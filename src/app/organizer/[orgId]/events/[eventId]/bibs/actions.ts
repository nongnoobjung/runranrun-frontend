"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { text } from "@/lib/form";
import type { BibImportResult, BibOverview, RegistrationList } from "@/lib/org";
import { orgMutation, problemState, type OrgFormState } from "@/lib/org-actions";

async function putBib(orgId: string, eventId: string, registrationId: string, bibNumber: string | null): Promise<OrgFormState> {
  const res = await api<{ bibNumber: string | null }>(`/v1/org/${orgId}/events/${eventId}/registrations/${registrationId}/bib`, {
    method: "PUT",
    body: { bibNumber },
    auth: true,
  });
  if (!res.ok) {
    if (res.status === 401) redirect(`/login?next=${encodeURIComponent("/organizer")}`);
    // A taken number also says who holds it, so the organiser can sort it out.
    const holder = res.problem.code === "BIB_TAKEN" && typeof res.problem.registrationNo === "string" ? res.problem.registrationNo : null;
    return holder ? { error: `เลขบิบนี้เป็นของผู้สมัคร ${holder} แล้ว` } : problemState(res.problem);
  }
  refresh();
  return { notice: res.data.bibNumber ? `ให้เลข ${res.data.bibNumber} แล้ว` : "ลบเลขบิบแล้ว" };
}

/** Sets or clears (empty field) one runner's number. */
export async function setBib(orgId: string, eventId: string, registrationId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  return putBib(orgId, eventId, registrationId, text(fd, "bibNumber"));
}

/** Same, for a runner typed in by registration number on the bibs page. */
export async function setBibByRegistrationNo(orgId: string, eventId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const registrationNo = (text(fd, "registrationNo") ?? "").toUpperCase();
  if (!registrationNo) return { fieldErrors: { registrationNo: "กรอกเลขสมัคร" } };
  const found = await api<RegistrationList>(`/v1/org/${orgId}/events/${eventId}/registrations?q=${encodeURIComponent(registrationNo)}&limit=20`, { auth: true });
  const reg = found.ok ? found.data.items.find((r) => r.registrationNo === registrationNo) : undefined;
  if (!reg) return { fieldErrors: { registrationNo: "ไม่พบเลขสมัครนี้ในงาน" } };
  return putBib(orgId, eventId, reg.id, text(fd, "bibNumber"));
}

export async function assignWaiting(orgId: string, eventId: string): Promise<OrgFormState> {
  const res = await orgMutation<BibOverview & { assigned: number }>(orgId, `/events/${eventId}/bibs/assign`, "POST", {});
  if (!res.ok) return res.state;
  const left = res.data.waiting.length;
  return {
    notice:
      res.data.assigned === 0
        ? "ไม่มีเลขให้ออก ตั้งช่วงเลขบิบของระยะในหน้าระยะและราคาก่อน"
        : `ออกบิบให้ ${res.data.assigned.toLocaleString("th-TH")} คน${left ? ` ยังเหลือ ${left.toLocaleString("th-TH")} คนที่ช่วงเลขไม่พอหรือยังไม่ได้ตั้ง` : ""}`,
  };
}

export type ImportState = { result?: BibImportResult; error?: string };

/** Checks the file (dryRun) or applies it. The API refuses to apply a file with any wrong line. */
export async function importBibs(orgId: string, eventId: string, csv: string, dryRun: boolean): Promise<ImportState> {
  const res = await orgMutation<BibImportResult>(orgId, `/events/${eventId}/bibs/import`, "POST", { csv, dryRun });
  return res.ok ? { result: res.data } : { error: res.state.error };
}
