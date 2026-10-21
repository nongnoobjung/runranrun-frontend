import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, EmptyState, PageHeader, Pill } from "@/components/backoffice";
import { baht } from "@/lib/format";
import { eventPath, orgEvent, orgGet, type EventChanges } from "@/lib/org";

export const metadata: Metadata = { title: "โอนสิทธิ์และเปลี่ยนระยะ" };

type Props = PageProps<"/organizer/[orgId]/events/[eventId]/changes">;

const at = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });

const TRANSFER: Record<EventChanges["transfers"][number]["status"], [string, string]> = {
  pending: ["รอผู้รับ", "bg-warn-soft text-warn"],
  accepted: ["รอชำระค่าธรรมเนียม", "bg-warn-soft text-warn"],
  completed: ["โอนแล้ว", "bg-ok-soft text-ok"],
  rejected: ["ไม่สำเร็จ", "bg-tint text-muted"],
  expired: ["หมดเวลา", "bg-tint text-muted"],
  cancelled: ["ยกเลิก", "bg-tint text-muted"],
};

const CHANGE: Record<EventChanges["raceChanges"][number]["status"], [string, string]> = {
  pending_payment: ["รอชำระเงิน", "bg-warn-soft text-warn"],
  completed: ["เปลี่ยนแล้ว", "bg-ok-soft text-ok"],
  rejected: ["ไม่สำเร็จ", "bg-tint text-muted"],
  cancelled: ["ยกเลิก / หมดเวลา", "bg-tint text-muted"],
};

export default function ChangesPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="โอนสิทธิ์และเปลี่ยนระยะ" />
          <div className="h-72 animate-pulse rounded-[28px] bg-white" aria-busy="true" />
        </>
      }
    >
      <Changes params={params} />
    </Suspense>
  );
}

async function Changes({ params }: Pick<Props, "params">) {
  const { orgId, eventId } = await params;
  const [event, data] = await Promise.all([
    orgEvent(orgId, eventId),
    orgGet<EventChanges>(orgId, `/events/${eventId}/changes`, eventPath(orgId, eventId, "changes")),
  ]);
  const registration = (id: string) => `${eventPath(orgId, eventId, "registrations")}?selected=${id}#detail`;
  const done = (s: string) => s === "completed";
  const policy = [
    event.allowTransfer ? `โอนได้${event.transferFeeSatang ? ` ค่าธรรมเนียม ${baht(event.transferFeeSatang)}` : " ฟรี"}` : "ปิดการโอน",
    event.allowRaceChange ? `เปลี่ยนระยะได้${event.raceChangeFeeSatang ? ` ค่าธรรมเนียม ${baht(event.raceChangeFeeSatang)}` : " ฟรี"}` : "ปิดการเปลี่ยนระยะ",
  ].join(" · ");

  return (
    <>
      <PageHeader
        title="โอนสิทธิ์และเปลี่ยนระยะ"
        eyebrow={`โอนแล้ว ${data.transfers.filter((t) => done(t.status)).length.toLocaleString("th-TH")} · เปลี่ยนระยะแล้ว ${data.raceChanges.filter((c) => done(c.status)).length.toLocaleString("th-TH")}`}
      />
      <p className="text-sm text-muted">
        {policy} · ตั้งค่าได้ที่{" "}
        <Link href={eventPath(orgId, eventId, "edit")} className="font-semibold">
          ข้อมูลงาน
        </Link>{" "}
        · ย้ายระยะให้นักวิ่งเองได้ที่รายละเอียดผู้สมัคร
      </p>

      <Card title="โอนสิทธิ์">
        {data.transfers.length === 0 ? (
          <EmptyState>ยังไม่มีการโอนสิทธิ์</EmptyState>
        ) : (
          <ol className="flex flex-col" aria-label="รายการโอนสิทธิ์">
            {data.transfers.map((t) => {
              const [label, cls] = TRANSFER[t.status];
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-3 border-t border-line py-3 first:border-t-0">
                  <span className="rounded-full bg-ice px-3 py-0.5 text-sm font-bold text-brand">{t.raceCode}</span>
                  <span className="flex min-w-0 flex-1 flex-col leading-snug">
                    <span className="truncate">
                      <Link href={registration(t.from.registrationId)} className="text-ink">
                        {t.from.name}
                      </Link>{" "}
                      →{" "}
                      {t.to.registrationId ? (
                        <Link href={registration(t.to.registrationId)} className="font-semibold text-ink">
                          {t.to.name}
                        </Link>
                      ) : (
                        <span className="text-muted">{t.to.email}</span>
                      )}
                    </span>
                    <span className="truncate text-[13px] text-muted">
                      {t.from.registrationNo}
                      {t.to.registrationNo && ` → ${t.to.registrationNo}`}
                      {t.bibNumber && ` · บิบ ${t.bibNumber}`}
                      {t.feeSatang > 0 && ` · ค่าธรรมเนียม ${baht(t.feeSatang)}`} · {at.format(new Date(t.completedAt ?? t.createdAt))}
                    </span>
                  </span>
                  <Pill label={label} className={cls} />
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <Card title="เปลี่ยนระยะ">
        {data.raceChanges.length === 0 ? (
          <EmptyState>ยังไม่มีการเปลี่ยนระยะ</EmptyState>
        ) : (
          <ol className="flex flex-col" aria-label="รายการเปลี่ยนระยะ">
            {data.raceChanges.map((c) => {
              const [label, cls] = CHANGE[c.status];
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 border-t border-line py-3 first:border-t-0">
                  <span className="rounded-full bg-ice px-3 py-0.5 text-sm font-bold whitespace-nowrap text-brand">
                    {c.fromRaceCode} → {c.toRaceCode}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col leading-snug">
                    <Link href={registration(c.registrationId)} className="truncate text-ink">
                      {c.name}
                    </Link>
                    <span className="truncate text-[13px] text-muted">
                      {c.registrationNo}
                      {c.bibNumber && ` · บิบ ${c.bibNumber}`} · {c.byOrganizer ? `ผู้จัดย้ายให้${c.requestedBy ? ` (${c.requestedBy})` : ""}` : c.paidSatang > 0 ? `จ่าย ${baht(c.paidSatang)}` : "ไม่มีค่าใช้จ่าย"} ·{" "}
                      {at.format(new Date(c.completedAt ?? c.createdAt))}
                    </span>
                  </span>
                  <Pill label={label} className={cls} />
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </>
  );
}
