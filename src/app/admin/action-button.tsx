"use client";

import { useActionState } from "react";
import { FormMessage, smallButtonClass } from "@/components/backoffice";
import { SubmitButton } from "@/components/submit-button";
import type { OrgFormState } from "@/lib/org-actions";

/** A one-click admin action (approve, reactivate, …) with its result underneath. */
export function ActionButton({
  action,
  label,
  pendingLabel = "…",
  className = smallButtonClass,
}: {
  action: () => Promise<OrgFormState>;
  label: string;
  pendingLabel?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState<OrgFormState, FormData>(() => action(), {});
  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <SubmitButton className={className} pendingLabel={pendingLabel}>
        {label}
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

/** An admin action that needs one line of text first (a reason, a transfer reference). */
export function TextActionForm({
  action,
  name,
  label,
  placeholder,
  submitLabel,
  className = smallButtonClass,
}: {
  action: (prev: OrgFormState, fd: FormData) => Promise<OrgFormState>;
  name: string;
  label: string;
  placeholder?: string;
  submitLabel: string;
  className?: string;
}) {
  const [state, formAction] = useActionState<OrgFormState, FormData>(action, {});
  const error = state.fieldErrors?.[name];
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-muted">{label}</span>
        <input
          name={name}
          placeholder={placeholder}
          maxLength={1000}
          aria-invalid={Boolean(error)}
          className={`min-h-10 w-full rounded-[14px] border-[1.5px] bg-white px-3 text-sm ${error ? "border-bad" : "border-line-strong"}`}
        />
        {error && <span className="text-sm text-bad">{error}</span>}
      </label>
      <div>
        <SubmitButton className={className} pendingLabel="…">
          {submitLabel}
        </SubmitButton>
      </div>
      <FormMessage state={state.fieldErrors?.[name] ? undefined : state} />
    </form>
  );
}
