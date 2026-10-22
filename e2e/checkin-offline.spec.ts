import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { ALL_AUDIENCES, orgURL, signInOrganizer } from "./hosts";

const API = process.env.API_URL ?? "http://localhost:4000";
const ORGANIZER = "organizer@riverside.example";
const SEEDED_EVENT = "riverside-night-run-2027";

async function apiCall<T>(path: string, init: { token?: string; body?: unknown; key?: boolean } = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init.body ? "POST" : "GET",
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

interface SeededEvent {
  id: string;
  races: { id: string; code: string }[];
  products: { type: string; variants: { id: string; label: string }[] }[];
}

/** Registers and pays for one 10K place on the seeded event straight through the API. */
async function paidRunner(firstNameTh: string): Promise<string> {
  const { accessToken: token } = await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { audience: ALL_AUDIENCES, email: `e2e-runner-${randomUUID()}@example.com` } });
  const event = await apiCall<SeededEvent>(`/v1/events/${SEEDED_EVENT}`);
  const race = event.races.find((r) => r.code === "10K")!;
  const shirt = event.products.find((p) => p.type === "shirt")!.variants.find((v) => v.label === "M")!;
  const session = await apiCall<{ id: string }>("/v1/checkout/sessions", {
    token,
    body: { eventId: event.id, races: [{ raceId: race.id, quantity: 1 }], variants: [{ variantId: shirt.id, quantity: 1 }] },
  });
  const idDocNumber = `1${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 900 + 100)}`;
  const order = await apiCall<{ id: string; registrations: { registrationNo: string }[] }>("/v1/orders", {
    token,
    key: true,
    body: {
      checkoutSessionId: session.id,
      buyer: { name: `${firstNameTh} ทดสอบ`, email: "buyer@example.com", phone: "081-234-5678" },
      participants: [
        {
          raceId: race.id,
          shirtVariantId: shirt.id,
          runner: {
            firstNameTh, lastNameTh: "ทดสอบ", firstNameEn: "Offline", lastNameEn: "Tester", gender: "female", birthDate: "1992-04-01",
            nationality: "TH", idDocType: "thai_id", idDocNumber, emergencyName: "ญาติ ทดสอบ", emergencyPhone: "081-000-0000",
          },
        },
      ],
    },
  });
  await apiCall(`/v1/orders/${order.id}/payments`, { token, key: true, body: { method: "promptpay" } });
  await apiCall(`/v1/dev/orders/${order.id}/complete-payment`, { body: {} });
  return order.registrations[0].registrationNo;
}

/** Signs in as the seeded organiser and opens the check-in page of the seeded event; returns the event's backoffice URL. */
async function openCheckin(page: Page): Promise<string> {
  await signInOrganizer(page, ORGANIZER);
  await expect(page.getByRole("heading", { name: "งานทั้งหมด" })).toBeVisible();
  await page.getByRole("link", { name: /Riverside Night Run 2027/ }).first().click();
  await expect(page.getByRole("heading", { name: "ภาพรวม" })).toBeVisible();
  const eventUrl = page.url();
  expect(eventUrl).toMatch(orgURL("/[0-9a-f-]{36}/events/[^/]+$"));
  await page.goto(`${eventUrl}/checkin`);
  await expect(page.getByText(/^รายชื่อ ณ /)).toBeVisible();
  return eventUrl;
}

const status = (page: Page) => page.getByRole("status").filter({ hasText: /ออนไลน์|ออฟไลน์/ });
const queued = (page: Page, n: number) => page.getByLabel(`รอส่ง ${n} รายการ`);

async function scan(page: Page, code: string) {
  const input = page.getByPlaceholder("พิมพ์เลขบิบ หรือเลขสมัคร");
  await input.fill(code);
  await input.press("Enter");
}

test("staff hand over a kit with no network, and it syncs once the network is back", async ({ page, context }) => {
  const name = `ออฟ${Date.now().toString(36).slice(-4)}`;
  const registrationNo = await paidRunner(name);
  const eventUrl = await openCheckin(page);
  await expect(status(page)).toHaveText("ออนไลน์");

  // The page has been opened online once, so it opens again from the service worker with no network.
  await expect
    .poll(() => page.evaluate(async () => (await (await caches.open("kao-checkin-v2")).keys()).some((r) => r.url.endsWith("/checkin"))), { timeout: 15_000 })
    .toBe(true);
  await context.setOffline(true);
  await expect(status(page)).toHaveText("ออฟไลน์");
  const reloaded = await page.reload();
  expect(reloaded?.fromServiceWorker()).toBe(true);
  await expect(status(page)).toHaveText("ออฟไลน์");
  await expect(page.getByText(/^รายชื่อ ณ /)).toBeVisible();

  await scan(page, registrationNo.toLowerCase());
  await expect(page.getByRole("heading", { name: "มอบของได้" })).toBeVisible();
  await expect(page.getByText("ตรวจจากรายชื่อในเครื่อง (ออฟไลน์)")).toBeVisible();
  await page.getByPlaceholder("ชื่อผู้รับแทน").fill("แม่");
  await page.getByRole("button", { name: "ยืนยัน ให้เสื้อและบิบแล้ว" }).click();
  await expect(page.getByRole("heading", { name: "✓ บันทึกในเครื่องแล้ว" })).toBeVisible();
  await expect(queued(page, 1)).toBeVisible();
  await page.getByRole("button", { name: "สแกนคนต่อไป" }).click();

  // The same ticket again on this device is refused while the first pickup is still in the queue.
  await scan(page, registrationNo);
  await expect(page.getByRole("heading", { name: "รับไปแล้ว" })).toBeVisible();
  await page.getByRole("button", { name: "สแกนคนต่อไป" }).click();

  await context.setOffline(false);
  await expect(status(page)).toHaveText("ออนไลน์");
  await expect(queued(page, 0)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("region", { name: "ส่งไม่สำเร็จ" })).toHaveCount(0);

  // Listed under "รับแล้ว"; phones also show the "รับของแล้ว" pill on the runner's card.
  await page.goto(`${eventUrl}/registrations?q=${registrationNo}&pickup=picked`);
  await expect(page.getByRole("link", { name: new RegExp(name) }).filter({ visible: true })).toHaveCount(1);
  if (test.info().project.name === "mobile") await expect(page.getByText("รับของแล้ว").filter({ visible: true })).toBeVisible();
});

test("a kit handed over offline that another table already gave out is reported after sync", async ({ page, context }) => {
  const registrationNo = await paidRunner(`ชน${Date.now().toString(36).slice(-4)}`);
  const eventUrl = await openCheckin(page);
  const [, orgId, eventId] = new URL(eventUrl).pathname.match(/^\/([^/]+)\/events\/([^/]+)/)!;

  await context.setOffline(true);
  await expect(status(page)).toHaveText("ออฟไลน์");
  // Meanwhile another table, still online, hands over the same kit.
  const { accessToken } = await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { audience: ALL_AUDIENCES, email: ORGANIZER } });
  await apiCall(`/v1/org/${orgId}/events/${eventId}/checkins`, { token: accessToken, body: { code: registrationNo, clientUuid: randomUUID() } });

  await scan(page, registrationNo);
  await page.getByRole("button", { name: "ยืนยัน ให้เสื้อและบิบแล้ว" }).click();
  await expect(queued(page, 1)).toBeVisible();
  await page.getByRole("button", { name: "สแกนคนต่อไป" }).click();

  await context.setOffline(false);
  const conflicts = page.getByRole("region", { name: "ส่งไม่สำเร็จ" });
  await expect(conflicts).toContainText("ส่งไม่สำเร็จ 1 รายการ", { timeout: 15_000 });
  await expect(conflicts).toContainText("รับไปแล้วที่จุดอื่น");
  await expect(queued(page, 0)).toBeVisible();
  await conflicts.getByRole("button", { name: "รับทราบ" }).click();
  await expect(conflicts).toHaveCount(0);
});
