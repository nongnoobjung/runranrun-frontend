import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { ALL_AUDIENCES, orgURL, signInOrganizer } from "./hosts";

const API = process.env.API_URL ?? "http://localhost:4000";
const ORGANIZER = "organizer@riverside.example";
const SEEDED_EVENT = "riverside-night-run-2027";

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
            firstNameTh, lastNameTh: "ทดสอบ", firstNameEn: "Chujai", lastNameEn: "Tester", gender: "female", birthDate: "1992-04-01",
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

/** Signs in on the organiser backoffice and lands on the organisation's event list. */
async function signInAsOrganizer(page: Page) {
  await signInOrganizer(page, ORGANIZER);
  await expect(page).toHaveURL(orgURL("/[0-9a-f-]{36}$"));
  await expect(page.getByRole("heading", { name: "งานทั้งหมด" })).toBeVisible();
}

// With Cache Components the previous route stays in the DOM (hidden), so only match what is on screen.
const visibleLabel = (page: Page, label: string | RegExp) => page.getByLabel(label).filter({ visible: true });
const visibleButton = (page: Page, name: string | RegExp, exact = false) => page.getByRole("button", { name, exact }).filter({ visible: true });

test("an organizer sets up a new event and opens registration", async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  await signInAsOrganizer(page);
  const stamp = Date.now().toString(36);
  const name = `เทรลทดสอบ ${stamp}`;

  await page.getByRole("link", { name: "+ สร้างงานใหม่" }).click();
  await visibleLabel(page, "ชื่องาน (ภาษาไทย)").fill(name);
  await visibleLabel(page, "ชื่องาน (English)").fill(`E2E Trail ${stamp}`);
  await visibleLabel(page, "ประเภทงาน").selectOption("trail");
  await visibleLabel(page, "วันแข่ง").fill("2027-06-20");
  await visibleButton(page, "สร้างงาน (ฉบับร่าง)").click();
  await expect(page).toHaveURL(/\/edit$/);
  const eventUrl = page.url().replace(/\/edit$/, "");
  const publish = visibleButton(page, "เปิดรับสมัคร", true);
  await expect(publish).toBeDisabled();

  await visibleLabel(page, "จังหวัด").selectOption("CNX");
  await visibleLabel(page, "สถานที่จัดงาน").fill("ลานวัดพระธาตุดอยสุเทพ");
  await visibleLabel(page, /^เปิดรับสมัคร/).fill("2026-10-01T10:00");
  await visibleLabel(page, /^ปิดรับสมัคร/).fill("2027-05-31T23:59");
  await visibleButton(page, "บันทึกข้อมูลงาน").click();
  await expect(page.getByText("บันทึกข้อมูลงานแล้ว").filter({ visible: true })).toBeVisible();

  await page.goto(`${eventUrl}/races`);
  await page.getByText("+ เพิ่มระยะ").filter({ visible: true }).click();
  const raceForm = page.locator("details[open] form").filter({ visible: true }).last();
  await raceForm.getByLabel("ชื่อย่อ").fill("25K");
  await raceForm.getByLabel("ชื่อระยะ").fill("เทรล 25 กม.");
  await raceForm.getByLabel("ระยะทาง (กม.)").fill("25");
  await raceForm.getByLabel("โควต้า (คน)").fill("300");
  await raceForm.getByLabel("บิบเลขแรก").fill("1");
  await raceForm.getByLabel("บิบเลขสุดท้าย").fill("300");
  await raceForm.getByRole("button", { name: "เพิ่มระยะ" }).click();
  await expect(page.getByText(/ยังไม่มีราคา/).filter({ visible: true })).toBeVisible();

  await visibleButton(page, "+ เพิ่มช่วงราคา").click();
  const tierForm = page.locator("form").filter({ visible: true }).filter({ has: page.getByRole("button", { name: "เพิ่มช่วงราคา", exact: true }) });
  await tierForm.getByLabel("ชื่อช่วง").fill("ปกติ");
  await tierForm.getByLabel("ราคา (บาท)").fill("1,450");
  await tierForm.getByLabel("เริ่มขาย").fill("2026-10-01T10:00");
  await tierForm.getByLabel("ขายถึง").fill("2027-05-31T23:59");
  await tierForm.getByRole("button", { name: "เพิ่มช่วงราคา", exact: true }).click();
  await expect(page.getByText("฿1,450").filter({ visible: true }).first()).toBeVisible();

  await page.goto(`${eventUrl}/shirts`);
  await page.locator('input[name="stock"]').filter({ visible: true }).first().fill("150");
  await visibleButton(page, "บันทึกไซซ์เสื้อ").click();
  await expect(page.getByText("บันทึกไซซ์เสื้อแล้ว").filter({ visible: true })).toBeVisible();

  await page.goto(`${eventUrl}/edit`);
  await expect(publish).toBeEnabled();
  await publish.click();
  await expect(page.getByText(/เปิดรับสมัครแล้ว/).filter({ visible: true }).first()).toBeVisible();
  const slug = await page.locator('input[name="slug"]').filter({ visible: true }).inputValue();

  // Runners can now see it.
  await page.goto(`/events/${slug}`);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText("25K").first()).toBeVisible();
});

test("an organizer finds a runner, and staff hand over the kit once", async ({ page }) => {
  const registrationNo = await paidRunner(`ชูใจ${Date.now().toString(36).slice(-4)}`);
  await signInAsOrganizer(page);
  await page.getByRole("link", { name: /Riverside Night Run 2027/ }).first().click();
  await expect(page.getByRole("heading", { name: "ภาพรวม" })).toBeVisible();
  const eventUrl = page.url();

  await page.goto(`${eventUrl}/registrations`);
  await page.getByRole("searchbox").filter({ visible: true }).fill(registrationNo);
  await visibleButton(page, "ค้นหา", true).click();
  await expect(page).toHaveURL(new RegExp(`q=${registrationNo}`));
  await page.getByRole("link", { name: /ชูใจ/ }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/selected=/);
  await visibleButton(page, "แสดง", true).click();
  await expect(page.getByText(/^\d{13}$/).filter({ visible: true })).toBeVisible();

  await page.goto(`${eventUrl}/checkin`);
  const input = page.getByPlaceholder("พิมพ์เลขบิบ หรือเลขสมัคร");
  await input.fill(registrationNo);
  await input.press("Enter");
  await expect(page.getByRole("heading", { name: "มอบของได้" })).toBeVisible();
  await page.getByRole("button", { name: "ยืนยัน ให้เสื้อและบิบแล้ว" }).dblclick();
  await expect(page.getByRole("heading", { name: /บันทึกแล้ว/ })).toBeVisible();
  await page.getByRole("button", { name: "สแกนคนต่อไป" }).click();

  await input.fill(registrationNo);
  await input.press("Enter");
  await expect(page.getByRole("heading", { name: "รับไปแล้ว" })).toBeVisible();
});
