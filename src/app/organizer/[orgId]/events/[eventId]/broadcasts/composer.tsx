"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Field, FormMessage, smallButtonClass, smallGhostButtonClass } from "@/components/backoffice";
import { buttonClass, inputClass } from "@/components/ui";
import { bangkokToIso } from "@/lib/form";
import type { Broadcast, BroadcastAudience, BroadcastPreview } from "@/lib/org";
import type { OrgFormState } from "@/lib/org-actions";
import { previewBroadcast, saveDraft, sendBroadcast, sendTest, type Draft } from "./actions";

const PLACEHOLDERS = ["{ชื่อ}", "{บิบ}", "{ระยะ}", "{เวลาปล่อยตัว}"];
const MAX_BODY = 2000;

/**
 * Write, aim and send a broadcast. Every action saves the draft first, so a test or a send always matches what is on
 * screen. The recipient count and the sample refresh as the organiser changes the audience or the text.
 */
export function Composer({
  orgId,
  eventId,
  races,
  initial,
}: {
  orgId: string;
  eventId: string;
  races: { id: string; code: string }[];
  initial: Broadcast | null;
}) {
  const [id, setId] = useState<string | null>(initial?.id ?? null);
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [audience, setAudience] = useState<BroadcastAudience>(initial?.audience ?? { raceId: null, status: "confirmed", pickup: null });
  const [preview, setPreview] = useState<BroadcastPreview | null>(null);
  const [state, setState] = useState<OrgFormState>({});
  const [scheduling, setScheduling] = useState(false);
  const [when, setWhen] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const draft: Draft = { subject, body, audience };

  useEffect(() => {
    const t = setTimeout(async () => setPreview(await previewBroadcast(orgId, eventId, { subject, body, audience })), 300);
    return () => clearTimeout(t);
  }, [orgId, eventId, subject, body, audience]);

  function insert(token: string) {
    const el = bodyRef.current;
    const at = el?.selectionStart ?? body.length;
    const next = body.slice(0, at) + token + body.slice(el?.selectionEnd ?? at);
    setBody(next.slice(0, MAX_BODY));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + token.length, at + token.length);
    });
  }

  /** Saves, then runs `then` with the saved id. */
  function withSaved(then?: (savedId: string) => Promise<OrgFormState>) {
    startTransition(async () => {
      const saved = await saveDraft(orgId, eventId, id, draft);
      if (!saved.id) return setState(saved);
      setId(saved.id);
      setState(then ? await then(saved.id) : saved);
    });
  }

  const ready = subject.trim() !== "" && body.trim() !== "";
  const count = preview?.count ?? 0;

  return (
    <div className="flex flex-wrap items-start gap-4">
      <section aria-label="เขียนข้อความ" className="flex min-w-0 flex-[999_1_480px] flex-col gap-4 rounded-[28px] bg-white p-5 sm:p-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">ช่องทาง</legend>
          <div className="flex flex-wrap gap-2">
            <span className="flex min-h-11 items-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white">อีเมล · ทุกคนที่มีอีเมล</span>
            <span className="flex min-h-11 items-center rounded-full bg-tint px-4 text-sm text-muted">LINE OA · เร็ว ๆ นี้</span>
            <span className="flex min-h-11 items-center rounded-full bg-tint px-4 text-sm text-muted">SMS · เร็ว ๆ นี้</span>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3 rounded-[20px] bg-tint p-4">
          <legend className="sr-only">ส่งถึงใคร</legend>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium">ส่งถึง</span>
            <span aria-live="polite">
              <b className="text-2xl font-bold tabular-nums">{preview ? count.toLocaleString("th-TH") : "…"}</b> <span className="text-sm">คน</span>
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="ระยะ">
              <select
                value={audience.raceId ?? ""}
                onChange={(e) => setAudience({ ...audience, raceId: e.target.value || null })}
                className={`${inputClass} min-h-10 bg-white`}
              >
                <option value="">ทุกระยะ</option>
                {races.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="การชำระเงิน">
              <select
                value={audience.status}
                onChange={(e) => setAudience({ ...audience, status: e.target.value as BroadcastAudience["status"] })}
                className={`${inputClass} min-h-10 bg-white`}
              >
                <option value="confirmed">ชำระแล้ว</option>
                <option value="pending">รอชำระ</option>
              </select>
            </Field>
            <Field label="รับของ">
              <select
                value={audience.pickup ?? ""}
                onChange={(e) => setAudience({ ...audience, pickup: (e.target.value || null) as BroadcastAudience["pickup"] })}
                className={`${inputClass} min-h-10 bg-white`}
              >
                <option value="">ทั้งหมด</option>
                <option value="not_picked">ยังไม่รับ</option>
                <option value="picked">รับแล้ว</option>
              </select>
            </Field>
          </div>
          {preview && preview.withoutEmail > 0 && <span className="text-[13px] text-warn">อีก {preview.withoutEmail} คนในกลุ่มนี้ไม่มีอีเมล จะไม่ได้รับข้อความ</span>}
        </fieldset>

        <Field label="หัวข้อ">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} className={inputClass} placeholder="เช่น พรุ่งนี้วันสุดท้าย รับเสื้อและบิบ" />
        </Field>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="broadcast-body" className="text-sm font-medium">
            ข้อความ
          </label>
          <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
            <span className="text-muted">แทรก:</span>
            {PLACEHOLDERS.map((p) => (
              <button key={p} type="button" onClick={() => insert(p)} className="min-h-9 rounded-full bg-ice px-3 font-medium text-brand">
                {p}
              </button>
            ))}
          </div>
          <textarea
            id="broadcast-body"
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={MAX_BODY}
            rows={7}
            className={`${inputClass} min-h-40 py-3`}
            placeholder="สวัสดี {ชื่อ} …"
          />
          <span className="self-end text-xs text-muted tabular-nums">
            {body.length.toLocaleString("th-TH")} / {MAX_BODY.toLocaleString("th-TH")} ตัวอักษร
          </span>
        </div>

        <FormMessage state={state} />

        {confirming ? (
          <div className="flex flex-col gap-2 rounded-[20px] bg-warn-soft p-4 text-sm text-warn">
            <span>
              ส่งอีเมลถึง <b>{count.toLocaleString("th-TH")} คน</b> ตอนนี้ ส่งแล้วยกเลิกไม่ได้
            </span>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={pending} onClick={() => withSaved((sid) => sendBroadcast(orgId, eventId, sid, null))} className={smallButtonClass}>
                {pending ? "กำลังส่ง…" : "ยืนยันส่งเลย"}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className={smallGhostButtonClass}>
                ยังไม่ส่ง
              </button>
            </div>
          </div>
        ) : scheduling ? (
          <div className="flex flex-wrap items-end gap-2">
            <Field label="ส่งเมื่อ (เวลาไทย)" className="min-w-0 flex-[1_1_220px]">
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={`${inputClass} min-h-10`} />
            </Field>
            <button
              type="button"
              disabled={pending || !when || !ready}
              onClick={() => withSaved((sid) => sendBroadcast(orgId, eventId, sid, bangkokToIso(when)))}
              className={smallButtonClass}
            >
              ตั้งเวลา
            </button>
            <button type="button" onClick={() => setScheduling(false)} className={smallGhostButtonClass}>
              ยกเลิก
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending || !ready || count === 0} onClick={() => setConfirming(true)} className={buttonClass}>
              ส่งเลย
            </button>
            <button type="button" disabled={pending || !ready || count === 0} onClick={() => setScheduling(true)} className={smallGhostButtonClass}>
              ตั้งเวลาส่ง
            </button>
            <button type="button" disabled={pending || !ready} onClick={() => withSaved((sid) => sendTest(orgId, eventId, sid))} className={smallGhostButtonClass}>
              ส่งทดสอบหาตัวเอง
            </button>
            <button type="button" disabled={pending || !ready} onClick={() => withSaved()} className={smallGhostButtonClass}>
              บันทึกร่าง
            </button>
          </div>
        )}
      </section>

      <aside aria-label="ตัวอย่างอีเมล" className="flex min-w-0 flex-[1_1_300px] flex-col gap-2">
        <span className="text-sm text-muted">ตัวอย่างที่ผู้รับคนแรกจะเห็น</span>
        <div className="flex flex-col gap-2 rounded-[28px] bg-white p-5">
          {preview?.sample ? (
            <>
              <span className="text-xs text-muted">ถึง {preview.sample.to}</span>
              <b className="leading-snug font-semibold">{preview.sample.subject || "(ยังไม่มีหัวข้อ)"}</b>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{preview.sample.body || "(ยังไม่มีข้อความ)"}</p>
            </>
          ) : (
            <span className="text-sm text-muted">{preview ? "ไม่มีผู้รับในกลุ่มนี้" : "กำลังโหลด…"}</span>
          )}
        </div>
      </aside>
    </div>
  );
}
