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

## โครงสร้าง

- **เบราว์เซอร์ไม่เรียก API ตรง:** server component และ server action (`src/app/actions.ts`) เรียก API ผ่าน `src/lib/api.ts`
- **JWT อยู่ใน httpOnly cookie:** JavaScript ฝั่งเบราว์เซอร์อ่านไม่ได้
- **ข้อมูลที่ขึ้นกับคำขอ:** ทุกหน้าที่อ่าน cookie หรือ params อยู่ใน `<Suspense>` ตามกติกา Cache Components หน้าเปล่าจึงแสดงทันที แล้วข้อมูลค่อยตามมา
- **คำสั่งซื้อไม่ซ้ำ:** ฟอร์มสมัครส่ง `Idempotency-Key` ที่คำนวณจากข้อมูลในฟอร์ม กดซ้ำหรือเน็ตหลุดแล้วส่งใหม่จะไม่สร้างคำสั่งซื้อซ้ำ
- **ไซซ์เสื้อ:** กดสมัครแล้วจองที่ทันที ไซซ์เสื้อจองตอนส่งฟอร์มผ่าน `PUT /v1/checkout/sessions/:id/variants` ถ้าไซซ์หมดจะเตือนก่อนสร้างคำสั่งซื้อ
- **ปุ่มจำลองการจ่าย:** `ENABLE_DEV_TOOLS=true` เปิดปุ่ม "จำลองว่าจ่ายแล้ว" ห้ามเปิดใน production

## Test

```bash
pnpm typecheck && pnpm lint    # TypeScript + ESLint
pnpm test                      # unit test (vitest)
pnpm test:e2e                  # Playwright: สมัครจริงตั้งแต่หน้าแรกถึงบัตรวิ่ง บน desktop และมือถือ
```

`test:e2e` ต้องมี API รันอยู่ที่ `API_URL` (ใช้ `PAYMENT_GATEWAY=fake`, `ENABLE_DEV_ENDPOINTS=true` และ seed ข้อมูลแล้ว)

## ยังไม่ได้ทำ

- LINE Login และ OTP (ต้องทำที่ API ก่อน)
- จ่ายด้วยบัตรและ Mobile Banking (ปุ่มมีแล้วแต่ปิดไว้)
- หน้าค้นหาพร้อมตัวกรอง, ผลการแข่งขัน, โอนสิทธิ์ / คืนเงิน, โปรไฟล์
- Backoffice ผู้จัดงานและแอดมิน
