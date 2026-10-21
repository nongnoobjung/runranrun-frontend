# ก้าว · เว็บ (runranrun-frontend)

เว็บสมัครงานวิ่งตามดีไซน์แบบ D (CI ฟ้า-ขาว) คู่กับ API ที่ [runranrun-api](https://github.com/nongnoobjung/runranrun-api)

- Next.js 16.4 (App Router, Cache Components, Partial Prefetching) + React 19
- Tailwind CSS v4: สี ฟอนต์ และมุมโค้งของแบรนด์อยู่ใน `@theme` ที่ `src/app/globals.css` จุดเดียว
- ฟอนต์ Prompt (ไทย + ละติน) ผ่าน `next/font`

## เริ่มใช้งาน

ต้องรัน API ก่อน (ดู README ของ runranrun-api: `docker compose up -d`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm dev:api`)

```bash
cp .env.example .env.local     # API_URL=http://localhost:4000
pnpm install
pnpm dev                       # http://localhost:3000
```

## หน้าที่ทำแล้ว

| หน้า | เส้นทาง |
|---|---|
| หน้าแรก: งานที่เปิดรับสมัคร | `/` |
| รายละเอียดงาน + เลือกระยะและจำนวนผู้วิ่ง | `/events/[slug]` |
| เข้าสู่ระบบ (ชั่วคราว: อีเมล) | `/login` |
| กรอกข้อมูลผู้วิ่ง ไซซ์เสื้อ ผู้ชำระเงิน โค้ดส่วนลด | `/checkout/[id]` |
| สรุปยอดและชำระเงิน PromptPay (QR + เช็กสถานะทุก 3 วินาที) | `/orders/[id]/pay` |
| ชำระสำเร็จ พร้อมเลขบิบ | `/orders/[id]/success` |
| งานของฉัน | `/me/events` |
| บัตรวิ่ง + QR รับเสื้อ | `/me/registrations/[id]` |

## Backoffice ผู้จัดงาน (`/organizer`)

เข้าสู่ระบบด้วย `organizer@riverside.example` (ได้จาก `pnpm db:seed` ของ API) แล้วเปิด `/organizer`

| หน้า | เส้นทาง |
|---|---|
| ทีมผู้จัด และงานทั้งหมดของทีม | `/organizer`, `/organizer/[orgId]` |
| สร้างงาน (ฉบับร่าง) | `/organizer/[orgId]/events/new` |
| ภาพรวม: ยอดสมัครรายวัน, โควต้าแต่ละระยะ, ยอดเสื้อ, รายได้, เพิ่งสมัคร | `/organizer/[orgId]/events/[eventId]` |
| ข้อมูลงาน, ความพร้อม, เปิด/ปิดรับสมัคร | `.../edit` |
| ระยะและช่วงราคา | `.../races` |
| ฟอร์มสมัคร: คำถามเพิ่มเติม (เพิ่ม แก้ เรียง ลบ เลือกระยะที่ถาม) | `.../form` |
| เสื้อและไซซ์ (สต็อก) | `.../shirts` |
| คูปอง | `.../coupons` |
| ผู้สมัคร: ค้นหา, กรอง, รายละเอียด, ดูเลขบัตร (บันทึกการเข้าถึง), Export CSV | `.../registrations` |
| หน้างาน: สแกน QR หรือพิมพ์เลขบิบ เพื่อมอบเสื้อและบิบ | `.../checkin` |

- **ตามบทบาท:** owner และ admin แก้ได้ทุกอย่าง, staff ใช้หน้ารับของ, finance และ viewer ดูอย่างเดียว
  - ปุ่มที่ทำไม่ได้จะซ่อนไว้ และ API ก็ตรวจซ้ำอีกชั้น
- **วันเวลา:** ทุกช่องที่ผู้จัดกรอกเป็นเวลากรุงเทพฯ
- **ราคา:** กรอกเป็นบาท ส่งไป API เป็นสตางค์
- **คำถามเพิ่มเติม:** ฟอร์มสมัครของนักวิ่งแสดงคำถามของระยะที่สมัคร API เป็นคนตรวจคำตอบ แล้วเว็บแสดงข้อผิดพลาดใต้คำถามนั้น คำตอบดูได้ในรายละเอียดผู้สมัครและ CSV
- **Export CSV:** วิ่งผ่าน route ของเว็บที่แนบ token จาก cookie ให้ เบราว์เซอร์จึงไม่ได้ถือ token ของ API

## โครงสร้าง

- **เบราว์เซอร์ไม่เรียก API ตรง:** server component และ server action (`src/app/actions.ts`) เรียก API ผ่าน `src/lib/api.ts`
- **JWT อยู่ใน httpOnly cookie:** JavaScript ฝั่งเบราว์เซอร์อ่านไม่ได้
- **ข้อมูลที่ขึ้นกับคำขอ:** ทุกหน้าที่อ่าน cookie หรือ params อยู่ใน `<Suspense>` ตามกติกา Cache Components หน้าเปล่าจึงแสดงทันที แล้วข้อมูลค่อยตามมา
- **คำสั่งซื้อไม่ซ้ำ:** ฟอร์มสมัครส่ง `Idempotency-Key` ที่คำนวณจากข้อมูลในฟอร์ม กดซ้ำหรือเน็ตหลุดแล้วส่งใหม่จะไม่สร้างคำสั่งซื้อซ้ำ
- **หน้านักวิ่งกับ backoffice แยก layout:** หน้านักวิ่งอยู่ใน route group `(site)` ที่มี header/footer ส่วน `/organizer` มีแถบเมนูของตัวเอง
- **ไซซ์เสื้อ:** กดสมัครแล้วจองที่ทันที ไซซ์เสื้อจองตอนส่งฟอร์มผ่าน `PUT /v1/checkout/sessions/:id/variants` ถ้าไซซ์หมดจะเตือนก่อนสร้างคำสั่งซื้อ
- **ปุ่มจำลองการจ่าย:** `ENABLE_DEV_TOOLS=true` เปิดปุ่ม "จำลองว่าจ่ายแล้ว" ห้ามเปิดใน production

## Test

```bash
pnpm typecheck && pnpm lint    # TypeScript + ESLint
pnpm test                      # unit test (vitest)
pnpm test:e2e                  # Playwright บน desktop และมือถือ: นักวิ่งสมัครจนได้บัตรวิ่ง, ผู้จัดสร้างงานจนเปิดรับสมัคร, ค้นหาผู้สมัครและมอบของหน้างาน, ผู้จัดเพิ่มคำถามบังคับแล้วนักวิ่งต้องตอบ
```

`test:e2e` ต้องมี API รันอยู่ที่ `API_URL` (ใช้ `PAYMENT_GATEWAY=fake`, `ENABLE_DEV_ENDPOINTS=true` และ seed ข้อมูลแล้ว)

## ยังไม่ได้ทำ

- LINE Login และ OTP (ต้องทำที่ API ก่อน)
- จ่ายด้วยบัตรและ Mobile Banking (ปุ่มมีแล้วแต่ปิดไว้)
- หน้าค้นหาพร้อมตัวกรอง, ผลการแข่งขัน, โอนสิทธิ์ / คืนเงิน, โปรไฟล์
- Backoffice ส่วนที่เหลือ: ออกบิบเอง, คำขอโอน/คืนเงิน, ผลการแข่งขัน, ส่งข่าว, การเงิน, เชิญทีมงาน
- หน้ารับของแบบออฟไลน์ (เก็บคิวไว้แล้วส่งทีหลัง)
- Backoffice แอดมิน
