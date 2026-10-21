import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const API = process.env.API_URL ?? "http://localhost:4000";
const ORGANIZER = "organizer@riverside.example";
const fixture = (name: string) => join(__dirname, "fixtures", name);

// With Cache Components the previous route stays in the DOM (hidden), so only match what is on screen.
const label = (page: Page, text: string | RegExp) => page.getByLabel(text).filter({ visible: true });
const status = (page: Page, text: string) => page.getByRole("status").filter({ hasText: text }).filter({ visible: true });

async function apiCall<T>(path: string, init: { method?: string; token?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { "content-type": "application/json", ...(init.token ? { authorization: `Bearer ${init.token}` } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** A published event of its own with one race and no texts or images yet. */
async function freshEvent() {
  const { accessToken: token } = await apiCall<{ accessToken: string }>("/v1/dev/login", { body: { email: ORGANIZER } });
  const { items } = await apiCall<{ items: { id: string }[] }>("/v1/org", { token });
  const org = `/v1/org/${items[0].id}`;
  const slug = `e2e-content-${randomUUID().slice(0, 8)}`;
  const now = Date.now();
  const window = { startsAt: new Date(now - 86_400_000).toISOString(), endsAt: new Date(now + 30 * 86_400_000).toISOString() };
  const event = await apiCall<{ id: string }>(`${org}/events`, {
    token,
    body: {
      nameTh: `งานริมน้ำ ${slug.slice(-8)}`, nameEn: `River Run ${slug.slice(-8)}`, slug, eventType: "road", eventDate: "2027-06-01",
      provinceCode: "BKK", venueName: "สวนลุมพินี", registrationOpensAt: window.startsAt, registrationClosesAt: window.endsAt,
    },
  });
  const { races } = await apiCall<{ races: { id: string }[] }>(`${org}/events/${event.id}/races`, {
    token,
    body: { code: "10K", nameTh: "มินิ", distanceKm: 10, capacity: 100 },
  });
  await apiCall(`${org}/events/${event.id}/races/${races[0].id}/price-tiers`, { token, body: { name: "ปกติ", priceSatang: 50_000, ...window } });
  await apiCall(`${org}/events/${event.id}/publish`, { token, body: {} });
  return { slug, path: `/organizer/${items[0].id}/events/${event.id}/content` };
}

/** Every <img> matched has loaded real pixels. */
async function expectLoaded(page: Page, selector: string, count: number) {
  await expect
    .poll(() => page.$$eval(selector, (imgs) => imgs.filter((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0).length))
    .toBe(count);
}

test("an organiser writes Thai and English content with pictures, and the event page shows it", async ({ page }) => {
  const ev = await freshEvent();
  await page.goto(`/login?next=${encodeURIComponent(ev.path)}`);
  await label(page, "อีเมล").fill(ORGANIZER);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "เนื้อหาและรูปภาพ" })).toBeVisible();

  // 1. Cover, then two gallery photos with captions, the second moved to the front.
  await label(page, "อัปโหลดรูปปก").setInputFiles(fixture("event-cover.jpg"));
  await expect(status(page, "อัปโหลดรูปแล้ว")).toBeVisible();
  await expect(page.getByRole("img", { name: "รูปปก" })).toHaveAttribute("src", /^\/media\/event-images\/[0-9a-f-]{36}\.webp$/);

  await label(page, "เพิ่มรูป").setInputFiles([fixture("event-start.jpg"), fixture("event-medal.png")]);
  await expect(status(page, "อัปโหลด 2 รูปแล้ว")).toBeVisible();
  const gallery = page.getByRole("list", { name: "แกลเลอรี" });
  await expect(gallery.getByRole("listitem")).toHaveCount(2);
  await label(page, "คำบรรยาย (ไทย) รูปที่ 2").fill("เหรียญที่ระลึก");
  await label(page, "Caption (English) รูปที่ 2").fill("Finisher medal");
  await page.getByRole("button", { name: "เลื่อนขึ้น รูปที่ 2" }).click();
  await label(page, "คำบรรยาย (ไทย) รูปที่ 2").fill("จุดปล่อยตัว");
  await page.getByRole("button", { name: "บันทึกลำดับและคำบรรยาย" }).click();
  await expect(status(page, "บันทึกแกลเลอรีแล้ว")).toBeVisible();

  // 2. Thai texts: Markdown with a heading, bold, a list and an uploaded picture placed in the text.
  await label(page, "คำโปรยสั้น ๆ").fill("วิ่งริมน้ำยามเย็น ปิดถนน");
  const descTh = page.getByRole("textbox", { name: "รายละเอียดงาน" });
  await descTh.fill("## เส้นทางริมน้ำ\n\nวิ่ง**ปิดถนน**ตลอดสาย\n\n- น้ำทุก 2 กม.\n- เหรียญทุกระยะ");
  await label(page, "แทรกรูป (รายละเอียดงาน)").setInputFiles(fixture("event-route.jpg"));
  await expect(descTh).toHaveValue(/!\[event-route\]\(\/media\/event-images\/[0-9a-f-]{36}\.webp\)\n\n$/);
  await page.getByRole("tab", { name: "ดูตัวอย่าง" }).filter({ visible: true }).first().click();
  await expect(page.getByRole("heading", { name: "เส้นทางริมน้ำ" })).toBeVisible();
  await page.getByRole("tab", { name: "เขียน" }).filter({ visible: true }).first().click();
  await label(page, "กติกาการแข่งขัน").fill("- ติดบิบด้านหน้า\n- ห้ามใช้หูฟัง");
  await page.getByRole("button", { name: "+ เพิ่มคำถาม" }).filter({ visible: true }).click();
  await label(page, "คำถาม 1").fill("จอดรถได้ไหม");
  await label(page, "คำตอบ 1").fill("จอดได้ที่ลานจอดสวนลุมพินี");

  // 3. English: summary, description and the FAQ answer; the rules stay Thai only.
  await page.getByRole("tab", { name: "English" }).click();
  await label(page, "Summary").fill("An evening closed-road run by the river");
  await page.getByRole("textbox", { name: "Description" }).fill("## Riverside course\n\nA **closed road** all the way\n\n- Water every 2 km");
  await label(page, "Question 1").fill("Is there parking?");
  await label(page, "Answer 1").fill("Yes, at the Lumphini Park car park");
  await page.getByRole("button", { name: "บันทึกเนื้อหา" }).click();
  await expect(status(page, "บันทึกเนื้อหาแล้ว")).toBeVisible();

  // 4. The public page in Thai.
  await page.goto(`/events/${ev.slug}`);
  await expect(page.locator("main img").first()).toHaveAttribute("src", /^\/media\/event-images\//);
  const about = page.getByRole("region", { name: "เกี่ยวกับงาน" });
  await expect(about.getByText("วิ่งริมน้ำยามเย็น ปิดถนน")).toBeVisible();
  await expect(about.getByRole("heading", { name: "เส้นทางริมน้ำ" })).toBeVisible();
  await expect(about.locator("strong")).toHaveText("ปิดถนน");
  await expect(about.getByRole("listitem")).toHaveText(["น้ำทุก 2 กม.", "เหรียญทุกระยะ"]);
  await expect(about.getByRole("img", { name: "event-route" })).toBeVisible();
  const photos = page.getByRole("region", { name: "รูปภาพ" });
  await expect(photos.getByRole("button")).toHaveCount(2);
  await expect(photos.getByRole("button").first()).toHaveAccessibleName("เปิดรูปที่ 1: เหรียญที่ระลึก");
  await expectLoaded(page, "main img", await page.locator("main img").count());
  await photos.getByRole("button").first().click();
  const viewer = page.getByRole("dialog", { name: "เหรียญที่ระลึก" });
  await expect(viewer).toBeVisible();
  await viewer.getByRole("button", { name: "รูปถัดไป" }).click();
  await expect(page.getByRole("dialog", { name: "จุดปล่อยตัว" })).toBeVisible();
  await page.getByRole("button", { name: "ปิด", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("region", { name: "กติกาการแข่งขัน" }).getByRole("listitem")).toHaveText(["ติดบิบด้านหน้า", "ห้ามใช้หูฟัง"]);
  await page.getByText("จอดรถได้ไหม").click();
  await expect(page.getByText("จอดได้ที่ลานจอดสวนลุมพินี")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  // 5. In English, with Thai where nothing English was written.
  await page.goto(`/events/${ev.slug}?lang=en`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^River Run /);
  const aboutEn = page.getByRole("region", { name: "About the event" });
  await expect(aboutEn.getByText("An evening closed-road run by the river")).toBeVisible();
  await expect(aboutEn.getByRole("heading", { name: "Riverside course" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Photos" }).getByRole("button").first()).toHaveAccessibleName("Open photo 1: Finisher medal");
  await expect(page.getByRole("region", { name: "Race rules" }).getByRole("listitem").first()).toHaveText("ติดบิบด้านหน้า");
  await page.getByText("Is there parking?").click();
  await expect(page.getByText("Yes, at the Lumphini Park car park")).toBeVisible();
});

test("the seeded event shows its cover, formatted description and gallery", async ({ page }) => {
  await page.goto("/events/riverside-night-run-2027");
  const about = page.getByRole("region", { name: "เกี่ยวกับงาน" });
  await expect(about.getByRole("heading", { name: "วิ่งเลียบเจ้าพระยายามค่ำคืน" })).toBeVisible();
  await expect(about.getByRole("list").first().getByRole("listitem")).toHaveCount(4);
  await expect(page.getByRole("region", { name: "รูปภาพ" }).getByRole("button")).toHaveCount(2);
  await expectLoaded(page, "main img", await page.locator("main img").count());
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
