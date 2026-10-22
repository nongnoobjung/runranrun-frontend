"use client";

import { useActionState } from "react";
import { Field, FormMessage, smallButtonClass } from "@/components/backoffice";
import { SubmitButton } from "@/components/submit-button";
import { inputClass } from "@/components/ui";
import type { OrgFormState } from "@/lib/org-actions";

/** A new platform fee rate: percent of sales plus a fixed amount per runner, from now or from a later day. */
export function FeeForm({
  action,
  current,
  submitLabel = "ตั้งอัตราใหม่",
}: {
  action: (prev: OrgFormState, fd: FormData) => Promise<OrgFormState>;
  current: { percentBps: number; fixedPerRegistrationSatang: number } | null;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState<OrgFormState, FormData>(action, {});
  const err = (k: string) => state.fieldErrors?.[k];
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="% ของยอดขาย" error={err("percent")}>
          <input
            name="percent"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.01}
            defaultValue={current ? current.percentBps / 100 : 0}
            className={`${inputClass} min-h-10`}
          />
        </Field>
        <Field label="ค่าคงที่ต่อผู้วิ่ง (บาท)" error={err("fixedBaht")}>
          <input
            name="fixedBaht"
            type="number"
            inputMode="decimal"
            min={0}
            max={10000}
            step={0.01}
            defaultValue={current ? current.fixedPerRegistrationSatang / 100 : 0}
            className={`${inputClass} min-h-10`}
          />
        </Field>
        <Field label="มีผลตั้งแต่" hint="เว้นว่าง = ทันที" error={err("effectiveFrom")}>
          <input name="effectiveFrom" type="date" className={`${inputClass} min-h-10`} />
        </Field>
      </div>
      <p className="text-[13px] text-muted">คำสั่งซื้อที่สร้างไปแล้วยังใช้ค่าธรรมเนียมเดิม อัตราใหม่ใช้กับคำสั่งซื้อที่สร้างหลังวันเริ่มมีผล</p>
      <div>
        <SubmitButton className={smallButtonClass}>{submitLabel}</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
