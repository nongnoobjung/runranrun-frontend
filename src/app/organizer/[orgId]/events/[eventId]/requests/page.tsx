import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, EmptyState, PageHeader, Pill } from "@/components/backoffice";
import { baht } from "@/lib/format";
import { can, eventPath, membership, orgEvent, orgGet, type OrgRefund, type RefundList } from "@/lib/org";
import { BANKS } from "@/lib/types";
import { DecideRefund, TransferredForm } from "./refund-forms";

export const metadata: Metadata = { title: "คำขอคืนเงิน" };

type Props = PageProps<"/organizer/[orgId]/events/[eventId]/requests">;

const when = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });
const day = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });

const STATUS: Record<OrgRefund["status"], { label: string; className: string }> = {
  requested: { label: "รออนุมัติ", className: "bg-warn-soft text-warn" },
  approved: { label: "รอโอนคืน", className: "bg-ice text-brand" },
  processing: { label: "กำลังคืนเงิน", className: "bg-ice text-brand" },
  succeeded: { label: "คืนเงินแล้ว", className: "bg-ok-soft text-ok" },
  rejected: { label: "ปฏิเสธ", className: "bg-bad-soft text-bad" },
  failed: { label: "คืนไม่สำเร็จ", className: "bg-bad-soft text-bad" },
};

export default function RequestsPage({ params, searchParams }: Props) {
  return (
    <>
      <PageHeader title="คำขอคืนเงิน" eyebrow="นักวิ่งขอยกเลิกสิทธิ์และรับเงินคืนตามนโยบายของงาน" />
      <Suspense fallback={<div className="h-72 animate-pulse rounded-[28px] bg-white" aria-busy="true" />}>
        <Requests params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function waited(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? "วันนี้" : `รอ ${days} วัน`;
}

async function Requests({ params, searchParams }: Props) {
  const { orgId, eventId } = await params;
  const tab = (await searchParams).tab === "closed" ? "closed" : "open";
  const [org, event] = await Promise.all([membership(orgId), orgEvent(orgId, eventId)]);
  if (!can(org.role, "manage_refunds")) notFound();
  const list = await orgGet<RefundList>(orgId, `/events/${eventId}/refunds?status=${tab}`, eventPath(orgId, eventId, "requests"));
  const base = eventPath(orgId, eventId, "requests");
  const tabs = [
    { key: "open", label: "ต้องจัดการ", count: list.counts.requested + list.counts.approved },
    { key: "closed", label: "เสร็จแล้ว", count: list.counts.closed },
  ];

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-4">
        <nav aria-label="สถานะคำขอ" className="flex gap-1 self-start rounded-full bg-white p-1">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={t.key === "open" ? base : `${base}?tab=closed`}
              aria-current={tab === t.key ? "page" : undefined}
              className={`flex min-h-10 items-center gap-2 rounded-full px-4 text-sm no-underline ${tab === t.key ? "bg-brand font-semibold text-white" : "text-ink"}`}
            >
              {t.label}
              <span className={`rounded-full px-2 text-xs font-semibold ${tab === t.key ? "bg-white text-brand" : "bg-ice text-brand"}`}>{t.count}</span>
            </Link>
          ))}
        </nav>

        {list.items.length === 0 ? (
          <EmptyState>{tab === "open" ? "ไม่มีคำขอที่ต้องจัดการ" : "ยังไม่มีคำขอที่จัดการเสร็จ"}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3" aria-label="คำขอคืนเงิน">
            {list.items.map((f) => (
              <li key={f.id} className="flex flex-col gap-3 rounded-[28px] bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1 leading-snug">
                    <span className="flex flex-wrap items-center gap-2">
                      <b className="font-semibold">{f.registration.name}</b>
                      <span className="rounded-full bg-ice px-2.5 text-xs font-semibold text-brand">{f.registration.raceCode}</span>
                      <Pill label={STATUS[f.status].label} className={STATUS[f.status].className} />
                    </span>
                    <span className="text-[13px] text-muted">
                      {f.registration.registrationNo} · {f.requestedByRunner ? "นักวิ่งขอ" : "ผู้จัดยกเลิก"} {when.format(new Date(f.createdAt))}
                      {f.status === "requested" && <span className="font-semibold text-warn"> · {waited(f.createdAt)}</span>}
                    </span>
                    {f.reason && <span className="text-sm">เหตุผล: {f.reason}</span>}
                  </div>
                  <div className="flex flex-col items-end leading-tight">
                    <span className="text-xs text-muted">คืน</span>
                    <b className="text-2xl font-bold tabular-nums">{baht(f.amountSatang)}</b>
                    <span className="text-xs text-muted">จ่ายไป {baht(f.registration.pricePaidSatang)}</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-tint px-4 py-3 text-sm">
                  {f.bank ? (
                    <>
                      <span className="text-muted">โอนคืนเข้า </span>
                      <b className="font-semibold">{BANKS[f.bank.bankCode] ?? f.bank.bankCode}</b> <span className="tabular-nums">{f.bank.accountNumber}</span>
                      <span className="text-muted"> · {f.bank.accountName}</span>
                    </>
                  ) : (
                    <span className="text-muted">ไม่มีบัญชีรับเงินคืน ติดต่อนักวิ่งเพื่อขอเลขบัญชี</span>
                  )}
                  {f.paymentMethod === "promptpay" && <span className="block text-xs text-muted">จ่ายด้วย PromptPay ซึ่งคืนผ่านระบบไม่ได้ ต้องโอนคืนเอง</span>}
                </div>

                {f.status === "requested" && (
                  <DecideRefund orgId={orgId} eventId={eventId} refundId={f.id} amountLabel={baht(f.amountSatang)} />
                )}
                {f.status === "approved" && <TransferredForm orgId={orgId} eventId={eventId} refundId={f.id} />}
                {f.status === "succeeded" && f.transferReference && <span className="text-sm text-muted">เลขอ้างอิงการโอน {f.transferReference}</span>}
                {f.status === "rejected" && f.note && <span className="text-sm text-muted">เหตุผลที่ปฏิเสธ: {f.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Card title="นโยบายที่ใช้คำนวณ" className="min-w-0 flex-[1_1_300px]">
        {event.allowRefund ? (
          <p className="text-sm leading-relaxed">
            คืน <b>{(event.refundPercentBps / 100).toLocaleString("th-TH")}%</b> ของค่าสมัคร ถึง{" "}
            <b>{event.refundDeadline ? day.format(new Date(event.refundDeadline)) : "วันแข่ง"}</b> ค่าธรรมเนียมชำระเงินไม่คืน
          </p>
        ) : (
          <p className="text-sm text-muted">งานนี้ยังไม่เปิดให้นักวิ่งขอคืนเงิน</p>
        )}
        {can(org.role, "manage_event") && (
          <Link href={eventPath(orgId, eventId, "edit")} className="text-sm">
            แก้นโยบาย →
          </Link>
        )}
        <p className="rounded-2xl bg-warn-soft px-4 py-3 text-[13px] leading-relaxed text-warn">
          อนุมัติแล้วสิทธิ์ บิบ และ QR ของนักวิ่งใช้ไม่ได้ทันที ที่ว่างกลับไปเปิดขาย จากนั้นโอนเงินคืนเข้าบัญชีที่นักวิ่งแจ้งแล้วบันทึกเลขอ้างอิง
        </p>
      </Card>
    </div>
  );
}
