import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ALL_AUDIENCES } from "./hosts";

const API = process.env.API_URL ?? "http://localhost:4000";
const ORGANIZER = "organizer@riverside.example";

async function apiCall<T>(path: string, init: { method?: string; token?: string; body?: unknown; key?: boolean } = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: {
      "content-type": "application/json",
      ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
      ...(init.key ? { "idempotency-key": randomUUID() } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** A fresh event with one paid 10K runner whose results the organiser imports and publishes through the API. */
async function publishedResults() {
  const { accessToken: token } = await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { audience: ALL_AUDIENCES, email: ORGANIZER } });
  const { items } = await apiCall<{ items: { id: string }[] }>("/v1/org", { token });
  const org = `/v1/org/${items[0].id}`;
  const tag = randomUUID().slice(0, 8);
  const slug = `e2e-index-${tag}`;
  const name = `งานรวมผล ${tag}`;
  const now = Date.now();
  // Later than the other specs' events, so it lands on the first page of the index.
  const event = await apiCall<{ id: string }>(`${org}/events`, {
    token,
    body: {
      nameTh: name, slug, eventType: "road", eventDate: "2029-01-15", provinceCode: "BKK", venueName: "สวนลุมพินี",
      registrationOpensAt: new Date(now - 86_400_000).toISOString(), registrationClosesAt: new Date(now + 30 * 86_400_000).toISOString(),
    },
  });
  const { races } = await apiCall<{ races: { id: string }[] }>(`${org}/events/${event.id}/races`, {
    token,
    body: { code: "10K", nameTh: "มินิ", distanceKm: 10, capacity: 100, bibStart: 1, bibEnd: 100 },
  });
  await apiCall(`${org}/events/${event.id}/races/${races[0].id}/price-tiers`, {
    token,
    body: { name: "ปกติ", priceSatang: 50_000, startsAt: new Date(now - 86_400_000).toISOString(), endsAt: new Date(now + 30 * 86_400_000).toISOString() },
  });
  await apiCall(`${org}/events/${event.id}/publish`, { token, body: {} });

  const runnerEmail = `e2e-index-${randomUUID()}@example.com`;
  const lastName = `ค้นเจอ${tag}`;
  const { accessToken: runnerToken } = await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { audience: ALL_AUDIENCES, email: runnerEmail } });
  const session = await apiCall<{ id: string }>("/v1/checkout/sessions", { token: runnerToken, body: { eventId: event.id, races: [{ raceId: races[0].id, quantity: 1 }] } });
  const order = await apiCall<{ id: string }>("/v1/orders", {
    token: runnerToken,
    key: true,
    body: {
      checkoutSessionId: session.id,
      buyer: { name: "ผู้ซื้อ", email: "buyer@example.com", phone: "081-234-5678" },
      participants: [
        {
          raceId: races[0].id,
          runner: {
            firstNameTh: "ดาว", lastNameTh: lastName, firstNameEn: "Dao", lastNameEn: "Index", gender: "female", birthDate: "1995-05-05", nationality: "TH",
            idDocType: "thai_id", idDocNumber: `1${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 900 + 100)}`,
            emergencyName: "ญาติ", emergencyPhone: "081-000-0000",
          },
        },
      ],
    },
  });
  await apiCall(`/v1/orders/${order.id}/payments`, { token: runnerToken, key: true, body: { method: "promptpay" } });
  await apiCall(`/v1/dev/orders/${order.id}/complete-payment`, { body: {} });
  const regs = await apiCall<{ items: { bibNumber: string }[] }>("/v1/me/registrations", { token: runnerToken });
  const bib = regs.items[0].bibNumber;

  await apiCall(`${org}/events/${event.id}/results/import`, { token, body: { csv: `bib,chip_time\n${bib},47:30\n`, dryRun: false } });
  await apiCall(`${org}/events/${event.id}/results/publish`, { token, body: { published: true } });
  return { slug, name, runner: `ดาว ${lastName}`, tag, bib, runnerEmail };
}

test("published results show on the results index, and a runner finds theirs across events", async ({ page }) => {
  const ev = await publishedResults();

  // The header menu (the footer on phones, where the menu is hidden) leads to the index.
  await page.goto("/");
  await page.getByRole("link", { name: "ผลการแข่งขัน", exact: true }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/results$/);
  await expect(page.getByRole("heading", { level: 1, name: "ผลการแข่งขัน" })).toBeVisible();
  const card = page.getByRole("list", { name: "งานที่ประกาศผลแล้ว" }).getByRole("link", { name: new RegExp(ev.name) });
  await expect(card).toContainText("เข้าเส้นชัย 1 คน");
  await expect(card).toContainText("10K");

  // Search by name across all events.
  await page.getByRole("searchbox", { name: "ชื่อนักวิ่ง เลขบิบ หรือชื่องาน" }).fill(ev.tag);
  await page.getByRole("button", { name: "ค้นหา" }).click();
  await expect(page).toHaveURL(/q=/);
  const found = page.getByRole("list", { name: "นักวิ่งที่ค้นพบ" }).getByRole("link");
  await expect(found).toHaveCount(1);
  await expect(found).toContainText(ev.runner);
  await expect(found).toContainText(`${ev.name} · 10K`);
  await expect(found).toContainText("47:30");
  // The tag is in the event name too, so the event shows under งาน.
  await expect(page.getByRole("list", { name: "งานที่ค้นพบ" }).getByRole("link", { name: new RegExp(ev.name) })).toBeVisible();

  // The match opens the event's results page, narrowed to the runner.
  await found.click();
  await expect(page).toHaveURL(new RegExp(`/events/${ev.slug}/results\\?race=.+&q=${ev.bib}`));
  await expect(page.getByRole("heading", { level: 1, name: `ผลการแข่งขัน ${ev.name}` })).toBeVisible();
  const list = page.getByRole("region", { name: "ผล 10K" });
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(list.getByRole("listitem")).toContainText(ev.runner);

  // Signed in, the runner sees their own result at the top of the index.
  await page.goto("/login?next=/results");
  await page.getByLabel("อีเมล").fill(ev.runnerEmail);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(/\/results$/);
  await expect(page.getByRole("list", { name: "ผลของฉัน" }).getByRole("link")).toContainText(ev.runner);
});

test("a search with no match says so", async ({ page }) => {
  await page.goto(`/results?q=${encodeURIComponent(`ไม่มีใคร${randomUUID().slice(0, 8)}`)}`);
  await expect(page.getByText(/ไม่พบผลของ/)).toBeVisible();
  await page.getByRole("link", { name: "← ดูงานทั้งหมด" }).click();
  await expect(page).toHaveURL(/\/results$/);
});
