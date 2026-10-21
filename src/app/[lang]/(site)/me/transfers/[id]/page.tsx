import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { api, apiOrThrow } from "@/lib/api";
import { baht, fmt } from "@/lib/format";
import type { EventDetail, RunnerProfile, Transfer } from "@/lib/types";
import { AcceptForm } from "./accept-form";

export const metadata: Metadata = { title: "รับโอนสิทธิ์" };

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
  const { id } = await params;
  const res = await api<{ incoming: Transfer[] }>("/v1/me/transfers", { auth: true });
  if (!res.ok) {
    if (res.status === 401) redirect(`/login?next=/me/transfers/${id}`);
    throw new Error(res.problem.title);
  }
  const t = res.data.incoming.find((x) => x.id === id);
  if (!t) notFound();
  if (t.feeOrderId) redirect(`/orders/${t.feeOrderId}/pay`);
  if (t.status === "completed" && t.registrationId) redirect(`/me/registrations/${t.registrationId}`);
  const [event, profiles] = await Promise.all([
    apiOrThrow<EventDetail>(`/v1/events/${encodeURIComponent(t.event.slug)}`),
    api<{ items: RunnerProfile[] }>("/v1/me/profiles", { auth: true }),
  ]);
  const questions = (event.questions ?? []).filter((q) => !q.raceIds || q.raceIds.includes(t.race.id));

  return (
    <>
      <Link href="/me/transfers" className="self-start font-semibold text-ink">
        ← โอนสิทธิ์
      </Link>
      <div>
        <h1 className="text-3xl font-bold">รับโอนสิทธิ์</h1>
        <p className="text-muted">
          {t.event.name} · {t.race.code} · {fmt.date(t.event.eventDate)}
        </p>
      </div>
      {t.status !== "pending" ? (
        <p role="status" className="rounded-card bg-white p-5 text-muted">
          สิทธิ์นี้รับไม่ได้แล้ว
        </p>
      ) : (
        <AcceptForm
          transferId={t.id}
          questions={questions}
          note={`จาก ${t.sender}${t.shirtSize ? ` · เสื้อไซซ์ ${t.shirtSize} (เปลี่ยนไซซ์ไม่ได้)` : ""}`}
          profiles={profiles.ok ? profiles.data.items : []}
          submitLabel={t.feeSatang > 0 ? `รับสิทธิ์และชำระค่าธรรมเนียม ${baht(t.feeSatang)}` : "รับสิทธิ์"}
        />
      )}
    </>
  );
}
