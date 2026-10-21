"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, smallGhostButtonClass } from "@/components/backoffice";
import { SubmitButton } from "@/components/submit-button";
import { inputClass } from "@/components/ui";
import type { OrgFormState } from "@/lib/org-actions";
import { moveRace } from "./actions";

/** The organiser moves a runner to another race: no payment, no policy check, but the race needs a free place. */
export function MoveRaceForm({
  orgId,
  eventId,
  registrationId,
  races,
}: {
  orgId: string;
  eventId: string;
  registrationId: string;
  races: { id: string; code: string; free: number }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<OrgFormState, FormData>(moveRace.bind(null, orgId, eventId, registrationId), {});
  if (races.length === 0) return null;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${smallGhostButtonClass} self-start`}>
        ย้ายระยะ
      </button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3 rounded-[20px] bg-ice/60 p-4">
      <Field label="ย้ายไประยะ" error={state.fieldErrors?.toRaceId}>
        <select name="toRaceId" defaultValue="" className={`${inputClass} min-h-10`}>
          <option value="">เลือกระยะ</option>
          {races.map((r) => (
            <option key={r.id} value={r.id} disabled={r.free <= 0}>
              {r.code} · {r.free > 0 ? `ว่าง ${r.free.toLocaleString("th-TH")} ที่` : "เต็ม"}
            </option>
          ))}
        </select>
      </Field>
      <p className="text-[13px] text-muted">ไม่เก็บส่วนต่างและไม่คืนเงิน เลขบิบเดิมใช้ไม่ได้ ได้เลขใหม่ของระยะนั้น</p>
      <div className="flex flex-wrap gap-2">
        <SubmitButton className="inline-flex min-h-10 items-center rounded-full bg-brand px-4 text-sm font-semibold text-white" pendingLabel="กำลังย้าย…">
          ยืนยันย้ายระยะ
        </SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className={smallGhostButtonClass}>
          ไม่ใช่
        </button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
