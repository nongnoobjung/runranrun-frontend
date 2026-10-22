import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { ORG, orgURL, signInAdmin, signInOrganizer } from "./hosts";

/** Seeded by the API's `pnpm db:seed` as a platform superadmin. */
const ADMIN_EMAIL = "admin@kao.example";
const PDF = join(__dirname, "fixtures", "kyc-sample.pdf");

// With Cache Components the previous route stays in the DOM (hidden), so only match what is on screen.
const label = (page: Page, text: string | RegExp) => page.getByLabel(text).filter({ visible: true });

const docRow = (page: Page, list: string, type: string) =>
  page.getByRole("list", { name: list }).getByRole("listitem").filter({ hasText: type }).filter({ visible: true });

test("a runner opens an organiser team, sends KYC, and the admin approves it", async ({ page, browser }) => {
  const tag = randomUUID().slice(0, 6);
  const teamName = `ทีมสมัครเอง ${tag}`;

  // 1. Sign up on the organiser backoffice: a new account has no team yet and is offered to open one.
  await signInOrganizer(page, `e2e-kyc-${tag}@example.com`);
  await expect(page.getByText("บัญชีนี้ยังไม่ได้อยู่ในทีมผู้จัดงาน")).toBeVisible();
  await page.getByRole("link", { name: "เปิดทีมผู้จัดงาน" }).filter({ visible: true }).click();
  await expect(page.getByRole("heading", { name: "เปิดทีมผู้จัดงาน" })).toBeVisible();
  await label(page, "ชื่อทีมผู้จัด (ภาษาไทย)").fill(teamName);
  await label(page, "อีเมลติดต่อ").fill(`team-${tag}@example.com`);
  await page.getByRole("button", { name: "เปิดทีมแล้วไปส่งเอกสาร" }).click();
  await expect(page).toHaveURL(orgURL("/[0-9a-f-]{36}/kyc\\?new=1$"));
  const orgId = new URL(page.url()).pathname.split("/")[1];
  await expect(page.getByRole("status").filter({ hasText: `เปิดทีม ${teamName} แล้ว` })).toBeVisible();
  await expect(page.getByText("รอตรวจเอกสาร", { exact: true })).toBeVisible();

  // 2. Company details; a wrong check digit is caught first.
  await label(page, /^ชื่อตามทะเบียน/).fill(`บริษัท ทดสอบ ${tag} จำกัด`);
  await label(page, "เลขประจำตัวผู้เสียภาษี").fill("0105550123452");
  await label(page, "เบอร์โทรติดต่อ").fill("081-234-5678");
  await label(page, "เลขที่ ถนน").fill("99 ถนนเจริญกรุง");
  await label(page, "แขวง / ตำบล").fill("บางรัก");
  await label(page, "เขต / อำเภอ").fill("บางรัก");
  await label(page, "จังหวัด").fill("กรุงเทพมหานคร");
  await label(page, "รหัสไปรษณีย์").fill("10500");
  await page.getByRole("button", { name: "บันทึกข้อมูลบริษัท" }).click();
  await expect(page.getByText("เลขผู้เสียภาษีไม่ถูกต้อง ตรวจ 13 หลักอีกครั้ง")).toBeVisible();
  await label(page, "เลขประจำตัวผู้เสียภาษี").fill("0105550123451");
  await page.getByRole("button", { name: "บันทึกข้อมูลบริษัท" }).click();
  await expect(page.getByRole("status").filter({ hasText: "บันทึกข้อมูลแล้ว" })).toBeVisible();

  // 3. Documents and the payout account.
  for (const type of ["บัตรประชาชนผู้มีอำนาจ", "หน้าสมุดบัญชี"]) {
    await label(page, "ประเภทเอกสาร").selectOption({ label: type });
    await label(page, /^ไฟล์/).setInputFiles(PDF);
    await page.getByRole("button", { name: "อัปโหลดเอกสาร" }).click();
    await expect(docRow(page, "เอกสารที่ส่งแล้ว", type)).toContainText("รอตรวจ");
  }
  const href = await docRow(page, "เอกสารที่ส่งแล้ว", "หน้าสมุดบัญชี").getByRole("link").getAttribute("href");
  const file = await page.request.get(new URL(href!, page.url()).href);
  expect(file.status()).toBe(200);
  expect(file.headers()["content-type"]).toBe("application/pdf");
  expect(file.headers()["cache-control"]).toContain("no-store");

  await label(page, /^ธนาคาร/).selectOption("SCB");
  await label(page, "เลขบัญชี").fill("111-2-33333-4");
  await label(page, "ชื่อบัญชี").fill(`บริษัท ทดสอบ ${tag} จำกัด`);
  await page.getByRole("button", { name: "ส่งบัญชีให้ตรวจ" }).click();
  await expect(page.getByText(/ธนาคารไทยพาณิชย์ ••••3334 .* รอทีมงานก้าวยืนยัน/)).toBeVisible();
  await expect(page.getByRole("list", { name: "สิ่งที่ต้องส่ง" })).not.toContainText("ยังขาด");

  // 4. The admin sends the bank book back once, then approves the documents, the account and the team.
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await signInAdmin(admin, ADMIN_EMAIL, `/organizations/${orgId}`);
  await expect(admin.getByRole("heading", { name: teamName })).toBeVisible();
  const book = docRow(admin, "เอกสาร KYC", "หน้าสมุดบัญชี");
  await book.getByLabel(/ไม่ผ่าน เพราะ/).fill("ภาพไม่ชัด");
  await book.getByRole("button", { name: "ส่งกลับให้แก้" }).click();
  await expect(book).toContainText("เหตุผล: ภาพไม่ชัด");

  await page.goto(`${ORG}/${orgId}`);
  await expect(page.getByText("หน้าสมุดบัญชี: ภาพไม่ชัด")).toBeVisible();

  await book.getByRole("button", { name: "เอกสารผ่าน" }).click();
  await expect(book).toContainText("ผ่าน");
  await expect(book).not.toContainText("เหตุผล");
  const idCard = docRow(admin, "เอกสาร KYC", "บัตรประชาชนผู้มีอำนาจ");
  await idCard.getByRole("button", { name: "เอกสารผ่าน" }).click();
  await expect(idCard.getByRole("button", { name: "เอกสารผ่าน" })).toHaveCount(0);
  await expect(admin.getByText("1112333334")).toBeVisible();
  await admin.getByRole("button", { name: "ยืนยันบัญชีนี้" }).click();
  await expect(admin.getByText(/ธนาคารไทยพาณิชย์ ••••3334 .* ตรวจแล้ว/)).toBeVisible();
  await admin.getByRole("button", { name: "อนุมัติ KYC" }).click();
  await expect(admin.getByText(/^ผ่านเมื่อ/)).toBeVisible();
  await adminContext.close();

  // 5. The team is through: no more KYC notice, and the legal details are locked.
  await page.goto(`${ORG}/${orgId}/kyc`);
  await expect(page.getByText("ผ่าน KYC แล้ว")).toBeVisible();
  await expect(label(page, "เลขประจำตัวผู้เสียภาษี")).toBeDisabled();
  await expect(docRow(page, "เอกสารที่ส่งแล้ว", "หน้าสมุดบัญชี")).toContainText("ผ่าน");
  await page.goto(`${ORG}/${orgId}`);
  await expect(page.getByRole("heading", { name: "งานทั้งหมด" })).toBeVisible();
  await expect(page.getByText(/ยังรอตรวจเอกสาร/)).toHaveCount(0);
});
