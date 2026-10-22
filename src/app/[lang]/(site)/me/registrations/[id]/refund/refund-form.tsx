"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";
import { requestRefund, type FormState } from "@/app/actions";
import { buttonClass, ErrorNote, inputClass } from "@/components/ui";
import { useT } from "@/i18n/client";

// The choice is sent to the API in Thai for the organiser to read, and requestRefund (app/actions.ts) checks for OTHER:
// keep these values Thai in every language; only the label on the page is translated.
const REASONS = [
  ["injured", "บาดเจ็บ / ป่วย"],
  ["busy", "ติดธุระ"],
  ["travel", "เดินทางไม่ได้"],
  ["duplicate", "สมัครซ้ำ"],
  ["other", "อื่น ๆ"],
] as const;
const OTHER = REASONS[4][1];

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
  const [reason, setReason] = useState<string>(REASONS[0][1]);
  const t = useT();
  const tr = t.me.refund;
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
        <legend className="sr-only">{tr.reasonTitle}</legend>
        <h2 className="text-lg font-semibold">{tr.reasonTitle}</h2>
        <div className="flex flex-wrap gap-2">
          {REASONS.map(([key, value]) => (
            <label key={key} className="cursor-pointer">
              <input type="radio" name="reasonChoice" value={value} checked={reason === value} onChange={() => setReason(value)} className="peer sr-only" />
              <span className="flex min-h-11 items-center rounded-full bg-ice px-4 text-sm peer-checked:bg-brand peer-checked:font-semibold peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-brand">
                {tr.reasons[key]}
              </span>
            </label>
          ))}
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[13px] text-muted">{reason === OTHER ? tr.tellOrganiser : tr.detailsOptional}</span>
          <input name="reasonOther" maxLength={300} aria-invalid={Boolean(err("reasonOther"))} className={`${inputClass} ${err("reasonOther") ? "border-bad" : ""}`} />
          {err("reasonOther") && <span className="text-sm text-bad">{err("reasonOther")}</span>}
        </label>
      </fieldset>

      {needsBank && (
        <fieldset className="flex flex-col gap-3 rounded-card bg-white p-5">
          <legend className="sr-only">{tr.bankTitle}</legend>
          <h2 className="text-lg font-semibold">{tr.bankTitle}</h2>
          <p className="text-sm text-muted">{tr.bankIntro}</p>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">{tr.bank}</span>
            <select name="bankCode" defaultValue="" className={`${inputClass} ${err("bank.bankCode") ? "border-bad" : ""}`}>
              <option value="">{tr.pickBank}</option>
              {banks.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
            {err("bank.bankCode") && <span className="text-sm text-bad">{err("bank.bankCode")}</span>}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">{tr.accountNumber}</span>
            <input name="accountNumber" inputMode="numeric" autoComplete="off" className={`${inputClass} ${err("bank.accountNumber") ? "border-bad" : ""}`} />
            {err("bank.accountNumber") && <span className="text-sm text-bad">{err("bank.accountNumber")}</span>}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">{tr.accountName}</span>
            <input name="accountName" autoComplete="name" className={`${inputClass} ${err("bank.accountName") ? "border-bad" : ""}`} />
            {err("bank.accountName") && <span className="text-sm text-bad">{err("bank.accountName")}</span>}
          </label>
        </fieldset>
      )}

      <ErrorNote message={state.error} />
      <button type="submit" disabled={pending} className={`${buttonClass} bg-bad hover:bg-bad/90`}>
        {pending ? tr.sending : tr.submit(amountLabel)}
      </button>
      <p className="text-center text-[13px] text-muted">{tr.footnote}</p>
    </form>
  );
}
