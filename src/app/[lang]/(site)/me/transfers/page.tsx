import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { declineTransfer } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass } from "@/components/ui";
import { localePath, type Locale } from "@/i18n/config";
import Link from "@/i18n/link";
import { getLocale, getT } from "@/i18n/server";
import { api } from "@/lib/api";
import { baht, fmtFor } from "@/lib/format";
import type { Transfer } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.me.transfers.title };
}

const AT_OPTIONS: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" };
const AT: Record<Locale, Intl.DateTimeFormat> = {
  th: new Intl.DateTimeFormat("th-TH-u-ca-gregory", AT_OPTIONS),
  en: new Intl.DateTimeFormat("en-GB", AT_OPTIONS),
};

const STATUS_CLASS: Record<Transfer["status"], string> = {
  pending: "bg-warn-soft text-warn",
  accepted: "bg-warn-soft text-warn",
  completed: "bg-ok-soft text-ok",
  rejected: "bg-tint text-muted",
  expired: "bg-tint text-muted",
  cancelled: "bg-tint text-muted",
};

export default async function TransfersPage() {
  const t = await getT();
  return (
    <div className="bg-tint pb-12">
      <div className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 pt-6">
        <Link href="/me/events" className="self-start font-semibold text-ink">
          {t.me.back.myEvents}
        </Link>
        <h1 className="text-3xl font-bold">{t.me.transfers.title}</h1>
        <Suspense fallback={<div className="h-72 animate-pulse rounded-card bg-white" aria-busy="true" />}>
          <Transfers />
        </Suspense>
      </div>
    </div>
  );
}

async function Transfers() {
  const [dict, locale] = await Promise.all([getT(), getLocale()]);
  const tt = dict.me.transfers;
  const at = AT[locale];
  const res = await api<{ incoming: Transfer[]; outgoing: Transfer[] }>("/v1/me/transfers", { auth: true });
  if (!res.ok) {
    if (res.status === 401) redirect(localePath(locale, "/login?next=/me/transfers"));
    throw new Error(res.problem.title);
  }
  const { incoming, outgoing } = res.data;
  const open = incoming.filter((t) => t.status === "pending" || t.status === "accepted");

  return (
    <>
      <section className="flex flex-col gap-3" aria-label={tt.incomingTitle}>
        <h2 className="text-lg font-semibold">{tt.incomingTitle}</h2>
        {open.length === 0 ? (
          <p className="rounded-card bg-white p-6 text-center text-muted">{tt.incomingEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {open.map((t) => (
              <li key={t.id} className="overflow-hidden rounded-card bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
                  <span className="flex min-w-0 flex-col leading-snug">
                    <b className="truncate font-semibold">{t.event.name}</b>
                    <span className="text-[13px] text-muted">{fmtFor(locale).date(t.event.eventDate)}</span>
                  </span>
                  <span className="rounded-full bg-ice px-3 py-0.5 font-bold text-brand">{t.race.code}</span>
                </div>
                <div className="flex flex-col gap-3 p-5">
                  <p className="break-words">
                    <b className="font-semibold">{t.sender}</b> {tt.sentYou(t.race.code)}
                    {t.shirtSize && ` · ${tt.shirtSize(t.shirtSize)}`}
                  </p>
                  <p className="text-sm text-muted">
                    {tt.acceptBy(at.format(new Date(t.expiresAt)))}
                    {t.feeSatang > 0 && ` · ${tt.fee(baht(t.feeSatang))}`}
                  </p>
                  {t.feeOrderId ? (
                    <Link href={`/orders/${t.feeOrderId}/pay`} className={`${buttonClass} no-underline`}>
                      {tt.payFee}
                    </Link>
                  ) : (
                    <Link href={`/me/transfers/${t.id}`} className={`${buttonClass} no-underline`}>
                      {tt.accept}
                    </Link>
                  )}
                  <form action={declineTransfer.bind(null, t.id)} className="self-center">
                    <SubmitButton className="px-4 py-2 text-sm text-muted underline" pendingLabel="…">
                      {tt.decline}
                    </SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="flex flex-col gap-3 rounded-card bg-white p-5" aria-label={tt.outgoingTitle}>
          <h2 className="text-lg font-semibold">{tt.outgoingTitle}</h2>
          <ul className="flex flex-col">
            {outgoing.map((t) => {
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                  <span className="rounded-full bg-ice px-3 py-0.5 text-sm font-bold text-brand">{t.race.code}</span>
                  <span className="flex min-w-0 flex-1 flex-col leading-snug">
                    <span className="truncate">{t.event.name}</span>
                    <span className="truncate text-[13px] text-muted">{tt.to(t.toEmail)}</span>
                  </span>
                  <span className={`rounded-full px-3 py-0.5 text-[13px] font-semibold ${STATUS_CLASS[t.status]}`}>{tt.status[t.status]}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
