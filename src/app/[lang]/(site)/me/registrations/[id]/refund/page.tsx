import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { api } from "@/lib/api";
import { baht, problemMessage } from "@/lib/format";
import { BANKS, type MyRegistration, type RefundQuote } from "@/lib/types";
import { RefundForm } from "./refund-form";

export const metadata: Metadata = { title: "ขอคืนเงิน" };

type Props = PageProps<"/[lang]/me/registrations/[id]/refund">;

const day = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });

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
  const { id } = await params;
  const back = `/me/registrations/${id}`;
  const [reg, quote] = await Promise.all([
    api<MyRegistration>(`/v1/me/registrations/${encodeURIComponent(id)}`, { auth: true }),
    api<RefundQuote>(`/v1/me/registrations/${encodeURIComponent(id)}/refund`, { auth: true }),
  ]);
  if (!reg.ok || !quote.ok) {
    if (reg.status === 401 || quote.status === 401) redirect(`/login?next=${back}/refund`);
    notFound();
  }
  const r = reg.data;
  const q = quote.data;

  return (
    <>
      <Link href={back} className="self-start font-semibold text-ink">
        ← บัตรวิ่ง
      </Link>
      <div>
        <h1 className="text-3xl font-bold">ขอคืนเงิน</h1>
        <p className="text-muted">
          {r.runner.th ?? r.runner.en} · {r.race.code}
          {r.bibNumber && ` · บิบ ${r.bibNumber}`}
        </p>
      </div>

      <section className="flex flex-col gap-2 rounded-card bg-white p-5" aria-label="ยอดเงินคืน">
        <div className="flex justify-between text-sm">
          <span className="text-muted">ค่าสมัคร {r.race.code}</span>
          <span className="tabular-nums">{baht(q.pricePaidSatang)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">อัตราคืนตามนโยบาย</span>
          <span className="tabular-nums">× {(q.percentBps / 100).toLocaleString("th-TH")}%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">ค่าธรรมเนียมชำระเงิน</span>
          <span>ไม่คืน</span>
        </div>
        <div className="flex items-baseline justify-between border-t border-line pt-2">
          <b className="font-semibold">ได้รับคืน</b>
          <b className="text-2xl font-bold text-brand tabular-nums">{baht(q.amountSatang)}</b>
        </div>
        <span className="text-[13px] text-muted">ขอคืนได้ถึง {day.format(new Date(q.refundUntil))}</span>
      </section>

      {q.eligible ? (
        <RefundForm registrationId={r.id} amountLabel={baht(q.amountSatang)} needsBank={q.needsBankAccount} banks={Object.entries(BANKS)} />
      ) : (
        <p role="status" className="rounded-card bg-white p-5 text-muted">
          {problemMessage({ code: q.reason ?? "", title: "ขอคืนเงินไม่ได้" })}
        </p>
      )}
    </>
  );
}
