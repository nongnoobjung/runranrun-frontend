import { expect, test } from "@playwright/test";

const EVENT = "Riverside Night Run 2027";

test("a runner narrows the event list by name, distance and province", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /ค้นหาตามจังหวัด เดือน และระยะ/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "หางานวิ่ง" })).toBeVisible();

  await page.getByRole("searchbox", { name: "ชื่องานหรือสถานที่" }).fill("Riverside Night");
  await page.getByRole("button", { name: "ค้นหา", exact: true }).click();
  await expect(page).toHaveURL(/q=Riverside\+Night/);
  const results = page.getByRole("list", { name: "ผลการค้นหา" });
  await expect(results.getByRole("link", { name: new RegExp(EVENT) })).toBeVisible();

  // The seeded event has a half marathon but no ultra; the search words stay as the distance changes.
  await page.getByRole("link", { name: "ฮาล์ฟ 21K" }).click();
  await expect(page).toHaveURL(/distance=half/);
  await expect(results.getByRole("link", { name: new RegExp(EVENT) })).toBeVisible();
  await page.getByRole("link", { name: "อัลตรา" }).click();
  await expect(page.getByText("ไม่พบงานที่ตรงกับตัวกรอง")).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "ชื่องานหรือสถานที่" })).toHaveValue("Riverside Night");

  await page.getByRole("link", { name: "ล้างตัวกรอง" }).click();
  await expect(page).toHaveURL(/\/events$/);
  await page.getByLabel("จังหวัด").selectOption("BKK");
  await page.getByRole("button", { name: "ค้นหา", exact: true }).click();
  await expect(page).toHaveURL(/province=BKK/);
  await expect(page.getByRole("status").filter({ hasText: /พบ \d/ })).toBeVisible();
  await expect(results.getByRole("link").first()).toBeVisible();
});
