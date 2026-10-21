import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { localePath } from "@/i18n/config";
import Link from "@/i18n/link";
import { getLocale, getT } from "@/i18n/server";
import { api } from "@/lib/api";
import { baht, fmtFor, problemMessage } from "@/lib/format";
import { BANKS, type MyRegistration, type RefundQuote } from "@/lib/types";
import { RefundForm } from "./refund-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.me.refund.title };
}

type Props = PageProps<"/[lang]/me/registrations/[id]/refund">;

export default function RefundPage({ params }: Props) {
  return (
    <div className="bg-tint pb-10">
      <div className="mx-auto flex max-w-[560px] flex-col gap-4 px-4 pt-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-white" aria-busy="true" />}>
          <Refund params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function Refund({ params }: Pick<Props, "params">) {
  const [{ id }, t, locale] = await Promise.all([params, getT(), getLocale()]);
  const tr = t.me.refund;
  const back = `/me/registrations/${id}`;
  const [reg, quote] = await Promise.all([
    api<MyRegistration>(`/v1/me/registrations/${encodeURIComponent(id)}`, { auth: true }),
    api<RefundQuote>(`/v1/me/registrations/${encodeURIComponent(id)}/refund`, { auth: true }),
  ]);
  if (!reg.ok || !quote.ok) {
    if (reg.status === 401 || quote.status === 401) redirect(localePath(locale, `/login?next=${back}/refund`));
    notFound();
  }
  const r = reg.data;
  const q = quote.data;

  return (
    <>
      <Link href={back} className="self-start font-semibold text-ink">
        {t.me.back.ticket}
      </Link>
      <div>
        <h1 className="text-3xl font-bold">{tr.title}</h1>
        <p className="text-muted">
          {locale === "en" ? r.runner.en : (r.runner.th ?? r.runner.en)} · {r.race.code}
          {r.bibNumber && ` · ${t.me.bib(r.bibNumber)}`}
        </p>
      </div>

      <section className="flex flex-col gap-2 rounded-card bg-white p-5" aria-label={tr.amountLabel}>
        <div className="flex justify-between text-sm">
          <span className="text-muted">{tr.entryFee(r.race.code)}</span>
          <span className="tabular-nums">{baht(q.pricePaidSatang)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">{tr.policyRate}</span>
          <span className="tabular-nums">× {fmtFor(locale).num(q.percentBps / 100)}%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">{tr.paymentFee}</span>
          <span>{tr.notRefunded}</span>
        </div>
        <div className="flex items-baseline justify-between border-t border-line pt-2">
          <b className="font-semibold">{tr.youGet}</b>
          <b className="text-2xl font-bold text-brand tabular-nums">{baht(q.amountSatang)}</b>
        </div>
        <span className="text-[13px] text-muted">{tr.until(fmtFor(locale).date(q.refundUntil))}</span>
      </section>

      {q.eligible ? (
        <RefundForm registrationId={r.id} amountLabel={baht(q.amountSatang)} needsBank={q.needsBankAccount} banks={Object.keys(BANKS).map((code): [string, string] => [code, tr.bankNames[code] ?? BANKS[code]])} />
      ) : (
        <p role="status" className="rounded-card bg-white p-5 text-muted">
          {problemMessage({ code: q.reason ?? "", title: tr.notAllowed }, locale)}
        </p>
      )}
    </>
  );
}
