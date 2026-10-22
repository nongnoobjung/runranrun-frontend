import { expect, test, type Page } from "@playwright/test";

async function expectNoSideScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
}

test("the footer leads to how to register in Thai, and the page switches to English", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "วิธีสมัคร" }).click();
  await expect(page).toHaveURL(/\/how-to-register$/);
  await expect(page.getByRole("heading", { level: 1, name: "วิธีสมัครวิ่ง" })).toBeVisible();
  const steps = page.getByRole("list", { name: "ขั้นตอนการสมัคร" });
  await expect(steps.getByRole("listitem")).toHaveCount(9);
  for (const step of ["หางานที่อยากวิ่ง", "กรอกข้อมูลผู้วิ่ง", "จ่ายด้วย PromptPay", "รับเสื้อและบิบหน้างาน"]) {
    await expect(steps.getByRole("heading", { name: step })).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "ถ้าแผนเปลี่ยน" })).toBeVisible();
  await expectNoSideScroll(page);

  // The links go to the real pages.
  await steps.getByRole("link", { name: "หางานวิ่ง →" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "หางานวิ่ง" })).toBeVisible();
  await page.goBack();
  await page.getByRole("link", { name: "นโยบายคืนเงิน →" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "นโยบายคืนเงิน" })).toBeVisible();
  await page.goBack();

  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/how-to-register$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1, name: "How to register" })).toBeVisible();
  const enSteps = page.getByRole("list", { name: "Registration steps" });
  await expect(enSteps.getByRole("heading", { name: "Pay with PromptPay" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "If your plans change" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Results →" })).toHaveAttribute("href", "/en/results");
  await expectNoSideScroll(page);

  // Back to Thai for the next tests, which expect the default language.
  await page.getByRole("link", { name: "ภาษาไทย" }).click();
  await expect(page).toHaveURL(/^[^?]*\/how-to-register$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "th");
});

test("the home page steps link to the full how-to", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("region", { name: "ขั้นตอนการสมัคร" }).getByRole("link", { name: /ดูวิธีสมัครทีละขั้นตอน/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "วิธีสมัครวิ่ง" })).toBeVisible();
});
