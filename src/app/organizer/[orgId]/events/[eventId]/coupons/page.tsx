import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, EmptyState, PageHeader, Pill } from "@/components/backoffice";
import { baht } from "@/lib/format";
import { can, eventPath, membership, orgGet, type Coupon } from "@/lib/org";
import { CreateCouponForm, EditCouponForm, ToggleCouponButton } from "./coupon-forms";

export const metadata: Metadata = { title: "คูปอง" };

type Props = PageProps<"/organizer/[orgId]/events/[eventId]/coupons">;

export default function CouponsPage({ params }: Props) {
  return (
    <>
      <PageHeader title="คูปอง" eyebrow="โค้ดส่วนลดสำหรับงานนี้" />
      <Suspense fallback={<div className="h-72 animate-pulse rounded-[28px] bg-white" aria-busy="true" />}>
        <Coupons params={params} />
      </Suspense>
    </>
  );
}

const when = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  day: "numeric",
  month: "short",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Bangkok",
});

function discountLabel(c: Coupon): string {
  if (c.discountType === "fixed") return baht(c.discountValue);
  const pct = `${(c.discountValue / 100).toLocaleString("th-TH", { maximumFractionDigits: 2 })}%`;
  return c.maxDiscountSatang ? `${pct} (สูงสุด ${baht(c.maxDiscountSatang)})` : pct;
}

function windowLabel(c: Coupon): string {
  if (!c.startsAt && !c.endsAt) return "ใช้ได้ตลอด";
  const from = c.startsAt ? when.format(new Date(c.startsAt)) : "ตอนนี้";
  const to = c.endsAt ? when.format(new Date(c.endsAt)) : "ไม่หมดอายุ";
  return `${from} – ${to}`;
}

function couponState(c: Coupon): { label: string; className: string } {
  const now = Date.now();
  if (!c.isActive) return { label: "ปิดใช้", className: "bg-ice text-muted" };
  if (c.endsAt && new Date(c.endsAt).getTime() <= now) return { label: "หมดอายุ", className: "bg-ice text-muted" };
  if (c.usageLimit !== null && c.used >= c.usageLimit) return { label: "สิทธิ์เต็ม", className: "bg-warn-soft text-warn" };
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return { label: "ยังไม่เริ่ม", className: "bg-warn-soft text-warn" };
  return { label: "ใช้ได้", className: "bg-ok-soft text-ok" };
}

async function Coupons({ params }: Pick<Props, "params">) {
  const { orgId, eventId } = await params;
  const [org, { items }] = await Promise.all([
    membership(orgId),
    orgGet<{ items: Coupon[] }>(orgId, `/events/${eventId}/coupons`, eventPath(orgId, eventId, "coupons")),
  ]);
  const canEdit = can(org.role, "manage_event");

  return (
    <>
      {items.length === 0 ? (
        <EmptyState>ยังไม่มีโค้ดส่วนลด</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="โค้ดส่วนลด">
          {items.map((c) => {
            const state = couponState(c);
            return (
              <li key={c.id} className="flex flex-col gap-3 rounded-[28px] bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="font-mono text-lg tracking-wide">{c.code}</b>
                      <Pill label={state.label} className={state.className} />
                    </div>
                    {c.description && <span className="text-sm text-muted">{c.description}</span>}
                  </div>
                  {canEdit && <ToggleCouponButton orgId={orgId} eventId={eventId} coupon={c} />}
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-muted">ส่วนลด</dt>
                    <dd className="font-semibold">{discountLabel(c)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">ใช้ไปแล้ว</dt>
                    <dd className="font-semibold tabular-nums">
                      {c.used.toLocaleString("th-TH")} / {c.usageLimit === null ? "ไม่จำกัด" : c.usageLimit.toLocaleString("th-TH")}
                      {c.usagePerUser !== null && <span className="font-normal text-muted"> · {c.usagePerUser} ครั้ง/คน</span>}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">ส่วนลดที่ให้ไป</dt>
                    <dd className="font-semibold tabular-nums">{baht(c.discountGivenSatang)}</dd>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <dt className="text-muted">ช่วงเวลา</dt>
                    <dd>{windowLabel(c)}</dd>
                  </div>
                </dl>
                {canEdit && (
                  <details className="group border-t border-line pt-3">
                    <summary className="cursor-pointer text-sm font-medium text-brand">แก้ไขโค้ดนี้</summary>
                    <EditCouponForm orgId={orgId} eventId={eventId} coupon={c} />
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canEdit && (
        <Card title="สร้างโค้ดใหม่">
          <CreateCouponForm orgId={orgId} eventId={eventId} />
        </Card>
      )}
    </>
  );
}
