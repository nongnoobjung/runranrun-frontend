"use server";

import { z } from "zod";
import { api } from "@/lib/api";
import { fromRegistration, type Roster, type ScanResult } from "@/lib/checkin-offline";
import { problemMessage } from "@/lib/format";
import type { CheckinRegistration } from "@/lib/org";

const ids = z.object({ orgId: z.string().uuid(), eventId: z.string().uuid() });
const code = z.string().trim().min(1).max(64);

function base(orgId: string, eventId: string): string {
  const p = ids.parse({ orgId, eventId });
  return `/v1/org/${p.orgId}/events/${p.eventId}/checkins`;
}

function classify(r: CheckinRegistration): ScanResult {
  const runner = fromRegistration(r);
  if (r.status !== "confirmed") return { kind: "not_confirmed", runner };
  if (r.kitPickedUpAt) return { kind: "picked_up", runner, offline: false };
  return { kind: "ready", runner, offline: false };
}

export async function lookupCode(orgId: string, eventId: string, raw: string): Promise<ScanResult> {
  const parsed = code.safeParse(raw);
  if (!parsed.success) return { kind: "error", message: "พิมพ์เลขบิบ เลขสมัคร หรือสแกน QR" };
  const res = await api<CheckinRegistration>(`${base(orgId, eventId)}/lookup?code=${encodeURIComponent(parsed.data)}`, { auth: true });
  if (res.ok) return classify(res.data);
  if (res.problem.code === "REGISTRATION_NOT_FOUND" || res.status === 404) return { kind: "not_found", code: parsed.data, offline: false };
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
  if (res.ok) return { kind: "done", runner: fromRegistration(res.data), queued: false };
  const registration = res.problem.registration as CheckinRegistration | undefined;
  if (res.problem.code === "ALREADY_PICKED_UP" && registration) return { kind: "picked_up", runner: fromRegistration(registration), offline: false };
  if (res.problem.code === "NOT_CONFIRMED" && registration) return { kind: "not_confirmed", runner: fromRegistration(registration) };
  if (res.problem.code === "REFUND_PENDING" && registration) return { kind: "refund_pending", runner: fromRegistration(registration) };
  if (res.problem.code === "REGISTRATION_NOT_FOUND") return { kind: "not_found", code: body.data.code, offline: false };
  return { kind: "error", message: problemMessage(res.problem) };
}

/** The event's paid runners, kept on the device so the scanner keeps working when the network drops. */
export async function downloadRoster(orgId: string, eventId: string): Promise<{ ok: true; roster: Roster } | { ok: false; message: string }> {
  const res = await api<Roster>(`${base(orgId, eventId)}/roster`, { auth: true });
  if (res.ok) return { ok: true, roster: res.data };
  return { ok: false, message: problemMessage(res.problem) };
}

export type SyncItemResult = { clientUuid: string; ok: true; pickedUpAt: string | null } | { clientUuid: string; ok: false; code: string; pickedUpAt: string | null };

export type SyncResult = { ok: true; results: SyncItemResult[] } | { ok: false; message: string; unreachable: boolean };

const queueItem = z.object({
  code,
  clientUuid: z.string().uuid(),
  pickedUpBy: z.string().trim().max(120).nullable(),
  scannedAt: z.string().datetime({ offset: true }),
});

/** Sends pickups recorded offline, oldest first. The API dedupes on clientUuid, so sending a queue twice is safe. */
export async function syncPickups(orgId: string, eventId: string, items: z.input<typeof queueItem>[]): Promise<SyncResult> {
  const body = z.array(queueItem).min(1).max(200).safeParse(items);
  if (!body.success) return { ok: false, message: "ข้อมูลในคิวไม่ถูกต้อง", unreachable: false };
  const res = await api<{ results: ({ clientUuid: string; registration: CheckinRegistration | null } & ({ ok: true } | { ok: false; code: string }))[] }>(
    `${base(orgId, eventId)}/batch`,
    { method: "POST", auth: true, body: { items: body.data } },
  );
  if (!res.ok) return { ok: false, message: problemMessage(res.problem), unreachable: res.problem.code === "API_UNREACHABLE" };
  return {
    ok: true,
    results: res.data.results.map((r) =>
      r.ok
        ? { clientUuid: r.clientUuid, ok: true, pickedUpAt: r.registration?.kitPickedUpAt ?? null }
        : { clientUuid: r.clientUuid, ok: false, code: r.code, pickedUpAt: r.registration?.kitPickedUpAt ?? null },
    ),
  };
}
