import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, EmptyState, PageHeader, Pill } from "@/components/backoffice";
import { can, eventPath, membership, orgEvent, orgGet, type EventWaitlist } from "@/lib/org";
import { OfferNowButton } from "./offer-button";

export const metadata: Metadata = { title: "Waitlist" };

type Props = PageProps<"/organizer/[orgId]/events/[eventId]/waitlist">;

const at = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });

export default function WaitlistPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Waitlist" />
          <div className="h-72 animate-pulse rounded-[28px] bg-white" aria-busy="true" />
        </>
      }
    >
      <Waitlist params={params} />
    </Suspense>
  );
}

async function Waitlist({ params }: Pick<Props, "params">) {
  const { orgId, eventId } = await params;
  const [org, event, data] = await Promise.all([
    membership(orgId),
    orgEvent(orgId, eventId),
    orgGet<EventWaitlist>(orgId, `/events/${eventId}/waitlist`, eventPath(orgId, eventId, "waitlist")),
  ]);
  const waiting = data.races.reduce((s, r) => s + r.counts.waiting, 0);
  const free = data.races.reduce((s, r) => s + (r.counts.waiting ? Math.min(r.free, r.counts.waiting) : 0), 0);

  return (
    <>
      <PageHeader
        title="Waitlist"
        eyebrow={event.waitlistEnabled ? `รอคิว ${waiting.toLocaleString("th-TH")} คน` : "ปิดอยู่"}
        actions={can(org.role, "manage_event") && event.waitlistEnabled && waiting > 0 && <OfferNowButton orgId={orgId} eventId={eventId} free={free} />}
      />

      {!event.waitlistEnabled && (
        <p className="rounded-3xl bg-warn-soft px-5 py-3 text-sm text-warn">
          งานนี้ยังไม่เปิดคิว waitlist เปิดได้ที่{" "}
          <Link href={eventPath(orgId, eventId, "edit")} className="font-semibold text-warn">
            ข้อมูลงาน
          </Link>{" "}
          แล้วนักวิ่งจะเข้าคิวได้เมื่อระยะเต็ม
        </p>
      )}

      <p className="text-sm text-muted">
        ที่ว่างจากการยกเลิก คืนเงิน หรือเพิ่มโควต้า ระบบเสนอให้คนแรกในคิวภายใน 30 วินาที และกันที่ไว้ให้ 24 ชั่วโมง ถ้าไม่สมัครทันจะส่งต่อคิวถัดไป
      </p>

      {data.races.map((r) => (
        <Card
          key={r.raceId}
          title={
            <span className="flex items-center gap-2">
              <span className="rounded-full bg-ice px-3 py-0.5 text-lg font-bold text-brand">{r.code}</span>
              <span className="text-sm font-normal text-muted">ว่าง {r.free.toLocaleString("th-TH")} ที่</span>
            </span>
          }
        >
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {(
              [
                ["รอคิว", r.counts.waiting],
                ["ได้รับข้อเสนอ", r.counts.offered],
                ["สมัครสำเร็จ", r.counts.converted],
                ["หมดเวลา", r.counts.expired],
              ] as const
            ).map(([label, n]) => (
              <div key={label} className="rounded-2xl bg-tint px-3 py-2">
                <dt className="text-[13px] text-muted">{label}</dt>
                <dd className="text-xl font-bold tabular-nums">{n.toLocaleString("th-TH")}</dd>
              </div>
            ))}
          </dl>
          {r.entries.length === 0 ? (
            <EmptyState>ไม่มีใครรอคิวระยะนี้</EmptyState>
          ) : (
            <ol className="flex flex-col" aria-label={`คิว ${r.code}`}>
              {r.entries.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-ice text-sm font-bold text-brand tabular-nums">{e.position}</span>
                  <span className="flex min-w-0 flex-1 flex-col leading-snug">
                    <b className="truncate font-semibold">{e.name}</b>
                    <span className="truncate text-[13px] text-muted">
                      {e.email} · เข้าคิว {at.format(new Date(e.joinedAt))}
                    </span>
                  </span>
                  {e.status === "offered" ? (
                    <span className="flex flex-col items-end gap-0.5">
                      <Pill label={e.claimed ? "กำลังสมัคร" : "ได้รับข้อเสนอ"} className="bg-warn-soft text-warn" />
                      {e.offerExpiresAt && <span className="text-xs text-muted">ถึง {at.format(new Date(e.offerExpiresAt))}</span>}
                    </span>
                  ) : (
                    <Pill label="รอคิว" className="bg-ice text-muted" />
                  )}
                </li>
              ))}
            </ol>
          )}
        </Card>
      ))}
    </>
  );
}
