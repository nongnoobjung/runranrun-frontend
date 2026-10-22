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

/** A published 10K of its own with two paid runners, so results never touch the seeded event. */
async function raceWithRunners() {
  const { accessToken: token } = await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { audience: ALL_AUDIENCES, email: ORGANIZER } });
  const { items } = await apiCall<{ items: { id: string }[] }>("/v1/org", { token });
  const org = `/v1/org/${items[0].id}`;
  const slug = `e2e-results-${randomUUID().slice(0, 8)}`;
  const now = Date.now();
  const event = await apiCall<{ id: string }>(`${org}/events`, {
    token,
    body: {
      nameTh: `งานทดสอบผลวิ่ง ${slug.slice(-8)}`, slug, eventType: "road", eventDate: "2027-06-01", provinceCode: "BKK", venueName: "สวนลุมพินี",
      registrationOpensAt: new Date(now - 86_400_000).toISOString(), registrationClosesAt: new Date(now + 30 * 86_400_000).toISOString(),
    },
  });
  const { races } = await apiCall<{ races: { id: string }[] }>(`${org}/events/${event.id}/races`, {
    token,
    body: { code: "10K", nameTh: "มินิ", distanceKm: 10, capacity: 100, bibStart: 1, bibEnd: 100 },
  });
  await apiCall(`${org}/events/${event.id}/races/${races[0].id}/price-tiers`, {
    token,
    body: { name: "ปกติ", priceSatang: 50_000, startsAt: new Date(now - 86_400_000).toISOString(), endsAt: new Date(now + 30 * 86_400_000).toISOString() },
  });
  await apiCall(`${org}/events/${event.id}/publish`, { token, body: {} });

  const bibs: string[] = [];
  for (const [th, en] of [["ฟ้า", "Fah"], ["ฝน", "Fon"]]) {
    const { accessToken: runnerToken } = await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { audience: ALL_AUDIENCES, email: `e2e-res-${randomUUID()}@example.com` } });
    const session = await apiCall<{ id: string }>("/v1/checkout/sessions", { token: runnerToken, body: { eventId: event.id, races: [{ raceId: races[0].id, quantity: 1 }] } });
    const order = await apiCall<{ id: string }>("/v1/orders", {
      token: runnerToken,
      key: true,
      body: {
        checkoutSessionId: session.id,
        buyer: { name: "ผู้ซื้อ", email: "buyer@example.com", phone: "081-234-5678" },
        participants: [
          {
            raceId: races[0].id,
            runner: {
              firstNameTh: th, lastNameTh: "วิ่งดี", firstNameEn: en, lastNameEn: "Wingdee", gender: "female", birthDate: "1995-05-05", nationality: "TH",
              idDocType: "thai_id", idDocNumber: `1${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 900 + 100)}`,
              emergencyName: "ญาติ", emergencyPhone: "081-000-0000",
            },
          },
        ],
      },
    });
    await apiCall(`/v1/orders/${order.id}/payments`, { token: runnerToken, key: true, body: { method: "promptpay" } });
    await apiCall(`/v1/dev/orders/${order.id}/complete-payment`, { body: {} });
    const regs = await apiCall<{ items: { bibNumber: string }[] }>("/v1/me/registrations", { token: runnerToken });
    bibs.push(regs.items[0].bibNumber);
  }
  return { slug, path: `/${items[0].id}/events/${event.id}`, bibs };
}

test("an organiser imports and publishes results, and runners find theirs", async ({ page }) => {
  const ev = await raceWithRunners();
  const [fah, fon] = ev.bibs;

  await signInOrganizer(page, ORGANIZER, `${ev.path}/results`);
  await expect(page.getByRole("heading", { level: 1, name: "ผลการแข่งขัน" })).toBeVisible();
  await expect(page.getByText("ยังไม่ได้นำเข้าผล")).toBeVisible();

  // A file with a mistake is refused line by line.
  const upload = (csv: string) =>
    page.getByLabel(/ไฟล์ CSV จากผู้จับเวลา/).setInputFiles({ name: "results.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await upload(`bib,chip_time,gun_time\n${fah},48:10,48:20\n9999,50:00,\n`);
  await page.getByRole("button", { name: "ตรวจไฟล์" }).click();
  await expect(page.getByText("แถว 3 · บิบ 9999 · ไม่มีบิบนี้ในผู้สมัครที่ชำระเงินแล้ว")).toBeVisible();
  await expect(page.getByRole("button", { name: /นำเข้าผล/ })).toHaveCount(0);

  await upload(`bib,chip_time,gun_time\n${fah},48:10,48:20\n${fon},52:05,52:30\n`);
  await page.getByRole("button", { name: "ตรวจไฟล์" }).click();
  await page.getByRole("button", { name: "นำเข้าผล 2 คน" }).click();
  await expect(page.getByRole("status").filter({ hasText: "นำเข้าผลแล้ว 2 คน" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "ฟ้า วิ่งดี" })).toContainText("48:10");

  await page.getByRole("button", { name: "เผยแพร่ผล (2 คนเข้าเส้นชัย)" }).click();
  await expect(page.getByText("เผยแพร่แล้ว", { exact: true })).toBeVisible();

  // Runners: from the event page to the results, then search.
  await page.goto(`/events/${ev.slug}`);
  await page.getByRole("link", { name: "ดูผลการแข่งขัน →" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /ผลการแข่งขัน/ })).toBeVisible();
  const list = page.getByRole("region", { name: "ผล 10K" });
  await expect(list.getByRole("listitem").first()).toContainText("ฟ้า วิ่งดี");
  await expect(list.getByRole("listitem").first()).toContainText("48:10");
  await expect(list.getByRole("listitem").nth(1)).toContainText("ฝน วิ่งดี");
  await page.getByLabel("ค้นหาชื่อหรือเลขบิบ").fill(fon);
  await page.getByRole("button", { name: "ค้นหา" }).click();
  await expect(page).toHaveURL(/q=/);
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(list.getByRole("listitem")).toContainText("ฝน วิ่งดี");
  await expect(list.getByRole("listitem")).toContainText("5:13 /กม.");
});
