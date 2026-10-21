"use server";

import { redirect } from "next/navigation";
import { text } from "@/lib/form";
import type { OrgRole } from "@/lib/org";
import { orgMutation, type OrgFormState } from "@/lib/org-actions";

export async function inviteMember(orgId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const email = text(fd, "email") ?? "";
  const res = await orgMutation(orgId, "/members", "POST", { email, role: text(fd, "role") });
  if (!res.ok) return res.state;
  return { notice: `เชิญ ${email} แล้ว จะเข้าทีมได้เมื่อเข้าสู่ระบบด้วยอีเมลนี้` };
}

export async function changeMemberRole(orgId: string, memberId: string, role: OrgRole): Promise<OrgFormState> {
  const res = await orgMutation(orgId, `/members/${memberId}`, "PATCH", { role });
  return res.ok ? {} : res.state;
}

/** Removes a member or withdraws an invitation. Someone who removes themselves leaves the organisation's pages. */
export async function removeMember(orgId: string, memberId: string, you: boolean): Promise<OrgFormState> {
  const res = await orgMutation(orgId, `/members/${memberId}`, "DELETE");
  if (!res.ok) return res.state;
  if (you) redirect("/organizer");
  return {};
}
