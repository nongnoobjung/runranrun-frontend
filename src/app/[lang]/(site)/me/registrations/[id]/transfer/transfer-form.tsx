"use client";

import { useActionState, useTransition, type FormEvent } from "react";
import { createTransfer, type FormState } from "@/app/actions";
import { buttonClass, ErrorNote, inputClass } from "@/components/ui";
import { useT } from "@/i18n/client";

export function TransferForm({ registrationId, until }: { registrationId: string; until: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createTransfer.bind(null, registrationId), {});
  const [, startTransition] = useTransition();
  const tt = useT().me.transfer;
  const error = state.fieldErrors?.toEmail;
  // Submit through a transition so the email stays in the box after an error.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 rounded-card bg-white p-5">
      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-muted">{tt.email}</span>
        <input
          name="toEmail"
          type="email"
          autoComplete="off"
          placeholder="friend@example.com"
          aria-invalid={Boolean(error)}
          className={`${inputClass} ${error ? "border-bad" : ""}`}
        />
        {error && <span className="text-sm text-bad">{error}</span>}
      </label>
      <ErrorNote message={state.error} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? tt.sending : tt.submit}
      </button>
      <span className="text-center text-[13px] text-muted">{tt.until(until)}</span>
    </form>
  );
}
