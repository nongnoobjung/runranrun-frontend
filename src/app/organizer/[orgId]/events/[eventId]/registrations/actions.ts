"use server";

import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { problemMessage } from "@/lib/format";
import { orgMutation, type OrgFormState } from "@/lib/org-actions";

export interface RevealState {
  idDocNumber?: string;
  error?: string;
}

/** Fetches the full ID number. The API logs who looked; nothing on the page changes, so no refresh. */
export async function revealIdDoc(orgId: string, registrationId: string): Promise<RevealState> {
  const res = await api<{ idDocNumber: string }>(`/v1/org/${orgId}/registrations/${registrationId}/reveal-id-doc`, {
    method: "POST",
    auth: true,
  });
  if (!res.ok) {
    if (res.status === 401) redirect("/login?next=/");
    return { error: problemMessage(res.problem) };
  }
  return { idDocNumber: res.data.idDocNumber };
}

/** Moves the runner to another race of the event, without payment; they get the new race's next bib. */
export async function moveRace(orgId: string, eventId: string, registrationId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const toRaceId = String(fd.get("toRaceId") ?? "");
  if (!toRaceId) return { fieldErrors: { toRaceId: "เลือกระยะ" } };
  const res = await orgMutation(orgId, `/events/${eventId}/registrations/${registrationId}/race-change`, "POST", { toRaceId });
  return res.ok ? { notice: "ย้ายระยะแล้ว" } : res.state;
}
