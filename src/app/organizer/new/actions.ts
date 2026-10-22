"use server";

import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { text } from "@/lib/form";
import { problemState, type OrgFormState } from "@/lib/org-actions";

/** Opens the team (waiting for KYC, the caller as owner) and goes on to its KYC page. */
export async function createOrganization(_prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const res = await api<{ id: string }>("/v1/org", {
    method: "POST",
    auth: true,
    body: {
      nameTh: text(fd, "nameTh") ?? "",
      nameEn: text(fd, "nameEn") ?? undefined,
      contactEmail: text(fd, "contactEmail") ?? "",
      contactPhone: text(fd, "contactPhone") ?? undefined,
    },
  });
  if (!res.ok) {
    if (res.status === 401) redirect("/login?next=/new");
    return problemState(res.problem);
  }
  redirect(`/${res.data.id}/kyc?new=1`);
}
