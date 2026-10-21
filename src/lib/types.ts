/** Response shapes of the kao API (runranrun-api). Money is always integer satang. */

export interface ApiProblem {
  status: number;
  code: string;
  title: string;
  detail?: string;
  errors?: { path: string; message: string }[];
  [key: string]: unknown;
}

export type Availability = "open" | "almost_full" | "sold_out" | "not_open" | "closed";
export type EventType = "road" | "trail" | "virtual" | "ultra" | "fun_run";

export interface EventSummary {
  id: string;
  slug: string;
  name: { th: string; en: string | null };
  type: EventType;
  eventDate: string;
  province: string | null;
  venue: string | null;
  coverImageUrl: string | null;
  races: { code: string; distanceKm: number }[];
  fromPriceSatang: number | null;
  availability: Availability;
}

export interface RaceDetail {
  id: string;
  code: string;
  name: string;
  distanceKm: number;
  startAt: string | null;
  cutoffMinutes: number | null;
  ageMin: number | null;
  ageMax: number | null;
  capacity: number;
  available: number;
  priceSatang: number | null;
  tierName: string | null;
  availability: Availability;
}

export interface ProductDetail {
  id: string;
  type: string;
  name: string;
  priceSatang: number;
  required: boolean;
  includedInRace: boolean;
  variants: { id: string; label: string; attributes: { chest_in?: number }; priceDeltaSatang: number; available: number | null }[];
}

export interface EventDetail {
  id: string;
  slug: string;
  name: { th: string; en: string | null };
  summary: string | null;
  description: string | null;
  type: EventType;
  eventDate: string;
  province: string | null;
  venue: string | null;
  coverImageUrl: string | null;
  faq: { q: string; a: string }[];
  registration: { opensAt: string | null; closesAt: string | null; holdMinutes: number };
  policy: { allowTransfer: boolean; allowRaceChange: boolean; allowRefund: boolean; waitlist: boolean };
  organizer: { slug: string; name: string; logoUrl: string | null };
  races: RaceDetail[];
  products: ProductDetail[];
  /** The organiser's extra questions; each runner answers those for their race (raceIds null = every race). */
  questions: FormQuestion[];
}

export type QuestionType = "text" | "textarea" | "number" | "select" | "multiselect" | "checkbox" | "date";

export interface FormQuestion {
  key: string;
  label: string;
  helpText: string | null;
  type: QuestionType;
  options: string[] | null;
  required: boolean;
  raceIds: string[] | null;
  min: number | null;
  max: number | null;
}

export interface CheckoutSession {
  id: string;
  eventId: string;
  eventSlug: string;
  status: "active" | "converted" | "expired" | "abandoned";
  expiresAt: string;
  items: {
    races: { raceId: string; code: string; quantity: number; tierName: string; priceSatang: number }[];
    variants: { variantId: string; label: string; quantity: number; unitPriceSatang: number }[];
  };
}

export interface Payment {
  id: string;
  method: "promptpay" | "card" | "mobile_banking";
  status: "pending" | "authorized" | "succeeded" | "failed" | "expired" | "refunded" | "partially_refunded";
  amountSatang: number;
  qrPayload: string | null;
  qrImageUrl: string | null;
  authorizeUri: string | null;
  expiresAt: string | null;
}

export interface Order {
  id: string;
  orderNo: string;
  status: "pending_payment" | "paid" | "expired" | "cancelled" | "partially_refunded" | "refunded";
  event: { id: string; slug: string; name: string; eventDate: string };
  subtotalSatang: number;
  discountSatang: number;
  feeSatang: number;
  totalSatang: number;
  expiresAt: string | null;
  paidAt: string | null;
  items: { type: string; description: string; quantity: number; unitPriceSatang: number; discountSatang: number; totalSatang: number }[];
  registrations: {
    id: string;
    registrationNo: string;
    status: string;
    raceCode: string;
    name: { en: string; th: string | null };
    shirtSize: string | null;
    bibNumber: string | null;
  }[];
  payment: Payment | null;
}

export interface MyRegistration {
  id: string;
  registrationNo: string;
  status: "pending" | "confirmed";
  bibNumber: string | null;
  qrToken: string | null;
  shirtSize: string | null;
  ageGroup: string | null;
  kitPickedUpAt: string | null;
  runner: { en: string; th: string | null };
  race: { code: string; distanceKm: number; startAt: string | null; cutoffMinutes: number | null };
  event: { slug: string; name: string; eventDate: string; venue: string | null; coverImageUrl: string | null };
  orderNo: string;
}

/** Thai bank codes, for refund and payout accounts. */
export const BANKS: Record<string, string> = {
  KBANK: "ธนาคารกสิกรไทย",
  SCB: "ธนาคารไทยพาณิชย์",
  BBL: "ธนาคารกรุงเทพ",
  KTB: "ธนาคารกรุงไทย",
  BAY: "ธนาคารกรุงศรีอยุธยา",
  TTB: "ธนาคารทหารไทยธนชาต",
  GSB: "ธนาคารออมสิน",
  KKP: "ธนาคารเกียรตินาคินภัทร",
  CIMBT: "ธนาคารซีไอเอ็มบี ไทย",
  UOBT: "ธนาคารยูโอบี",
  LHBANK: "ธนาคารแลนด์ แอนด์ เฮ้าส์",
  BAAC: "ธ.ก.ส.",
};
