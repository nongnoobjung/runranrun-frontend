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

/** A published one-race event of its own (฿500, 80% back until race day), so refunds never touch the seeded event. */
async function freshEvent() {
  const { accessToken: token } = await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { email: ORGANIZER } });
  const { items } = await apiCall<{ items: { id: string }[] }>("/v1/org", { token });
  const org = `/v1/org/${items[0].id}`;
  const slug = `e2e-refund-${randomUUID().slice(0, 8)}`;
  const now = Date.now();
  const event = await apiCall<{ id: string }>(`${org}/events`, {
    token,
    body: {
      nameTh: `งานทดสอบคืนเงิน ${slug.slice(-8)}`, slug, eventType: "road", eventDate: "2027-06-01", provinceCode: "BKK", venueName: "สวนลุมพินี",
      registrationOpensAt: new Date(now - 86_400_000).toISOString(), registrationClosesAt: new Date(now + 30 * 86_400_000).toISOString(),
      allowRefund: true, refundPercentBps: 8000,
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
  return { token, eventId: event.id, raceId: races[0].id, path: `/organizer/${items[0].id}/events/${event.id}` };
}

/** Pays for one place as `email` straight through the API and returns the registration id. */
async function paidRunner(ev: Awaited<ReturnType<typeof freshEvent>>, email: string, firstNameEn: string): Promise<string> {
  const { accessToken: token } = await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { email } });
  const session = await apiCall<{ id: string }>("/v1/checkout/sessions", { token, body: { eventId: ev.eventId, races: [{ raceId: ev.raceId, quantity: 1 }] } });
  const order = await apiCall<{ id: string }>("/v1/orders", {
    token,
    key: true,
    body: {
      checkoutSessionId: session.id,
      buyer: { name: "ผู้ซื้อ ทดสอบ", email: "buyer@example.com", phone: "081-234-5678" },
      participants: [
        {
          raceId: ev.raceId,
          isSelf: true,
          runner: {
            firstNameTh: "ใจดี", lastNameTh: "ขอคืน", firstNameEn, lastNameEn: "Refund", gender: "male", birthDate: "1988-08-08", nationality: "TH",
            idDocType: "thai_id", idDocNumber: `1${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 900 + 100)}`,
            emergencyName: "ญาติ", emergencyPhone: "081-000-0000",
          },
        },
      ],
    },
  });
  await apiCall(`/v1/orders/${order.id}/payments`, { token, key: true, body: { method: "promptpay" } });
  await apiCall(`/v1/dev/orders/${order.id}/complete-payment`, { body: {} });
  const mine = await apiCall<{ items: { id: string }[] }>("/v1/me/registrations", { token });
  return mine.items[0].id;
}

async function signIn(page: Page, email: string, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("อีเมล").fill(email);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
}

test("a runner asks for a refund and the organiser approves and records the transfer", async ({ page, browser }) => {
  const ev = await freshEvent();
  const email = `e2e-refund-${randomUUID().slice(0, 8)}@example.com`;
  const registrationId = await paidRunner(ev, email, "Kim");

  // Runner: from the ticket to the request form.
  const theirs = await browser.newContext();
  const runner = await theirs.newPage();
  await signIn(runner, email, `/me/registrations/${registrationId}`);
  await runner.getByRole("link", { name: /ขอยกเลิกและคืนเงิน ฿400/ }).click();
  await expect(runner.getByRole("heading", { name: "ขอคืนเงิน" })).toBeVisible();
  await expect(runner.getByLabel("ยอดเงินคืน")).toContainText("฿400");
  await runner.getByText("ติดธุระ", { exact: true }).click();
  await runner.getByRole("button", { name: "ส่งคำขอคืน ฿400" }).click();
  await expect(runner.getByText("กรอกข้อมูลให้ครบก่อนส่งคำขอ")).toBeVisible();
  await runner.getByLabel("ธนาคาร").selectOption({ label: "ธนาคารกสิกรไทย" });
  await runner.getByLabel("เลขบัญชี").fill("123-4-56789-0");
  await runner.getByLabel("ชื่อบัญชี").fill("ใจดี ขอคืน");
  await runner.getByRole("button", { name: "ส่งคำขอคืน ฿400" }).click();
  await expect(runner).toHaveURL(new RegExp(`/me/registrations/${registrationId}`));
  await expect(runner.getByRole("status")).toContainText("ส่งคำขอคืนเงิน ฿400 แล้ว รอผู้จัดตอบ");

  // Organiser: approve, then record the transfer.
  await signIn(page, ORGANIZER, `${ev.path}/requests`);
  const request = page.getByRole("list", { name: "คำขอคืนเงิน" }).getByRole("listitem").filter({ hasText: "ใจดี ขอคืน" });
  await expect(request).toContainText("ติดธุระ");
  await expect(request).toContainText("1234567890");
  await request.getByRole("button", { name: "อนุมัติคืน ฿400" }).click();
  await expect(request).toContainText("รอโอนคืน");
  await request.getByLabel("เลขอ้างอิงการโอน").fill("KBANK-0001");
  await request.getByRole("button", { name: "บันทึกว่าโอนคืนแล้ว" }).click();
  await expect(page.getByText("ไม่มีคำขอที่ต้องจัดการ")).toBeVisible();
  await page.getByRole("link", { name: /เสร็จแล้ว/ }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "ใจดี ขอคืน" })).toContainText("KBANK-0001");

  // The ticket is gone from the runner's events once the place is refunded.
  await runner.goto("/me/events");
  await expect(runner.getByRole("link", { name: new RegExp(`งานทดสอบคืนเงิน`) })).toHaveCount(0);
  await theirs.close();
});

test("an organiser cancels a place from the runner detail with a partial refund", async ({ page }) => {
  const ev = await freshEvent();
  const registrationId = await paidRunner(ev, `e2e-cancel-${randomUUID().slice(0, 8)}@example.com`, "Lee");

  await signIn(page, ORGANIZER, `${ev.path}/registrations?selected=${registrationId}`);
  const detail = page.getByRole("complementary", { name: /รายละเอียด/ });
  await detail.getByRole("button", { name: "ยกเลิกสิทธิ์ / คืนเงิน" }).click();
  await expect(detail.getByLabel(/คืนเงิน \(บาท\)/)).toHaveValue("400");
  await detail.getByLabel(/คืนเงิน \(บาท\)/).fill("250");
  await detail.getByLabel("เหตุผล").fill("นักวิ่งแจ้งยกเลิกทางโทรศัพท์");
  await detail.getByRole("button", { name: "ยืนยันยกเลิกสิทธิ์" }).click();
  await expect(detail.getByText("คืนเงินแล้ว")).toBeVisible();

  await page.goto(`${ev.path}/requests`);
  const item = page.getByRole("listitem").filter({ hasText: "ใจดี ขอคืน" });
  await expect(item).toContainText("ผู้จัดยกเลิก");
  await expect(item).toContainText("฿250");
  await expect(item).toContainText("ไม่มีบัญชีรับเงินคืน");
});
