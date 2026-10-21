import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const API = process.env.API_URL ?? "http://localhost:4000";
const ORGANIZER = "organizer@riverside.example";

async function apiCall<T>(path: string, init: { method?: string; token?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { "content-type": "application/json", ...(init.token ? { authorization: `Bearer ${init.token}` } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

/**
 * A published one-race event of its own, so required questions added here never reach the seeded
 * event the other journeys register for.
 */
async function freshEvent() {
  const { accessToken: token } = await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { email: ORGANIZER } });
  const { items } = await apiCall<{ items: { id: string }[] }>("/v1/org", { token });
  const org = `/v1/org/${items[0].id}`;
  const slug = `e2e-form-${randomUUID().slice(0, 8)}`;
  const now = Date.now();
  const event = await apiCall<{ id: string }>(`${org}/events`, {
    token,
    body: {
      nameTh: `งานทดสอบฟอร์ม ${slug.slice(-8)}`, slug, eventType: "road", eventDate: "2027-06-01", provinceCode: "BKK", venueName: "สวนลุมพินี",
      registrationOpensAt: new Date(now - 86_400_000).toISOString(), registrationClosesAt: new Date(now + 30 * 86_400_000).toISOString(),
    },
  });
  const withRace = await apiCall<{ races: { id: string }[] }>(`${org}/events/${event.id}/races`, {
    token,
    body: { code: "10K", nameTh: "มินิ", distanceKm: 10, capacity: 100, bibStart: 1, bibEnd: 100 },
  });
  await apiCall(`${org}/events/${event.id}/races/${withRace.races[0].id}/price-tiers`, {
    token,
    body: { name: "ปกติ", priceSatang: 50_000, startsAt: new Date(now - 86_400_000).toISOString(), endsAt: new Date(now + 30 * 86_400_000).toISOString() },
  });
  await apiCall(`${org}/events/${event.id}/publish`, { token, body: {} });
  return { token, orgId: items[0].id, eventId: event.id, slug, org };
}

test("an organiser adds a required question and the runner has to answer it", async ({ page, browser }) => {
  const ev = await freshEvent();

  // Organiser: add a required choice question on the form page.
  await page.goto("/login?next=/organizer");
  await page.getByLabel("อีเมล").fill(ORGANIZER);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(/\/organizer\/[0-9a-f-]{36}$/);
  await page.goto(`/organizer/${ev.orgId}/events/${ev.eventId}/form`);
  await expect(page.getByText("ยังไม่มีคำถามเพิ่มเติม")).toBeVisible();
  await page.getByLabel("คำถาม", { exact: true }).fill("เคยวิ่งฮาล์ฟมาราธอนไหม");
  await page.getByLabel("ประเภท").selectOption({ label: "เลือกหนึ่งข้อ" });
  await page.getByLabel(/ตัวเลือก/).fill("เคย\nไม่เคย");
  await page.getByLabel("บังคับตอบ").check();
  await page.getByRole("button", { name: "เพิ่มคำถาม" }).click();
  await expect(page.getByRole("status")).toContainText("เพิ่มคำถาม");
  const question = page.getByRole("list", { name: "คำถามเพิ่มเติม" }).getByRole("listitem");
  await expect(question).toContainText("เคยวิ่งฮาล์ฟมาราธอนไหม");
  await expect(question).toContainText("เลือกหนึ่งข้อ");

  // Runner: the question shows up in checkout and must be answered.
  const theirs = await browser.newContext();
  const runner = await theirs.newPage();
  await runner.goto(`/login?next=/events/${ev.slug}`);
  await runner.getByLabel("อีเมล").fill(`e2e-form-${randomUUID().slice(0, 8)}@example.com`);
  await runner.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await runner.getByRole("button", { name: /^สมัคร 1 คน/ }).click();
  await expect(runner).toHaveURL(/\/checkout\//);
  await runner.getByLabel(/First name/).fill("Pim");
  await runner.getByLabel(/Last name/).fill("Answer");
  await runner.getByLabel(/วันเกิด/).fill("1994-07-20");
  await runner.getByLabel(/เลขบัตร/).fill(`1${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 900 + 100)}`);
  await runner.getByLabel(/^ผู้ติดต่อฉุกเฉิน/).fill("แม่ ทดสอบ");
  await runner.getByLabel(/เบอร์ผู้ติดต่อฉุกเฉิน/).fill("081-234-5678");
  await runner.getByLabel(/ชื่อ-นามสกุล/).fill("พิม ตอบคำถาม");
  await runner.getByLabel(/อีเมล \(รับใบเสร็จ\)/).fill("pim@example.com");
  await runner.getByLabel(/^เบอร์โทร/).last().fill("081-234-5678");

  await runner.getByRole("checkbox", { name: /ยินยอมให้ส่งข้อมูลผู้วิ่ง/ }).check();
  await runner.getByRole("button", { name: "ไปชำระเงิน" }).click();
  const answer = runner.getByLabel(/เคยวิ่งฮาล์ฟมาราธอนไหม/);
  await expect(runner.locator("label").filter({ has: answer })).toContainText("จำเป็นต้องตอบ");
  await expect(runner.getByLabel(/First name/)).toHaveValue("Pim");
  await answer.selectOption("ไม่เคย");
  await runner.getByRole("button", { name: "ไปชำระเงิน" }).click();
  await expect(runner).toHaveURL(/\/orders\/.+\/pay/);
  await theirs.close();

  // Organiser: the answer is on the runner's detail, and the question now counts one answer.
  const list = await apiCall<{ items: { id: string }[] }>(`${ev.org}/events/${ev.eventId}/registrations`, { token: ev.token });
  await page.goto(`/organizer/${ev.orgId}/events/${ev.eventId}/registrations?selected=${list.items[0].id}`);
  const detail = page.getByRole("complementary", { name: /รายละเอียด/ });
  await expect(detail.getByRole("heading", { name: "คำตอบฟอร์มสมัคร" })).toBeVisible();
  await expect(detail).toContainText("เคยวิ่งฮาล์ฟมาราธอนไหม");
  await expect(detail).toContainText("ไม่เคย");
  await page.goto(`/organizer/${ev.orgId}/events/${ev.eventId}/form`);
  await expect(page.getByRole("list", { name: "คำถามเพิ่มเติม" })).toContainText("ตอบแล้ว 1 คน");
});
