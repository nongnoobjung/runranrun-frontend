import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, PageHeader, Pill, smallGhostButtonClass } from "@/components/backoffice";
import { PROVINCES } from "@/lib/format";
import { can, EVENT_STATUS, eventPath, membership, orgEvent, type ReadinessKey } from "@/lib/org";
import { closeEvent, publishEvent, updateEvent } from "./actions";
import { EventForm } from "./event-form";
import { StatusActions } from "./status-actions";

export const metadata: Metadata = { title: "ข้อมูลงาน" };

export default function EditEventPage({ params }: PageProps<"/organizer/[orgId]/events/[eventId]/edit">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[28px] bg-white" aria-busy="true" />}>
      <EditEvent params={params} />
    </Suspense>
  );
}

const READINESS: Record<ReadinessKey, { label: string; section?: string }> = {
  basics: { label: "ชื่องาน วันแข่ง จังหวัด และสถานที่", section: "edit#basics" },
  registration_window: { label: "วันเปิดและปิดรับสมัคร", section: "edit#window" },
  races: { label: "มีอย่างน้อย 1 ระยะ", section: "races" },
  prices: { label: "ทุกระยะมีช่วงราคา", section: "races" },
  organization: { label: "ทีมผู้จัดผ่านการตรวจเอกสาร (KYC)" },
};

async function EditEvent({ params }: Pick<PageProps<"/organizer/[orgId]/events/[eventId]/edit">, "params">) {
  const { orgId, eventId } = await params;
  const [org, event] = await Promise.all([membership(orgId), orgEvent(orgId, eventId)]);
  const canEdit = can(org.role, "manage_event");
  const status = EVENT_STATUS[event.status];
  const ready = event.readiness.every((r) => r.ok);
  const live = event.status === "published" || event.status === "closed";

  return (
    <>
      <PageHeader
        eyebrow={event.nameTh}
        title="ข้อมูลงาน"
        actions={
          <>
            <Pill label={status.label} className={status.className} />
            {live && (
              <Link href={`/events/${event.slug}`} target="_blank" className={smallGhostButtonClass}>
                ดูหน้างาน ↗
              </Link>
            )}
          </>
        }
      />
      {!canEdit && <p className="rounded-2xl bg-ice px-4 py-3 text-sm text-muted">บทบาทของคุณดูข้อมูลได้อย่างเดียว</p>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="order-2 min-w-0 xl:order-1">
          <EventForm
            action={updateEvent.bind(null, orgId, eventId)}
            event={{
              slug: event.slug, nameTh: event.nameTh, nameEn: event.nameEn, eventType: event.eventType, eventDate: event.eventDate,
              provinceCode: event.provinceCode, venueName: event.venueName, venueAddress: event.venueAddress, summaryTh: event.summaryTh,
              descriptionTh: event.descriptionTh, coverImageUrl: event.coverImageUrl, registrationOpensAt: event.registrationOpensAt,
              registrationClosesAt: event.registrationClosesAt, holdMinutes: event.holdMinutes,
              allowRefund: event.allowRefund, refundDeadline: event.refundDeadline, refundPercentBps: event.refundPercentBps,
            }}
            slugLocked={event.status !== "draft"}
            readOnly={!canEdit}
            provinces={Object.entries(PROVINCES)}
          />
        </div>

        <aside className="order-1 flex flex-col gap-4 xl:sticky xl:top-8 xl:order-2">
          <Card title="ความพร้อมก่อนเปิดรับสมัคร">
            <ul className="flex flex-col gap-2.5">
              {event.readiness.map((r) => {
                const item = READINESS[r.key];
                return (
                  <li key={r.key} className="flex items-start gap-2.5 text-sm">
                    <span
                      aria-hidden
                      className={`mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full text-xs font-bold ${
                        r.ok ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"
                      }`}
                    >
                      {r.ok ? "✓" : "!"}
                    </span>
                    <span className="flex flex-col">
                      <span>
                        <span className="sr-only">{r.ok ? "ครบแล้ว: " : "ยังขาด: "}</span>
                        {item.label}
                      </span>
                      {!r.ok &&
                        (item.section ? (
                          <Link href={eventPath(orgId, eventId, item.section)} className="text-[13px]">
                            ไปกรอก →
                          </Link>
                        ) : (
                          <span className="text-[13px] text-muted">ทีมงานก้าวตรวจเอกสารภายใน 1 วันทำการ</span>
                        ))}
                    </span>
                  </li>
                );
              })}
            </ul>
            {canEdit && (
              <StatusActions
                status={event.status}
                ready={ready}
                publish={publishEvent.bind(null, orgId, eventId)}
                close={closeEvent.bind(null, orgId, eventId)}
              />
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
