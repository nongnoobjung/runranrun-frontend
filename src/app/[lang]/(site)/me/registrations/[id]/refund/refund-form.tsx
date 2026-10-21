"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";
import { requestRefund, type FormState } from "@/app/actions";
import { buttonClass, ErrorNote, inputClass } from "@/components/ui";

const REASONS = ["บาดเจ็บ / ป่วย", "ติดธุระ", "เดินทางไม่ได้", "สมัครซ้ำ", "อื่น ๆ"];

export function RefundForm({
  registrationId,
  amountLabel,
  needsBank,
  banks,
}: {
  registrationId: string;
  amountLabel: string;
  needsBank: boolean;
  banks: [string, string][];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(requestRefund.bind(null, registrationId), {});
  const [, startTransition] = useTransition();
  const [reason, setReason] = useState(REASONS[0]);
  const err = (name: string) => state.fieldErrors?.[name];
  // Submit through a transition so what the runner typed stays after a validation error.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="needsBank" value={needsBank ? "1" : "0"} />
      <fieldset className="flex flex-col gap-3 rounded-card bg-white p-5">
        <legend className="sr-only">เหตุผล</legend>
        <h2 className="text-lg font-semibold">เหตุผล</h2>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <label key={r} className="cursor-pointer">
              <input type="radio" name="reasonChoice" value={r} checked={reason === r} onChange={() => setReason(r)} className="peer sr-only" />
              <span className="flex min-h-11 items-center rounded-full bg-ice px-4 text-sm peer-checked:bg-brand peer-checked:font-semibold peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-brand">
                {r}
              </span>
            </label>
          ))}
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[13px] text-muted">{reason === "อื่น ๆ" ? "เล่าให้ผู้จัดฟัง" : "รายละเอียดเพิ่มเติม (ไม่บังคับ)"}</span>
          <input name="reasonOther" maxLength={300} aria-invalid={Boolean(err("reasonOther"))} className={`${inputClass} ${err("reasonOther") ? "border-bad" : ""}`} />
          {err("reasonOther") && <span className="text-sm text-bad">{err("reasonOther")}</span>}
        </label>
      </fieldset>

      {needsBank && (
        <fieldset className="flex flex-col gap-3 rounded-card bg-white p-5">
          <legend className="sr-only">บัญชีรับเงินคืน</legend>
          <h2 className="text-lg font-semibold">บัญชีรับเงินคืน</h2>
          <p className="text-sm text-muted">คุณจ่ายด้วย PromptPay ซึ่งคืนกลับอัตโนมัติไม่ได้ ผู้จัดจะโอนเข้าบัญชีนี้หลังอนุมัติ</p>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">ธนาคาร</span>
            <select name="bankCode" defaultValue="" className={`${inputClass} ${err("bank.bankCode") ? "border-bad" : ""}`}>
              <option value="">เลือกธนาคาร</option>
              {banks.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
            {err("bank.bankCode") && <span className="text-sm text-bad">{err("bank.bankCode")}</span>}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">เลขบัญชี</span>
            <input name="accountNumber" inputMode="numeric" autoComplete="off" className={`${inputClass} ${err("bank.accountNumber") ? "border-bad" : ""}`} />
            {err("bank.accountNumber") && <span className="text-sm text-bad">{err("bank.accountNumber")}</span>}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">ชื่อบัญชี</span>
            <input name="accountName" autoComplete="name" className={`${inputClass} ${err("bank.accountName") ? "border-bad" : ""}`} />
            {err("bank.accountName") && <span className="text-sm text-bad">{err("bank.accountName")}</span>}
          </label>
        </fieldset>
      )}

      <ErrorNote message={state.error} />
      <button type="submit" disabled={pending} className={`${buttonClass} bg-bad hover:bg-bad/90`}>
        {pending ? "กำลังส่งคำขอ…" : `ส่งคำขอคืน ${amountLabel}`}
      </button>
      <p className="text-center text-[13px] text-muted">ผู้จัดอนุมัติแล้วบัตรวิ่งและ QR จะใช้ไม่ได้ ระหว่างรอรับของหน้างานไม่ได้</p>
    </form>
  );
}
