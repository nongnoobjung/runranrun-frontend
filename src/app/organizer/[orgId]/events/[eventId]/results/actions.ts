"use server";

import type { ResultsImport } from "@/lib/org";
import { orgMutation, type OrgFormState } from "@/lib/org-actions";

export type ImportState = { result?: ResultsImport; error?: string };

/** Checks the timing file (dryRun) or makes it the event's results. Nothing is written while any line is wrong. */
export async function importResults(orgId: string, eventId: string, csv: string, dryRun: boolean): Promise<ImportState> {
  const res = await orgMutation<ResultsImport>(orgId, `/events/${eventId}/results/import`, "POST", { csv, dryRun });
  return res.ok ? { result: res.data } : { error: res.state.error };
}

export async function publishResults(orgId: string, eventId: string, published: boolean): Promise<OrgFormState> {
  const res = await orgMutation(orgId, `/events/${eventId}/results/publish`, "POST", { published });
  if (!res.ok) return res.state;
  return { notice: published ? "เผยแพร่ผลแล้ว นักวิ่งดูผลได้ที่หน้างาน" : "ซ่อนผลจากหน้างานแล้ว" };
}
