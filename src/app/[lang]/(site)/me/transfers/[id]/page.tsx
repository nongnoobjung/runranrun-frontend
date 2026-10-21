import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { localePath } from "@/i18n/config";
import Link from "@/i18n/link";
import { getLocale, getT } from "@/i18n/server";
import { api, apiOrThrow } from "@/lib/api";
import { baht, fmtFor } from "@/lib/format";
import type { EventDetail, RunnerProfile, Transfer } from "@/lib/types";
import { AcceptForm } from "./accept-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.me.acceptTransfer.title };
}

type Props = PageProps<"/[lang]/me/transfers/[id]">;

export default function AcceptTransferPage({ params }: Props) {
  return (
    <div className="bg-tint pb-10">
      <div className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 pt-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-white" aria-busy="true" />}>
          <Accept params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function Accept({ params }: Pick<Props, "params">) {
  const [{ id }, dict, locale] = await Promise.all([params, getT(), getLocale()]);
  const ta = dict.me.acceptTransfer;
  const res = await api<{ incoming: Transfer[] }>("/v1/me/transfers", { auth: true });
  if (!res.ok) {
    if (res.status === 401) redirect(localePath(locale, `/login?next=/me/transfers/${id}`));
    throw new Error(res.problem.title);
  }
  const t = res.data.incoming.find((x) => x.id === id);
  if (!t) notFound();
  if (t.feeOrderId) redirect(localePath(locale, `/orders/${t.feeOrderId}/pay`));
  if (t.status === "completed" && t.registrationId) redirect(localePath(locale, `/me/registrations/${t.registrationId}`));
  const [event, profiles] = await Promise.all([
    apiOrThrow<EventDetail>(`/v1/events/${encodeURIComponent(t.event.slug)}`),
    api<{ items: RunnerProfile[] }>("/v1/me/profiles", { auth: true }),
  ]);
  const questions = (event.questions ?? []).filter((q) => !q.raceIds || q.raceIds.includes(t.race.id));

  return (
    <>
      <Link href="/me/transfers" className="self-start font-semibold text-ink">
        {dict.me.back.transfers}
      </Link>
      <div>
        <h1 className="text-3xl font-bold">{ta.title}</h1>
        <p className="text-muted">
          {t.event.name} · {t.race.code} · {fmtFor(locale).date(t.event.eventDate)}
        </p>
      </div>
      {t.status !== "pending" ? (
        <p role="status" className="rounded-card bg-white p-5 text-muted">
          {ta.unavailable}
        </p>
      ) : (
        <AcceptForm
          transferId={t.id}
          questions={questions}
          note={ta.note(t.sender, t.shirtSize)}
          profiles={profiles.ok ? profiles.data.items : []}
          submitLabel={t.feeSatang > 0 ? ta.submitFee(baht(t.feeSatang)) : ta.submit}
        />
      )}
    </>
  );
}
