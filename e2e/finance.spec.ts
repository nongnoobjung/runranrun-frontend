import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

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

/** A published ฿500 10K of its own, so the money on it is only what this test puts there. */
async function freshEvent() {
  const { accessToken: token } = await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { email: ORGANIZER } });
  const { items } = await apiCall<{ items: { id: string }[] }>("/v1/org", { token });
  const org = `/v1/org/${items[0].id}`;
  const slug = `e2e-finance-${randomUUID().slice(0, 8)}`;
  const now = Date.now();
  const event = await apiCall<{ id: string }>(`${org}/events`, {
    token,
    body: {
      nameTh: `งานทดสอบการเงิน ${slug.slice(-8)}`, slug, eventType: "road", eventDate: "2027-06-01", provinceCode: "BKK", venueName: "สวนลุมพินี",
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
  return { eventId: event.id, raceId: races[0].id, path: `/organizer/${items[0].id}/events/${event.id}` };
}

/** One order for one place; paid unless `pay` is false. Returns the order number. */
async function order(ev: Awaited<ReturnType<typeof freshEvent>>, pay: boolean): Promise<string> {
  const { accessToken: token } = await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { email: `e2e-fin-${randomUUID()}@example.com` } });
  const session = await apiCall<{ id: string }>("/v1/checkout/sessions", { token, body: { eventId: ev.eventId, races: [{ raceId: ev.raceId, quantity: 1 }] } });
  const created = await apiCall<{ id: string; orderNo: string }>("/v1/orders", {
    token,
    key: true,
    body: {
      checkoutSessionId: session.id,
      buyer: { name: "ผู้ซื้อ การเงิน", email: "buyer@example.com", phone: "081-234-5678" },
      participants: [
        {
          raceId: ev.raceId,
          runner: {
            firstNameEn: "Fin", lastNameEn: "Test", gender: "female", birthDate: "1991-05-05", nationality: "TH", idDocType: "thai_id",
            idDocNumber: `1${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 900 + 100)}`, emergencyName: "ญาติ", emergencyPhone: "081-000-0000",
          },
        },
      ],
    },
  });
  if (pay) {
    await apiCall(`/v1/orders/${created.id}/payments`, { token, key: true, body: { method: "promptpay" } });
    await apiCall(`/v1/dev/orders/${created.id}/complete-payment`, { body: {} });
  }
  return created.orderNo;
}

test("an organiser sees the event's money, its transactions and exports them", async ({ page }) => {
  const ev = await freshEvent();
  const paid = await order(ev, true);
  const pending = await order(ev, false);

  await page.goto(`/login?next=${encodeURIComponent(`${ev.path}/finance`)}`);
  await page.getByLabel("อีเมล").fill(ORGANIZER);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "การเงิน" })).toBeVisible();

  const kpis = page.getByRole("region", { name: "สรุปยอด" });
  await expect(kpis).toContainText("฿500");
  await expect(kpis).toContainText("1 คำสั่งซื้อ · 1 ผู้วิ่ง");
  await expect(page.getByText(/ยังมี 1 คำสั่งซื้อรอชำระ/)).toBeVisible();

  const rows = page.getByRole("row");
  await expect(rows.filter({ hasText: paid })).toContainText("สำเร็จ");
  await expect(rows.filter({ hasText: pending })).toContainText("รอชำระ");
  await page.getByRole("link", { name: "รอชำระ", exact: true }).click();
  await expect(page).toHaveURL(/tab=pending/);
  await expect(rows.filter({ hasText: paid })).toHaveCount(0);
  await expect(page.getByText("แสดง 1 จาก 1 ธุรกรรม")).toBeVisible();

  const csv = await page.request.get(`${ev.path}/finance/export`);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const text = await csv.text();
  expect(text).toContain("order_no,status,created_at");
  expect(text).toContain(paid);
  expect(text).toContain(pending);
});
