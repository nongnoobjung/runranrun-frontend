import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

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

/** A published event of its own whose only race has one place, already sold, with the waitlist on. */
async function fullEvent() {
  const { accessToken: token } = await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { email: ORGANIZER } });
  const { items } = await apiCall<{ items: { id: string }[] }>("/v1/org", { token });
  const org = `/v1/org/${items[0].id}`;
  const slug = `e2e-queue-${randomUUID().slice(0, 8)}`;
  const now = Date.now();
  const event = await apiCall<{ id: string }>(`${org}/events`, {
    token,
    body: {
      nameTh: `งานทดสอบคิว ${slug.slice(-8)}`, slug, eventType: "road", eventDate: "2027-06-01", provinceCode: "BKK", venueName: "สวนลุมพินี",
      registrationOpensAt: new Date(now - 86_400_000).toISOString(), registrationClosesAt: new Date(now + 30 * 86_400_000).toISOString(), waitlistEnabled: true,
    },
  });
  const { races } = await apiCall<{ races: { id: string }[] }>(`${org}/events/${event.id}/races`, {
    token,
    body: { code: "5K", nameTh: "ฟันรัน", distanceKm: 5, capacity: 1, bibStart: 1, bibEnd: 100 },
  });
  await apiCall(`${org}/events/${event.id}/races/${races[0].id}/price-tiers`, {
    token,
    body: { name: "ปกติ", priceSatang: 65_000, startsAt: new Date(now - 86_400_000).toISOString(), endsAt: new Date(now + 30 * 86_400_000).toISOString() },
  });
  await apiCall(`${org}/events/${event.id}/publish`, { token, body: {} });

  const { accessToken: buyerToken } = await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { email: `e2e-q-${randomUUID()}@example.com` } });
  const session = await apiCall<{ id: string }>("/v1/checkout/sessions", { token: buyerToken, body: { eventId: event.id, races: [{ raceId: races[0].id, quantity: 1 }] } });
  const order = await apiCall<{ id: string; registrations: { id: string }[] }>("/v1/orders", {
    token: buyerToken,
    key: true,
    body: {
      checkoutSessionId: session.id,
      buyer: { name: "ผู้ซื้อ", email: "buyer@example.com", phone: "081-234-5678" },
      participants: [
        {
          raceId: races[0].id,
          runner: {
            firstNameEn: "Early", lastNameEn: "Bird", gender: "male", birthDate: "1990-01-01", nationality: "TH", idDocType: "thai_id",
            idDocNumber: `1${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 900 + 100)}`, emergencyName: "ญาติ", emergencyPhone: "081-000-0000",
          },
        },
      ],
    },
  });
  await apiCall(`/v1/orders/${order.id}/payments`, { token: buyerToken, key: true, body: { method: "promptpay" } });
  await apiCall(`/v1/dev/orders/${order.id}/complete-payment`, { body: {} });
  return { token, org, slug, eventId: event.id, registrationId: order.registrations[0].id, path: `/organizer/${items[0].id}/events/${event.id}` };
}

async function signIn(page: Page, email: string, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("อีเมล").fill(email);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
}

test("a runner queues for a full race and takes the place when it frees up", async ({ page, browser }) => {
  const ev = await fullEvent();

  await signIn(page, `e2e-queue-${randomUUID().slice(0, 8)}@example.com`, `/events/${ev.slug}`);
  await expect(page.getByText("เต็มแล้ว")).toBeVisible();
  await page.getByRole("button", { name: "เข้าคิว waitlist 5K" }).click();
  await expect(page).toHaveURL(/\/me\/waitlist/);
  const entry = page.getByRole("list", { name: "คิวของฉัน" }).getByRole("listitem");
  await expect(entry).toContainText("คุณอยู่คิวที่");
  await expect(entry).toContainText("คิวถัดไปคือคุณ");

  // The organiser sees the queue; then the sold place is cancelled and offered to the runner at once.
  const theirs = await browser.newContext();
  const organiser = await theirs.newPage();
  await signIn(organiser, ORGANIZER, `${ev.path}/waitlist`);
  await expect(organiser.getByRole("list", { name: "คิว 5K" })).toContainText("รอคิว");
  await apiCall(`${ev.org}/events/${ev.eventId}/registrations/${ev.registrationId}/cancel`, { token: ev.token, body: { refundSatang: 0, reason: "ยกเลิกเอง" } });

  await page.reload();
  await expect(entry).toContainText("ถึงคิวคุณแล้ว");
  await expect(entry).toContainText(/\d{1,2}:\d{2}:\d{2}/);
  await page.getByRole("button", { name: /สมัครและชำระเงิน · ฿650/ }).click();
  await expect(page).toHaveURL(/\/checkout\//);
  await expect(page.getByText(/จองที่ไว้\s+\d\d:\d\d/)).toBeVisible();

  await organiser.reload();
  await expect(organiser.getByRole("list", { name: "คิว 5K" })).toContainText("กำลังสมัคร");
  await theirs.close();
});
