/** Formats integer satang as baht: 120000 → "฿1,200", 110160 → "฿1,101.60". */
export function baht(satang: number): string {
  const whole = satang % 100 === 0;
  return `฿${(satang / 100).toLocaleString("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

const thaiDate = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
const thaiDay = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { weekday: "long", timeZone: "Asia/Bangkok" });
const thaiMonthShort = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { month: "short", timeZone: "Asia/Bangkok" });
const thaiTime = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });

/** Event dates come from the API as YYYY-MM-DD (a calendar day in Bangkok). Noon keeps it on the same day in any zone. */
function day(value: string): Date {
  return new Date(value.length === 10 ? `${value}T12:00:00+07:00` : value);
}

export const fmt = {
  date: (v: string) => thaiDate.format(day(v)),
  weekday: (v: string) => thaiDay.format(day(v)),
  dayOfMonth: (v: string) => String(day(v).getUTCDate()).padStart(2, "0"),
  monthShort: (v: string) => thaiMonthShort.format(day(v)),
  time: (v: string) => thaiTime.format(new Date(v)),
};

export function distanceLabel(km: number): string {
  return `${km}K`;
}

/** Minutes left as mm:ss, never negative. */
export function countdown(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const PROBLEM_TH: Record<string, string> = {
  SOLD_OUT: "ระยะนี้เต็มแล้ว",
  SIZE_SOLD_OUT: "ไซซ์นี้หมดแล้ว เลือกไซซ์อื่น",
  NO_PRICE_AVAILABLE: "ยังไม่เปิดขายราคาสำหรับระยะนี้",
  REGISTRATION_CLOSED: "งานนี้ยังไม่เปิดหรือปิดรับสมัครแล้ว",
  CHECKOUT_EXPIRED: "หมดเวลาจองที่ เริ่มสมัครใหม่อีกครั้ง",
  ALREADY_REGISTERED: "บัตรประชาชนนี้สมัครระยะนี้ไปแล้ว",
  COUPON_INVALID: "โค้ดส่วนลดใช้กับงานนี้ไม่ได้",
  COUPON_USED_UP: "โค้ดส่วนลดถูกใช้ครบแล้ว",
  COUPON_ALREADY_USED: "คุณใช้โค้ดนี้ไปแล้ว",
  ORDER_NOT_PAYABLE: "คำสั่งซื้อนี้ชำระเงินไม่ได้แล้ว",
  PAYMENT_GATEWAY_ERROR: "ระบบชำระเงินขัดข้อง ลองใหม่อีกครั้ง",
  API_UNREACHABLE: "ระบบไม่ตอบสนอง ลองใหม่อีกครั้ง",
  UNAUTHORIZED: "กรุณาเข้าสู่ระบบ",
};

/** A Thai message for an API problem code, falling back to the API's own detail. */
export function problemMessage(p: { code: string; title: string; detail?: string }): string {
  return PROBLEM_TH[p.code] ?? p.detail ?? p.title;
}

const PROVINCES: Record<string, string> = {
  BKK: "กรุงเทพฯ", CNX: "เชียงใหม่", HKT: "ภูเก็ต", KKN: "ขอนแก่น", NMA: "นครราชสีมา",
  PKN: "ประจวบคีรีขันธ์", SKA: "สงขลา", CRI: "เชียงราย", CBI: "ชลบุรี", KBI: "กระบี่",
};

/** Thai name for the API's province code; unknown codes are shown as they are. */
export function provinceName(code: string | null): string | null {
  return code ? (PROVINCES[code] ?? code) : null;
}
