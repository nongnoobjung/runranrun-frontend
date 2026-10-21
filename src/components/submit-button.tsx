"use client";

import { useFormStatus } from "react-dom";
import { buttonClass } from "./ui";

/** Submit button that disables itself while its form's action runs. */
export function SubmitButton({
  children,
  pendingLabel = "กำลังบันทึก…",
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
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={className} name={name} value={value}>
      {pending ? pendingLabel : children}
    </button>
  );
}
