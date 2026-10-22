"use client";

import { useFormStatus } from "react-dom";
import { useT } from "@/i18n/client";
import { buttonClass } from "./ui";

/** Submit button that disables itself while its form's action runs; it reads "Saving…" by default meanwhile. */
export function SubmitButton({
  children,
  pendingLabel,
  className = buttonClass,
  name,
  value,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const t = useT();
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={className} name={name} value={value}>
      {pending ? (pendingLabel ?? t.common.saving) : children}
    </button>
  );
}
