import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/backoffice";
import { adminGet, adminMe, type AdminOverview } from "@/lib/admin";
import { baht } from "@/lib/format";

export const metadata: Metadata = { title: "ภาพรวม" };

const ROLE: Record<string, string> = { support: "ซัพพอร์ต (ดูอย่างเดียว)", finance: "การเงิน", admin: "แอดมิน", superadmin: "ซูเปอร์แอดมิน" };

export default function AdminHome() {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="ภาพรวม" />
          <div className="h-48 animate-pulse rounded-[28px] bg-white" aria-busy="true" />
        </>
      }
    >
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const [me, o] = await Promise.all([adminMe(), adminGet<AdminOverview>("/overview")]);
  const cards = [
    { href: "/reviews", label: "งานรอตรวจ", value: o.pendingReview.toLocaleString("th-TH"), hint: "ตรวจก่อนเปิดรับสมัครครั้งแรก", urgent: o.pendingReview > 0 },
    { href: "/organizations?status=pending_kyc", label: "ผู้จัดรอตรวจ KYC", value: o.pendingKyc.toLocaleString("th-TH"), hint: "อนุมัติแล้วจึงเปิดรับสมัครได้", urgent: o.pendingKyc > 0 },
    ...(me.can.payouts
      ? [
          { href: "/payouts", label: "ยอดรอสร้างรอบจ่าย", value: baht(o.toSettleSatang), hint: `${o.eventsToSettle.toLocaleString("th-TH")} งาน`, urgent: o.toSettleSatang > 0 },
          { href: "/payouts", label: "รอบจ่ายที่ยังไม่โอน", value: o.settlementsOpen.toLocaleString("th-TH"), hint: "อนุมัติแล้วบันทึกการโอน", urgent: o.settlementsOpen > 0 },
        ]
      : []),
    { href: "/organizations?status=suspended", label: "ผู้จัดที่ถูกระงับ", value: o.suspended.toLocaleString("th-TH"), hint: "เปิดงานใหม่ไม่ได้", urgent: false },
  ];
  return (
    <>
      <PageHeader title="ภาพรวม" eyebrow={`สิทธิ์ของคุณ: ${ROLE[me.role] ?? me.role}`} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="flex flex-col gap-1 rounded-[24px] bg-white p-5 text-ink no-underline transition hover:-translate-y-0.5">
            <span className="text-sm text-muted">{c.label}</span>
            <b className={`text-3xl font-bold tabular-nums ${c.urgent ? "text-brand" : ""}`}>{c.value}</b>
            <span className="text-[13px] text-muted">{c.hint}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
