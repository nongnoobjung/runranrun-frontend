"use client";

import { useActionState } from "react";
import { claimWaitlist, type FormState } from "@/app/actions";
import { buttonClass, ErrorNote } from "@/components/ui";
import { useT } from "@/i18n/client";

/** Takes up the offered place and opens the checkout that holds it. */
export function ClaimButton({ entryId, label }: { entryId: string; label: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(() => claimWaitlist(entryId), {});
  const t = useT();
  return (
    <form action={action} className="flex flex-col gap-2">
      <ErrorNote message={state.error} />
      <button type="submit" disabled={pending} className={`${buttonClass} w-full`}>
        {pending ? t.me.waitlist.opening : label}
      </button>
    </form>
  );
}
