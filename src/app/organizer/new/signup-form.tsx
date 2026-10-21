"use client";

import { useActionState, useTransition, type FormEvent } from "react";
import { Field, FormMessage } from "@/components/backoffice";
import { buttonClass, inputClass } from "@/components/ui";
import { createOrganization } from "./actions";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(createOrganization, {});
  const [, startTransition] = useTransition();
  const err = (name: string) => state.fieldErrors?.[name];
  // Submitting through a transition keeps what was typed if the API rejects it.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field label="ชื่อทีมผู้จัด (ภาษาไทย)" hint="ชื่อที่นักวิ่งเห็นในหน้างาน" error={err("nameTh")}>
        <input name="nameTh" required maxLength={120} className={inputClass} placeholder="เช่น ชมรมวิ่งริมโขง" />
      </Field>
      <Field label="ชื่อทีม (English)" hint="ไม่บังคับ" error={err("nameEn")}>
        <input name="nameEn" maxLength={120} className={inputClass} placeholder="Mekong Runners" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="อีเมลติดต่อ" error={err("contactEmail")}>
          <input name="contactEmail" type="email" required autoComplete="email" className={inputClass} placeholder="team@example.com" />
        </Field>
        <Field label="เบอร์โทรติดต่อ" hint="ไม่บังคับ" error={err("contactPhone")}>
          <input name="contactPhone" type="tel" inputMode="tel" autoComplete="tel" className={inputClass} placeholder="08x-xxx-xxxx" />
        </Field>
      </div>
      <FormMessage state={state} />
      <div>
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "กำลังเปิดทีม…" : "เปิดทีมแล้วไปส่งเอกสาร"}
        </button>
      </div>
    </form>
  );
}
