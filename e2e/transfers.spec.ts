import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { ALL_AUDIENCES, signInOrganizer } from "./hosts";

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

const idNumber = () => `1${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 900 + 100)}`;

/** A published event of its own (5K ฿500, 10K ฿800) that allows transfers and race changes, with one paid 5K place. */
async function eventWithPlace() {
  const { accessToken: token } = await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { audience: ALL_AUDIENCES, email: ORGANIZER } });
  const { items } = await apiCall<{ items: { id: string }[] }>("/v1/org", { token });
  const org = `/v1/org/${items[0].id}`;
  const slug = `e2e-move-${randomUUID().slice(0, 8)}`;
  const now = Date.now();
  const window = { startsAt: new Date(now - 86_400_000).toISOString(), endsAt: new Date(now + 30 * 86_400_000).toISOString() };
  const event = await apiCall<{ id: string }>(`${org}/events`, {
    token,
    body: {
      nameTh: `งานทดสอบโอน ${slug.slice(-8)}`, slug, eventType: "road", eventDate: "2027-06-01", provinceCode: "BKK", venueName: "สวนลุมพินี",
      registrationOpensAt: window.startsAt, registrationClosesAt: window.endsAt, allowTransfer: true, allowRaceChange: true,
    },
  });
  const raceIds: Record<string, string> = {};
  for (const [code, price, bibStart] of [["5K", 50_000, 1], ["10K", 80_000, 501]] as const) {
    const { races } = await apiCall<{ races: { id: string; code: string }[] }>(`${org}/events/${event.id}/races`, {
      token,
      body: { code, nameTh: code === "5K" ? "ฟันรัน" : "มินิ", distanceKm: code === "5K" ? 5 : 10, capacity: 50, bibStart, bibEnd: bibStart + 400 },
    });
    raceIds[code] = races.find((r) => r.code === code)!.id;
    await apiCall(`${org}/events/${event.id}/races/${raceIds[code]}/price-tiers`, { token, body: { name: "ปกติ", priceSatang: price, ...window } });
  }
  await apiCall(`${org}/events/${event.id}/publish`, { token, body: {} });

  const email = `e2e-owner-${randomUUID().slice(0, 8)}@example.com`;
  const { accessToken: buyerToken } = await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { audience: ALL_AUDIENCES, email } });
  const session = await apiCall<{ id: string }>("/v1/checkout/sessions", { token: buyerToken, body: { eventId: event.id, races: [{ raceId: raceIds["5K"], quantity: 1 }] } });
  const order = await apiCall<{ id: string; registrations: { id: string }[] }>("/v1/orders", {
    token: buyerToken,
    key: true,
    body: {
      checkoutSessionId: session.id,
      buyer: { name: "ต้นทาง", email, phone: "081-234-5678" },
      participants: [
        {
          raceId: raceIds["5K"],
          isSelf: true,
          runner: {
            firstNameEn: "Somchai", lastNameEn: "Jaidee", gender: "male", birthDate: "1990-01-01", nationality: "TH", idDocType: "thai_id",
            idDocNumber: idNumber(), emergencyName: "ญาติ", emergencyPhone: "081-000-0000",
          },
        },
      ],
    },
  });
  await apiCall(`/v1/orders/${order.id}/payments`, { token: buyerToken, key: true, body: { method: "promptpay" } });
  await apiCall(`/v1/dev/orders/${order.id}/complete-payment`, { body: {} });
  return { email, registrationId: order.registrations[0].id, path: `/${items[0].id}/events/${event.id}` };
}

async function signIn(page: Page, email: string, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("อีเมล").fill(email);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
}

test("a runner hands their place to a friend, who takes it with their own details and keeps the bib", async ({ page, browser }) => {
  const ev = await eventWithPlace();
  const friend = `e2e-friend-${randomUUID().slice(0, 8)}@example.com`;

  await signIn(page, ev.email, `/me/registrations/${ev.registrationId}`);
  await expect(page.getByText("BIB NUMBER")).toBeVisible();
  const bib = (await page.locator("span.text-6xl").textContent())?.trim();
  await page.getByRole("link", { name: "โอนสิทธิ์ให้คนอื่น" }).click();
  await page.getByLabel("อีเมลของผู้รับสิทธิ์").fill(friend);
  await page.getByRole("button", { name: "โอนสิทธิ์", exact: true }).click();
  await expect(page.getByText("รอผู้รับตอบรับ")).toBeVisible();
  await expect(page.getByText(friend)).toBeVisible();

  const theirs = await browser.newContext();
  const other = await theirs.newPage();
  await signIn(other, friend, "/me/events");
  await other.getByRole("link", { name: /มีคนโอนสิทธิ์วิ่งให้คุณ 1 รายการ/ }).click();
  await other.getByRole("link", { name: "รับสิทธิ์และกรอกข้อมูลผู้วิ่ง" }).click();
  await expect(other.getByRole("heading", { name: "รับโอนสิทธิ์" })).toBeVisible();
  await other.getByLabel("ชื่อ (ไทย)").fill("มะลิ");
  await other.getByLabel("นามสกุล (ไทย)").fill("สุขใส");
  await other.getByLabel(/First name/).fill("Mali");
  await other.getByLabel(/Last name/).fill("Suksai");
  await other.getByLabel("เพศ").selectOption("female");
  await other.getByLabel(/วันเกิด/).fill("1995-05-05");
  await other.getByLabel(/เลขบัตร/).fill(idNumber());
  await other.getByLabel(/^ผู้ติดต่อฉุกเฉิน/).fill("แม่");
  await other.getByLabel(/เบอร์ผู้ติดต่อฉุกเฉิน/).fill("081-111-2222");
  await other.getByRole("checkbox", { name: /ยินยอมให้ส่งข้อมูลผู้วิ่ง/ }).check();
  await other.getByRole("button", { name: "รับสิทธิ์", exact: true }).click();
  await expect(other.getByText("BIB NUMBER")).toBeVisible();
  await expect(other.locator("span.text-6xl")).toHaveText(bib!);
  await expect(other.getByText("MALI", { exact: true })).toBeVisible();
  await theirs.close();

  // The place is gone from the sender's list.
  await page.goto("/me/events");
  await expect(page.getByText("ยังไม่มีงานที่สมัครไว้")).toBeVisible();

  const organiser = await (await browser.newContext()).newPage();
  await signInOrganizer(organiser, ORGANIZER, `${ev.path}/changes`);
  await expect(organiser.getByRole("list", { name: "รายการโอนสิทธิ์" })).toContainText("มะลิ สุขใส");
  await expect(organiser.getByRole("list", { name: "รายการโอนสิทธิ์" })).toContainText("โอนแล้ว");
});

test("a runner moves up to a longer race and pays the difference", async ({ page, browser }) => {
  const ev = await eventWithPlace();

  await signIn(page, ev.email, `/me/registrations/${ev.registrationId}`);
  await page.getByRole("link", { name: "เปลี่ยนระยะ" }).click();
  await expect(page.getByRole("heading", { name: "เปลี่ยนระยะ" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /10K/ })).toBeChecked();
  await expect(page.getByText("ส่วนต่าง +฿300")).toBeVisible();
  await page.getByRole("button", { name: "เปลี่ยนเป็น 10K และชำระเงิน" }).click();

  await expect(page).toHaveURL(/\/orders\/.+\/pay/);
  await expect(page.getByText(/เปลี่ยนเป็น 10K · คำสั่งซื้อ/)).toBeVisible();
  await page.getByRole("button", { name: /สร้าง QR ชำระ/ }).click();
  await page.getByRole("button", { name: /จำลองว่าจ่ายแล้ว/ }).click();
  await expect(page.getByRole("heading", { name: "เปลี่ยนเป็น 10K แล้ว" })).toBeVisible();
  await page.getByRole("link", { name: "ดูบัตรวิ่ง" }).click();
  await expect(page.getByText(/เปลี่ยนเป็น 10K แล้ว · บิบใหม่ 0501/)).toBeVisible();
  await expect(page.locator("span.text-6xl")).toHaveText("0501");

  const organiser = await (await browser.newContext()).newPage();
  await signInOrganizer(organiser, ORGANIZER, `${ev.path}/changes`);
  await expect(organiser.getByRole("list", { name: "รายการเปลี่ยนระยะ" })).toContainText("5K → 10K");
  await expect(organiser.getByRole("list", { name: "รายการเปลี่ยนระยะ" })).toContainText("เปลี่ยนแล้ว");
});
