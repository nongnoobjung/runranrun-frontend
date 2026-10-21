import type { QuestionType, ResultStatus } from "./types";

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

/** 6728000 → "1:52:08"; under an hour "52:08". */
export function duration(ms: number | null): string {
  if (!ms) return "–";
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** 313 → "5:13 /กม." */
export function pace(secPerKm: number | null): string {
  if (!secPerKm) return "–";
  return `${Math.floor(secPerKm / 60)}:${String(secPerKm % 60).padStart(2, "0")} /กม.`;
}

export const RESULT_STATUS_TH: Record<ResultStatus, string> = { FIN: "เข้าเส้นชัย", DNF: "ไม่ถึงเส้นชัย", DNS: "ไม่ได้ออกตัว", DQ: "ตัดสิทธิ์" };

export function distanceLabel(km: number): string {
  return `${km}K`;
}

/** Minutes left as mm:ss, never negative. */
export function countdown(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const ss = String(total % 60).padStart(2, "0");
  // Long waits (a 24-hour waitlist offer) read as h:mm:ss; checkout holds stay mm:ss.
  if (total >= 3600) return `${Math.floor(total / 3600)}:${String(Math.floor((total % 3600) / 60)).padStart(2, "0")}:${ss}`;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${ss}`;
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
  FORBIDDEN: "บทบาทของคุณในทีมผู้จัดทำรายการนี้ไม่ได้",
  VALIDATION_FAILED: "ข้อมูลบางช่องไม่ถูกต้อง",
  // Organizer backoffice
  EVENT_NOT_READY: "ยังเปิดรับสมัครไม่ได้ กรอกข้อมูลที่ขาดให้ครบก่อน",
  INVALID_STATUS: "สถานะงานตอนนี้ทำรายการนี้ไม่ได้",
  SLUG_TAKEN: "ลิงก์นี้มีงานอื่นใช้แล้ว",
  SLUG_LOCKED: "เปลี่ยนลิงก์ไม่ได้หลังเปิดรับสมัครแล้ว",
  RACE_CODE_TAKEN: "งานนี้มีระยะที่ใช้ชื่อย่อนี้แล้ว",
  CAPACITY_BELOW_SOLD: "ลดโควต้าต่ำกว่าจำนวนที่ขายหรือจองไว้แล้วไม่ได้",
  BIBS_ISSUED: "ออกบิบจากช่วงนี้ไปแล้ว แก้ได้เฉพาะเลขสุดท้าย",
  BIB_RANGE_OVERLAP: "ช่วงเลขบิบทับกับระยะอื่น",
  RACE_HAS_REGISTRATIONS: "ระยะนี้มีผู้สมัครแล้ว ลบไม่ได้",
  QUOTA_BELOW_SOLD: "ลดโควต้าราคานี้ต่ำกว่าที่ขายไปแล้วไม่ได้",
  TIER_HAS_SALES: "มีคนซื้อในราคานี้แล้ว ให้ปรับวันสิ้นสุดแทนการลบ",
  STOCK_BELOW_SOLD: "ลดสต็อกต่ำกว่าจำนวนเสื้อที่ขายหรือจองไว้แล้วไม่ได้",
  COUPON_CODE_TAKEN: "งานนี้มีโค้ดนี้แล้ว",
  COUPON_IN_USE: "มีคนใช้โค้ดนี้แล้ว จึงแก้ส่วนลดไม่ได้ ปิดโค้ดแล้วสร้างใหม่แทน",
  USAGE_BELOW_USED: "จำนวนสิทธิ์ต้องไม่น้อยกว่าที่ใช้ไปแล้ว",
  REGISTRATION_NOT_FOUND: "ไม่พบผู้สมัครในงานนี้",
  ALREADY_PICKED_UP: "ผู้สมัครคนนี้รับของไปแล้ว",
  NOT_CONFIRMED: "ผู้สมัครคนนี้ยังไม่ได้ชำระเงิน หรือสิทธิ์ถูกยกเลิกแล้ว",
  WAITLIST_DISABLED: "งานนี้ไม่มีคิว waitlist",
  RACE_NOT_FULL: "ระยะนี้ยังมีที่ว่าง สมัครได้เลย",
  ALREADY_IN_WAITLIST: "คุณอยู่ในคิวของระยะนี้แล้ว",
  NO_OFFER: "ตอนนี้ยังไม่ถึงคิวคุณ หรือหมดเวลารับสิทธิ์แล้ว",
  NO_RESULTS: "ยังไม่มีผลให้เผยแพร่ นำเข้าไฟล์ผลก่อน",
  RESULTS_NOT_PUBLISHED: "ผลการแข่งขันยังไม่ออก",
  BROADCAST_NOT_DRAFT: "ข้อความนี้ส่งหรือตั้งเวลาไปแล้ว แก้ไขไม่ได้",
  NO_RECIPIENTS: "ไม่มีผู้สมัครในกลุ่มนี้ที่มีอีเมล",
  NO_EMAIL: "บัญชีของคุณไม่มีอีเมลสำหรับส่งทดสอบ",
  NOT_SCHEDULED: "ข้อความนี้ไม่ได้ตั้งเวลาไว้แล้ว",
  BIB_TAKEN: "เลขบิบนี้มีผู้สมัครคนอื่นใช้แล้ว",
  REFUND_NOT_ALLOWED: "งานนี้ไม่มีนโยบายคืนเงิน",
  REFUND_CLOSED: "เลยกำหนดขอคืนเงินของงานนี้แล้ว",
  REFUND_IN_PROGRESS: "มีคำขอคืนเงินของสิทธิ์นี้อยู่แล้ว",
  REFUND_PENDING: "นักวิ่งขอคืนเงินอยู่ ตอบคำขอก่อนมอบของ",
  REFUND_STATE: "คำขอนี้ถูกจัดการไปแล้ว รีเฟรชหน้าเพื่อดูสถานะล่าสุด",
  ALREADY_INVITED: "อีเมลนี้มีคำเชิญที่ยังไม่ตอบรับอยู่แล้ว",
  ALREADY_MEMBER: "อีเมลนี้อยู่ในทีมแล้ว",
  LAST_OWNER: "ทีมต้องมีเจ้าของอย่างน้อยหนึ่งคน เพิ่มเจ้าของอีกคนก่อน",
  TOO_MANY_QUESTIONS: "ฟอร์มหนึ่งงานมีคำถามเพิ่มเติมได้ไม่เกิน 30 ข้อ",
  QUESTION_IN_USE: "มีคนตอบคำถามนี้แล้ว จึงเปลี่ยนประเภทไม่ได้ สร้างคำถามใหม่แทน",
  TRANSFER_NOT_ALLOWED: "งานนี้ไม่เปิดให้โอนสิทธิ์",
  TRANSFER_CLOSED: "หมดเวลาโอนสิทธิ์ของงานนี้แล้ว",
  TRANSFER_IN_PROGRESS: "สิทธิ์นี้กำลังโอนให้คนอื่นอยู่ ยกเลิกการโอนก่อน",
  TRANSFER_UNAVAILABLE: "สิทธิ์นี้โอนไม่ได้แล้ว เจ้าของอาจรับของหน้างานหรือยกเลิกสิทธิ์ไปแล้ว",
  SELF_TRANSFER: "ใส่อีเมลของคนที่จะรับสิทธิ์ ไม่ใช่อีเมลของคุณเอง",
  RACE_CHANGE_NOT_ALLOWED: "งานนี้ไม่เปิดให้เปลี่ยนระยะ",
  RACE_CHANGE_CLOSED: "หมดเวลาเปลี่ยนระยะของงานนี้แล้ว",
  RACE_CHANGE_IN_PROGRESS: "มีการเปลี่ยนระยะที่รอชำระเงินอยู่",
  RACE_NOT_ELIGIBLE: "อายุหรือเพศของผู้วิ่งไม่ตรงเงื่อนไขของระยะนี้",
  PROFILE_EXISTS: "บันทึกผู้วิ่งที่ใช้เลขบัตรนี้ไว้แล้ว แก้ไขคนเดิมแทน",
  TOO_MANY_PROFILES: "บันทึกผู้วิ่งได้สูงสุด 20 คน ลบคนที่ไม่ใช้แล้วก่อน",
  // Organiser sign-up and KYC
  TOO_MANY_PENDING_TEAMS: "คุณมีทีมที่รอตรวจเอกสารอยู่ 3 ทีมแล้ว ส่งเอกสารให้ครบก่อนเปิดทีมใหม่",
  KYC_LOCKED: "ชื่อตามทะเบียนและเลขผู้เสียภาษีผ่านการตรวจแล้ว ติดต่อทีมงานก้าวหากต้องแก้",
  UNSUPPORTED_FILE_TYPE: "รองรับเฉพาะไฟล์ PDF, JPG หรือ PNG",
  UNSUPPORTED_MEDIA_TYPE: "รองรับเฉพาะไฟล์ PDF, JPG หรือ PNG",
  FILE_TOO_LARGE: "ไฟล์ใหญ่เกิน 10 MB",
  FILE_REQUIRED: "เลือกไฟล์ก่อน",
  EMPTY_FILE: "ไฟล์ว่างเปล่า",
  TOO_MANY_PARTS: "อัปโหลดได้ครั้งละหนึ่งไฟล์",
  TOO_MANY_DOCUMENTS: "ทีมหนึ่งเก็บเอกสารได้ 20 ไฟล์ ลบไฟล์เก่าที่ไม่ใช้ก่อน",
  DOCUMENT_APPROVED: "เอกสารที่ตรวจผ่านแล้วลบไม่ได้",
  NO_BANK_SUBMISSION: "ผู้จัดยังไม่ได้ส่งบัญชีรับเงินมาให้ยืนยัน",
};

/** A Thai message for an API problem code, falling back to the API's own detail. */
export function problemMessage(p: { code: string; title: string; detail?: string }): string {
  return PROBLEM_TH[p.code] ?? p.detail ?? p.title;
}

export const PROVINCES: Record<string, string> = {
  BKK: "กรุงเทพฯ", CNX: "เชียงใหม่", HKT: "ภูเก็ต", KKN: "ขอนแก่น", NMA: "นครราชสีมา",
  PKN: "ประจวบคีรีขันธ์", SKA: "สงขลา", CRI: "เชียงราย", CBI: "ชลบุรี", KBI: "กระบี่",
};

/** Thai name for the API's province code; unknown codes are shown as they are. */
export function provinceName(code: string | null): string | null {
  return code ? (PROVINCES[code] ?? code) : null;
}

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  text: "ข้อความสั้น",
  textarea: "ข้อความยาว",
  number: "ตัวเลข",
  select: "เลือกหนึ่งข้อ",
  multiselect: "เลือกได้หลายข้อ",
  checkbox: "ติ๊กยืนยัน",
  date: "วันที่",
};

/** A runner's answer as text: choices joined, ticks as ใช่ / ไม่. */
export function answerText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "ใช่" : "ไม่";
  return String(value);
}

/** How a saved runner shows in lists and pickers: "ตัวฉัน · nickname · name". */
export function profileLabel(p: { isSelf: boolean; nickname: string | null; firstNameTh: string | null; lastNameTh: string | null; firstNameEn: string; lastNameEn: string }): string {
  const name = p.firstNameTh ? `${p.firstNameTh} ${p.lastNameTh ?? ""}`.trim() : `${p.firstNameEn} ${p.lastNameEn}`;
  return [p.isSelf ? "ตัวฉัน" : null, p.nickname, name].filter(Boolean).join(" · ");
}
