import type { Locale } from "@/i18n/config";
import type { QuestionType, ResultStatus } from "./types";

/** Formats integer satang as baht: 120000 → "฿1,200", 110160 → "฿1,101.60". */
export function baht(satang: number): string {
  const whole = satang % 100 === 0;
  return `฿${(satang / 100).toLocaleString("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Event dates come from the API as YYYY-MM-DD (a calendar day in Bangkok). Noon keeps it on the same day in any zone. */
function day(value: string): Date {
  return new Date(value.length === 10 ? `${value}T12:00:00+07:00` : value);
}

// Thai keeps the Gregorian year (no Buddhist era); English reads the British way: "14 Feb 2027", 24-hour clock.
const INTL_LOCALE: Record<Locale, string> = { th: "th-TH-u-ca-gregory", en: "en-GB" };

function formatters(locale: Locale) {
  const tag = INTL_LOCALE[locale];
  const zone = { timeZone: "Asia/Bangkok" } as const;
  const date = new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", year: "numeric", ...zone });
  const weekday = new Intl.DateTimeFormat(tag, { weekday: "long", ...zone });
  const monthShort = new Intl.DateTimeFormat(tag, { month: "short", ...zone });
  const time = new Intl.DateTimeFormat(tag, { hour: "2-digit", minute: "2-digit", hour12: false, ...zone });
  return {
    date: (v: string) => date.format(day(v)),
    weekday: (v: string) => weekday.format(day(v)),
    dayOfMonth: (v: string) => String(day(v).getUTCDate()).padStart(2, "0"),
    monthShort: (v: string) => monthShort.format(day(v)),
    time: (v: string) => time.format(new Date(v)),
    /** Counts with thousands separators: 1,234. */
    num: (n: number) => n.toLocaleString(locale === "th" ? "th-TH" : "en-US"),
  };
}

const FORMATTERS: Record<Locale, ReturnType<typeof formatters>> = { th: formatters("th"), en: formatters("en") };

/** Date, time and number formatting for a language. */
export function fmtFor(locale: Locale) {
  return FORMATTERS[locale];
}

/** Thai formatting, for the Thai-only organiser and admin pages. */
export const fmt = FORMATTERS.th;

/** 6728000 → "1:52:08"; under an hour "52:08". */
export function duration(ms: number | null): string {
  if (!ms) return "–";
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** 313 → "5:13 /กม." (English "5:13 /km") */
export function pace(secPerKm: number | null, locale: Locale = "th"): string {
  if (!secPerKm) return "–";
  return `${Math.floor(secPerKm / 60)}:${String(secPerKm % 60).padStart(2, "0")} /${locale === "th" ? "กม." : "km"}`;
}

export const RESULT_STATUS: Record<Locale, Record<ResultStatus, string>> = {
  th: { FIN: "เข้าเส้นชัย", DNF: "ไม่ถึงเส้นชัย", DNS: "ไม่ได้ออกตัว", DQ: "ตัดสิทธิ์" },
  en: { FIN: "Finished", DNF: "Did not finish", DNS: "Did not start", DQ: "Disqualified" },
};
export const RESULT_STATUS_TH = RESULT_STATUS.th;

export function distanceLabel(km: number): string {
  return `${km}K`;
}

/** A waiting room estimate in words: 45 → "ไม่ถึง 1 นาที", 400 → "ประมาณ 7 นาที", 5400 → "ประมาณ 1 ชม. 30 นาที" (English "about 1 hr 30 min"). */
export function waitLabel(seconds: number, locale: Locale = "th"): string {
  const th = locale === "th";
  if (seconds < 60) return th ? "ไม่ถึง 1 นาที" : "less than a minute";
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return th ? `ประมาณ ${minutes} นาที` : `about ${minutes} min`;
  const rest = minutes % 60;
  const hours = Math.floor(minutes / 60).toLocaleString();
  return th ? `ประมาณ ${hours} ชม.${rest ? ` ${rest} นาที` : ""}` : `about ${hours} hr${rest ? ` ${rest} min` : ""}`;
}

/** Minutes left as mm:ss, never negative. */
export function countdown(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const ss = String(total % 60).padStart(2, "0");
  // Long waits (a 24-hour waitlist offer) read as h:mm:ss; checkout holds stay mm:ss.
  if (total >= 3600) return `${Math.floor(total / 3600)}:${String(Math.floor((total % 3600) / 60)).padStart(2, "0")}:${ss}`;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${ss}`;
}

const PROBLEM_TH = {
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
  UPCOMING_REGISTRATIONS: "ยังมีงานที่สมัครไว้และยังไม่ถึงวันแข่ง ขอคืนเงินหรือโอนสิทธิ์ก่อนปิดบัญชี",
  PROFILE_EXISTS: "บันทึกผู้วิ่งที่ใช้เลขบัตรนี้ไว้แล้ว แก้ไขคนเดิมแทน",
  TOO_MANY_PROFILES: "บันทึกผู้วิ่งได้สูงสุด 20 คน ลบคนที่ไม่ใช้แล้วก่อน",
  RATE_LIMITED: "มีคนใช้งานพร้อมกันจำนวนมาก รอสักครู่แล้วลองใหม่",
  QUEUE_REQUIRED: "งานนี้ต้องเข้าคิวก่อนสมัคร",
  QUEUE_TOKEN_EXPIRED: "หมดเวลาสมัครของรอบคิวคุณแล้ว เข้าคิวใหม่อีกครั้ง",
  QUEUE_UNAVAILABLE: "ระบบคิวไม่พร้อมใช้งานตอนนี้ ลองใหม่อีกครั้ง",
  WAITING_ROOM_UNAVAILABLE: "เซิร์ฟเวอร์นี้ยังเปิดระบบคิวไม่ได้ ติดต่อทีมงานก้าว",
  // Organiser sign-up and KYC
  TOO_MANY_PENDING_TEAMS: "คุณมีทีมที่รอตรวจเอกสารอยู่ 3 ทีมแล้ว ส่งเอกสารให้ครบก่อนเปิดทีมใหม่",
  KYC_LOCKED: "ชื่อตามทะเบียนและเลขผู้เสียภาษีผ่านการตรวจแล้ว ติดต่อทีมงานก้าวหากต้องแก้",
  UNSUPPORTED_FILE_TYPE: "รองรับเฉพาะไฟล์ PDF, JPG หรือ PNG",
  UNSUPPORTED_MEDIA_TYPE: "รองรับเฉพาะไฟล์ PDF, JPG หรือ PNG",
  FILE_TOO_LARGE: "ไฟล์ใหญ่เกิน 10 MB",
  FILE_REQUIRED: "เลือกไฟล์ก่อน",
  EMPTY_FILE: "ไฟล์ว่างเปล่า",
  UNSUPPORTED_IMAGE_TYPE: "รองรับเฉพาะรูป JPG, PNG หรือ WebP",
  INVALID_IMAGE: "เปิดรูปนี้ไม่ได้ ลองบันทึกใหม่เป็น JPG หรือ PNG",
  TOO_MANY_IMAGES: "งานนี้มีรูปครบจำนวนแล้ว ลบรูปที่ไม่ใช้ก่อน",
  GALLERY_FULL: "แกลเลอรีมีได้สูงสุด 30 รูป",
  TOO_MANY_PARTS: "อัปโหลดได้ครั้งละหนึ่งไฟล์",
  TOO_MANY_DOCUMENTS: "ทีมหนึ่งเก็บเอกสารได้ 20 ไฟล์ ลบไฟล์เก่าที่ไม่ใช้ก่อน",
  DOCUMENT_APPROVED: "เอกสารที่ตรวจผ่านแล้วลบไม่ได้",
  NO_BANK_SUBMISSION: "ผู้จัดยังไม่ได้ส่งบัญชีรับเงินมาให้ยืนยัน",
  RECEIPT_NOT_AVAILABLE: "ใบเสร็จออกให้เมื่อชำระเงินแล้ว",
  ORDER_REFUNDED: "คำสั่งซื้อนี้คืนเงินแล้ว จึงออกใบกำกับภาษีใหม่ไม่ได้",
  TAX_INVOICE_EXISTS: "ออกใบกำกับภาษีให้คำสั่งซื้อนี้แล้ว หากต้องแก้ไขติดต่อผู้จัดงาน",
};

/** English for every code above: a missing one fails typecheck. */
const PROBLEM_EN: Record<keyof typeof PROBLEM_TH, string> = {
  SOLD_OUT: "This race is full",
  SIZE_SOLD_OUT: "This size is sold out. Pick another size",
  NO_PRICE_AVAILABLE: "Entries for this race are not on sale yet",
  REGISTRATION_CLOSED: "Registration for this event is not open or has closed",
  CHECKOUT_EXPIRED: "Your held place has expired. Please start again",
  ALREADY_REGISTERED: "This ID number is already registered for this race",
  COUPON_INVALID: "This discount code cannot be used for this event",
  COUPON_USED_UP: "This discount code has been fully used",
  COUPON_ALREADY_USED: "You have already used this code",
  ORDER_NOT_PAYABLE: "This order can no longer be paid",
  PAYMENT_GATEWAY_ERROR: "The payment system is having trouble. Please try again",
  API_UNREACHABLE: "The system is not responding. Please try again",
  UNAUTHORIZED: "Please sign in",
  FORBIDDEN: "Your role in the organiser team cannot do this",
  VALIDATION_FAILED: "Some fields are not valid",
  EVENT_NOT_READY: "Registration cannot open yet. Fill in the missing details first",
  INVALID_STATUS: "This cannot be done while the event is in its current status",
  SLUG_TAKEN: "Another event already uses this link",
  SLUG_LOCKED: "The link cannot change once registration has opened",
  RACE_CODE_TAKEN: "This event already has a race with this short name",
  CAPACITY_BELOW_SOLD: "Capacity cannot go below the places already sold or held",
  BIBS_ISSUED: "Bibs from this range are already issued; only the last number can change",
  BIB_RANGE_OVERLAP: "This bib range overlaps another race",
  RACE_HAS_REGISTRATIONS: "This race has entries and cannot be deleted",
  QUOTA_BELOW_SOLD: "This price's quota cannot go below what has been sold",
  TIER_HAS_SALES: "People have bought at this price; change its end date instead of deleting it",
  STOCK_BELOW_SOLD: "Stock cannot go below the shirts already sold or held",
  COUPON_CODE_TAKEN: "This event already has this code",
  COUPON_IN_USE: "This code has been used, so its discount cannot change. Turn it off and create a new one",
  USAGE_BELOW_USED: "The number of uses cannot be less than those already used",
  REGISTRATION_NOT_FOUND: "No such entry in this event",
  ALREADY_PICKED_UP: "This runner has already picked up their kit",
  NOT_CONFIRMED: "This runner has not paid yet, or the entry was cancelled",
  WAITLIST_DISABLED: "This event has no waitlist",
  RACE_NOT_FULL: "This race still has places. Register now",
  ALREADY_IN_WAITLIST: "You are already on the waitlist for this race",
  NO_OFFER: "It is not your turn yet, or the offer has expired",
  NO_RESULTS: "No results to publish yet. Import a results file first",
  RESULTS_NOT_PUBLISHED: "Results are not out yet",
  BROADCAST_NOT_DRAFT: "This message has already been sent or scheduled and cannot be edited",
  NO_RECIPIENTS: "No runners with an email in this group",
  NO_EMAIL: "Your account has no email to send a test to",
  NOT_SCHEDULED: "This message is no longer scheduled",
  BIB_TAKEN: "Another runner already has this bib number",
  REFUND_NOT_ALLOWED: "This event has no refund policy",
  REFUND_CLOSED: "The refund deadline for this event has passed",
  REFUND_IN_PROGRESS: "There is already a refund request for this entry",
  REFUND_PENDING: "The runner has asked for a refund. Answer the request before handing over the kit",
  REFUND_STATE: "This request has already been handled. Refresh to see its latest status",
  ALREADY_INVITED: "This email already has an invitation waiting",
  ALREADY_MEMBER: "This email is already in the team",
  LAST_OWNER: "The team needs at least one owner. Add another owner first",
  TOO_MANY_QUESTIONS: "An event form can have at most 30 extra questions",
  QUESTION_IN_USE: "People have answered this question, so its type cannot change. Create a new question instead",
  TRANSFER_NOT_ALLOWED: "This event does not allow transfers",
  TRANSFER_CLOSED: "The transfer deadline for this event has passed",
  TRANSFER_IN_PROGRESS: "This entry is already being transferred. Cancel that transfer first",
  TRANSFER_UNAVAILABLE: "This entry can no longer be transferred; the kit may have been picked up or the entry cancelled",
  SELF_TRANSFER: "Enter the email of the person receiving the entry, not your own",
  RACE_CHANGE_NOT_ALLOWED: "This event does not allow race changes",
  RACE_CHANGE_CLOSED: "The race change deadline for this event has passed",
  RACE_CHANGE_IN_PROGRESS: "A race change is already waiting for payment",
  RACE_NOT_ELIGIBLE: "The runner's age or gender does not meet this race's conditions",
  UPCOMING_REGISTRATIONS: "You still have entries for races that have not happened yet. Ask for a refund or transfer them before closing your account",
  PROFILE_EXISTS: "A saved runner with this ID number already exists. Edit that one instead",
  TOO_MANY_PROFILES: "You can save up to 20 runners. Delete one you no longer use first",
  RATE_LIMITED: "Lots of people are here at once. Wait a moment and try again",
  QUEUE_REQUIRED: "This event needs you to queue before registering",
  QUEUE_TOKEN_EXPIRED: "Your turn from the queue has run out. Please join the queue again",
  QUEUE_UNAVAILABLE: "The queue is not available right now. Please try again",
  WAITING_ROOM_UNAVAILABLE: "This server cannot run the queue yet. Contact the Kao team",
  TOO_MANY_PENDING_TEAMS: "You already have 3 teams waiting for document checks. Finish their documents before opening a new team",
  KYC_LOCKED: "The registered name and tax ID have been verified. Contact the Kao team if they need changing",
  UNSUPPORTED_FILE_TYPE: "Only PDF, JPG or PNG files are supported",
  UNSUPPORTED_MEDIA_TYPE: "Only PDF, JPG or PNG files are supported",
  FILE_TOO_LARGE: "The file is larger than 10 MB",
  FILE_REQUIRED: "Choose a file first",
  EMPTY_FILE: "The file is empty",
  UNSUPPORTED_IMAGE_TYPE: "Only JPG, PNG or WebP images are supported",
  INVALID_IMAGE: "This image can't be opened. Try saving it again as JPG or PNG",
  TOO_MANY_IMAGES: "This event already has as many images as it can. Delete ones you don't use first",
  GALLERY_FULL: "The gallery can hold up to 30 photos",
  TOO_MANY_PARTS: "Upload one file at a time",
  TOO_MANY_DOCUMENTS: "A team can keep up to 20 documents. Delete old ones you no longer need first",
  DOCUMENT_APPROVED: "Approved documents cannot be deleted",
  NO_BANK_SUBMISSION: "The organiser has not sent a payout bank account to confirm yet",
  RECEIPT_NOT_AVAILABLE: "The receipt is issued once the order is paid",
  ORDER_REFUNDED: "This order has been refunded, so no new tax invoice can be issued",
  TAX_INVOICE_EXISTS: "A tax invoice has already been issued for this order. Contact the organiser to correct it",
};

const PROBLEMS: Record<Locale, Record<string, string>> = { th: PROBLEM_TH, en: PROBLEM_EN };

/** A message for an API problem code in the page's language, falling back to the API's own detail. */
export function problemMessage(
  p: { code: string; title: string; detail?: string; retryAfterSeconds?: unknown },
  locale: Locale = "th",
): string {
  if (p.code === "RATE_LIMITED" && typeof p.retryAfterSeconds === "number") {
    const seconds = p.retryAfterSeconds.toLocaleString();
    return locale === "th" ? `มีคนใช้งานพร้อมกันจำนวนมาก รอ ${seconds} วินาทีแล้วลองใหม่` : `Lots of people are here at once. Wait ${seconds} seconds and try again`;
  }
  return PROBLEMS[locale][p.code] ?? p.detail ?? p.title;
}

export const PROVINCES: Record<string, string> = {
  BKK: "กรุงเทพฯ", CNX: "เชียงใหม่", HKT: "ภูเก็ต", KKN: "ขอนแก่น", NMA: "นครราชสีมา",
  PKN: "ประจวบคีรีขันธ์", SKA: "สงขลา", CRI: "เชียงราย", CBI: "ชลบุรี", KBI: "กระบี่",
};

const PROVINCES_EN: Record<string, string> = {
  BKK: "Bangkok", CNX: "Chiang Mai", HKT: "Phuket", KKN: "Khon Kaen", NMA: "Nakhon Ratchasima",
  PKN: "Prachuap Khiri Khan", SKA: "Songkhla", CRI: "Chiang Rai", CBI: "Chon Buri", KBI: "Krabi",
};

/** The province's name for the API's province code; unknown codes are shown as they are. */
export function provinceName(code: string | null, locale: Locale = "th"): string | null {
  return code ? ((locale === "th" ? PROVINCES : PROVINCES_EN)[code] ?? code) : null;
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

/** A runner's answer as text: choices joined, ticks as ใช่ / ไม่ (Yes / No). */
export function answerText(value: unknown, locale: Locale = "th"): string {
  if (value === null || value === undefined || value === "") return "–";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return locale === "th" ? (value ? "ใช่" : "ไม่") : value ? "Yes" : "No";
  return String(value);
}

/** How a saved runner shows in lists and pickers: "ตัวฉัน · nickname · name" (English: "Me · nickname · English name"). */
export function profileLabel(
  p: { isSelf: boolean; nickname: string | null; firstNameTh: string | null; lastNameTh: string | null; firstNameEn: string; lastNameEn: string },
  locale: Locale = "th",
): string {
  const name = p.firstNameTh && locale === "th" ? `${p.firstNameTh} ${p.lastNameTh ?? ""}`.trim() : `${p.firstNameEn} ${p.lastNameEn}`;
  return [p.isSelf ? (locale === "th" ? "ตัวฉัน" : "Me") : null, p.nickname, name].filter(Boolean).join(" · ");
}
