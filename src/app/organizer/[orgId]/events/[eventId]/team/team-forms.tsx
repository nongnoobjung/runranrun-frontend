"use client";

import { useActionState, useState, useTransition } from "react";
import { dangerButtonClass, Field, FormMessage, smallGhostButtonClass } from "@/components/backoffice";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, inputClass } from "@/components/ui";
import type { OrgMember, OrgRole } from "@/lib/org";
import type { OrgFormState } from "@/lib/org-actions";
import { changeMemberRole, inviteMember, removeMember } from "./actions";

/** Role choices with their Thai labels; passed in from the server because lib/org is server-only. */
export type RoleOption = { value: OrgRole; label: string };

export function InviteForm({ orgId, roles }: { orgId: string; roles: RoleOption[] }) {
  const [state, action] = useActionState<OrgFormState, FormData>(inviteMember.bind(null, orgId), {});
  // Start with an empty email again after each successful invite.
  const [round, setRound] = useState(0);
  const [lastNotice, setLastNotice] = useState<string | undefined>();
  if (state.notice && state.notice !== lastNotice) {
    setLastNotice(state.notice);
    setRound((r) => r + 1);
  }
  return (
    <form action={action} className="flex flex-col gap-3">
      <div key={round} className="flex flex-col gap-3">
        <Field label="อีเมล" error={state.fieldErrors?.email}>
          <input name="email" type="email" required autoComplete="off" className={inputClass} placeholder="name@example.com" />
        </Field>
        <Field label="บทบาท" error={state.fieldErrors?.role}>
          <select name="role" defaultValue="staff" className={inputClass}>
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton className={buttonClass} pendingLabel="กำลังเชิญ…">
        เชิญเข้าทีม
      </SubmitButton>
    </form>
  );
}

/** Role picker and remove button on one member row. Changing the role saves straight away. */
export function MemberControls({ orgId, member, roles }: { orgId: string; member: OrgMember; roles: RoleOption[] }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<OrgFormState>({});
  const [confirming, setConfirming] = useState(false);
  const who = member.name ?? member.email;

  function run(fn: () => Promise<OrgFormState>) {
    startTransition(async () => setState(await fn()));
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label={`บทบาทของ ${who}`}
          value={member.role}
          disabled={pending}
          onChange={(e) => run(() => changeMemberRole(orgId, member.id, e.target.value as OrgRole))}
          className="min-h-10 rounded-full border-[1.5px] border-line-strong bg-white px-3 text-sm text-ink focus:border-brand focus:outline-none disabled:opacity-60"
        >
          {roles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {confirming ? (
          <>
            <button type="button" disabled={pending} onClick={() => run(() => removeMember(orgId, member.id, member.you))} className={dangerButtonClass}>
              {pending ? "กำลังนำออก…" : member.status === "invited" ? "ยืนยันยกเลิกคำเชิญ" : member.you ? "ยืนยันออกจากทีม" : "ยืนยันนำออก"}
            </button>
            <button type="button" disabled={pending} onClick={() => setConfirming(false)} className={smallGhostButtonClass}>
              ไม่ใช่
            </button>
          </>
        ) : (
          <button type="button" disabled={pending} onClick={() => setConfirming(true)} className={smallGhostButtonClass}>
            {member.status === "invited" ? "ยกเลิกคำเชิญ" : member.you ? "ออกจากทีม" : "นำออก"}
          </button>
        )}
      </div>
      <FormMessage state={state} />
    </div>
  );
}
