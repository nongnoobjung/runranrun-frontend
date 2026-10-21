import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const API = process.env.API_URL ?? "http://localhost:4000";
/** Seeded by the API's `pnpm db:seed` as a platform superadmin. */
const ADMIN = "admin@kao.example";

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

const login = async (email: string) => (await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { email } })).accessToken;

async function signIn(page: Page, email: string, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("อีเมล").fill(email);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
}

test("an admin approves a new organiser, reviews its first event and pays it out", async ({ page }) => {
  // A brand-new organiser team waiting for KYC, with one draft event ready to open.
  const tag = randomUUID().slice(0, 6);
  const orgName = `ทีมทดสอบแอดมิน ${tag}`;
  const owner = await login(`e2e-admin-owner-${tag}@example.com`);
  const { id: orgId } = await apiCall<{ id: string }>("/v1/dev/organizations", { body: { nameTh: orgName, ownerEmail: `e2e-admin-owner-${tag}@example.com` } });
  const org = `/v1/org/${orgId}`;
  const now = Date.now();
  const window = { startsAt: new Date(now - 86_400_000).toISOString(), endsAt: new Date(now + 30 * 86_400_000).toISOString() };
  const eventName = `งานรอตรวจ ${tag}`;
  const slug = `e2e-review-${tag}`;
  const event = await apiCall<{ id: string }>(`${org}/events`, {
    token: owner,
    body: {
      nameTh: eventName, slug, eventType: "road", eventDate: "2027-07-04", provinceCode: "CNX", venueName: "ประตูท่าแพ",
      registrationOpensAt: window.startsAt, registrationClosesAt: window.endsAt,
    },
  });
  const { races } = await apiCall<{ races: { id: string }[] }>(`${org}/events/${event.id}/races`, {
    token: owner,
    body: { code: "10K", nameTh: "มินิ", distanceKm: 10, capacity: 100, bibStart: 1, bibEnd: 100 },
  });
  await apiCall(`${org}/events/${event.id}/races/${races[0].id}/price-tiers`, { token: owner, body: { name: "ปกติ", priceSatang: 50_000, ...window } });

  // 1. KYC: approve the team and record its checked bank account.
  await signIn(page, ADMIN, "/admin/organizations?status=pending_kyc");
  await page.getByRole("list", { name: "รายชื่อผู้จัด" }).getByRole("link", { name: new RegExp(orgName) }).click();
  await expect(page.getByRole("heading", { name: orgName })).toBeVisible();
  await page.getByRole("button", { name: "อนุมัติ KYC" }).click();
  await expect(page.getByText(/^ผ่านเมื่อ/)).toBeVisible();
  await expect(page.getByRole("button", { name: "อนุมัติ KYC" })).toHaveCount(0);
  await page.getByLabel("ธนาคาร").selectOption("KBANK");
  await page.getByLabel("เลขบัญชี").fill("123-4-56789-0");
  await page.getByLabel("ชื่อบัญชี").fill(orgName);
  await page.getByRole("button", { name: "บันทึกบัญชีที่ตรวจแล้ว" }).click();
  await expect(page.getByText(/ธนาคารกสิกรไทย ••••7890/)).toBeVisible();

  // 2. Review: the first opening waits; sent back once, then approved.
  expect((await apiCall<{ status: string }>(`${org}/events/${event.id}/publish`, { token: owner, body: {} })).status).toBe("pending_review");
  await page.goto("/admin/reviews");
  await page.getByRole("list", { name: "งานรอตรวจ" }).getByRole("link", { name: new RegExp(eventName) }).click();
  await page.getByLabel(/ส่งกลับให้ผู้จัดแก้/).fill("ใส่รายละเอียดเส้นทาง");
  await page.getByRole("button", { name: "ส่งกลับให้แก้" }).click();
  await expect(page.getByText("ส่งกลับให้ผู้จัดแก้แล้ว")).toBeVisible();
  const draft = await apiCall<{ status: string; review: { note: string } }>(`${org}/events/${event.id}`, { token: owner });
  expect(draft).toMatchObject({ status: "draft", review: { note: "ใส่รายละเอียดเส้นทาง" } });

  await apiCall(`${org}/events/${event.id}/publish`, { token: owner, body: {} });
  await page.goto(`/admin/reviews/${event.id}`);
  await page.getByRole("button", { name: "อนุมัติและเปิดรับสมัคร" }).click();
  await expect(page.getByText("อนุมัติแล้ว งานเปิดรับสมัครทันที")).toBeVisible();
  await page.goto(`/events/${slug}`);
  await expect(page.getByRole("heading", { level: 1, name: eventName })).toBeVisible();

  // 3. Payout: a runner pays, then the admin settles, approves and records the transfer.
  const buyer = await login(`e2e-admin-buyer-${tag}@example.com`);
  const session = await apiCall<{ id: string }>("/v1/checkout/sessions", { token: buyer, body: { eventId: event.id, races: [{ raceId: races[0].id, quantity: 1 }] } });
  const order = await apiCall<{ id: string }>("/v1/orders", {
    token: buyer,
    key: true,
    body: {
      checkoutSessionId: session.id,
      buyer: { name: "ผู้ซื้อ", email: "buyer@example.com", phone: "081-234-5678" },
      participants: [
        {
          raceId: races[0].id,
          runner: {
            firstNameEn: "Pay", lastNameEn: "Out", gender: "male", birthDate: "1990-01-01", nationality: "TH", idDocType: "thai_id",
            idDocNumber: `1${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 900 + 100)}`, emergencyName: "ญาติ", emergencyPhone: "081-000-0000",
          },
        },
      ],
    },
  });
  await apiCall(`/v1/orders/${order.id}/payments`, { token: buyer, key: true, body: { method: "promptpay" } });
  await apiCall(`/v1/dev/orders/${order.id}/complete-payment`, { body: {} });

  await page.goto("/admin/payouts");
  const owed = page.getByRole("list", { name: "งานที่มียอดค้างจ่าย" }).getByRole("listitem").filter({ hasText: eventName });
  await owed.getByRole("button", { name: "สร้างรอบจ่าย" }).click();
  const round = page.getByRole("list", { name: "รอบจ่าย" }).getByRole("listitem").filter({ hasText: eventName });
  await expect(round).toContainText("รออนุมัติ");
  await round.getByRole("button", { name: "อนุมัติรอบนี้" }).click();
  await expect(round).toContainText("รอโอน");
  await expect(round).toContainText("••••7890");
  await round.getByLabel(/เลขอ้างอิงการโอน/).fill(`KB-${tag}`);
  await round.getByRole("button", { name: "บันทึกว่าโอนแล้ว" }).click();
  await expect(round).toContainText("โอนแล้ว");
  await expect(round).toContainText(`อ้างอิง KB-${tag}`);

  const finance = await apiCall<{ summary: { netSatang: number; paidOutSatang: number; toPayOutSatang: number } }>(`${org}/events/${event.id}/finance`, { token: owner });
  expect(finance.summary.paidOutSatang).toBe(finance.summary.netSatang);
  expect(finance.summary.toPayOutSatang).toBe(0);
});

test("people without a platform role cannot open the admin pages", async ({ page }) => {
  await signIn(page, `e2e-not-admin-${randomUUID().slice(0, 6)}@example.com`, "/admin");
  await expect(page.getByRole("heading", { name: "ไม่พบหน้านี้" })).toBeVisible();
});
