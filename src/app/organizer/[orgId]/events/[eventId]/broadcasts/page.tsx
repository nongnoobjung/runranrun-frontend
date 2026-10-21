import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, EmptyState, PageHeader, Pill, smallGhostButtonClass } from "@/components/backoffice";
import { SubmitButton } from "@/components/submit-button";
import { can, eventPath, membership, orgEvent, orgGet, type Broadcast } from "@/lib/org";
import { deleteDraft, unschedule } from "./actions";
import { Composer } from "./composer";

export const metadata: Metadata = { title: "ส่งข่าว" };

type Props = PageProps<"/organizer/[orgId]/events/[eventId]/broadcasts">;

const at = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });

const STATUS: Record<Broadcast["status"], { label: string; className: string }> = {
  draft: { label: "ร่าง", className: "bg-ice text-muted" },
  scheduled: { label: "ตั้งเวลาไว้", className: "bg-warn-soft text-warn" },
  sending: { label: "กำลังส่ง", className: "bg-ice text-brand" },
  sent: { label: "ส่งแล้ว", className: "bg-ok-soft text-ok" },
  cancelled: { label: "ยกเลิก", className: "bg-ice text-muted" },
};

export default function BroadcastsPage({ params, searchParams }: Props) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="ส่งข่าวถึงผู้สมัคร" />
          <div className="h-96 animate-pulse rounded-[28px] bg-white" aria-busy="true" />
        </>
      }
    >
      <Broadcasts params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Broadcasts({ params, searchParams }: Props) {
  const { orgId, eventId } = await params;
  const sp = await searchParams;
  const [org, event] = await Promise.all([membership(orgId), orgEvent(orgId, eventId)]);
  if (!can(org.role, "manage_event")) notFound();
  const back = eventPath(orgId, eventId, "broadcasts");
  const { items } = await orgGet<{ items: Broadcast[] }>(orgId, `/events/${eventId}/broadcasts`, back);
  const editing = typeof sp.draft === "string" ? (items.find((b) => b.id === sp.draft && b.status === "draft") ?? null) : null;
  const sent = items.filter((b) => b.status !== "draft");
  const drafts = items.filter((b) => b.status === "draft");
  const raceCode = new Map(event.races.map((r) => [r.id, r.code]));
  const audienceText = (b: Broadcast) =>
    [
      b.audience.raceId ? raceCode.get(b.audience.raceId) : "ทุกระยะ",
      b.audience.status === "pending" ? "รอชำระ" : "ชำระแล้ว",
      b.audience.pickup === "not_picked" ? "ยังไม่รับของ" : b.audience.pickup === "picked" ? "รับของแล้ว" : null,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <>
      <PageHeader title="ส่งข่าวถึงผู้สมัคร" eyebrow={`${event.nameTh} · ส่งไปแล้ว ${sent.filter((b) => b.status === "sent").length} ครั้ง`} />

      {(sp.sent === "sent" || sp.sent === "sending") && (
        <p role="status" className="rounded-3xl bg-ok-soft px-5 py-3 text-sm text-ok">
          {sp.sent === "sent" ? "ส่งแล้ว ดูจำนวนผู้รับได้ในประวัติด้านล่าง" : "กำลังทยอยส่ง รีเฟรชหน้าเพื่อดูจำนวนที่ส่งแล้ว"}
        </p>
      )}
      {sp.sent === "scheduled" && (
        <p role="status" className="rounded-3xl bg-warn-soft px-5 py-3 text-sm text-warn">
          ตั้งเวลาส่งแล้ว ยกเลิกเวลาส่งได้ในประวัติด้านล่างก่อนถึงเวลา
        </p>
      )}

      <Composer key={editing?.id ?? "new"} orgId={orgId} eventId={eventId} races={event.races.map((r) => ({ id: r.id, code: r.code }))} initial={editing} />

      {drafts.length > 0 && (
        <Card title="ร่างที่บันทึกไว้">
          <ul className="flex flex-col" aria-label="ร่าง">
            {drafts.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-2.5 first:border-t-0">
                <span className="flex min-w-0 flex-col leading-snug">
                  <b className="truncate font-semibold">{b.subject}</b>
                  <span className="text-[13px] text-muted">{audienceText(b)} · บันทึก {at.format(new Date(b.createdAt))}</span>
                </span>
                <span className="flex gap-2">
                  <Link href={`${back}?draft=${b.id}`} className={smallGhostButtonClass}>
                    แก้ไข
                  </Link>
                  <form action={deleteDraft.bind(null, orgId, eventId, b.id)}>
                    <SubmitButton className={smallGhostButtonClass} pendingLabel="…">
                      ลบ
                    </SubmitButton>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="ประวัติการส่ง">
        {sent.length === 0 ? (
          <EmptyState>ยังไม่เคยส่ง</EmptyState>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[13px] text-muted">
                  <th className="py-2 pr-3 font-medium">หัวข้อ</th>
                  <th className="py-2 pr-3 font-medium">ส่งถึง</th>
                  <th className="py-2 pr-3 text-right font-medium">ผู้รับ</th>
                  <th className="py-2 pr-3 font-medium">เมื่อ</th>
                  <th className="py-2 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {sent.map((b) => (
                  <tr key={b.id} className="border-t border-line">
                    <td className="py-2.5 pr-3 font-medium">{b.subject}</td>
                    <td className="py-2.5 pr-3 text-muted">อีเมล · {audienceText(b)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      {b.status === "sent" ? `${b.sentCount.toLocaleString("th-TH")}${b.failedCount ? ` (ไม่สำเร็จ ${b.failedCount})` : ""}` : "–"}
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-muted">{at.format(new Date(b.sentAt ?? b.scheduledAt ?? b.createdAt))}</td>
                    <td className="py-2.5">
                      <span className="flex flex-wrap items-center gap-2">
                        <Pill label={STATUS[b.status].label} className={STATUS[b.status].className} />
                        {b.status === "scheduled" && (
                          <form action={unschedule.bind(null, orgId, eventId, b.id)}>
                            <SubmitButton className="text-[13px] text-brand underline" pendingLabel="…">
                              ยกเลิกเวลาส่ง
                            </SubmitButton>
                          </form>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[13px] text-muted">ตอนนี้ระบบยังไม่ได้เชื่อมผู้ให้บริการอีเมลจริง ข้อความจะถูกบันทึกเป็นอีเมลที่ส่งแล้วในระบบ</p>
      </Card>
    </>
  );
}
