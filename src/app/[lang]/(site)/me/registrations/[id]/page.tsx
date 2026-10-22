import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { EventBanner } from "@/components/banner";
import { Qr } from "@/components/qr";
import { localePath } from "@/i18n/config";
import Link from "@/i18n/link";
import { getLocale, getT } from "@/i18n/server";
import { api } from "@/lib/api";
import { baht, fmtFor } from "@/lib/format";
import type { ChangeOptions, MyRegistration, RefundQuote } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.me.ticket.title };
}

export default async function TicketPage({ params, searchParams }: PageProps<"/[lang]/me/registrations/[id]">) {
  const t = await getT();
  return (
    <div className="bg-sky pb-12">
      <div className="mx-auto max-w-[440px] px-4 pt-6">
        <Link href="/me/events" className="mb-3 inline-block font-semibold text-ink">
          {t.me.back.myEvents}
        </Link>
        <Suspense fallback={<div className="h-[560px] animate-pulse rounded-[28px] bg-white/60" aria-busy="true" />}>
          <Ticket params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Ticket({ params, searchParams }: Pick<PageProps<"/[lang]/me/registrations/[id]">, "params" | "searchParams">) {
  const [{ id }, query, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  const tt = t.me.ticket;
  const [res, refund, changes] = await Promise.all([
    api<MyRegistration>(`/v1/me/registrations/${encodeURIComponent(id)}`, { auth: true }),
    api<RefundQuote>(`/v1/me/registrations/${encodeURIComponent(id)}/refund`, { auth: true }),
    api<ChangeOptions>(`/v1/me/registrations/${encodeURIComponent(id)}/changes`, { auth: true }),
  ]);
  if (!res.ok) {
    if (res.status === 401) redirect(localePath(locale, `/login?next=/me/registrations/${id}`));
    notFound();
  }
  const r = res.data;
  const [first, ...rest] = r.runner.en.split(" ");

  return (
    <article className="overflow-hidden rounded-[28px] bg-white shadow-[0_14px_34px_rgba(14,42,71,.14)]">
      {query.changed === "1" && (
        <p role="status" className="bg-ok-soft px-5 py-3 text-sm font-semibold text-ok">
          {tt.changed(r.race.code, r.bibNumber)}
        </p>
      )}
      <EventBanner
        slug={r.event.slug}
        type="road"
        title={r.event.name}
        subtitle={`${fmtFor(locale).date(r.event.eventDate)} · ${r.race.code}`}
        imageUrl={r.event.coverImageUrl}
        className="h-28"
        titleSize="text-lg"
      />
      <div className="flex flex-col items-center gap-0.5 px-5 pb-1.5 pt-4 text-center">
        <span className="text-xs tracking-[0.1em] text-muted">BIB NUMBER</span>
        <span className="text-6xl font-bold tracking-wide text-brand tabular-nums">{r.bibNumber ?? "----"}</span>
        <span className="text-xl font-semibold tracking-[0.08em]">{first}</span>
        <span className="text-[13px] text-muted">
          {[rest.join(" "), r.ageGroup].filter(Boolean).join(" · ")}
        </span>
      </div>

      <div aria-hidden className="relative my-1.5 h-6">
        <span className="absolute -left-3 top-0 h-6 w-6 rounded-full bg-sky" />
        <span className="absolute -right-3 top-0 h-6 w-6 rounded-full bg-sky" />
        <span className="absolute inset-x-5 top-[11px] border-t-2 border-dashed border-line-strong" />
      </div>

      <div className="flex items-center gap-4 px-5 pb-5">
        {r.qrToken ? (
          <Qr value={r.qrToken} size={128} label={tt.qrLabel} />
        ) : (
          <div className="grid h-32 w-32 place-items-center rounded-xl bg-tint p-2 text-center text-xs text-muted">{tt.qrAfterPayment}</div>
        )}
        <div className="flex flex-col gap-1.5 leading-snug">
          <b className="font-semibold">{tt.showQr}</b>
          {r.shirtSize && (
            <span className="text-sm text-muted">
              {tt.shirtSize} <b className="ml-1 rounded-xl bg-ice px-3 py-0.5 text-lg text-brand">{r.shirtSize}</b>
            </span>
          )}
          <span className={`text-[13px] font-medium ${r.kitPickedUpAt ? "text-ok" : "text-warn"}`}>
            {r.kitPickedUpAt ? tt.pickedUp : tt.notPickedUp}
          </span>
        </div>
      </div>

      <dl className="mx-5 mb-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-line pt-3 text-sm">
        <dt className="text-muted">{tt.registrationNo}</dt>
        <dd className="text-right">{r.registrationNo}</dd>
        <dt className="text-muted">{tt.order}</dt>
        <dd className="text-right">{r.orderNo}</dd>
        {r.event.venue && (
          <>
            <dt className="text-muted">{tt.venue}</dt>
            <dd className="text-right">{r.event.venue}</dd>
          </>
        )}
      </dl>
      {changes.ok && <ChangeLinks options={changes.data} t={tt} />}
      {refund.ok && <RefundNote quote={refund.data} registrationId={r.id} t={tt} />}
    </article>
  );
}

/** An open transfer or race change, or the ways to start one while the event allows it. */
type TicketT = Awaited<ReturnType<typeof getT>>["me"]["ticket"];

function ChangeLinks({ options: o, t }: { options: ChangeOptions; t: TicketT }) {
  const base = `/me/registrations/${o.registrationId}`;
  if (o.transfer.open) {
    return (
      <Link href={`${base}/transfer`} className="mx-5 mb-3 block rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn no-underline">
        {t.transferring(o.transfer.open.toEmail)}
      </Link>
    );
  }
  if (o.raceChange.open) {
    return (
      <Link href={`${base}/race-change`} className="mx-5 mb-3 block rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn no-underline">
        {t.raceChangePending(o.raceChange.open.toRaceCode)}
      </Link>
    );
  }
  if (!o.transfer.allowed && !o.raceChange.allowed) return null;
  return (
    <nav aria-label={t.changesLabel} className="mx-5 mb-3 grid grid-cols-2 gap-2">
      {o.raceChange.allowed && (
        <Link href={`${base}/race-change`} className="flex min-h-11 items-center justify-center rounded-full bg-ice px-3 text-sm font-semibold text-brand no-underline">
          {t.changeRace}
        </Link>
      )}
      {o.transfer.allowed && (
        <Link href={`${base}/transfer`} className="flex min-h-11 items-center justify-center rounded-full bg-ice px-3 text-sm font-semibold text-brand no-underline">
          {t.transfer}
        </Link>
      )}
    </nav>
  );
}

/** Where the runner's refund stands, or the way to ask for one while the policy allows it. */
function RefundNote({ quote, registrationId, t }: { quote: RefundQuote; registrationId: string; t: TicketT }) {
  const last = quote.lastRequest;
  if (last?.status === "requested") {
    return (
      <p role="status" className="mx-5 mb-5 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
        {t.refundRequested(baht(last.amountSatang))}
      </p>
    );
  }
  return (
    <div className="mx-5 mb-5 flex flex-col gap-2">
      {last?.status === "rejected" && (
        <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{t.refundRejected(last.note)}</p>
      )}
      {quote.eligible && (
        <Link href={`/me/registrations/${registrationId}/refund`} className="self-center text-sm text-muted">
          {t.refundLink(baht(quote.amountSatang))}
        </Link>
      )}
    </div>
  );
}
