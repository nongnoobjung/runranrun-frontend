import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, PageHeader, Pill } from "@/components/backoffice";
import { adminGet, ORG_STATUS, type AdminOrgSummary, type OrgStatus } from "@/lib/admin";

export const metadata: Metadata = { title: "ผู้จัดงาน" };

type Props = PageProps<"/admin/organizations">;

const TABS: [OrgStatus | "all", string][] = [
  ["pending_kyc", "รอตรวจ KYC"],
  ["active", "ใช้งานได้"],
  ["suspended", "ระงับ"],
  ["all", "ทั้งหมด"],
];

export default function OrganizationsPage({ searchParams }: Props) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="ผู้จัดงาน" />
          <div className="h-48 animate-pulse rounded-[28px] bg-white" aria-busy="true" />
        </>
      }
    >
      <Organizations searchParams={searchParams} />
    </Suspense>
  );
}

async function Organizations({ searchParams }: Pick<Props, "searchParams">) {
  const sp = await searchParams;
  const status = TABS.some(([s]) => s === sp.status) ? (sp.status as OrgStatus | "all") : "all";
  const { items, counts } = await adminGet<{ items: AdminOrgSummary[]; counts: Record<string, number> }>(`/organizations?status=${status}`, "/admin/organizations");
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <>
      <PageHeader title="ผู้จัดงาน" eyebrow={`ทั้งหมด ${total.toLocaleString("th-TH")} ทีม`} />
      <nav aria-label="สถานะ" className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {TABS.map(([s, label]) => (
          <Link
            key={s}
            href={s === "all" ? "/admin/organizations" : `/admin/organizations?status=${s}`}
            aria-current={s === status ? "page" : undefined}
            className={`flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm whitespace-nowrap no-underline ${s === status ? "bg-brand font-semibold text-white" : "bg-white text-ink"}`}
          >
            {label}
            <span className="tabular-nums opacity-80">{(s === "all" ? total : (counts[s] ?? 0)).toLocaleString("th-TH")}</span>
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <EmptyState>ไม่มีผู้จัดในสถานะนี้</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="รายชื่อผู้จัด">
          {items.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/organizations/${o.id}`} className="flex flex-wrap items-center gap-3 rounded-[24px] bg-white p-4 text-ink no-underline hover:ring-2 hover:ring-brand sm:p-5">
                <span className="flex min-w-0 flex-1 flex-col leading-snug">
                  <b className="font-semibold">{o.nameTh}</b>
                  <span className="truncate text-[13px] text-muted">
                    {o.contactEmail ?? o.slug} · {o.events.toLocaleString("th-TH")} งาน
                    {o.pendingReview > 0 && ` · รอตรวจ ${o.pendingReview} งาน`}
                    {o.pendingDocs > 0 && ` · เอกสารรอตรวจ ${o.pendingDocs}`}
                  </span>
                  <span className="text-xs text-muted">
                    {o.bankVerified ? "บัญชีรับเงินตรวจแล้ว" : o.bankSubmitted ? "บัญชีรับเงินรอยืนยัน" : "ยังไม่มีบัญชีรับเงิน"} · {o.reviewEvents ? "งานต้องรอตรวจ" : "เปิดงานเองได้"}
                  </span>
                </span>
                <Pill label={ORG_STATUS[o.status].label} className={ORG_STATUS[o.status].className} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
