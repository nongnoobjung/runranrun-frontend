"use client";

import { useActionState } from "react";
import { Field, FormMessage, smallButtonClass } from "@/components/backoffice";
import { SubmitButton } from "@/components/submit-button";
import { inputClass } from "@/components/ui";
import type { OrgFormState } from "@/lib/org-actions";

/** Records the payout account after checking it against the organiser's bank book. */
export function BankForm({ action, banks }: { action: (prev: OrgFormState, fd: FormData) => Promise<OrgFormState>; banks: [string, string][] }) {
  const [state, formAction] = useActionState<OrgFormState, FormData>(action, {});
  const err = (k: string) => state.fieldErrors?.[k];
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="ธนาคาร" error={err("bankCode")}>
          <select name="bankCode" defaultValue="" className={`${inputClass} min-h-10`}>
            <option value="">เลือกธนาคาร</option>
            {banks.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="เลขบัญชี" error={err("accountNumber")}>
          <input name="accountNumber" inputMode="numeric" autoComplete="off" className={`${inputClass} min-h-10`} />
        </Field>
        <Field label="ชื่อบัญชี" error={err("accountName")}>
          <input name="accountName" className={`${inputClass} min-h-10`} />
        </Field>
        <Field label="สาขา (ถ้ามี)" error={err("branch")}>
          <input name="branch" className={`${inputClass} min-h-10`} />
        </Field>
      </div>
      <div>
        <SubmitButton className={smallButtonClass}>บันทึกบัญชีที่ตรวจแล้ว</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
