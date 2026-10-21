"use client";

import { useEffect, useState } from "react";
import { pollQueue, type QueuePoll } from "@/app/actions";
import { ErrorNote, Meter } from "@/components/ui";
import { fmt, waitLabel } from "@/lib/format";

/** Seconds until the next check: often near the front, rarely at the back of a long queue. */
function nextPollSeconds(poll: QueuePoll): number {
  if (poll.retryAfterSeconds) return poll.retryAfterSeconds;
  if (poll.error) return 10;
  const wait = poll.status?.estimatedWaitSeconds ?? 0;
  return Math.min(15, Math.max(3, Math.round(wait / 4)));
}

/**
 * Joins the event's queue on arrival, then keeps checking the runner's place on its own.
 * When it is their turn the admission is already in a cookie, so it goes straight back to the race picker.
 */
export function QueuePanel({ eventId, slug, holdMinutes, expired }: { eventId: string; slug: string; holdMinutes: number; expired: boolean }) {
  // `start` is the furthest-back place seen here, for the progress bar.
  const [{ poll, start }, setView] = useState<{ poll: QueuePoll | null; start: number }>({ poll: null, start: 0 });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const check = async (join: boolean) => {
      const next = await pollQueue(eventId, join).catch((): QueuePoll => ({ error: "เชื่อมต่อไม่ได้ กำลังลองใหม่" }));
      if (stopped) return;
      const s = next.status;
      if (s?.status === "admitted" || s?.status === "not_required") {
        // A full load, so the browser scrolls to the race picker once it has streamed in.
        window.location.replace(`/events/${slug}#register`);
        return;
      }
      setView((v) => ({ poll: next, start: Math.max(v.start, s?.position ?? 0) }));
      // Someone who was not in it (e.g. an admission ran out in another tab) joins again.
      timer = setTimeout(() => void check(s?.status === "not_joined" || !s), nextPollSeconds(next) * 1000);
    };
    void check(true);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [eventId, slug]);

  const s = poll?.status;
  const opensAt = s?.opensAt && new Date(s.opensAt) > new Date() ? s.opensAt : null;
  const progress = s?.position && start ? ((start - s.position) / start) * 100 : 0;

  return (
    <section aria-labelledby="queue-title" className="flex flex-col gap-5 rounded-card bg-white p-5 sm:p-7">
      <div className="flex flex-col gap-1">
        <h1 id="queue-title" className="text-[26px] font-bold leading-tight sm:text-3xl">
          คุณอยู่ในคิวสมัคร
        </h1>
        <p className="text-muted">งานนี้มีคนสมัครพร้อมกันจำนวนมาก ระบบจะปล่อยเข้าสมัครทีละรอบตามลำดับคิว</p>
      </div>

      {expired && (
        <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">หมดเวลาสมัครของรอบที่แล้ว คุณได้เข้าคิวใหม่อีกครั้ง</p>
      )}

      <div role="status" aria-live="polite" className="flex flex-col items-center gap-1 rounded-[24px] bg-ice px-4 py-6 text-center">
        {s?.position ? (
          <>
            <span className="text-sm text-muted">คิวของคุณ</span>
            <b className="text-5xl font-bold tabular-nums text-brand" aria-label={`คิวที่ ${s.position.toLocaleString()}`}>
              {s.position.toLocaleString()}
            </b>
            <span className="text-sm text-muted">
              {s.position === 1 ? "คุณเป็นคิวถัดไป" : `มีคนอยู่ก่อนคุณ ${(s.position - 1).toLocaleString()} คน`}
            </span>
          </>
        ) : (
          <span className="py-4 text-muted">กำลังเข้าคิว…</span>
        )}
      </div>

      {s?.position && (
        <div className="flex flex-col gap-2">
          <Meter value={progress} />
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
            <span>
              เวลารอโดยประมาณ <b className="font-semibold">{waitLabel(s.estimatedWaitSeconds ?? 0)}</b>
            </span>
            <span className="text-muted">ปล่อยเข้าสมัครนาทีละ {s.admitPerMinute.toLocaleString()} คน</span>
          </div>
        </div>
      )}

      {opensAt && (
        <p className="rounded-2xl bg-tint px-4 py-3 text-sm">
          เปิดรับสมัคร {fmt.date(opensAt)} เวลา {fmt.time(opensAt)} น. ระบบจะเริ่มปล่อยคิวตอนนั้น
        </p>
      )}

      <ErrorNote message={poll?.error} />

      <ul className="flex flex-col gap-2 text-sm text-muted">
        <li>• หน้านี้อัปเดตเอง ไม่ต้องกดรีเฟรช ถึงคิวแล้วจะพาไปเลือกระยะทันที</li>
        <li>• ปิดหน้านี้แล้วกลับมาใหม่ ลำดับคิวของคุณยังอยู่</li>
        <li>• ถึงคิวแล้วมีเวลาเริ่มสมัครไม่กี่นาที เลือกระยะแล้วระบบจองที่ไว้ให้อีก {holdMinutes} นาทีระหว่างกรอกข้อมูล</li>
      </ul>
    </section>
  );
}
