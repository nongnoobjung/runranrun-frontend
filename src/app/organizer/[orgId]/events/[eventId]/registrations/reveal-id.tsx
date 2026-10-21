"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { revealIdDoc, type RevealState } from "./actions";

/** Masked ID number with a "แสดง" button for roles allowed to see it. Each reveal is logged by the API. */
export function RevealId({ orgId, registrationId, masked }: { orgId: string; registrationId: string; masked: string }) {
  const [state, action] = useActionState<RevealState>(revealIdDoc.bind(null, orgId, registrationId), {});
  if (state.idDocNumber) {
    return <span className="font-mono font-semibold tracking-wide">{state.idDocNumber}</span>;
  }
  return (
    <form action={action} className="flex flex-col items-start gap-0.5">
      <span className="font-mono tracking-wide">{masked}</span>
      <SubmitButton className="text-sm font-semibold text-brand underline disabled:opacity-60" pendingLabel="กำลังโหลด…">
        แสดง
      </SubmitButton>
      {state.error && (
        <span role="alert" className="text-[13px] text-bad">
          {state.error}
        </span>
      )}
    </form>
  );
}
