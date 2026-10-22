import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, PageHeader, Pill, dangerButtonClass, smallGhostButtonClass } from "@/components/backoffice";
import { approveEvent, rejectEvent } from "@/app/admin/actions";
import { adminGet, adminMe, ORG_STATUS, type AdminEvent } from "@/lib/admin";
import { baht, fmt, provinceName } from "@/lib/format";
import { EVENT_STATUS } from "@/lib/org";
import { ActionButton, TextActionForm } from "../../action-button";

export const metadata: Metadata = { title: "ตรวจงาน" };

type Props = PageProps<"/admin/reviews/[eventId]">;

const at = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });

const READINESS: Record<string, string> = {
  basics: "ชื่อ วันที่ และสถานที่",
  registration_window: "วันเปิด-ปิดรับสมัคร",
  races: "มีระยะอย่างน้อยหนึ่งระยะ",
  prices: "ทุกระยะมีราคา",
  organization: "ผู้จัดผ่าน KYC",
};

export default function ReviewPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[28px] bg-white" aria-busy="true" />}>
      <Review params={params} />
    </Suspense>
  );
}

async function Review({ params }: Pick<Props, "params">) {
  const { eventId } = await params;
  const [me, { event: e, organization: org }] = await Promise.all([adminMe(), adminGet<AdminEvent>(`/events/${eventId}`, `/admin/reviews/${eventId}`)]);
  const status = EVENT_STATUS[e.status];
  const pending = e.status === "pending_review";

  return (
    <>
      <Link href="/admin/reviews" className="self-start text-sm font-semibold">
        ← งานรอตรวจ
      </Link>
      <PageHeader
        title={e.nameTh}
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            <Pill label={status.label} className={status.className} />
            <Link href={`/admin/organizations/${org.id}`}>{org.nameTh}</Link>
            <Pill label={ORG_STATUS[org.status].label} className={ORG_STATUS[org.status].className} />
          </span>
        }
        actions={
          <Link href={`/admin/audit?eventId=${e.id}`} className={smallGhostButtonClass}>
            ดูบันทึกการทำงาน
          </Link>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4">
          <Card title="ข้อมูลงาน">
            <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <dt className="text-muted">วันแข่ง</dt>
              <dd>{fmt.date(e.eventDate)}</dd>
              <dt className="text-muted">สถานที่</dt>
              <dd>{[e.venueName, provinceName(e.provinceCode)].filter(Boolean).join(" · ") || "–"}</dd>
              <dt className="text-muted">รับสมัคร</dt>
              <dd>
                {e.registrationOpensAt ? at.format(new Date(e.registrationOpensAt)) : "–"} ถึง {e.registrationClosesAt ? at.format(new Date(e.registrationClosesAt)) : "–"}
              </dd>
              <dt className="text-muted">ลิงก์</dt>
              <dd className="break-all">/events/{e.slug}</dd>
              <dt className="text-muted">นโยบาย</dt>
              <dd>
                {[
                  e.allowRefund ? `คืนเงิน ${(e.refundPercentBps / 100).toLocaleString("th-TH")}%` : "ไม่คืนเงิน",
                  e.allowTransfer ? "โอนสิทธิ์ได้" : null,
                  e.allowRaceChange ? "เปลี่ยนระยะได้" : null,
                  e.waitlistEnabled ? "มี waitlist" : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </dd>
            </dl>
            {e.summaryTh && <p className="text-sm">{e.summaryTh}</p>}
            {e.descriptionTh && <p className="text-sm whitespace-pre-line text-muted">{e.descriptionTh}</p>}
          </Card>

          <Card title="ระยะและราคา">
            <ul className="flex flex-col">
              {e.races.map((r) => (
                <li key={r.id} className="flex flex-col gap-1 border-t border-line py-3 first:border-t-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <b className="rounded-full bg-ice px-3 py-0.5 text-brand">{r.code}</b>
                    <span>{r.nameTh}</span>
                    <span className="text-sm text-muted">
                      {r.distanceKm} กม. · {r.capacity.toLocaleString("th-TH")} ที่{r.ageMin ? ` · อายุ ${r.ageMin}+` : ""}
                    </span>
                  </span>
                  <span className="text-sm text-muted">
                    {r.tiers.length === 0 ? "ยังไม่มีราคา" : r.tiers.map((t) => `${t.name} ${baht(t.priceSatang)}`).join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-4">
          <Card title="ความพร้อม">
            <ul className="flex flex-col gap-1.5 text-sm">
              {e.readiness.map((r) => (
                <li key={r.key} className={r.ok ? "text-ok" : "text-bad"}>
                  {r.ok ? "✓" : "✕"} {READINESS[r.key] ?? r.key}
                </li>
              ))}
            </ul>
          </Card>
          {pending && me.can.review_events ? (
            <Card title="ผลการตรวจ">
              <ActionButton action={approveEvent.bind(null, e.id)} label="อนุมัติและเปิดรับสมัคร" pendingLabel="กำลังอนุมัติ…" />
              <div className="border-t border-line pt-3">
                <TextActionForm
                  action={rejectEvent.bind(null, e.id)}
                  name="note"
                  label="ส่งกลับให้ผู้จัดแก้ (ผู้จัดเห็นข้อความนี้)"
                  placeholder="เช่น ใส่แผนที่เส้นทาง และเวลาตัดตัวของ 21K"
                  submitLabel="ส่งกลับให้แก้"
                  className={dangerButtonClass}
                />
              </div>
            </Card>
          ) : (
            <p className="rounded-[24px] bg-white p-5 text-sm text-muted">
              {pending ? "สิทธิ์ของคุณดูได้อย่างเดียว" : `งานนี้ไม่ได้รอตรวจแล้ว (${status.label})`}
              {e.review.reviewedAt && ` · ตรวจเมื่อ ${at.format(new Date(e.review.reviewedAt))}`}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
