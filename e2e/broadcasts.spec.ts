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

/** A published 10K of its own with two paid runners who gave their email. */
async function eventWithRunners() {
  const { accessToken: token } = await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { audience: ALL_AUDIENCES, email: ORGANIZER } });
  const { items } = await apiCall<{ items: { id: string }[] }>("/v1/org", { token });
  const org = `/v1/org/${items[0].id}`;
  const slug = `e2e-news-${randomUUID().slice(0, 8)}`;
  const now = Date.now();
  const event = await apiCall<{ id: string }>(`${org}/events`, {
    token,
    body: {
      nameTh: `งานทดสอบส่งข่าว ${slug.slice(-8)}`, slug, eventType: "road", eventDate: "2027-06-01", provinceCode: "BKK", venueName: "สวนลุมพินี",
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
  for (const name of ["มะลิ", "กุหลาบ"]) {
    const { accessToken: runnerToken } = await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { audience: ALL_AUDIENCES, email: `e2e-news-${randomUUID()}@example.com` } });
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
              firstNameTh: name, lastNameTh: "ทดสอบ", firstNameEn: "News", lastNameEn: "Test", gender: "female", birthDate: "1995-05-05", nationality: "TH",
              idDocType: "thai_id", idDocNumber: `1${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 900 + 100)}`,
              email: `${randomUUID().slice(0, 6)}@example.com`, emergencyName: "ญาติ", emergencyPhone: "081-000-0000",
            },
          },
        ],
      },
    });
    await apiCall(`/v1/orders/${order.id}/payments`, { token: runnerToken, key: true, body: { method: "promptpay" } });
    await apiCall(`/v1/dev/orders/${order.id}/complete-payment`, { body: {} });
  }
  return { path: `/${items[0].id}/events/${event.id}` };
}

test("an organiser writes a broadcast, tests it, sends it, and schedules another", async ({ page }) => {
  const ev = await eventWithRunners();
  await signInOrganizer(page, ORGANIZER, `${ev.path}/broadcasts`);
  await expect(page.getByRole("heading", { level: 1, name: "ส่งข่าวถึงผู้สมัคร" })).toBeVisible();

  const composer = page.getByRole("region", { name: "เขียนข้อความ" });
  await expect(composer.getByText(/^2$/)).toBeVisible();
  await composer.getByLabel("หัวข้อ").fill("พรุ่งนี้รับเสื้อ {ชื่อ}");
  await composer.getByLabel("ข้อความ").fill("สวัสดี ");
  await composer.getByRole("button", { name: "{ชื่อ}" }).click();
  const sample = page.getByRole("complementary", { name: "ตัวอย่างอีเมล" });
  await expect(sample).toContainText(/พรุ่งนี้รับเสื้อ (มะลิ|กุหลาบ)/);
  await expect(sample).toContainText(/สวัสดี (มะลิ|กุหลาบ)/);

  await composer.getByRole("button", { name: "ส่งทดสอบหาตัวเอง" }).click();
  await expect(composer.getByRole("status")).toContainText(`ส่งทดสอบไปที่ ${ORGANIZER} แล้ว`);

  await composer.getByRole("button", { name: "ส่งเลย" }).click();
  await expect(composer).toContainText("ส่งอีเมลถึง 2 คน");
  await composer.getByRole("button", { name: "ยืนยันส่งเลย" }).click();
  // With a queue (Redis) the emails go out in the background, so the first view may still say "sending".
  await expect(page).toHaveURL(/sent=(sent|sending)/);
  const history = page.getByRole("table");
  const first = history.getByRole("row").filter({ hasText: "พรุ่งนี้รับเสื้อ {ชื่อ}" });
  await expect(async () => {
    await page.reload();
    await expect(first).toContainText("ส่งแล้ว", { timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  await expect(first.getByRole("cell").nth(2)).toHaveText("2");

  // A second message for tomorrow, then taken back to a draft.
  await composer.getByLabel("หัวข้อ").fill("เส้นทางวิ่ง");
  await composer.getByLabel("ข้อความ").fill("ดูแผนที่เส้นทางได้ที่หน้างาน");
  await composer.getByRole("button", { name: "ตั้งเวลาส่ง" }).click();
  const tomorrow = new Date(Date.now() + 7 * 3_600_000 + 86_400_000).toISOString().slice(0, 16);
  await composer.getByLabel("ส่งเมื่อ (เวลาไทย)").fill(tomorrow);
  await composer.getByRole("button", { name: "ตั้งเวลา", exact: true }).click();
  await expect(page).toHaveURL(/sent=scheduled/);
  const scheduled = history.getByRole("row").filter({ hasText: "เส้นทางวิ่ง" });
  await expect(scheduled).toContainText("ตั้งเวลาไว้");
  await scheduled.getByRole("button", { name: "ยกเลิกเวลาส่ง" }).click();
  await expect(page.getByRole("list", { name: "ร่าง" })).toContainText("เส้นทางวิ่ง");
});
