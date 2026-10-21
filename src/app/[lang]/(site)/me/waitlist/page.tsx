import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { leaveWaitlist } from "@/app/actions";
import { Countdown } from "@/components/countdown";
import { SubmitButton } from "@/components/submit-button";
import { localePath } from "@/i18n/config";
import Link from "@/i18n/link";
import { getLocale, getT } from "@/i18n/server";
import { api } from "@/lib/api";
import { baht, fmtFor } from "@/lib/format";
import type { WaitlistEntry } from "@/lib/types";
import { ClaimButton } from "./claim-button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.me.waitlist.title };
}

export default async function WaitlistPage() {
  const t = await getT();
  return (
    <div className="bg-tint pb-12">
      <div className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 pt-6">
        <Link href="/me/events" className="self-start font-semibold text-ink">
          {t.me.back.myEvents}
        </Link>
        <h1 className="text-3xl font-bold">{t.me.waitlist.title}</h1>
        <Suspense fallback={<div className="h-72 animate-pulse rounded-card bg-white" aria-busy="true" />}>
          <Entries />
        </Suspense>
      </div>
    </div>
  );
}

async function Entries() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const tw = t.me.waitlist;
  const f = fmtFor(locale);
  const res = await api<{ items: WaitlistEntry[] }>("/v1/me/waitlist", { auth: true });
  if (!res.ok) {
    if (res.status === 401) redirect(localePath(locale, "/login?next=/me/waitlist"));
    throw new Error(res.problem.title);
  }
  const items = res.data.items;
  if (items.length === 0) {
    return (
      <div className="rounded-card bg-white p-8 text-center">
        <p>{tw.empty}</p>
        <p className="mt-1 text-sm text-muted">{tw.emptyHint}</p>
      </div>
    );
  }
  return (
    <>
      <ul className="flex flex-col gap-4" aria-label={tw.listLabel}>
        {items.map((w) => (
          <li key={w.id} className="overflow-hidden rounded-card bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
              <span className="flex min-w-0 flex-col leading-snug">
                <Link href={`/events/${w.event.slug}`} className="truncate font-semibold text-ink no-underline">
                  {w.event.name}
                </Link>
                <span className="text-[13px] text-muted">{f.date(w.event.eventDate)}</span>
              </span>
              <span className="rounded-full bg-ice px-3 py-0.5 font-bold text-brand">{w.race.code}</span>
            </div>
            {w.status === "offered" ? (
              <div className="flex flex-col gap-3 p-5">
                <div className="rounded-[20px] bg-sky p-5 text-center">
                  <b className="text-xl font-bold">{tw.yourTurn}</b>
                  <p className="text-sm">{tw.held(w.race.code)}</p>
                  {w.offerExpiresAt && <Countdown until={w.offerExpiresAt} className="text-3xl font-bold" />}
                </div>
                <p className="text-sm text-muted">{tw.offerNote}</p>
                <ClaimButton entryId={w.id} label={tw.claim(w.priceSatang !== null ? baht(w.priceSatang) : null)} />
                <form action={leaveWaitlist.bind(null, w.id)} className="self-center">
                  <SubmitButton className="px-4 py-2 text-sm text-muted underline" pendingLabel="…">
                    {tw.giveUp}
                  </SubmitButton>
                </form>
              </div>
            ) : (
              <div className="flex flex-col gap-3 p-5">
                <div className="flex items-end justify-between gap-3">
                  <span className="flex flex-col">
                    <span className="text-sm text-muted">{tw.position}</span>
                    <b className="text-5xl leading-none font-bold text-brand tabular-nums">{f.num(w.position)}</b>
                  </span>
                  <span className="text-right text-sm">
                    {w.ahead === 0 ? (
                      <b className="text-ok">{tw.nextIsYou}</b>
                    ) : (
                      <>
                        {tw.ahead.before} <b className="tabular-nums">{f.num(w.ahead)}</b> {tw.ahead.after}
                      </>
                    )}
                  </span>
                </div>
                <p className="text-[13px] text-muted">{tw.joined(f.date(w.joinedAt.slice(0, 10)))}</p>
                <form action={leaveWaitlist.bind(null, w.id)} className="self-start">
                  <SubmitButton className="min-h-10 rounded-full px-4 text-sm text-muted ring-1 ring-line-strong" pendingLabel="…">
                    {tw.leave}
                  </SubmitButton>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>
      <section className="flex flex-col gap-3 rounded-card bg-white p-5" aria-label={tw.howTitle}>
        <h2 className="text-lg font-semibold">{tw.howTitle}</h2>
        <ol className="flex flex-col gap-3">
          {tw.steps.map(([title, text], i) => (
            <li key={title} className="flex gap-3">
              <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-ice font-bold text-brand">{i + 1}</span>
              <span className="flex flex-col leading-snug">
                <b className="font-semibold">{title}</b>
                <span className="text-sm text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
