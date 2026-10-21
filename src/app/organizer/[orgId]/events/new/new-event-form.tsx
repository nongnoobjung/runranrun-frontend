"use client";

import { useActionState, useTransition, type FormEvent } from "react";
import { Field, FormMessage } from "@/components/backoffice";
import { buttonClass, inputClass } from "@/components/ui";
import type { OrgFormState } from "@/lib/org-actions";
import { EVENT_TYPES } from "../event-types";

export function NewEventForm({
  action,
  provinces,
}: {
  action: (prev: OrgFormState, fd: FormData) => Promise<OrgFormState>;
  provinces: [string, string][];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [, startTransition] = useTransition();
  const err = (name: string) => state.fieldErrors?.[name];
  // Submitting through a transition keeps what the organiser typed if the API rejects it.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field label="ชื่องาน (ภาษาไทย)" error={err("nameTh")}>
        <input name="nameTh" required maxLength={200} className={inputClass} placeholder="เช่น เดิน-วิ่งริมโขง 2027" />
      </Field>
      <Field label="ชื่องาน (English)" hint="ใช้สร้างลิงก์ของงาน เช่น /events/mekong-run-2027" error={err("nameEn")}>
        <input name="nameEn" maxLength={200} className={inputClass} placeholder="Mekong Run 2027" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="ประเภทงาน" error={err("eventType")}>
          <select name="eventType" defaultValue="road" className={inputClass}>
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="วันแข่ง" error={err("eventDate")}>
          <input name="eventDate" type="date" required className={inputClass} />
        </Field>
        <Field label="จังหวัด" error={err("provinceCode")}>
          <select name="provinceCode" defaultValue="" className={inputClass}>
            <option value="">เลือกภายหลัง</option>
            {provinces.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <FormMessage state={state} />
      <div>
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "กำลังสร้าง…" : "สร้างงาน (ฉบับร่าง)"}
        </button>
      </div>
    </form>
  );
}
