"use client";

import { useActionState } from "react";
import { login, type FormState } from "@/app/actions";
import { buttonClass, ErrorNote, inputClass } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(login, {});
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
