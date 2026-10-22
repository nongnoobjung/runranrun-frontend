"use client";

import { useActionState, useState } from "react";
import { closeAccount, type FormState } from "@/app/actions";
import { ErrorNote } from "@/components/ui";
import { useT } from "@/i18n/client";

/** Closing the account asks for a tick first, since it cannot be undone. */
export function CloseAccountForm() {
  const t = useT().privacy.me;
  const [state, action, pending] = useActionState<FormState, FormData>(closeAccount, {});
  const [sure, setSure] = useState(false);
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="confirm" value="1" checked={sure} onChange={(e) => setSure(e.target.checked)} className="mt-0.5 h-5 w-5 flex-none accent-brand" />
        {t.closeConfirm}
      </label>
      <ErrorNote message={state.error} />
      <button
        type="submit"
        disabled={!sure || pending}
        className="inline-flex min-h-11 items-center justify-center self-start rounded-full bg-bad-soft px-5 text-sm font-semibold text-bad hover:bg-bad hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? t.closing : t.close}
      </button>
    </form>
  );
}
