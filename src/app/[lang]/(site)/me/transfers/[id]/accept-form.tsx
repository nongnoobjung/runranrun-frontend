"use client";

import { useActionState, useTransition, type FormEvent } from "react";
import { acceptTransfer, type FormState } from "@/app/actions";
import { Questions } from "@/components/runner-fields";
import { ConsentFields } from "@/components/consent-fields";
import { SavedRunnerFields } from "@/components/saved-runner";
import { buttonClass, ErrorNote } from "@/components/ui";
import { useT } from "@/i18n/client";
import type { FormQuestion, RunnerProfile } from "@/lib/types";

/** The recipient's own runner details and answers; the place, bib and shirt size come with the transfer. */
export function AcceptForm({
  transferId,
  questions,
  note,
  submitLabel,
  profiles,
  organizer,
}: {
  transferId: string;
  questions: FormQuestion[];
  note: string;
  submitLabel: string;
  profiles: RunnerProfile[];
  organizer: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(acceptTransfer.bind(null, transferId), {});
  const [, startTransition] = useTransition();
  const ta = useT().me.acceptTransfer;
  const err = (name: string) => state.fieldErrors?.[name];
  // Submit through a transition so what the runner typed stays after a validation error.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-card bg-white p-5" aria-label={ta.runnerTitle}>
        <div>
          <h2 className="text-lg font-semibold">{ta.runnerTitle}</h2>
          <p className="text-sm text-muted">{note}</p>
        </div>
        <SavedRunnerFields prefix="p0" err={err} profiles={profiles} initial={profiles.find((p) => p.isSelf)?.id} />
      </section>
      <Questions index={0} questions={questions} err={err} />
      <ConsentFields organizer={organizer} error={err("consent")} />
      <ErrorNote message={state.error} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? ta.accepting : submitLabel}
      </button>
    </form>
  );
}
