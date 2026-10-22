import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { ORG, orgURL, signInOrganizer } from "./hosts";

const ORGANIZER = "organizer@riverside.example";

/** Signs in on the organiser backoffice; organisers with one team land on its event list. */
async function signIn(page: Page, email: string) {
  await signInOrganizer(page, email);
  await expect(page).toHaveURL(orgURL("/[0-9a-f-]{36}$"));
}

/** Opens the team page from the first event's sidebar. */
async function openTeam(page: Page) {
  await page.getByRole("link", { name: /Riverside Night Run 2027/ }).first().click();
  await page.getByRole("link", { name: "ทีมงาน", exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole("heading", { name: /^ทีมงาน/ })).toBeVisible();
}

// With Cache Components the previous route stays in the DOM (hidden), so only match what is on screen.
const memberRow = (page: Page, email: string) => page.getByRole("listitem").filter({ hasText: email }).filter({ visible: true });

test("an owner invites a teammate, who joins by signing in, and then removes them", async ({ page, browser }) => {
  const email = `e2e-team-${randomUUID().slice(0, 8)}@example.com`;

  await signIn(page, ORGANIZER);
  await openTeam(page);
  await page.getByLabel("อีเมล").filter({ visible: true }).fill(email);
  await page.getByRole("combobox", { name: "บทบาท", exact: true }).filter({ visible: true }).selectOption({ label: "ดูอย่างเดียว" });
  await page.getByRole("button", { name: "เชิญเข้าทีม" }).click();
  await expect(page.getByRole("status").filter({ hasText: email })).toBeVisible();
  await expect(memberRow(page, email)).toContainText("รอตอบรับคำเชิญ");

  // The invited person signs in with that email in their own browser and lands in the team.
  const theirs = await browser.newContext();
  const guest = await theirs.newPage();
  await signIn(guest, email);
  await openTeam(guest);
  await expect(memberRow(guest, email)).toContainText("(คุณ)");
  await expect(guest.getByText("เฉพาะเจ้าของที่เชิญหรือเปลี่ยนบทบาทสมาชิกได้")).toBeVisible();
  await expect(guest.getByRole("button", { name: "เชิญเข้าทีม" })).toHaveCount(0);

  await page.reload();
  const row = memberRow(page, email);
  await expect(row).not.toContainText("รอตอบรับคำเชิญ");
  await row.getByRole("button", { name: "นำออก" }).click();
  await row.getByRole("button", { name: "ยืนยันนำออก" }).click();
  await expect(memberRow(page, email)).toHaveCount(0);

  // Once removed, the backoffice is closed to them.
  await guest.goto(ORG);
  await expect(guest.getByText("บัญชีนี้ยังไม่ได้อยู่ในทีมผู้จัดงาน")).toBeVisible();
  await theirs.close();
});

test("the last owner cannot step down", async ({ page }) => {
  await signIn(page, ORGANIZER);
  await openTeam(page);
  await memberRow(page, ORGANIZER).getByRole("combobox").selectOption({ label: "ผู้ดูแล" });
  await expect(memberRow(page, ORGANIZER).getByRole("alert")).toHaveText("ทีมต้องมีเจ้าของอย่างน้อยหนึ่งคน เพิ่มเจ้าของอีกคนก่อน");
  await expect(memberRow(page, ORGANIZER).getByRole("combobox")).toHaveValue("owner");
});
