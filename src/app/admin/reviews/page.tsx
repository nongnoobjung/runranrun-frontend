import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, PageHeader, Pill } from "@/components/backoffice";
import { adminGet, ORG_STATUS, type ReviewItem } from "@/lib/admin";
import { fmt, provinceName } from "@/lib/format";

export const metadata: Metadata = { title: "ตรวจงาน" };

const at = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });

export default function ReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="ตรวจงาน" />
          <div className="h-48 animate-pulse rounded-[28px] bg-white" aria-busy="true" />
        </>
      }
    >
      <Reviews searchParams={searchParams} />
    </Suspense>
  );
}

async function Reviews({ searchParams }: Pick<PageProps<"/admin/reviews">, "searchParams">) {
  const [sp, { items }] = await Promise.all([searchParams, adminGet<{ items: ReviewItem[] }>("/reviews", "/admin/reviews")]);
  const notice = sp.approved ? "อนุมัติแล้ว งานเปิดรับสมัครทันที" : sp.rejected ? "ส่งกลับให้ผู้จัดแก้แล้ว" : null;
  return (
    <>
      <PageHeader title="ตรวจงาน" eyebrow={`รอตรวจ ${items.length.toLocaleString("th-TH")} งาน`} />
      {notice && (
        <p role="status" className="rounded-2xl bg-ok-soft px-4 py-3 text-sm text-ok">
          {notice}
        </p>
      )}
      <p className="text-sm text-muted">งานของผู้จัดที่ตั้งให้ต้องตรวจ จะรอที่นี่ตอนกดเปิดรับสมัครครั้งแรก อนุมัติแล้วผู้จัดปิด/เปิดเองได้ต่อ</p>
      {items.length === 0 ? (
        <EmptyState>ไม่มีงานรอตรวจ</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="งานรอตรวจ">
          {items.map((e) => (
            <li key={e.id}>
              <Link href={`/admin/reviews/${e.id}`} className="flex flex-wrap items-center gap-3 rounded-[24px] bg-white p-4 text-ink no-underline hover:ring-2 hover:ring-brand sm:p-5">
                <span className="flex min-w-0 flex-1 flex-col leading-snug">
                  <b className="font-semibold">{e.nameTh}</b>
                  <span className="text-[13px] text-muted">
                    {e.organization.nameTh} · {fmt.date(e.eventDate)}
                    {e.province && ` · ${provinceName(e.province)}`} · {e.races.toLocaleString("th-TH")} ระยะ {e.capacity.toLocaleString("th-TH")} ที่
                  </span>
                  {e.submittedAt && <span className="text-xs text-muted">ส่งตรวจ {at.format(new Date(e.submittedAt))}</span>}
                </span>
                {e.organization.status !== "active" && <Pill label={ORG_STATUS[e.organization.status].label} className={ORG_STATUS[e.organization.status].className} />}
                <span aria-hidden className="text-brand">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
