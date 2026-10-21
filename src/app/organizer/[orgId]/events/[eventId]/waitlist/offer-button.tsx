"use client";

import { useState, useTransition } from "react";
import { FormMessage, smallButtonClass } from "@/components/backoffice";
import type { OrgFormState } from "@/lib/org-actions";
import { offerNow } from "./actions";

export function OfferNowButton({ orgId, eventId, free }: { orgId: string; eventId: string; free: number }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<OrgFormState>({});
  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button type="button" disabled={pending} onClick={() => startTransition(async () => setState(await offerNow(orgId, eventId)))} className={smallButtonClass}>
        {pending ? "…" : `เสนอที่ว่างให้คิวตอนนี้${free ? ` (${free} ที่)` : ""}`}
      </button>
      <FormMessage state={state} />
    </div>
  );
}
