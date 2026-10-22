"use client";

import { useActionState } from "react";
import { backofficeLogin, type FormState } from "@/app/actions";
import { buttonClass, ErrorNote, inputClass } from "./ui";

/** Email sign-in for the organiser backoffice and admin; the action signs in for the domain it is posted to. */
export function BackofficeLoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(backofficeLogin, {});
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-muted">อีเมล</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          aria-invalid={Boolean(state.fieldErrors?.email)}
          className={inputClass}
        />
        {state.fieldErrors?.email && <span className="text-sm text-bad">{state.fieldErrors.email}</span>}
      </label>
      <ErrorNote message={state.error} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
