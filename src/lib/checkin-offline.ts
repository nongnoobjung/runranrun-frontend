import type { CheckinRegistration } from "./org";

/** One runner as the API's offline roster sends it: only what staff need to hand over the kit. */
export interface RosterEntry {
  id: string;
  registrationNo: string;
  bibNumber: string | null;
  name: { th: string | null; en: string };
  raceCode: string;
  shirtSize: string | null;
  /** SHA-256 (hex) of the QR token on the runner's ticket. */
  qrHash: string;
  kitPickedUpAt: string | null;
  refundPending: boolean;
}

export interface Roster {
  generatedAt: string;
  items: RosterEntry[];
}

/** A pickup recorded on this device and not yet accepted by the API. */
export interface QueuedPickup {
  clientUuid: string;
  eventId: string;
  registrationId: string;
  code: string;
  pickedUpBy: string | null;
  scannedAt: string;
  /** Kept for the conflict list, so staff can tell who it was without the roster. */
  label: string;
  /** Set once the API refused it, with the problem code. */
  conflict: { code: string; at: string; pickedUpAt: string | null } | null;
}

/** What the scanner shows about a runner, online (full detail) or from the roster on the device. */
export interface Runner {
  id: string;
  registrationNo: string;
  bibNumber: string | null;
  status: CheckinRegistration["status"];
  name: { th: string | null; en: string };
  raceCode: string;
  shirtSize: string | null;
  kitPickedUpAt: string | null;
  /** Gender and age group; the offline roster leaves them out. */
  detail: string | null;
  emergencyName: string | null;
}

const GENDER: Record<CheckinRegistration["gender"], string> = { male: "ชาย", female: "หญิง", other: "อื่น ๆ" };

export function fromRegistration(r: CheckinRegistration): Runner {
  return {
    id: r.id,
    registrationNo: r.registrationNo,
    bibNumber: r.bibNumber,
    status: r.status,
    name: r.name,
    raceCode: r.race.code,
    shirtSize: r.shirtSize,
    kitPickedUpAt: r.kitPickedUpAt,
    detail: `${GENDER[r.gender]}${r.ageGroup ? ` · รุ่น ${r.ageGroup}` : ` · อายุ ${r.age}`}`,
    emergencyName: r.emergencyName,
  };
}

export function fromRoster(e: RosterEntry, kitPickedUpAt = e.kitPickedUpAt): Runner {
  return {
    id: e.id,
    registrationNo: e.registrationNo,
    bibNumber: e.bibNumber,
    status: "confirmed",
    name: e.name,
    raceCode: e.raceCode,
    shirtSize: e.shirtSize,
    kitPickedUpAt,
    detail: null,
    emergencyName: null,
  };
}

export function runnerLabel(r: Pick<Runner, "name" | "raceCode" | "bibNumber" | "registrationNo">): string {
  return [r.name.th ?? r.name.en, r.raceCode, r.bibNumber ? `บิบ ${r.bibNumber}` : r.registrationNo].join(" · ");
}

export interface RosterIndex {
  byBib: Map<string, RosterEntry>;
  byRegistrationNo: Map<string, RosterEntry>;
  byQrHash: Map<string, RosterEntry>;
}

export function indexRoster(items: RosterEntry[]): RosterIndex {
  const index: RosterIndex = { byBib: new Map(), byRegistrationNo: new Map(), byQrHash: new Map() };
  for (const e of items) {
    if (e.bibNumber) index.byBib.set(e.bibNumber, e);
    index.byRegistrationNo.set(e.registrationNo.toUpperCase(), e);
    index.byQrHash.set(e.qrHash, e);
  }
  return index;
}

/** Same rules as the API: the QR token, a bib number or a registration number (any case). */
export function findInRoster(index: RosterIndex, code: string, qrHash: string | null): RosterEntry | null {
  const c = code.trim();
  return (qrHash && index.byQrHash.get(qrHash)) || index.byBib.get(c) || index.byRegistrationNo.get(c.toUpperCase()) || null;
}

export async function sha256Hex(text: string): Promise<string | null> {
  // crypto.subtle only exists on https and localhost; bib and registration numbers still work without it.
  if (!globalThis.crypto?.subtle) return null;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Problem codes the batch sync can return for one item, in words for the staff member who handed over the kit. */
export const SYNC_CONFLICT_TH: Record<string, string> = {
  ALREADY_PICKED_UP: "รับไปแล้วที่จุดอื่น",
  REFUND_PENDING: "นักวิ่งขอคืนเงินอยู่",
  NOT_CONFIRMED: "ยังไม่ได้ชำระเงิน หรือสิทธิ์ถูกยกเลิก",
  REGISTRATION_NOT_FOUND: "ไม่พบผู้สมัครในงานนี้",
};

/** What the scanner shows after a lookup or a handover. Plain data so it crosses the server/client boundary as is. */
export type ScanResult =
  | { kind: "ready"; runner: Runner; offline: boolean }
  | { kind: "picked_up"; runner: Runner; offline: boolean }
  | { kind: "not_confirmed"; runner: Runner }
  | { kind: "refund_pending"; runner: Runner }
  | { kind: "not_found"; code: string; offline: boolean }
  | { kind: "done"; runner: Runner; queued: boolean }
  | { kind: "error"; message: string };

/** The verdict for a runner found in the roster on the device, counting pickups still waiting in the queue. */
export function offlineVerdict(entry: RosterEntry, queued: QueuedPickup | undefined): ScanResult {
  if (queued) return { kind: "picked_up", runner: fromRoster(entry, queued.scannedAt), offline: true };
  if (entry.kitPickedUpAt) return { kind: "picked_up", runner: fromRoster(entry), offline: true };
  if (entry.refundPending) return { kind: "refund_pending", runner: fromRoster(entry) };
  return { kind: "ready", runner: fromRoster(entry), offline: true };
}
