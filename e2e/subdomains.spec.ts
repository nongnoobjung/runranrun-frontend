import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN, ORG, adminURL, orgURL, signInAdmin, signInOrganizer, siteURL } from "./hosts";

/** Seeded by the API's `pnpm db:seed`. */
const ORGANIZER = "organizer@riverside.example";
const ADMIN_EMAIL = "admin@kao.example";

const orgLogin = (page: Page) => page.getByRole("heading", { level: 1, name: "เข้าสู่ระบบผู้จัดงาน" });
const adminLogin = (page: Page) => page.getByRole("heading", { level: 1, name: "เข้าสู่ระบบแอดมิน" });

test("the runner site sends organisers and admins to their own domains", async ({ page, isMobile }) => {
  await page.goto("/");
  // Phones have no header nav; the footer has the same way in.
  const link = isMobile
    ? page.getByRole("contentinfo").getByRole("link", { name: "เข้าระบบผู้จัด" })
    : page.getByRole("navigation").getByRole("link", { name: "สำหรับผู้จัดงาน" });
  await link.click();
  await expect(page).toHaveURL(orgURL("/login"));
  await expect(orgLogin(page)).toBeVisible();

  // Old /admin links jump to the admin domain, which asks its own sign-in.
  await page.goto("/admin");
  await expect(page).toHaveURL(adminURL("/login"));
  await expect(adminLogin(page)).toBeVisible();
});

test("signing in on the runner site does not sign you in on the organiser backoffice", async ({ page }) => {
  await page.goto("/login?next=/me/events");
  await page.getByLabel("อีเมล").fill(ORGANIZER);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(siteURL("/me/events"));

  await page.goto("/organizer");
  await expect(page).toHaveURL(orgURL("/login"));
  await expect(orgLogin(page)).toBeVisible();
});

test("an organiser signs in on the backoffice, works at plain URLs, and is still signed out elsewhere", async ({ page }) => {
  await signInOrganizer(page, ORGANIZER);
  await expect(page).toHaveURL(orgURL("/[0-9a-f-]{36}$"));
  await expect(page.getByRole("heading", { name: "งานทั้งหมด" })).toBeVisible();
  await page.getByRole("link", { name: /Riverside Night Run 2027/ }).first().click();
  await expect(page.getByRole("heading", { name: "ภาพรวม" })).toBeVisible();
  await expect(page).toHaveURL(orgURL("/[0-9a-f-]{36}/events/[^/]+$"));

  // Old /organizer links on the backoffice itself drop the prefix.
  const eventPath = new URL(page.url()).pathname;
  await page.goto(`${ORG}/organizer${eventPath}/checkin`);
  await expect(page).toHaveURL(orgURL(`${eventPath}/checkin$`));

  // Admin and the runner site each still ask for their own sign-in.
  await page.goto(ADMIN);
  await expect(page).toHaveURL(adminURL("/login"));
  await expect(adminLogin(page)).toBeVisible();
  await page.goto("/me/events");
  await expect(page).toHaveURL(siteURL("/login"));
});

test("an admin signs in on the admin domain and reaches the reviews", async ({ page }) => {
  await signInAdmin(page, ADMIN_EMAIL, "/reviews");
  await expect(page).toHaveURL(adminURL("/reviews$"));
  await expect(page.getByRole("heading", { level: 1, name: "ตรวจงาน" })).toBeVisible();

  // The link to the organiser backoffice lands on its own sign-in.
  await page.getByRole("link", { name: "หลังบ้านผู้จัดงาน" }).click();
  await expect(page).toHaveURL(orgURL("/login"));
  await expect(orgLogin(page)).toBeVisible();
});

test("signing out of a backoffice goes back to its sign-in page", async ({ page }) => {
  await signInOrganizer(page, ORGANIZER);
  await page.getByRole("button", { name: "ออกจากระบบ" }).filter({ visible: true }).click();
  await expect(page).toHaveURL(orgURL("/login$"));
  await expect(orgLogin(page)).toBeVisible();
  await page.goto(ORG);
  await expect(page).toHaveURL(orgURL("/login"));

  await signInAdmin(page, ADMIN_EMAIL);
  await expect(page).toHaveURL(adminURL("/$"));
  await page.getByRole("button", { name: "ออกจากระบบ" }).click();
  await expect(page).toHaveURL(adminURL("/login$"));
  await expect(adminLogin(page)).toBeVisible();
  // The admin header shows no backoffice link or sign-out once signed out.
  await expect(page.getByRole("link", { name: "หลังบ้านผู้จัดงาน" })).toHaveCount(0);
});

test("links from the organiser backoffice to the runner site land on the site's domain", async ({ page }) => {
  await page.goto(`${ORG}/_site/events`);
  await expect(page).toHaveURL(siteURL("/events$"));
  await expect(page.getByRole("heading", { level: 1, name: "หางานวิ่ง" })).toBeVisible();

  await page.goto(`${ORG}/login`);
  await page.getByRole("link", { name: "หน้าเว็บนักวิ่ง" }).click();
  await expect(page).toHaveURL(siteURL("/$"));
});

test("a new account opens a team at a plain URL on the organiser backoffice", async ({ page }) => {
  await signInOrganizer(page, `e2e-sub-${randomUUID().slice(0, 8)}@example.com`);
  await expect(page.getByText("บัญชีนี้ยังไม่ได้อยู่ในทีมผู้จัดงาน")).toBeVisible();
  await page.getByRole("link", { name: "เปิดทีมผู้จัดงาน" }).filter({ visible: true }).click();
  await expect(page).toHaveURL(orgURL("/new$"));
});
