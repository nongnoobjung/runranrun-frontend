import { expect, test } from "@playwright/test";

const EVENT = "Riverside Night Run 2027";

/** A unique 13-digit number so each run is a new person (one place per ID per race). */
function idNumber(): string {
  return `1${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 900 + 100)}`;
}

test("a runner registers, pays with PromptPay and gets a ticket with a bib", async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "งานที่กำลังมา" })).toBeVisible();
  await page.getByRole("link", { name: new RegExp(EVENT) }).first().click();

  await expect(page.getByRole("heading", { level: 1, name: EVENT })).toBeVisible();
  await page.getByRole("button", { name: /^สมัคร 1 คน/ }).click();

  // Not signed in yet: sent to log in, then back to the event.
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel("อีเมล").fill(email);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: EVENT })).toBeVisible();
  await page.getByRole("button", { name: /^สมัคร 1 คน/ }).click();

  await expect(page).toHaveURL(/\/checkout\//);
  await expect(page.getByText(/จองที่ไว้\s+\d\d:\d\d/)).toBeVisible();

  await page.getByLabel("ชื่อ (ไทย)").fill("สมชาย");
  await page.getByLabel("นามสกุล (ไทย)").fill("ใจดี");
  await page.getByLabel(/First name/).fill("Somchai");
  await page.getByLabel(/Last name/).fill("Jaidee");
  await page.getByLabel(/วันเกิด/).fill("1990-03-12");
  await page.getByLabel(/เลขบัตร/).fill(idNumber());
  await page.getByLabel(/^ผู้ติดต่อฉุกเฉิน/).fill("สมหญิง ใจดี");
  await page.getByLabel(/เบอร์ผู้ติดต่อฉุกเฉิน/).fill("081-234-5678");
  // The radio is visually hidden behind its size tile, so click the tile like a person would.
  await page.locator("label").filter({ has: page.getByRole("radio", { name: /^M\s/ }) }).click();
  await expect(page.getByRole("radio", { name: /^M\s/ })).toBeChecked();
  await page.getByLabel(/ชื่อ-นามสกุล/).fill("สมชาย ใจดี");
  await page.getByLabel(/อีเมล \(รับใบเสร็จ\)/).fill(email);
  await page.getByLabel(/^เบอร์โทร/).last().fill("081-234-5678");
  await page.getByLabel(/โค้ดส่วนลด/).fill("RUN10");
  await page.getByRole("button", { name: "ไปชำระเงิน" }).click();

  await expect(page).toHaveURL(/\/orders\/.+\/pay/);
  await expect(page.getByText("ส่วนลด", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /สร้าง QR ชำระ/ }).click();
  await expect(page.getByText("THAI QR PAYMENT")).toBeVisible();
  await expect(page.getByRole("img", { name: /QR PromptPay/ })).toBeVisible();

  await page.getByRole("button", { name: /จำลองว่าจ่ายแล้ว/ }).click();
  await expect(page.getByRole("heading", { name: "ชำระเงินสำเร็จ" })).toBeVisible();

  await page.getByRole("link", { name: "ดูบัตรวิ่ง" }).click();
  await expect(page.getByRole("heading", { name: "งานของฉัน" })).toBeVisible();
  await page.getByRole("link", { name: new RegExp(EVENT) }).first().click();
  await expect(page.getByText("BIB NUMBER")).toBeVisible();
  await expect(page.getByRole("img", { name: "QR สำหรับรับเสื้อและบิบ" })).toBeVisible();
  await expect(page.getByText(/^\d{4}$/).first()).toBeVisible();
});

test("validation errors keep what the runner typed", async ({ page }) => {
  const email = `e2e-val-${Date.now()}@example.com`;
  await page.goto("/login?next=/events/riverside-night-run-2027");
  await page.getByLabel("อีเมล").fill(email);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await page.getByRole("button", { name: /^สมัคร 1 คน/ }).click();
  await expect(page).toHaveURL(/\/checkout\//);

  await page.getByLabel(/First name/).fill("Somchai");
  await page.getByRole("button", { name: "ไปชำระเงิน" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "กรอกข้อมูลให้ครบ" })).toBeVisible();
  await expect(page.getByLabel(/First name/)).toHaveValue("Somchai");

  await page.getByRole("button", { name: "ยกเลิกและคืนที่ที่จองไว้" }).click();
  await expect(page.getByRole("heading", { level: 1, name: EVENT })).toBeVisible();
});
