"use server";

import { z } from "zod";
import { api } from "@/lib/api";
import { problemMessage } from "@/lib/format";
import type { CheckinRegistration } from "@/lib/org";

/** What the scanner shows. Plain data so it crosses the server/client boundary as is. */
export type ScanResult =
  | { kind: "ready"; registration: CheckinRegistration }
  | { kind: "picked_up"; registration: CheckinRegistration }
  | { kind: "not_confirmed"; registration: CheckinRegistration }
  | { kind: "not_found"; code: string }
  | { kind: "done"; registration: CheckinRegistration }
  | { kind: "error"; message: string };

const ids = z.object({ orgId: z.string().uuid(), eventId: z.string().uuid() });
const code = z.string().trim().min(1).max(64);

function base(orgId: string, eventId: string): string {
  const p = ids.parse({ orgId, eventId });
  return `/v1/org/${p.orgId}/events/${p.eventId}/checkins`;
}

function classify(r: CheckinRegistration): ScanResult {
  if (r.status !== "confirmed") return { kind: "not_confirmed", registration: r };
  if (r.kitPickedUpAt) return { kind: "picked_up", registration: r };
  return { kind: "ready", registration: r };
}

export async function lookupCode(orgId: string, eventId: string, raw: string): Promise<ScanResult> {
  const parsed = code.safeParse(raw);
  if (!parsed.success) return { kind: "error", message: "พิมพ์เลขบิบ เลขสมัคร หรือสแกน QR" };
  const res = await api<CheckinRegistration>(`${base(orgId, eventId)}/lookup?code=${encodeURIComponent(parsed.data)}`, { auth: true });
  if (res.ok) return classify(res.data);
  if (res.problem.code === "REGISTRATION_NOT_FOUND" || res.status === 404) return { kind: "not_found", code: parsed.data };
  return { kind: "error", message: problemMessage(res.problem) };
}

/** Records the pickup. The clientUuid comes from the scanner so a retried tap cannot record twice. */
export async function confirmPickup(
  orgId: string,
  eventId: string,
  input: { code: string; clientUuid: string; pickedUpBy: string },
): Promise<ScanResult> {
  const body = z
    .object({ code, clientUuid: z.string().uuid(), pickedUpBy: z.string().trim().max(120) })
    .safeParse(input);
  if (!body.success) return { kind: "error", message: "ข้อมูลไม่ครบ ลองสแกนใหม่" };
  const res = await api<CheckinRegistration>(base(orgId, eventId), {
    method: "POST",
    auth: true,
    body: { code: body.data.code, clientUuid: body.data.clientUuid, pickedUpBy: body.data.pickedUpBy || null },
  });
  if (res.ok) return { kind: "done", registration: res.data };
  const registration = res.problem.registration as CheckinRegistration | undefined;
  if (res.problem.code === "ALREADY_PICKED_UP" && registration) return { kind: "picked_up", registration };
  if (res.problem.code === "NOT_CONFIRMED" && registration) return { kind: "not_confirmed", registration };
  if (res.problem.code === "REGISTRATION_NOT_FOUND") return { kind: "not_found", code: body.data.code };
  return { kind: "error", message: problemMessage(res.problem) };
}
