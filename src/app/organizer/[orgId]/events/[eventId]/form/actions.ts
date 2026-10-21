"use server";

import { num, text } from "@/lib/form";
import { orgMutation, type OrgFormState } from "@/lib/org-actions";

/** Fields of the question form. Choices are typed one per line; no race ticked means every race. */
function questionBody(fd: FormData) {
  const type = text(fd, "type") ?? "text";
  const choice = type === "select" || type === "multiselect";
  return {
    label: text(fd, "label") ?? "",
    helpText: text(fd, "helpText"),
    type,
    options: choice ? (text(fd, "options") ?? "").split("\n").map((o) => o.trim()).filter(Boolean) : null,
    required: fd.get("required") === "on",
    raceIds: fd.getAll("raceIds").map(String),
    min: type === "number" ? num(fd, "min") : null,
    max: type === "number" ? num(fd, "max") : null,
  };
}

export async function createQuestion(orgId: string, eventId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const body = questionBody(fd);
  const res = await orgMutation(orgId, `/events/${eventId}/questions`, "POST", body);
  if (!res.ok) return res.state;
  return { notice: `เพิ่มคำถาม “${body.label}” แล้ว` };
}

export async function updateQuestion(orgId: string, eventId: string, questionId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const res = await orgMutation(orgId, `/events/${eventId}/questions/${questionId}`, "PATCH", questionBody(fd));
  if (!res.ok) return res.state;
  return { notice: "บันทึกแล้ว" };
}

export async function deleteQuestion(orgId: string, eventId: string, questionId: string): Promise<OrgFormState> {
  const res = await orgMutation(orgId, `/events/${eventId}/questions/${questionId}`, "DELETE");
  return res.ok ? {} : res.state;
}

/** Saves the whole order; the API wants every question exactly once. */
export async function reorderQuestions(orgId: string, eventId: string, ids: string[]): Promise<OrgFormState> {
  const res = await orgMutation(orgId, `/events/${eventId}/questions/order`, "PUT", { ids });
  return res.ok ? {} : res.state;
}
