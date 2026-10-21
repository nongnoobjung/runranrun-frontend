"use server";

import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { problemMessage } from "@/lib/format";

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
    if (res.status === 401) redirect("/login?next=/organizer");
    return { error: problemMessage(res.problem) };
  }
  return { idDocNumber: res.data.idDocNumber };
}
