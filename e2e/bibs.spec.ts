import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ALL_AUDIENCES, signInOrganizer } from "./hosts";

const API = process.env.API_URL ?? "http://localhost:4000";
const ORGANIZER = "organizer@riverside.example";

async function apiCall<T>(path: string, init: { method?: string; token?: string; body?: unknown; key?: boolean } = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: {
      "content-type": "application/json",
      ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
      ...(init.key ? { "idempotency-key": randomUUID() } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** A published event of its own whose 10K race has no bib range yet, so paid runners wait for a number. */
async function freshEvent() {
  const { accessToken: token } = await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { audience: ALL_AUDIENCES, email: ORGANIZER } });
  const { items } = await apiCall<{ items: { id: string }[] }>("/v1/org", { token });
  const org = `/v1/org/${items[0].id}`;
  const slug = `e2e-bibs-${randomUUID().slice(0, 8)}`;
  const now = Date.now();
  const event = await apiCall<{ id: string }>(`${org}/events`, {
    token,
    body: {
      nameTh: `งานทดสอบบิบ ${slug.slice(-8)}`, slug, eventType: "road", eventDate: "2027-06-01", provinceCode: "BKK", venueName: "สวนลุมพินี",
      registrationOpensAt: new Date(now - 86_400_000).toISOString(), registrationClosesAt: new Date(now + 30 * 86_400_000).toISOString(),
    },
  });
  const { races } = await apiCall<{ races: { id: string }[] }>(`${org}/events/${event.id}/races`, {
    token,
    body: { code: "10K", nameTh: "มินิ", distanceKm: 10, capacity: 100 },
  });
  await apiCall(`${org}/events/${event.id}/races/${races[0].id}/price-tiers`, {
    token,
    body: { name: "ปกติ", priceSatang: 50_000, startsAt: new Date(now - 86_400_000).toISOString(), endsAt: new Date(now + 30 * 86_400_000).toISOString() },
  });
  await apiCall(`${org}/events/${event.id}/publish`, { token, body: {} });
  return { token, orgId: items[0].id, eventId: event.id, raceId: races[0].id, org, path: `/${items[0].id}/events/${event.id}` };
}

/** Registers and pays for one place straight through the API; returns the registration number. */
async function paidRunner(ev: Awaited<ReturnType<typeof freshEvent>>, firstNameEn: string): Promise<string> {
  const { accessToken: token } = await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { audience: ALL_AUDIENCES, email: `e2e-bib-${randomUUID()}@example.com` } });
  const session = await apiCall<{ id: string }>("/v1/checkout/sessions", { token, body: { eventId: ev.eventId, races: [{ raceId: ev.raceId, quantity: 1 }] } });
  const order = await apiCall<{ id: string; registrations: { registrationNo: string }[] }>("/v1/orders", {
    token,
    key: true,
    body: {
      checkoutSessionId: session.id,
      buyer: { name: "ผู้ซื้อ ทดสอบ", email: "buyer@example.com", phone: "081-234-5678" },
      participants: [
        {
          raceId: ev.raceId,
          runner: {
            firstNameEn, lastNameEn: "Bib", gender: "female", birthDate: "1991-05-05", nationality: "TH", idDocType: "thai_id",
            idDocNumber: `1${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 900 + 100)}`, emergencyName: "ญาติ", emergencyPhone: "081-000-0000",
          },
        },
      ],
    },
  });
  await apiCall(`/v1/orders/${order.id}/payments`, { token, key: true, body: { method: "promptpay" } });
  await apiCall(`/v1/dev/orders/${order.id}/complete-payment`, { body: {} });
  return order.registrations[0].registrationNo;
}

async function bibsOf(ev: Awaited<ReturnType<typeof freshEvent>>): Promise<Record<string, string | null>> {
  const { items } = await apiCall<{ items: { registrationNo: string; bibNumber: string | null }[] }>(`${ev.org}/events/${ev.eventId}/registrations`, { token: ev.token });
  return Object.fromEntries(items.map((r) => [r.registrationNo, r.bibNumber]));
}

test("an organiser numbers waiting runners by hand, in bulk and from a CSV", async ({ page }) => {
  const ev = await freshEvent();
  const ann = await paidRunner(ev, "Ann");
  const ben = await paidRunner(ev, "Ben");

  await signInOrganizer(page, ORGANIZER, `${ev.path}/bibs`);
  await expect(page.getByRole("heading", { level: 1, name: "บิบ" })).toBeVisible();
  const waiting = page.getByRole("list", { name: "รอออกบิบ" });
  await expect(waiting.getByRole("listitem")).toHaveCount(2);

  // By hand, from the waiting list.
  await page.getByLabel("เลขบิบของ Ann Bib").fill("v01");
  await waiting.getByRole("listitem").filter({ hasText: ann }).getByRole("button", { name: "บันทึก" }).click();
  await expect(waiting.getByRole("listitem")).toHaveCount(1);

  // In bulk, once the race has a range.
  await apiCall(`${ev.org}/events/${ev.eventId}/races/${ev.raceId}`, { token: ev.token, method: "PATCH", body: { bibStart: 1, bibEnd: 50 } });
  await page.reload();
  await page.getByRole("button", { name: "ออกบิบให้คนที่ยังไม่มี (1 คน)" }).click();
  await expect(page.getByRole("status").filter({ hasText: "ออกบิบให้ 1 คน" })).toBeVisible();
  await expect(page.getByText("ทุกคนที่ชำระเงินแล้วมีเลขบิบแล้ว")).toBeVisible();
  expect(await bibsOf(ev)).toEqual({ [ann]: "V01", [ben]: "0001" });

  // A number that is taken says who holds it.
  await page.getByLabel("เลขสมัคร").fill(ben);
  await page.getByPlaceholder("0001").fill("V01");
  await page.getByRole("button", { name: "บันทึกเลขบิบ" }).click();
  await expect(page.getByRole("alert").filter({ hasText: `เป็นของผู้สมัคร ${ann}` })).toBeVisible();

  // Swap the two numbers from a file: check first, then import.
  await page.getByLabel("ไฟล์ CSV").setInputFiles({
    name: "bibs.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(`﻿registration_no,bib\r\n${ann},0001\r\n${ben},V01\r\n`),
  });
  await page.getByRole("button", { name: "ตรวจไฟล์" }).click();
  await expect(page.getByText("เปลี่ยน 2 คน")).toBeVisible();
  await page.getByRole("button", { name: "นำเข้า 2 คน" }).click();
  await expect(page.getByRole("status").filter({ hasText: "นำเข้าเลขบิบ 2 คนแล้ว" })).toBeVisible();
  expect(await bibsOf(ev)).toEqual({ [ann]: "0001", [ben]: "V01" });
});
