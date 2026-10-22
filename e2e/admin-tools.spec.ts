import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN, ALL_AUDIENCES, signInAdmin, signInOrganizer } from "./hosts";

const API = process.env.API_URL ?? "http://localhost:4000";
/** Seeded by the API's `pnpm db:seed` as a platform superadmin. */
const ADMIN_EMAIL = "admin@kao.example";

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

const login = async (email: string) => (await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { audience: ALL_AUDIENCES, email } })).accessToken;

/** Signs in on the runner site. */
async function signIn(page: Page, email: string, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("อีเมล").fill(email);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
}

/** An approved organiser team of its own with a published ฿500 10K. */
async function freshOrganiser(tag: string) {
  const ownerEmail = `e2e-tools-owner-${tag}@example.com`;
  const owner = await login(ownerEmail);
  const orgName = `ทีมทดสอบค่าธรรมเนียม ${tag}`;
  const { id: orgId } = await apiCall<{ id: string }>("/v1/dev/organizations", {
    body: { nameTh: orgName, ownerEmail, status: "active", reviewEvents: false },
  });
  const org = `/v1/org/${orgId}`;
  const now = Date.now();
  const window = { startsAt: new Date(now - 86_400_000).toISOString(), endsAt: new Date(now + 30 * 86_400_000).toISOString() };
  const event = await apiCall<{ id: string }>(`${org}/events`, {
    token: owner,
    body: {
      nameTh: `งานค่าธรรมเนียม ${tag}`,
      slug: `e2e-fee-${tag}`,
      eventType: "road",
      eventDate: "2027-08-01",
      provinceCode: "BKK",
      venueName: "สวนลุมพินี",
      registrationOpensAt: window.startsAt,
      registrationClosesAt: window.endsAt,
    },
  });
  const { races } = await apiCall<{ races: { id: string }[] }>(`${org}/events/${event.id}/races`, {
    token: owner,
    body: { code: "10K", nameTh: "มินิ", distanceKm: 10, capacity: 100, bibStart: 1, bibEnd: 100 },
  });
  await apiCall(`${org}/events/${event.id}/races/${races[0].id}/price-tiers`, { token: owner, body: { name: "ปกติ", priceSatang: 50_000, ...window } });
  await apiCall(`${org}/events/${event.id}/publish`, { token: owner, body: {} });
  return { orgId, orgName, ownerEmail, eventId: event.id, raceId: races[0].id };
}

/** A paid order for one runner, bought by `email`; returns the order number. */
async function paidOrder(ev: Awaited<ReturnType<typeof freshOrganiser>>, email: string): Promise<string> {
  const token = await login(email);
  const session = await apiCall<{ id: string }>("/v1/checkout/sessions", { token, body: { eventId: ev.eventId, races: [{ raceId: ev.raceId, quantity: 1 }] } });
  const order = await apiCall<{ id: string; orderNo: string }>("/v1/orders", {
    token,
    key: true,
    body: {
      checkoutSessionId: session.id,
      buyer: { name: "ผู้ซื้อ ค่าธรรมเนียม", email, phone: "081-234-5678" },
      participants: [
        {
          raceId: ev.raceId,
          runner: {
            firstNameEn: "Fee",
            lastNameEn: "Test",
            gender: "male",
            birthDate: "1990-01-01",
            nationality: "TH",
            idDocType: "thai_id",
            idDocNumber: `1${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 900 + 100)}`,
            emergencyName: "ญาติ",
            emergencyPhone: "081-000-0000",
          },
        },
      ],
    },
  });
  await apiCall(`/v1/orders/${order.id}/payments`, { token, key: true, body: { method: "promptpay" } });
  await apiCall(`/v1/dev/orders/${order.id}/complete-payment`, { body: {} });
  return order.orderNo;
}

test("an admin sets an organiser's fee, suspends a runner, and finds both in the audit log", async ({ page, browser }) => {
  const tag = randomUUID().slice(0, 8);
  const ev = await freshOrganiser(tag);
  const runnerEmail = `e2e-tools-runner-${tag}@example.com`;
  const before = await paidOrder(ev, `e2e-tools-early-${tag}@example.com`);

  // 1. The organiser's own rate: 5% + ฿10 per runner, from now.
  await signInAdmin(page, ADMIN_EMAIL, `/organizations/${ev.orgId}`);
  await expect(page.getByRole("heading", { name: ev.orgName })).toBeVisible();
  await expect(page.getByText(/ใช้อัตรา default ของแพลตฟอร์ม/)).toBeVisible();
  await page.getByLabel("% ของยอดขาย").fill("5");
  await page.getByLabel("ค่าคงที่ต่อผู้วิ่ง (บาท)").fill("10");
  await page.getByRole("button", { name: "ตั้งอัตราเฉพาะผู้จัดนี้" }).click();
  await expect(page.getByText("ตั้งอัตราใหม่แล้ว คำสั่งซื้อใหม่ใช้อัตรานี้ทันที")).toBeVisible();
  await expect(page.getByText("อัตราเฉพาะของผู้จัดนี้")).toBeVisible();
  await expect(page.getByRole("list", { name: "อัตราของผู้จัดนี้" })).toContainText("5% + ฿10 ต่อผู้วิ่ง");

  // 2. A new order pays the new rate (5% of ฿500 + ฿10 = ฿35); the earlier one keeps its fee.
  const after = await paidOrder(ev, runnerEmail);
  const organiser = await (await browser.newContext()).newPage();
  await signInOrganizer(organiser, ev.ownerEmail, `/${ev.orgId}/events/${ev.eventId}/finance`);
  await expect(organiser.getByRole("heading", { level: 1, name: "การเงิน" })).toBeVisible();
  const rows = organiser.getByRole("row");
  await expect(rows.filter({ hasText: after })).toContainText("−฿35");
  await expect(rows.filter({ hasText: before })).not.toContainText("฿35");
  await organiser.context().close();

  // 3. The runner is signed in on their own device; the admin suspends the account and they are signed out.
  const runner = await (await browser.newContext()).newPage();
  await signIn(runner, runnerEmail, "/me/privacy");
  await expect(runner).toHaveURL(/\/me\/privacy/);

  await page.goto(`${ADMIN}/users`);
  await page.getByLabel("อีเมลหรือชื่อ").fill(runnerEmail);
  await page.getByRole("button", { name: "ค้นหา" }).click();
  await page
    .getByRole("list", { name: "รายชื่อผู้ใช้" })
    .getByRole("link", { name: new RegExp(runnerEmail) })
    .click();
  await expect(page.getByRole("heading", { name: runnerEmail })).toBeVisible();
  await expect(page.getByRole("list", { name: "คำสั่งซื้อ" })).toContainText(after);
  await page.getByPlaceholder("เหตุผล").fill("ทดสอบระงับบัญชี");
  await page.getByRole("button", { name: "ระงับบัญชี" }).click();
  await expect(page.getByText("เหตุผลที่ระงับ: ทดสอบระงับบัญชี")).toBeVisible();
  await expect(page.getByRole("button", { name: "ยกเลิกการระงับ" })).toBeVisible();

  await runner.reload();
  await expect(runner).toHaveURL(/\/login/);
  await runner.context().close();

  // 4. Both changes are in the audit log, each with what changed.
  await page.getByRole("link", { name: "บันทึกเกี่ยวกับบัญชีนี้" }).click();
  await page
    .getByRole("list", { name: "บันทึกการทำงาน" })
    .getByRole("link", { name: /ระงับบัญชีผู้ใช้/ })
    .click();
  await expect(page.getByRole("heading", { name: "ระงับบัญชีผู้ใช้" })).toBeVisible();
  await expect(page.getByText('"reason": "ทดสอบระงับบัญชี"')).toBeVisible();

  await page.goto(`${ADMIN}/organizations/${ev.orgId}`);
  await page.getByRole("link", { name: "ดูบันทึกการทำงาน" }).click();
  await expect(page).toHaveURL(new RegExp(`organizationId=${ev.orgId}`));
  await page.getByLabel("การกระทำ (ขึ้นต้นด้วย)").fill("admin.platform_fee");
  await page.getByRole("button", { name: "กรอง" }).click();
  const log = page.getByRole("list", { name: "บันทึกการทำงาน" });
  await expect(log.getByRole("link")).toHaveCount(1);
  await log.getByRole("link", { name: /ตั้งค่าธรรมเนียมแพลตฟอร์ม/ }).click();
  await expect(page.getByText('"percentBps": 500')).toBeVisible();
  await expect(page.getByText('"fixedPerRegistrationSatang": 1000')).toBeVisible();
});
