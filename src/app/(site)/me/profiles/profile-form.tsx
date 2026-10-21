"use client";

import { useActionState, useTransition, type FormEvent } from "react";
import { saveProfile, type FormState } from "@/app/actions";
import { Field, RunnerFields } from "@/components/runner-fields";
import { buttonClass, ErrorNote } from "@/components/ui";
import type { RunnerProfile } from "@/lib/types";

/** Adds a saved runner, or edits one; leaving the ID number empty when editing keeps the saved number. */
export function ProfileForm({ profile }: { profile?: RunnerProfile }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveProfile.bind(null, profile?.id ?? null), {});
  const [, startTransition] = useTransition();
  const err = (name: string) => state.fieldErrors?.[name];
  // Submit through a transition so what was typed stays after a validation error.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-card bg-white p-5" aria-label="ข้อมูลผู้วิ่ง">
        <RunnerFields prefix="p0" err={err} saved={profile} />
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name="isSelf" defaultChecked={profile?.isSelf} className="h-5 w-5 flex-none accent-brand" />
          นี่คือข้อมูลของฉันเอง (เลือกให้อัตโนมัติตอนสมัคร)
        </label>
      </section>
      <section className="flex flex-col gap-3 rounded-card bg-white p-5" aria-label="ข้อมูลเพิ่มเติม">
        <h2 className="text-lg font-semibold">ข้อมูลเพิ่มเติม (ไม่บังคับ)</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ชื่อเล่น" name="nickname" defaultValue={profile?.nickname ?? undefined} maxLength={40} placeholder="เช่น พ่อ, น้องมะลิ" />
          <Field label="ความสัมพันธ์ของผู้ติดต่อฉุกเฉิน" name="emergencyRelation" defaultValue={profile?.emergencyRelation ?? undefined} maxLength={40} />
          <Field label="ไซซ์เสื้อที่ใส่ประจำ" name="shirtSize" defaultValue={profile?.shirtSize ?? undefined} maxLength={10} placeholder="เช่น M" />
          <Field label="ชมรม / ทีมวิ่ง" name="clubName" defaultValue={profile?.clubName ?? undefined} maxLength={100} />
        </div>
      </section>
      <ErrorNote message={state.error} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "กำลังบันทึก…" : "บันทึกผู้วิ่ง"}
      </button>
      <p className="text-center text-[13px] text-muted">เลขบัตรเก็บแบบเข้ารหัส และแสดงแค่ 4 ตัวท้าย ลบผู้วิ่งเมื่อไรเลขบัตรก็ถูกลบไปด้วย</p>
    </form>
  );
}
