"use client";

import { useActionState, useTransition, type FormEvent } from "react";
import { acceptTransfer, type FormState } from "@/app/actions";
import { Questions, RunnerFields } from "@/components/runner-fields";
import { buttonClass, ErrorNote } from "@/components/ui";
import type { FormQuestion } from "@/lib/types";

/** The recipient's own runner details and answers; the place, bib and shirt size come with the transfer. */
export function AcceptForm({ transferId, questions, note, submitLabel }: { transferId: string; questions: FormQuestion[]; note: string; submitLabel: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(acceptTransfer.bind(null, transferId), {});
  const [, startTransition] = useTransition();
  const err = (name: string) => state.fieldErrors?.[name];
  // Submit through a transition so what the runner typed stays after a validation error.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-card bg-white p-5" aria-label="ข้อมูลผู้วิ่ง">
        <div>
          <h2 className="text-lg font-semibold">ข้อมูลผู้วิ่ง</h2>
          <p className="text-sm text-muted">{note}</p>
        </div>
        <RunnerFields prefix="p0" err={err} />
      </section>
      <Questions index={0} questions={questions} err={err} />
      <ErrorNote message={state.error} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "กำลังรับสิทธิ์…" : submitLabel}
      </button>
    </form>
  );
}
