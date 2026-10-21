import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, dangerButtonClass, EmptyState, PageHeader, Pill } from "@/components/backoffice";
import { approveSettlement, createSettlement, markSettlementPaid, voidSettlement } from "@/app/admin/actions";
import { adminGet, type AdminPayouts, type SettlementRow } from "@/lib/admin";
import { baht, fmt } from "@/lib/format";
import { BANKS } from "@/lib/types";
import { ActionButton, TextActionForm } from "../action-button";

export const metadata: Metadata = { title: "จ่ายเงินผู้จัด" };

const at = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });

const STATUS: Record<SettlementRow["status"], [string, string]> = {
  calculated: ["รออนุมัติ", "bg-warn-soft text-warn"],
  approved: ["รอโอน", "bg-warn-soft text-warn"],
  paid: ["โอนแล้ว", "bg-ok-soft text-ok"],
};

export default function PayoutsPage() {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="จ่ายเงินผู้จัด" />
          <div className="h-48 animate-pulse rounded-[28px] bg-white" aria-busy="true" />
        </>
      }
    >
      <Payouts />
    </Suspense>
  );
}

async function Payouts() {
  const { events, settlements } = await adminGet<AdminPayouts>("/payouts", "/admin/payouts");
  const toSettle = events.reduce((s, e) => s + Math.max(0, e.toSettleSatang), 0);
  return (
    <>
      <PageHeader title="จ่ายเงินผู้จัด" eyebrow={`ยอดรอสร้างรอบจ่าย ${baht(toSettle)}`} />
      <p className="text-sm text-muted">
        แต่ละรอบรวมยอดขายหลังส่วนลด หักคืนเงินที่อนุมัติและค่าธรรมเนียมแพลตฟอร์ม เฉพาะส่วนที่ยังไม่อยู่ในรอบก่อน อนุมัติแล้วโอนเข้าบัญชีที่ตรวจแล้วของผู้จัด
        แล้วบันทึกเลขอ้างอิง ผู้จัดเห็นสถานะในหน้าการเงินของตัวเอง
      </p>

      <Card title="งานที่มียอดค้างจ่าย">
        {events.length === 0 ? (
          <EmptyState>ไม่มียอดค้างจ่าย</EmptyState>
        ) : (
          <ul className="flex flex-col" aria-label="งานที่มียอดค้างจ่าย">
            {events.map((e) => (
              <li key={e.eventId} className="flex flex-wrap items-center gap-3 border-t border-line py-3 first:border-t-0">
                <span className="flex min-w-0 flex-1 flex-col leading-snug">
                  <b className="font-semibold">{e.nameTh}</b>
                  <span className="text-[13px] text-muted">
                    <Link href={`/admin/organizations/${e.organization.id}`}>{e.organization.nameTh}</Link> · {fmt.date(e.eventDate)} · ยอดสุทธิ {baht(e.netSatang)} · โอนแล้ว{" "}
                    {baht(e.paidOutSatang)}
                  </span>
                  {!e.bankVerified && <span className="text-xs text-bad">ยังไม่มีบัญชีรับเงินที่ตรวจแล้ว</span>}
                </span>
                <span className="text-right">
                  <span className="block text-xs text-muted">ยังไม่อยู่ในรอบ</span>
                  <b className="tabular-nums">{baht(e.toSettleSatang)}</b>
                </span>
                {e.openSettlement ? (
                  <span className="text-xs text-muted">มีรอบที่ยังไม่โอน</span>
                ) : e.toSettleSatang > 0 ? (
                  <ActionButton action={createSettlement.bind(null, e.eventId)} label="สร้างรอบจ่าย" />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="รอบจ่าย">
        {settlements.length === 0 ? (
          <EmptyState>ยังไม่มีรอบจ่าย</EmptyState>
        ) : (
          <ul className="flex flex-col" aria-label="รอบจ่าย">
            {settlements.map((s) => {
              const [label, cls] = STATUS[s.status];
              return (
                <li key={s.id} className="flex flex-col gap-3 border-t border-line py-4 first:border-t-0">
                  <div className="flex flex-wrap items-start gap-3">
                    <span className="flex min-w-0 flex-1 flex-col leading-snug">
                      <b className="font-semibold">{s.event.nameTh}</b>
                      <span className="text-[13px] text-muted">
                        {s.organization.nameTh} · {at.format(new Date(s.periodStart))} – {at.format(new Date(s.periodEnd))} · {s.orders.toLocaleString("th-TH")} คำสั่งซื้อ
                      </span>
                      <span className="text-[13px] text-muted tabular-nums">
                        ขาย {baht(s.grossSatang)} − คืนเงิน {baht(s.refundsSatang)} − ค่าธรรมเนียม {baht(s.platformFeeSatang)}
                      </span>
                      {s.payout && (
                        <span className="text-[13px] text-muted">
                          โอนเข้า {BANKS[s.payout.bankCode] ?? s.payout.bankCode} ••••{s.payout.accountLast4}
                          {s.payout.transferRef && ` · อ้างอิง ${s.payout.transferRef}`}
                          {s.payout.paidAt && ` · ${at.format(new Date(s.payout.paidAt))}`}
                        </span>
                      )}
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <b className="text-xl tabular-nums">{baht(s.netSatang)}</b>
                      <Pill label={label} className={cls} />
                    </span>
                  </div>
                  {s.status !== "paid" && (
                    <div className="flex flex-wrap items-start gap-3">
                      {s.status === "calculated" ? (
                        <ActionButton action={approveSettlement.bind(null, s.id)} label="อนุมัติรอบนี้" />
                      ) : (
                        <div className="min-w-[240px] flex-1">
                          <TextActionForm action={markSettlementPaid.bind(null, s.id)} name="transferRef" label="โอนแล้ว: เลขอ้างอิงการโอน" submitLabel="บันทึกว่าโอนแล้ว" />
                        </div>
                      )}
                      <ActionButton action={voidSettlement.bind(null, s.id)} label="ยกเลิกรอบ" className={dangerButtonClass} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
