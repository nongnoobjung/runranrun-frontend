import { expect, test } from "@playwright/test";

const API = process.env.API_URL ?? "http://localhost:4000";
const EVENT = "Riverside Night Run 2027";
/** A valid 13-digit tax ID (checksum included) that is not the organiser's own. */
const BUYER_TAX_ID = "0107536000315";

function idNumber(): string {
  return `1${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 900 + 100)}`;
}

test("a paid order has a printable receipt that becomes a full tax invoice on request", async ({ page, request }) => {
  const email = `e2e-receipt-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

  await page.goto("/login");
  await page.getByLabel("อีเมล").fill(email);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto("/events/riverside-night-run-2027");
  await expect(page.getByRole("heading", { level: 1, name: EVENT })).toBeVisible();
  await page.getByRole("button", { name: /^สมัคร 1 คน/ }).click();

  await expect(page).toHaveURL(/\/checkout\//);
  await page.getByLabel(/First name/).fill("Somchai");
  await page.getByLabel(/Last name/).fill("Jaidee");
  await page.getByLabel(/วันเกิด/).fill("1990-03-12");
  await page.getByLabel(/เลขบัตร/).fill(idNumber());
  await page.getByLabel(/^ผู้ติดต่อฉุกเฉิน/).fill("สมหญิง ใจดี");
  await page.getByLabel(/เบอร์ผู้ติดต่อฉุกเฉิน/).fill("081-234-5678");
  await page.locator("label").filter({ has: page.getByRole("radio", { name: /^M\s/ }) }).click();
  await page.getByLabel(/ชื่อ-นามสกุล/).fill("สมชาย ใจดี");
  await page.getByLabel(/อีเมล \(รับใบเสร็จ\)/).fill(email);
  await page.getByLabel(/^เบอร์โทร/).last().fill("081-234-5678");
  // The tax invoice section is optional and stays closed unless asked for.
  await expect(page.getByLabel(/เลขประจำตัวผู้เสียภาษี/)).toHaveCount(0);
  await page.getByRole("checkbox", { name: /ยินยอมให้ส่งข้อมูลผู้วิ่ง/ }).check();
  await page.getByRole("button", { name: "ไปชำระเงิน" }).click();

  await expect(page).toHaveURL(/\/orders\/.+\/pay/);
  const orderId = page.url().match(/\/orders\/([^/]+)\/pay/)![1];
  await page.getByRole("button", { name: /สร้าง QR ชำระ/ }).click();
  await page.getByRole("button", { name: /จำลองว่าจ่ายแล้ว/ }).click();
  await expect(page.getByRole("heading", { name: "ชำระเงินสำเร็จ" })).toBeVisible();
  await expect(page.getByText(/เราส่งอีเมลยืนยันพร้อมลิงก์ใบเสร็จ/)).toBeVisible();

  await page.getByRole("link", { name: "ดูใบเสร็จ" }).click();
  await expect(page).toHaveURL(new RegExp(`/orders/${orderId}/receipt$`));
  await expect(page.getByRole("heading", { level: 1, name: /^ใบเสร็จรับเงิน/ })).toBeVisible();
  await expect(page.getByText(/^RC\d{4}-\d{6}$/)).toBeVisible();
  await expect(page.getByText("สมชาย ใจดี", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /พิมพ์/ })).toBeVisible();
  const firstNumber = await page.getByText(/^RC\d{4}-\d{6}$/).textContent();

  // A wrong tax ID is caught before anything is issued.
  await page.getByLabel("ชื่อบริษัท หรือ ชื่อ-นามสกุล").fill("บริษัท วิ่งดี จำกัด");
  await page.getByLabel(/เลขประจำตัวผู้เสียภาษี 13 หลัก/).fill("0107536000316");
  await page.getByLabel(/ที่อยู่ที่จะพิมพ์/).fill("99 ถนนพระราม 4 แขวงสีลม เขตบางรัก กรุงเทพมหานคร 10500");
  await page.getByRole("button", { name: "ออกใบกำกับภาษี" }).click();
  await expect(page.getByText(/เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง/)).toBeVisible();

  await page.getByLabel(/เลขประจำตัวผู้เสียภาษี 13 หลัก/).fill(BUYER_TAX_ID);
  await page.getByRole("button", { name: "ออกใบกำกับภาษี" }).click();
  await expect(page.getByText("บริษัท วิ่งดี จำกัด", { exact: true })).toBeVisible();
  await expect(page.getByText(`เลขประจำตัวผู้เสียภาษี ${BUYER_TAX_ID} · สำนักงานใหญ่`)).toBeVisible();
  await expect(page.getByText(/99 ถนนพระราม 4/)).toBeVisible();
  await expect(page.getByText(`ออกแทนเอกสารเลขที่ ${firstNumber} ซึ่งยกเลิกแล้ว`)).toBeVisible();
  await expect(page.getByRole("button", { name: "ออกใบกำกับภาษี" })).toHaveCount(0);
  await expect(page.getByText(/^RC\d{4}-\d{6}$/)).not.toHaveText(firstNumber!);

  // The same document reads in English on the English site.
  await page.goto(`/en/orders/${orderId}/receipt`);
  await expect(page.getByRole("heading", { level: 1, name: /^Receipt/ })).toBeVisible();
  await expect(page.getByText(`Tax ID ${BUYER_TAX_ID} · Head office`)).toBeVisible();

  // The "payment received" email went out once, with a link to this receipt.
  const emails = await request.get(`${API}/v1/dev/emails?to=${encodeURIComponent(email)}`);
  const items = (await emails.json()).items as { template: string; subject: string; text: string }[];
  expect(items.filter((e) => e.template === "order_paid")).toHaveLength(1);
  expect(items[0].text).toContain(`/orders/${orderId}/receipt`);
});

test("the receipt prints on A4 without the site's header and forms", async ({ page }) => {
  const email = `e2e-print-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/login");
  await page.getByLabel("อีเมล").fill(email);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto("/events/riverside-night-run-2027");
  await expect(page.getByRole("heading", { level: 1, name: EVENT })).toBeVisible();
  await page.getByRole("button", { name: /^สมัคร 1 คน/ }).click();
  await expect(page).toHaveURL(/\/checkout\//);
  await page.getByLabel(/First name/).fill("Somying");
  await page.getByLabel(/Last name/).fill("Jaidee");
  await page.getByLabel(/วันเกิด/).fill("1991-05-02");
  await page.getByLabel(/เลขบัตร/).fill(idNumber());
  await page.getByLabel(/^ผู้ติดต่อฉุกเฉิน/).fill("สมชาย ใจดี");
  await page.getByLabel(/เบอร์ผู้ติดต่อฉุกเฉิน/).fill("081-234-5678");
  await page.locator("label").filter({ has: page.getByRole("radio", { name: /^M\s/ }) }).click();
  await page.getByLabel(/ชื่อ-นามสกุล/).fill("สมหญิง ใจดี");
  await page.getByLabel(/อีเมล \(รับใบเสร็จ\)/).fill(email);
  await page.getByLabel(/^เบอร์โทร/).last().fill("081-234-5678");
  // Asked for at checkout: the receipt is a full tax invoice from the start.
  await page.getByRole("checkbox", { name: /ต้องการใบกำกับภาษีเต็มรูป/ }).check();
  await page.getByLabel("ชื่อบริษัท หรือ ชื่อ-นามสกุล").fill("สมหญิง ใจดี");
  await page.getByLabel(/เลขประจำตัวผู้เสียภาษี 13 หลัก/).fill(BUYER_TAX_ID);
  await page.getByRole("radio", { name: "บุคคลธรรมดา" }).check();
  await page.getByLabel(/ที่อยู่ที่จะพิมพ์/).fill("12 ซอยสุขุมวิท 24 แขวงคลองตัน เขตคลองเตย กรุงเทพมหานคร 10110");
  await page.getByRole("checkbox", { name: /ยินยอมให้ส่งข้อมูลผู้วิ่ง/ }).check();
  await page.getByRole("button", { name: "ไปชำระเงิน" }).click();
  await expect(page).toHaveURL(/\/orders\/.+\/pay/);
  const orderId = page.url().match(/\/orders\/([^/]+)\/pay/)![1];
  await page.getByRole("button", { name: /สร้าง QR ชำระ/ }).click();
  await page.getByRole("button", { name: /จำลองว่าจ่ายแล้ว/ }).click();
  await expect(page.getByRole("heading", { name: "ชำระเงินสำเร็จ" })).toBeVisible();

  await page.goto(`/orders/${orderId}/receipt`);
  await expect(page.getByText(`เลขประจำตัวผู้เสียภาษี ${BUYER_TAX_ID}`, { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "ขอใบกำกับภาษีเต็มรูป" })).toHaveCount(0);

  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("banner")).toBeHidden();
  await expect(page.getByRole("button", { name: /พิมพ์/ })).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: /^ใบเสร็จรับเงิน/ })).toBeVisible();
  const pdf = await page.pdf({ format: "A4" }).catch(() => null);
  // Chromium only prints to PDF headless; when it can, the receipt fits on one page.
  if (pdf) expect(pdf.toString("latin1").match(/\/Type\s*\/Pages[\s\S]*?\/Count (\d+)/)?.[1]).toBe("1");
});
