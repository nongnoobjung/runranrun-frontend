import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, EmptyState, PageHeader, Pill } from "@/components/backoffice";
import { bibLabel, can, eventPath, membership, orgGet, type BibOverview, type BibRace } from "@/lib/org";
import { AssignWaitingButton, ImportForm, SetBibForm, SetByRegistrationNoForm } from "./bib-forms";

export const metadata: Metadata = { title: "บิบ" };

type Props = PageProps<"/organizer/[orgId]/events/[eventId]/bibs">;

export default function BibsPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="บิบ" />
          <div className="h-72 animate-pulse rounded-[28px] bg-white" aria-busy="true" />
        </>
      }
    >
      <Bibs params={params} />
    </Suspense>
  );
}

function rangeText(r: BibRace): string {
  if (r.start === null) return "ยังไม่ได้ตั้งช่วงเลข";
  return `${bibLabel(r.prefix, r.start)} – ${r.end === null ? "ไม่จำกัด" : bibLabel(r.prefix, r.end)}`;
}

async function Bibs({ params }: Pick<Props, "params">) {
  const { orgId, eventId } = await params;
  const [org, bibs] = await Promise.all([membership(orgId), orgGet<BibOverview>(orgId, `/events/${eventId}/bibs`, eventPath(orgId, eventId, "bibs"))]);
  const canEdit = can(org.role, "manage_event");
  const waiting = bibs.totals.confirmed - bibs.totals.assigned;
  const fmt = (n: number) => n.toLocaleString("th-TH");

  return (
    <>
      <PageHeader
        title="บิบ"
        eyebrow={`ออกบิบแล้ว ${fmt(bibs.totals.assigned)} จาก ${fmt(bibs.totals.confirmed)} คนที่ชำระเงินแล้ว`}
        actions={canEdit && <AssignWaitingButton orgId={orgId} eventId={eventId} waiting={waiting} />}
      />

      <section aria-label="ช่วงเลขบิบแต่ละระยะ" className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
        {bibs.races.map((r) => {
          const pct = r.confirmed ? Math.round((r.assigned / r.confirmed) * 100) : 0;
          return (
            <div key={r.raceId} className="flex flex-col gap-2.5 rounded-3xl bg-white p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-ice px-3.5 py-0.5 text-lg font-bold text-brand">{r.code}</span>
                {r.rangeFull ? (
                  <Pill label="ช่วงเลขเต็ม" className="bg-warn-soft text-warn" />
                ) : (
                  r.next !== null && <span className="text-[13px] text-muted">เลขถัดไป {bibLabel(r.prefix, r.next)}</span>
                )}
              </div>
              <b className={`text-2xl font-bold tracking-wide tabular-nums ${r.start === null ? "text-base font-medium text-muted" : ""}`}>{rangeText(r)}</b>
              <div className="h-2 overflow-hidden rounded-full bg-tint" role="img" aria-label={`ออกแล้ว ${pct}%`}>
                <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-[13px]">
                <span>
                  ออกแล้ว <b className="tabular-nums">{fmt(r.assigned)}</b>
                </span>
                <span className={r.waiting ? "font-semibold text-warn" : "text-ok"}>รอออก {fmt(r.waiting)}</span>
              </div>
              {(r.start === null || r.rangeFull) && canEdit && (
                <Link href={eventPath(orgId, eventId, "races")} className="text-[13px]">
                  {r.start === null ? "ตั้งช่วงเลขบิบ" : "ขยายเลขสุดท้าย"} ในหน้าระยะและราคา →
                </Link>
              )}
            </div>
          );
        })}
      </section>

      <div className="flex flex-wrap items-start gap-4">
        <Card title="รอออกบิบ" className="min-w-0 flex-[999_1_480px]" action={<span className="text-sm text-muted">ชำระเงินแล้ว ยังไม่มีเลข</span>}>
          {bibs.waiting.length === 0 ? (
            <EmptyState>ทุกคนที่ชำระเงินแล้วมีเลขบิบแล้ว</EmptyState>
          ) : (
            <ul className="-mx-1 flex flex-col" aria-label="รอออกบิบ">
              {bibs.waiting.map((w) => (
                <li key={w.id} className="flex flex-col gap-2 border-t border-line px-1 py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex min-w-0 flex-col leading-snug">
                    <b className="font-semibold">{w.name}</b>
                    <span className="text-[13px] text-muted tabular-nums">
                      {w.registrationNo} · {w.raceCode}
                    </span>
                  </span>
                  {canEdit && <SetBibForm orgId={orgId} eventId={eventId} registrationId={w.id} current={null} label={`เลขบิบของ ${w.name}`} />}
                </li>
              ))}
            </ul>
          )}
          {waiting > bibs.waiting.length && <p className="text-[13px] text-muted">แสดง {fmt(bibs.waiting.length)} คนแรกจาก {fmt(waiting)} คน</p>}
        </Card>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          {canEdit && (
            <Card title="กำหนดเลขเอง">
              <p className="text-sm text-muted">ใช้กับนักวิ่งรับเชิญหรือเปลี่ยนเลขให้ใคร ใส่เลขอะไรก็ได้ที่ยังไม่มีคนใช้ในงานนี้</p>
              <SetByRegistrationNoForm orgId={orgId} eventId={eventId} />
            </Card>
          )}
          {can(org.role, "view_pii") && (
            <Card title="ไฟล์ส่งโรงพิมพ์">
              <p className="text-sm text-muted">รายชื่อคนที่ชำระเงินแล้วพร้อมเลขบิบ ชื่อบนบิบ และผู้ติดต่อฉุกเฉิน</p>
              <a href={`${eventPath(orgId, eventId, "registrations/export")}?status=confirmed`} className="self-start rounded-full bg-tint px-4 py-2.5 text-sm font-semibold no-underline">
                Export CSV
              </a>
            </Card>
          )}
        </div>
      </div>

      {canEdit && (
        <Card title="นำเข้าเลขบิบจากไฟล์">
          <ImportForm orgId={orgId} eventId={eventId} />
        </Card>
      )}
    </>
  );
}
