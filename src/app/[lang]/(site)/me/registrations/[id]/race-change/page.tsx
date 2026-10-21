import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { cancelRaceChange } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass } from "@/components/ui";
import { localePath, type Locale } from "@/i18n/config";
import Link from "@/i18n/link";
import { getLocale, getT } from "@/i18n/server";
import { api } from "@/lib/api";
import { baht, problemMessage } from "@/lib/format";
import type { ChangeOptions } from "@/lib/types";
import { RaceChangeForm } from "./race-change-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.me.raceChange.title };
}

type Props = PageProps<"/[lang]/me/registrations/[id]/race-change">;

const AT_OPTIONS: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" };
const AT: Record<Locale, Intl.DateTimeFormat> = {
  th: new Intl.DateTimeFormat("th-TH-u-ca-gregory", AT_OPTIONS),
  en: new Intl.DateTimeFormat("en-GB", AT_OPTIONS),
};

export default function RaceChangePage({ params }: Props) {
  return (
    <div className="bg-tint pb-10">
      <div className="mx-auto flex max-w-[560px] flex-col gap-4 px-4 pt-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-white" aria-busy="true" />}>
          <RaceChange params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function RaceChange({ params }: Pick<Props, "params">) {
  const [{ id }, t, locale] = await Promise.all([params, getT(), getLocale()]);
  const tc = t.me.raceChange;
  const at = AT[locale];
  const back = `/me/registrations/${id}`;
  const res = await api<ChangeOptions>(`/v1/me/registrations/${encodeURIComponent(id)}/changes`, { auth: true });
  if (!res.ok) {
    if (res.status === 401) redirect(localePath(locale, `/login?next=${back}/race-change`));
    notFound();
  }
  const o = res.data;
  const c = o.raceChange;

  return (
    <>
      <Link href={back} className="self-start font-semibold text-ink">
        {t.me.back.ticket}
      </Link>
      <div>
        <h1 className="text-3xl font-bold">{tc.title}</h1>
        <p className="text-muted">
          {locale === "en" ? o.runner.en : (o.runner.th ?? o.runner.en)} · {tc.now(o.raceCode)} · {tc.paid(baht(o.pricePaidSatang))}
        </p>
      </div>

      {c.open ? (
        <section className="flex flex-col gap-3 rounded-card bg-white p-5" aria-label={tc.openLabel}>
          <span className="self-start rounded-full bg-warn-soft px-3 py-1 text-[13px] font-semibold text-warn">{t.me.awaitingPayment}</span>
          <p>
            {tc.changeTo} <b className="font-semibold">{c.open.toRaceCode}</b> · {tc.pay(baht(c.open.totalSatang))}
          </p>
          <p className="text-sm text-muted">{tc.heldUntil(c.open.toRaceCode, at.format(new Date(c.open.expiresAt)))}</p>
          <Link href={`/orders/${c.open.orderId}/pay`} className={`${buttonClass} no-underline`}>
            {tc.goPay}
          </Link>
          <form action={cancelRaceChange.bind(null, c.open.id, o.registrationId)} className="self-center">
            <SubmitButton className="px-4 py-2 text-sm text-muted underline" pendingLabel="…">
              {tc.keep}
            </SubmitButton>
          </form>
        </section>
      ) : c.allowed ? (
        <RaceChangeForm registrationId={o.registrationId} options={c.options} feeSatang={c.feeSatang} until={at.format(new Date(c.until))} />
      ) : (
        <p role="status" className="rounded-card bg-white p-5 text-muted">
          {problemMessage({ code: c.reason ?? "", title: tc.notAllowed }, locale)}
        </p>
      )}

      <ul className="flex list-disc flex-col gap-1.5 rounded-card bg-white p-5 pl-9 text-sm text-muted">
        {tc.rules(c.feeSatang > 0 ? baht(c.feeSatang) : null).map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </>
  );
}
