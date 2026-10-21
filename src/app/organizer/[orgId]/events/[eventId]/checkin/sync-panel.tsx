"use client";

import { SYNC_CONFLICT_TH } from "@/lib/checkin-offline";
import { fmt } from "@/lib/format";
import type { OfflineCheckin } from "./use-offline-checkin";

/** Online or not, what is waiting to be sent, and when this device last reached the API. */
export function SyncPanel({ offline }: { offline: OfflineCheckin }) {
  const { online, pending, syncing, lastSyncAt, roster, problem } = offline;
  return (
    <section aria-label="สถานะการเชื่อมต่อ" className="flex flex-col gap-3 rounded-[28px] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <span role="status" className={`flex items-center gap-2 font-semibold ${online ? "text-ok" : "text-warn"}`}>
          <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${online ? "bg-ok" : "bg-warn"}`} />
          {online ? "ออนไลน์" : "ออฟไลน์"}
        </span>
        <button
          type="button"
          onClick={() => void offline.sync()}
          disabled={!pending || syncing}
          className="min-h-11 rounded-full bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark disabled:bg-line-strong disabled:text-muted"
        >
          {syncing ? "กำลังส่ง…" : "ส่งตอนนี้"}
        </button>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div className="flex min-w-0 flex-col">
          <dt className="text-muted">รอส่ง</dt>
          <dd className="text-lg font-semibold" aria-label={`รอส่ง ${pending} รายการ`}>
            {pending}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col">
          <dt className="text-muted">ซิงก์ล่าสุด</dt>
          <dd className="text-lg font-semibold">{lastSyncAt ? fmt.time(lastSyncAt) : "–"}</dd>
        </div>
        <div className="flex min-w-0 flex-col">
          <dt className="text-muted">รายชื่อในเครื่อง</dt>
          <dd className="text-lg font-semibold">{roster ? `${roster.items.length.toLocaleString("th-TH")} คน` : "–"}</dd>
        </div>
      </dl>
      {!online && (
        <p className="rounded-2xl bg-warn-soft px-3 py-2 text-sm text-warn">
          ไม่มีอินเทอร์เน็ต ตรวจจากรายชื่อในเครื่อง การมอบของเก็บไว้ในเครื่องและส่งให้เองเมื่อกลับมาออนไลน์
        </p>
      )}
      {problem && (
        <p role="alert" className="rounded-2xl bg-bad-soft px-3 py-2 text-sm text-bad">
          {problem}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[13px] text-muted">
        <span>{roster ? `รายชื่อ ณ ${fmt.date(roster.generatedAt)} ${fmt.time(roster.generatedAt)}` : "ยังไม่มีรายชื่อในเครื่อง"}</span>
        <button type="button" onClick={() => void offline.refreshRoster()} disabled={!online} className="min-h-10 underline disabled:no-underline disabled:opacity-60">
          อัปเดตรายชื่อ
        </button>
      </div>
    </section>
  );
}

/** Pickups the API refused after the kit was already handed over offline: someone needs to follow each one up. */
export function SyncConflicts({ offline }: { offline: OfflineCheckin }) {
  if (!offline.conflicts.length) return null;
  return (
    <section aria-label="ส่งไม่สำเร็จ" className="flex flex-col gap-2 rounded-[28px] bg-bad-soft p-4 text-bad">
      <h2 className="font-semibold">ส่งไม่สำเร็จ {offline.conflicts.length} รายการ</h2>
      <p className="text-sm">มอบของไปแล้วตอนออฟไลน์ แต่ระบบไม่รับ ส่งต่อหัวหน้าจุดเพื่อตามเรื่อง</p>
      <ul className="flex flex-col divide-y divide-bad/15 text-sm">
        {offline.conflicts.map((q) => (
          <li key={q.clientUuid} className="flex items-center justify-between gap-3 py-2">
            <span className="flex min-w-0 flex-col">
              <b className="break-words text-ink">{q.label}</b>
              <span>
                {SYNC_CONFLICT_TH[q.conflict!.code] ?? q.conflict!.code}
                {q.conflict!.code === "ALREADY_PICKED_UP" && q.conflict!.pickedUpAt && ` เมื่อ ${fmt.time(q.conflict!.pickedUpAt)}`}
                {` · มอบที่เครื่องนี้ ${fmt.time(q.scannedAt)}`}
              </span>
            </span>
            <button type="button" onClick={() => void offline.dismiss(q.clientUuid)} className="min-h-10 flex-none rounded-full bg-white px-3 font-semibold">
              รับทราบ
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
