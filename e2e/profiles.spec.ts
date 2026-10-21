import { expect, test } from "@playwright/test";

const EVENT = "Riverside Night Run 2027";

const idNumber = () => `1${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 900 + 100)}`;

test("a runner saves themself once and registers without typing their details again", async ({ page }) => {
  const email = `e2e-profile-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const id = idNumber();

  await page.goto(`/login?next=${encodeURIComponent("/me/profiles/new")}`);
  await page.getByLabel("อีเมล").fill(email);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "เพิ่มผู้วิ่ง" })).toBeVisible();
  await page.getByLabel("ชื่อ (ไทย)").fill("สมชาย");
  await page.getByLabel("นามสกุล (ไทย)").fill("ใจดี");
  await page.getByLabel(/First name/).fill("Somchai");
  await page.getByLabel(/Last name/).fill("Jaidee");
  await page.getByLabel(/วันเกิด/).fill("1990-03-12");
  await page.getByLabel(/เลขบัตร/).fill(id);
  await page.getByLabel(/^ผู้ติดต่อฉุกเฉิน/).fill("สมหญิง ใจดี");
  await page.getByLabel(/เบอร์ผู้ติดต่อฉุกเฉิน/).fill("081-234-5678");
  await page.getByLabel(/นี่คือข้อมูลของฉันเอง/).check();
  await page.getByLabel("ชื่อเล่น").fill("ชาย");
  await page.getByRole("button", { name: "บันทึกผู้วิ่ง" }).click();

  const list = page.getByRole("list", { name: "ผู้วิ่งที่บันทึกไว้" });
  await expect(list).toContainText("ตัวฉัน · ชาย · สมชาย ใจดี");
  await expect(list).toContainText(`••••${id.slice(-4)}`);
  await expect(page.getByText(id)).toHaveCount(0);

  // Registering: the saved runner is picked already, so only the shirt and the buyer are left.
  await page.goto("/");
  await page.getByRole("link", { name: new RegExp(EVENT) }).first().click();
  await page.getByRole("button", { name: /^สมัคร 1 คน/ }).click();
  await expect(page.getByLabel("ใช้ข้อมูลผู้วิ่งที่บันทึกไว้")).toHaveValue(/.+/);
  await expect(page.getByLabel(/First name/)).toHaveValue("SOMCHAI");
  await expect(page.getByLabel(/เลขบัตร/)).toHaveAttribute("placeholder", `ใช้เลขที่บันทึกไว้ ••••${id.slice(-4)}`);
  await page.locator("label").filter({ has: page.getByRole("radio", { name: /^M\s/ }) }).click();
  await page.getByLabel(/ชื่อ-นามสกุล/).fill("สมชาย ใจดี");
  await page.getByLabel(/อีเมล \(รับใบเสร็จ\)/).fill(email);
  await page.getByLabel(/^เบอร์โทร/).last().fill("081-234-5678");
  await page.getByRole("button", { name: "ไปชำระเงิน" }).click();
  await expect(page).toHaveURL(/\/orders\/.+\/pay/);

  // Editing keeps the saved ID number when the box is left empty; deleting forgets the runner.
  await page.goto("/me/profiles");
  await list.getByRole("link", { name: "แก้ไข" }).click();
  await page.getByLabel("ชื่อเล่น").fill("พี่ชาย");
  await page.getByRole("button", { name: "บันทึกผู้วิ่ง" }).click();
  await expect(list).toContainText("ตัวฉัน · พี่ชาย");
  await expect(list).toContainText(`••••${id.slice(-4)}`);
  await list.getByRole("button", { name: "ลบ" }).click();
  await expect(page.getByText("ยังไม่ได้บันทึกผู้วิ่ง")).toBeVisible();
});
