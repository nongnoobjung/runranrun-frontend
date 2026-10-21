"use server";

import { bangkokToIso, num, satang, text } from "@/lib/form";
import { orgMutation, type OrgFormState } from "@/lib/org-actions";

function raceBody(fd: FormData) {
  const cutoffHours = num(fd, "cutoffHours");
  return {
    code: text(fd, "code") ?? "",
    nameTh: text(fd, "nameTh") ?? "",
    distanceKm: num(fd, "distanceKm"),
    capacity: num(fd, "capacity"),
    startAt: bangkokToIso(text(fd, "startAt")),
    // Organisers think in hours; the API stores minutes.
    cutoffMinutes: cutoffHours === null ? null : Math.round(cutoffHours * 60),
    ageMin: num(fd, "ageMin"),
    bibPrefix: text(fd, "bibPrefix"),
    bibStart: num(fd, "bibStart"),
    bibEnd: num(fd, "bibEnd"),
  };
}

function tierBody(fd: FormData) {
  return {
    name: text(fd, "name") ?? "",
    priceSatang: satang(fd, "price"),
    startsAt: bangkokToIso(text(fd, "startsAt")),
    endsAt: bangkokToIso(text(fd, "endsAt")),
    quota: num(fd, "quota"),
  };
}

const base = (eventId: string) => `/events/${eventId}/races`;

export async function createRace(orgId: string, eventId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const res = await orgMutation(orgId, base(eventId), "POST", raceBody(fd));
  return res.ok ? { notice: "เพิ่มระยะแล้ว เพิ่มช่วงราคาต่อได้เลย" } : res.state;
}

export async function updateRace(orgId: string, eventId: string, raceId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const res = await orgMutation(orgId, `${base(eventId)}/${raceId}`, "PATCH", raceBody(fd));
  return res.ok ? { notice: "บันทึกระยะแล้ว" } : res.state;
}

export async function deleteRace(orgId: string, eventId: string, raceId: string): Promise<OrgFormState> {
  const res = await orgMutation(orgId, `${base(eventId)}/${raceId}`, "DELETE");
  return res.ok ? {} : res.state;
}

export async function createTier(orgId: string, eventId: string, raceId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const res = await orgMutation(orgId, `${base(eventId)}/${raceId}/price-tiers`, "POST", tierBody(fd));
  return res.ok ? { notice: "เพิ่มช่วงราคาแล้ว" } : res.state;
}

export async function updateTier(
  orgId: string,
  eventId: string,
  raceId: string,
  tierId: string,
  _prev: OrgFormState,
  fd: FormData,
): Promise<OrgFormState> {
  const res = await orgMutation(orgId, `${base(eventId)}/${raceId}/price-tiers/${tierId}`, "PATCH", tierBody(fd));
  return res.ok ? { notice: "บันทึกแล้ว" } : res.state;
}

export async function deleteTier(orgId: string, eventId: string, raceId: string, tierId: string): Promise<OrgFormState> {
  const res = await orgMutation(orgId, `${base(eventId)}/${raceId}/price-tiers/${tierId}`, "DELETE");
  return res.ok ? {} : res.state;
}
