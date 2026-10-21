import { describe, expect, it } from "vitest";
import { findInRoster, indexRoster, offlineVerdict, runnerLabel, sha256Hex, type QueuedPickup, type RosterEntry } from "../checkin-offline";

const QR = "3f2a9c0d1e4b5a6978e1f0c2d3b4a596";

async function entry(overrides: Partial<RosterEntry> = {}): Promise<RosterEntry> {
  return {
    id: "reg-1",
    registrationNo: "R27-000123",
    bibNumber: "1042",
    name: { th: "ชูใจ ทดสอบ", en: "Chujai Tester" },
    raceCode: "10K",
    shirtSize: "M",
    qrHash: (await sha256Hex(QR))!,
    kitPickedUpAt: null,
    refundPending: false,
    ...overrides,
  };
}

describe("offline check-in", () => {
  it("hashes the QR the same way the API does (SHA-256, hex)", async () => {
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("finds a runner by QR, bib or registration number in any case", async () => {
    const e = await entry();
    const index = indexRoster([e, await entry({ id: "reg-2", registrationNo: "R27-000124", bibNumber: null, qrHash: "x" })]);
    expect(findInRoster(index, QR, await sha256Hex(QR))).toBe(e);
    expect(findInRoster(index, " 1042 ", null)).toBe(e);
    expect(findInRoster(index, "r27-000123", null)).toBe(e);
    expect(findInRoster(index, "9999", await sha256Hex("9999"))).toBeNull();
  });

  it("refuses a second handover, including one still waiting in the queue on this device", async () => {
    const e = await entry();
    expect(offlineVerdict(e, undefined)).toMatchObject({ kind: "ready", offline: true, runner: { id: "reg-1", raceCode: "10K", detail: null } });
    expect(offlineVerdict({ ...e, kitPickedUpAt: "2027-02-13T03:00:00Z" }, undefined)).toMatchObject({ kind: "picked_up" });
    const queued = { scannedAt: "2027-02-14T01:02:03Z" } as QueuedPickup;
    expect(offlineVerdict(e, queued)).toMatchObject({ kind: "picked_up", runner: { kitPickedUpAt: "2027-02-14T01:02:03Z" } });
    expect(offlineVerdict({ ...e, refundPending: true }, undefined)).toMatchObject({ kind: "refund_pending" });
  });

  it("labels a runner for the queue with the bib, or the registration number without one", async () => {
    expect(runnerLabel({ ...(await entry()) })).toBe("ชูใจ ทดสอบ · 10K · บิบ 1042");
    expect(runnerLabel({ ...(await entry({ bibNumber: null, name: { th: null, en: "Jane Doe" } })) })).toBe("Jane Doe · 10K · R27-000123");
  });
});
