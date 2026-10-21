import { expect, test, type Page } from "@playwright/test";

const EVENT = "Riverside Night Run 2027";

/** English is longer than Thai: nothing may push the page wider than the screen. */
async function expectNoSideScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
}

test("a runner switches to English, finds an event and opens the checkout in English, then switches back to Thai", async ({ page }) => {
  const email = `e2e-i18n-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "th");
  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Upcoming events" })).toBeVisible();
  await expectNoSideScroll(page);

  // The choice is remembered: a plain (Thai) URL now opens its English page.
  await page.goto("/events");
  await expect(page).toHaveURL(/\/en\/events$/);
  await expect(page.getByRole("heading", { level: 1, name: "Find events" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Event name or place" }).fill("Riverside Night");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/events\?.*q=Riverside\+Night/);
  await expect(page.getByRole("status").filter({ hasText: /\d+ events? found/ })).toBeVisible();
  await expectNoSideScroll(page);
  await page.getByRole("list", { name: "Search results" }).getByRole("link", { name: new RegExp(EVENT) }).click();

  await expect(page).toHaveURL(/\/en\/events\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: EVENT })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Races and times" })).toBeVisible();
  await expectNoSideScroll(page);
  await page.getByRole("button", { name: /^Register 1 runner/ }).click();

  // Signing in keeps the language, and goes back to the English event page.
  await expect(page).toHaveURL(/\/en\/login\?next=/);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/events\/[^/]+$/);
  await page.getByRole("button", { name: /^Register 1 runner/ }).click();

  await expect(page).toHaveURL(/\/en\/checkout\//);
  for (const label of [/^First name \(Thai\)/, /^Last name \(Thai\)/, /^Date of birth/, /^Emergency contact name/, /^Full name/, /^Email \(for receipt\)/]) {
    await expect(page.getByLabel(label)).toBeVisible();
  }
  await expectNoSideScroll(page);
  // Sending it empty: the Server Action answers in English too.
  await page.getByRole("button", { name: "Go to payment" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Fill in all the required fields to continue" })).toBeVisible();
  await expect(page.getByText("Required").first()).toBeVisible();

  // Back to Thai on the same page, and it stays Thai.
  await page.getByRole("link", { name: "ภาษาไทย" }).click();
  await expect(page).toHaveURL(/^[^?]*\/checkout\/[^/]+$/);
  expect(new URL(page.url()).pathname.startsWith("/en")).toBe(false);
  await expect(page.locator("html")).toHaveAttribute("lang", "th");
  await expect(page.getByLabel("ชื่อ (ไทย)")).toBeVisible();
  await page.goto("/events");
  await expect(page).toHaveURL(/\/events$/);
  await expect(page.getByRole("heading", { level: 1, name: "หางานวิ่ง" })).toBeVisible();
});

test("English pages that are not there show the not-found page in English", async ({ page }) => {
  const res = await page.goto("/en/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/en");
});
