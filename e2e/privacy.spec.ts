import { expect, test, type Page } from "@playwright/test";

const EVENT = "Riverside Night Run 2027";

const idNumber = () => `1${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 900 + 100)}`;
const newEmail = (tag: string) => `e2e-pdpa-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

/**
 * Ticks "I understand" and presses close, retrying until `then` holds. A tick made before the page has hydrated is
 * reset by React, which left the button disabled now and then on CI.
 */
async function closeAccount(page: Page, then: () => Promise<void>) {
  const tick = page.getByRole("checkbox", { name: /เข้าใจแล้วว่าปิดบัญชีแล้วกู้คืนไม่ได้/ });
  await expect(async () => {
    await tick.check();
    await page.getByRole("button", { name: "ปิดบัญชี" }).click({ timeout: 2_000 });
    await then();
  }).toPass({ timeout: 20_000 });
}

async function signIn(page: Page, email: string, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("อีเมล").fill(email);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
}

test("the footer links to the privacy policy, terms and refund policy", async ({ page }) => {
  await page.goto("/");
  for (const [link, heading] of [
    ["นโยบายความเป็นส่วนตัว (PDPA)", "นโยบายความเป็นส่วนตัว"],
    ["เงื่อนไขการใช้งาน", "เงื่อนไขการใช้งาน"],
    ["นโยบายคืนเงิน", "นโยบายคืนเงิน"],
  ]) {
    await page.getByRole("contentinfo").getByRole("link", { name: link }).click();
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await page.goBack();
  }
});

test("a runner agrees before registering, then manages their consents and data", async ({ page }) => {
  const email = newEmail("runner");
  await signIn(page, email, "/");
  await page.getByRole("link", { name: new RegExp(EVENT) }).first().click();
  await page.getByRole("button", { name: /^สมัคร 1 คน/ }).click();
  await page.getByLabel(/First name/).fill("Pdpa");
  await page.getByLabel(/Last name/).fill("Tester");
  await page.getByLabel(/วันเกิด/).fill("1991-01-01");
  await page.getByLabel(/เลขบัตร/).fill(idNumber());
  await page.getByLabel(/^ผู้ติดต่อฉุกเฉิน/).fill("ญาติ");
  await page.getByLabel(/เบอร์ผู้ติดต่อฉุกเฉิน/).fill("081-234-5678");
  await page.locator("label").filter({ has: page.getByRole("radio", { name: /^M\s/ }) }).click();
  await page.getByLabel(/ชื่อ-นามสกุล/).fill("Pdpa Tester");
  await page.getByLabel(/อีเมล \(รับใบเสร็จ\)/).fill(email);
  await page.getByLabel(/^เบอร์โทร/).last().fill("081-234-5678");

  // Nothing is sent until the runner agrees.
  await page.getByRole("button", { name: "ไปชำระเงิน" }).click();
  await expect(page.getByText("ติ๊กยอมรับก่อนสมัคร")).toBeVisible();
  await page.getByRole("checkbox", { name: /ยินยอมให้ส่งข้อมูลผู้วิ่ง/ }).check();
  await page.getByRole("checkbox", { name: /รับข่าวงานวิ่งอื่น/ }).check();
  await page.getByRole("button", { name: "ไปชำระเงิน" }).click();
  await expect(page).toHaveURL(/\/orders\/.+\/pay/);

  await page.goto("/me/events");
  await page.getByRole("link", { name: "ความเป็นส่วนตัว →" }).click();
  const consents = page.getByRole("region", { name: "ความยินยอม" });
  await expect(consents).toContainText(/นโยบายความเป็นส่วนตัว\s*ยอมรับเมื่อ/);
  await expect(consents).toContainText("เปิดอยู่");
  await page.getByRole("button", { name: "เลิกรับข่าวสาร" }).click();
  await expect(consents).toContainText("ปิดอยู่");

  const download = await page.request.get("/me/privacy/export");
  expect(download.headers()["content-disposition"]).toContain("kao-my-data-");
  const data = await download.json();
  expect(data.registrations).toEqual([expect.objectContaining({ first_name_en: "PDPA", event: expect.stringContaining("Riverside") })]);

  // A place for an upcoming race keeps the account open.
  await closeAccount(page, () => expect(page.getByText("ยังมีงานที่สมัครไว้และยังไม่ถึงวันแข่ง")).toBeVisible({ timeout: 3_000 }));
});

test("someone with nothing upcoming closes their account and is signed out", async ({ page }) => {
  await signIn(page, newEmail("leaving"), "/me/privacy");
  await expect(page.getByRole("heading", { name: "ความเป็นส่วนตัวและข้อมูลของฉัน" })).toBeVisible();
  await expect(page.getByRole("button", { name: "ปิดบัญชี" })).toBeDisabled();
  await closeAccount(page, () => expect(page).toHaveURL(/\/\?closed=1$/, { timeout: 5_000 }));
  await page.goto("/me/events");
  await expect(page).toHaveURL(/\/login/);
});
