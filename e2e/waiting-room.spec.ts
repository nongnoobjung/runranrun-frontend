import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { ALL_AUDIENCES, signInOrganizer } from "./hosts";

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

/** A published event of its own with one open 5K, so turning its waiting room on touches nobody else's test. */
async function openEvent() {
  const { accessToken: token } = await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { audience: ALL_AUDIENCES, email: ORGANIZER } });
  const { items } = await apiCall<{ items: { id: string }[] }>("/v1/org", { token });
  const org = `/v1/org/${items[0].id}`;
  const slug = `e2e-room-${randomUUID().slice(0, 8)}`;
  const now = Date.now();
  const event = await apiCall<{ id: string }>(`${org}/events`, {
    token,
    body: {
      nameTh: `งานคิวยาว ${slug.slice(-8)}`, slug, eventType: "road", eventDate: "2027-06-01", provinceCode: "BKK", venueName: "สวนลุมพินี",
      registrationOpensAt: new Date(now - 86_400_000).toISOString(), registrationClosesAt: new Date(now + 30 * 86_400_000).toISOString(),
    },
  });
  const { races } = await apiCall<{ races: { id: string }[] }>(`${org}/events/${event.id}/races`, {
    token,
    body: { code: "5K", nameTh: "ฟันรัน", distanceKm: 5, capacity: 50, bibStart: 1, bibEnd: 100 },
  });
  await apiCall(`${org}/events/${event.id}/races/${races[0].id}/price-tiers`, {
    token,
    body: { name: "ปกติ", priceSatang: 65_000, startsAt: new Date(now - 86_400_000).toISOString(), endsAt: new Date(now + 30 * 86_400_000).toISOString() },
  });
  await apiCall(`${org}/events/${event.id}/publish`, { token, body: {} });
  return { slug, eventId: event.id, path: `/${items[0].id}/events/${event.id}` };
}

async function signIn(page: Page, email: string, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("อีเมล").fill(email);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
}

test("a runner waits in the queue of a busy event, is let in and reaches checkout", async ({ page, browser }) => {
  const ev = await openEvent();

  // The organiser turns the waiting room on from the event page, letting one runner in a minute.
  const theirs = await browser.newContext();
  const organiser = await theirs.newPage();
  await signInOrganizer(organiser, ORGANIZER, `${ev.path}/edit`);
  await organiser.getByLabel("ให้นักวิ่งเข้าคิวก่อนเลือกระยะ").check();
  await organiser.getByLabel(/ปล่อยเข้าสมัคร \(คนต่อนาที\)/).fill("1");
  await organiser.getByRole("button", { name: "บันทึกข้อมูลงาน" }).click();
  await expect(organiser.getByText("บันทึกข้อมูลงานแล้ว")).toBeVisible();
  await theirs.close();

  // Someone got there first and takes the first place let in.
  const { accessToken: early } = await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { audience: ALL_AUDIENCES, email: `e2e-early-${randomUUID()}@example.com` } });
  await apiCall("/v1/checkout/queue", { token: early, body: { eventId: ev.eventId } });
  await apiCall(`/v1/dev/events/${ev.eventId}/queue/admit`, { body: { count: 1 } });

  await signIn(page, `e2e-room-${randomUUID().slice(0, 8)}@example.com`, `/events/${ev.slug}`);
  await expect(page.getByRole("button", { name: /^สมัคร 1 คน/ })).toHaveCount(0);
  await page.getByRole("link", { name: "เข้าคิวสมัคร" }).click();

  await expect(page).toHaveURL(new RegExp(`/events/${ev.slug}/queue`));
  await expect(page.getByRole("heading", { name: "คุณอยู่ในคิวสมัคร" })).toBeVisible();
  const place = page.getByRole("status").filter({ hasText: "คิวของคุณ" });
  await expect(place).toContainText("คุณเป็นคิวถัดไป");
  await expect(page.getByText("ปล่อยเข้าสมัครนาทีละ 1 คน")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);

  // Their turn comes: the page notices on its own and goes back to the race picker.
  await apiCall(`/v1/dev/events/${ev.eventId}/queue/admit`, { body: { count: 1 } });
  await expect(page).toHaveURL(new RegExp(`/events/${ev.slug}#register$`), { timeout: 20_000 });
  await expect(page.getByText("ถึงคิวของคุณแล้ว")).toBeVisible();
  await page.getByRole("button", { name: /^สมัคร 1 คน · ฿650/ }).click();

  await expect(page).toHaveURL(/\/checkout\//);
  await expect(page.getByText(/จองที่ไว้\s+\d\d:\d\d/)).toBeVisible();
});
