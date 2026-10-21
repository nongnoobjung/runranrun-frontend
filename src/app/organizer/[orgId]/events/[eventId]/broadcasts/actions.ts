"use server";

import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import type { Broadcast, BroadcastAudience, BroadcastPreview } from "@/lib/org";
import { orgMutation, problemState, type OrgFormState } from "@/lib/org-actions";

export interface Draft {
  subject: string;
  body: string;
  audience: BroadcastAudience;
}

const base = (eventId: string) => `/events/${eventId}/broadcasts`;

/** The live recipient count and sample while the organiser types; not a mutation, so no page refresh. */
export async function previewBroadcast(orgId: string, eventId: string, draft: Draft): Promise<BroadcastPreview | null> {
  const res = await api<BroadcastPreview>(`/v1/org/${orgId}${base(eventId)}/preview`, { method: "POST", body: draft, auth: true });
  return res.ok ? res.data : null;
}

/** Creates the draft or updates it; returns its id so later actions (test, send) work on what was saved. */
export async function saveDraft(orgId: string, eventId: string, id: string | null, draft: Draft): Promise<{ id?: string } & OrgFormState> {
  const res = id
    ? await orgMutation<Broadcast>(orgId, `${base(eventId)}/${id}`, "PATCH", draft)
    : await orgMutation<Broadcast>(orgId, base(eventId), "POST", draft);
  return res.ok ? { id: res.data.id, notice: "บันทึกร่างแล้ว" } : res.state;
}

export async function sendTest(orgId: string, eventId: string, id: string): Promise<OrgFormState> {
  const res = await api<{ to: string }>(`/v1/org/${orgId}${base(eventId)}/${id}/test`, { method: "POST", auth: true });
  if (!res.ok) return problemState(res.problem);
  return { notice: `ส่งทดสอบไปที่ ${res.data.to} แล้ว` };
}

/** Sends now, or at `scheduledAt` (ISO); then shows the history with the composer cleared. */
export async function sendBroadcast(orgId: string, eventId: string, id: string, scheduledAt: string | null): Promise<OrgFormState> {
  const res = await orgMutation<Broadcast>(orgId, `${base(eventId)}/${id}/send`, "POST", { scheduledAt });
  if (!res.ok) return res.state;
  redirect(`/organizer/${orgId}/events/${eventId}/broadcasts?sent=${res.data.status}`);
}

export async function unschedule(orgId: string, eventId: string, id: string): Promise<void> {
  await orgMutation(orgId, `${base(eventId)}/${id}/unschedule`, "POST");
}

export async function deleteDraft(orgId: string, eventId: string, id: string): Promise<void> {
  await orgMutation(orgId, `${base(eventId)}/${id}`, "DELETE");
}
