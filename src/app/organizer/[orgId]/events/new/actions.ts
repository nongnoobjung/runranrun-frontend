"use server";

import { redirect } from "next/navigation";
import { text } from "@/lib/form";
import { eventPath, type OrgEvent } from "@/lib/org";
import { orgMutation, type OrgFormState } from "@/lib/org-actions";

export async function createEvent(orgId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const res = await orgMutation<OrgEvent>(orgId, "/events", "POST", {
    nameTh: text(fd, "nameTh") ?? "",
    nameEn: text(fd, "nameEn"),
    eventType: text(fd, "eventType") ?? "road",
    eventDate: text(fd, "eventDate") ?? "",
    provinceCode: text(fd, "provinceCode"),
  });
  if (!res.ok) return res.state;
  redirect(eventPath(orgId, res.data.id, "edit"));
}
