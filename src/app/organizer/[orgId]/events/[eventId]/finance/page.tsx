import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, EmptyState, PageHeader, Pill } from "@/components/backoffice";
import { baht } from "@/lib/format";
import {
  can,
  eventPath,
  membership,
  orgEvent,
  orgGet,
  type EventFinance,
  type FinanceTransaction,
  type OrgFinance,
  type SettlementRound,
  type TransactionStatus,
} from "@/lib/org";
import { BANKS } from "@/lib/types";

export const metadata: Metadata = { title: "การเงิน" };

type Props = PageProps<"/organizer/[orgId]/events/[eventId]/finance">;

const PAGE_SIZE = 20;
const TABS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "paid", label: "สำเร็จ" },
  { key: "refunded", label: "คืนเงิน / ยกเลิก" },
  { key: "pending", label: "รอชำระ" },
] as const;

const TX_STATUS: Record<TransactionStatus, { label: string; className: string }> = {
  pending_payment: { label: "รอชำระ", className: "bg-warn-soft text-warn" },
  paid: { label: "สำเร็จ", className: "bg-ok-soft text-ok" },
  partially_refunded: { label: "คืนบางส่วน", className: "bg-bad-soft text-bad" },
  refunded: { label: "คืนเงิน", className: "bg-bad-soft text-bad" },
  cancelled: { label: "ยกเลิก", className: "bg-ice text-muted" },
};

const METHOD: Record<string, string> = { promptpay: "PromptPay", card: "บัตร", mobile_banking: "Mobile Banking", bank_transfer: "โอนเงิน", manual: "บันทึกเอง", free: "ฟรี" };

const at = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });
const day = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
const num = (n: number) => n.toLocaleString("th-TH");

export default function FinancePage({ params, searchParams }: Props) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="การเงิน" />
          <div className="h-72 animate-pulse rounded-[28px] bg-white" aria-busy="true" />
        </>
      }
    >
      <Finance params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function roundState(s: SettlementRound): { label: string; className: string } {
  if (s.payout?.status === "paid") return { label: "โอนแล้ว", className: "bg-ok-soft text-ok" };
  if (s.payout?.status === "failed") return { label: "โอนไม่สำเร็จ", className: "bg-bad-soft text-bad" };
  if (s.payout || s.status === "approved" || s.status === "calculated") return { label: "รอโอน", className: "bg-warn-soft text-warn" };
  return { label: "กำลังสะสมยอด", className: "bg-ice text-muted" };
}

async function Finance({ params, searchParams }: Props) {
  const { orgId, eventId } = await params;
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const [org, event] = await Promise.all([membership(orgId), orgEvent(orgId, eventId)]);
  if (!can(org.role, "view_finance")) notFound();
  const back = eventPath(orgId, eventId, "finance");
  const [fin, tx, orgFin] = await Promise.all([
    orgGet<EventFinance>(orgId, `/events/${eventId}/finance`, back),
    orgGet<{ items: FinanceTransaction[]; total: number }>(orgId, `/events/${eventId}/finance/transactions?status=${tab}&limit=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}`, back),
    orgGet<OrgFinance>(orgId, "/finance", back),
  ]);
  const s = fin.summary;
  const href = (next: { tab?: string; page?: number }) => {
    const q = new URLSearchParams();
    const t = next.tab ?? tab;
    if (t !== "all") q.set("tab", t);
    if ((next.page ?? 1) > 1) q.set("page", String(next.page));
    return `${back}${q.size ? `?${q}` : ""}`;
  };
  const pages = Math.max(1, Math.ceil(tx.total / PAGE_SIZE));

  const kpis = [
    { label: "ยอดขายรวม", value: baht(s.salesSatang), sub: `${num(s.orders)} คำสั่งซื้อ · ${num(s.runners)} ผู้วิ่ง`, strong: true },
    { label: "ค่าธรรมเนียมแพลตฟอร์ม", value: baht(s.platformFeesSatang), sub: "หักจากยอดก่อนโอน" },
    { label: "คืนเงิน", value: baht(s.refundsSatang), sub: `${num(s.refundCount)} รายการ · โอนคืนแล้ว ${baht(s.refundsPaidSatang)}` },
    { label: "ยอดสุทธิของคุณ", value: baht(s.netSatang), sub: `โอนแล้ว ${baht(s.paidOutSatang)} · รอโอน ${baht(s.toPayOutSatang)}` },
  ];

  return (
    <>
      <PageHeader
        title="การเงิน"
        eyebrow={`${event.nameTh} · ข้อมูลถึง ${at.format(new Date())}`}
        actions={
          <a href={`${eventPath(orgId, eventId, "finance/export")}${tab === "all" ? "" : `?status=${tab}`}`} className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold no-underline">
            Export ธุรกรรม (CSV)
          </a>
        }
      />

      <section aria-label="สรุปยอด" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        {kpis.map((k) => (
          <div key={k.label} className={`flex flex-col gap-1 rounded-3xl p-5 ${k.strong ? "bg-sky" : "bg-white"}`}>
            <span className={`text-sm ${k.strong ? "text-ink" : "text-muted"}`}>{k.label}</span>
            <b className="text-[26px] leading-tight font-bold tabular-nums">{k.value}</b>
            <span className={`text-[13px] ${k.strong ? "text-ink" : "text-muted"}`}>{k.sub}</span>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-start gap-4">
        <Card title="ยอดสุทธิคิดอย่างไร" className="min-w-0 flex-[999_1_420px]">
          <dl className="flex flex-col text-sm">
            {(
              [
                ["ยอดขาย (ค่าสมัครและสินค้า)", s.salesSatang, false],
                ["ส่วนลดคูปอง", s.discountsSatang, true],
                ["ค่าธรรมเนียมแพลตฟอร์ม", s.platformFeesSatang, true],
                ["คืนเงินที่อนุมัติแล้ว", s.refundsSatang, true],
              ] as const
            ).map(([label, amount, deducted]) => (
              <div key={label} className="flex justify-between gap-3 border-t border-line py-2 first:border-t-0">
                <dt className="text-muted">{label}</dt>
                <dd className="tabular-nums">{deducted && amount > 0 ? `− ${baht(amount)}` : baht(amount)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-3 border-t-2 border-ink pt-2">
              <dt className="font-semibold">ยอดสุทธิของคุณ</dt>
              <dd className="font-bold tabular-nums">{baht(s.netSatang)}</dd>
            </div>
          </dl>
          <p className="text-[13px] text-muted">
            นักวิ่งจ่ายค่าธรรมเนียมชำระเงินเพิ่ม {baht(s.runnerFeesSatang)} แยกจากยอดขายและไม่รวมในยอดสุทธิ
            {s.pendingOrders > 0 && ` · ยังมี ${num(s.pendingOrders)} คำสั่งซื้อรอชำระ ${baht(s.pendingSatang)}`}
          </p>
        </Card>

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <Card title="รอบ payout">
            {fin.payouts.length === 0 ? (
              <p className="text-sm text-muted">ยังไม่มีรอบโอน ทีมก้าวจะสรุปยอดและโอนเข้าบัญชีของคุณตามรอบ</p>
            ) : (
              <ul className="flex flex-col gap-2" aria-label="รอบ payout">
                {fin.payouts.map((p) => {
                  const state = roundState(p);
                  return (
                    <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-tint px-3.5 py-3">
                      <span className="flex min-w-0 flex-1 flex-col leading-snug">
                        <b className="text-sm font-semibold">
                          รอบ {day.format(new Date(p.periodStart))} – {day.format(new Date(p.periodEnd))}
                        </b>
                        <span className="text-xs text-muted">
                          {p.payout?.status === "paid" && p.payout.paidAt
                            ? `โอนเข้า ${BANKS[p.payout.bankCode ?? ""] ?? p.payout.bankCode ?? ""} ••${p.payout.accountLast4 ?? ""} เมื่อ ${at.format(new Date(p.payout.paidAt))}`
                            : `${num(p.orders)} คำสั่งซื้อ · หักค่าธรรมเนียม ${baht(p.feesSatang)}`}
                        </span>
                      </span>
                      <span className="flex flex-col items-end gap-1">
                        <b className="tabular-nums">{baht(p.payout?.amountSatang ?? p.netSatang)}</b>
                        <Pill label={state.label} className={state.className} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <Card title="บัญชีรับเงิน">
            {fin.bankAccount ? (
              <div className="flex flex-col gap-1 text-sm">
                <span className="flex items-center gap-2">
                  <b className="font-semibold">{BANKS[fin.bankAccount.bankCode] ?? fin.bankAccount.bankCode}</b>
                  <Pill label={fin.bankAccount.verified ? "ยืนยันแล้ว" : "รอยืนยัน"} className={fin.bankAccount.verified ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"} />
                </span>
                <span className="tabular-nums">••••••{fin.bankAccount.accountLast4}</span>
                <span className="text-muted">{fin.bankAccount.accountName}</span>
              </div>
            ) : (
              <p className="text-sm text-muted">ยังไม่มีบัญชีรับเงิน ติดต่อทีมก้าวเพื่อเพิ่มบัญชีก่อนรอบโอนแรก</p>
            )}
          </Card>
        </div>
      </div>

      <Card title="ธุรกรรม">
        <nav aria-label="สถานะธุรกรรม" className="-mx-1 flex flex-wrap gap-1">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={href({ tab: t.key })}
              aria-current={tab === t.key ? "page" : undefined}
              className={`flex min-h-10 items-center rounded-full px-4 text-sm no-underline ${tab === t.key ? "bg-brand font-semibold text-white" : "bg-tint text-ink"}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        {tx.items.length === 0 ? (
          <EmptyState>ยังไม่มีธุรกรรม</EmptyState>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[13px] text-muted">
                  <th className="py-2 pr-3 font-medium">Order</th>
                  <th className="py-2 pr-3 font-medium">วันเวลา</th>
                  <th className="py-2 pr-3 font-medium">ช่องทาง</th>
                  <th className="py-2 pr-3 text-right font-medium">ยอดขาย</th>
                  <th className="py-2 pr-3 text-right font-medium">ส่วนลด</th>
                  <th className="py-2 pr-3 text-right font-medium">ค่าธรรมเนียม</th>
                  <th className="py-2 pr-3 text-right font-medium">คืนเงิน</th>
                  <th className="py-2 pr-3 text-right font-medium">สุทธิ</th>
                  <th className="py-2 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {tx.items.map((t) => (
                  <tr key={t.orderNo} className="border-t border-line">
                    <td className="py-2.5 pr-3 font-medium tabular-nums">{t.orderNo}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-muted">{at.format(new Date(t.paidAt ?? t.createdAt))}</td>
                    <td className="py-2.5 pr-3">{t.method ? (METHOD[t.method] ?? t.method) : "–"}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{baht(t.salesSatang)}</td>
                    <td className="py-2.5 pr-3 text-right text-muted tabular-nums">{t.discountSatang ? `−${baht(t.discountSatang)}` : "–"}</td>
                    <td className="py-2.5 pr-3 text-right text-muted tabular-nums">{t.platformFeeSatang ? `−${baht(t.platformFeeSatang)}` : "–"}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-bad">{t.refundedSatang ? `−${baht(t.refundedSatang)}` : ""}</td>
                    <td className={`py-2.5 pr-3 text-right font-semibold tabular-nums ${t.netSatang !== null && t.netSatang < 0 ? "text-bad" : ""}`}>
                      {t.netSatang === null ? "–" : baht(t.netSatang)}
                    </td>
                    <td className="py-2.5">
                      <Pill label={TX_STATUS[t.status].label} className={TX_STATUS[t.status].className} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <span>
            แสดง {num(tx.items.length)} จาก {num(tx.total)} ธุรกรรม
          </span>
          <span className="flex gap-2">
            {page > 1 && (
              <Link href={href({ page: page - 1 })} className="rounded-full bg-tint px-4 py-2 no-underline">
                ก่อนหน้า
              </Link>
            )}
            {page < pages && (
              <Link href={href({ page: page + 1 })} className="rounded-full bg-tint px-4 py-2 no-underline">
                ถัดไป
              </Link>
            )}
          </span>
        </div>
      </Card>

      {orgFin.events.length > 1 && (
        <Card title={`ทุกงานของ ${org.nameTh}`}>
          <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[13px] text-muted">
                  <th className="py-2 pr-3 font-medium">งาน</th>
                  <th className="py-2 pr-3 text-right font-medium">ผู้วิ่ง</th>
                  <th className="py-2 pr-3 text-right font-medium">ยอดขาย</th>
                  <th className="py-2 pr-3 text-right font-medium">สุทธิ</th>
                  <th className="py-2 text-right font-medium">รอโอน</th>
                </tr>
              </thead>
              <tbody>
                {orgFin.events.map((e) => (
                  <tr key={e.eventId} className="border-t border-line">
                    <td className="py-2.5 pr-3">
                      <Link href={eventPath(orgId, e.eventId, "finance")} aria-current={e.eventId === eventId ? "page" : undefined} className="no-underline">
                        {e.nameTh}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{num(e.runners)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{baht(e.salesSatang)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{baht(e.netSatang)}</td>
                    <td className="py-2.5 text-right tabular-nums">{baht(e.toPayOutSatang)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-ink font-semibold">
                  <td className="py-2.5 pr-3">รวม</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{num(orgFin.totals.runners)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{baht(orgFin.totals.salesSatang)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{baht(orgFin.totals.netSatang)}</td>
                  <td className="py-2.5 text-right tabular-nums">{baht(orgFin.totals.toPayOutSatang)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
