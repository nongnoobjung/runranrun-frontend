"use client";

import { useActionState } from "react";
import { FormMessage, smallButtonClass } from "@/components/backoffice";
import { SubmitButton } from "@/components/submit-button";
import { inputClass } from "@/components/ui";
import type { OrgFormState } from "@/lib/org-actions";

/** Superadmins only: the account's platform role. */
export function RoleForm({
  action,
  role,
  roles,
}: {
  action: (prev: OrgFormState, fd: FormData) => Promise<OrgFormState>;
  role: string;
  roles: [string, string][];
}) {
  const [state, formAction] = useActionState<OrgFormState, FormData>(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-muted">สิทธิ์ในแพลตฟอร์ม</span>
        <select name="role" defaultValue={role} className={`${inputClass} min-h-10`}>
          {roles.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div>
        <SubmitButton className={smallButtonClass} pendingLabel="…">
          เปลี่ยนสิทธิ์
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
