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
  /** Set once the organiser has published race results. */
  resultsPublishedAt: string | null;
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
  /** What the order paid for: new places, or a fee / price difference for a change to an existing place. */
  purpose:
    | { kind: "registration" }
    | { kind: "race_change" | "transfer"; status: string; registrationId: string | null; raceCode: string };
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

export type RefundStatus = "requested" | "approved" | "rejected" | "processing" | "succeeded" | "failed";

/** What a runner would get back today, or why they cannot ask (an API problem code). */
export interface RefundQuote {
  registrationId: string;
  eligible: boolean;
  reason: "NOT_CONFIRMED" | "REFUND_NOT_ALLOWED" | "REFUND_CLOSED" | "ALREADY_PICKED_UP" | "REFUND_IN_PROGRESS" | "TRANSFER_IN_PROGRESS" | "RACE_CHANGE_IN_PROGRESS" | null;
  pricePaidSatang: number;
  percentBps: number;
  amountSatang: number;
  refundUntil: string;
  paymentMethod: string | null;
  needsBankAccount: boolean;
  allowTransfer: boolean;
  lastRequest: { id: string; status: RefundStatus; amountSatang: number; createdAt: string; note: string | null } | null;
}

export type ResultStatus = "FIN" | "DNF" | "DNS" | "DQ";

export interface RaceResult {
  bib: string;
  name: string;
  gender: "male" | "female" | "other" | null;
  ageGroup: string | null;
  status: ResultStatus;
  gunTimeMs: number | null;
  chipTimeMs: number | null;
  paceSecPerKm: number | null;
  rankOverall: number | null;
  rankGender: number | null;
  rankAgeGroup: number | null;
}

export interface PublicResults {
  event: { slug: string; name: string; eventDate: string; publishedAt: string };
  races: { id: string; code: string; name: string; distanceKm: number; finishers: number; total: number }[];
  raceId: string | null;
  items: RaceResult[];
  total: number;
}

/** An event whose results are out, for the results index. */
export interface ResultsEvent {
  slug: string;
  name: { th: string; en: string | null };
  type: EventType;
  eventDate: string;
  province: string | null;
  venue: string | null;
  coverImageUrl: string | null;
  publishedAt: string;
  finishers: number;
  races: { id: string; code: string; name: string; distanceKm: number; finishers: number }[];
}

/** One runner's result with its event and race, from the cross-event search or "my results". */
export interface RunnerResult extends RaceResult {
  event: { slug: string; name: string; eventDate: string };
  race: { id: string; code: string; name: string; distanceKm: number };
}

/** The signed-in runner's place in a race's waitlist. */
export interface WaitlistEntry {
  id: string;
  status: "waiting" | "offered";
  position: number;
  /** Runners still waiting ahead of this one. */
  ahead: number;
  offerExpiresAt: string | null;
  checkoutSessionId: string | null;
  priceSatang: number | null;
  race: { id: string; code: string; distanceKm: number };
  event: { slug: string; name: string; eventDate: string };
  joinedAt: string;
}

/** What a runner may do with a paid place: hand it to someone else, or move it to another race. */
export interface ChangeOptions {
  registrationId: string;
  registrationNo: string;
  raceCode: string;
  runner: { en: string; th: string | null };
  event: { slug: string; name: string };
  pricePaidSatang: number;
  transfer: {
    allowed: boolean;
    reason: string | null;
    feeSatang: number;
    until: string;
    open: { id: string; status: "pending" | "accepted"; toEmail: string; feeSatang: number; expiresAt: string; createdAt: string } | null;
  };
  raceChange: {
    allowed: boolean;
    reason: string | null;
    feeSatang: number;
    until: string;
    open: { id: string; toRaceCode: string; orderId: string; totalSatang: number; expiresAt: string } | null;
    options: {
      raceId: string;
      code: string;
      name: string;
      distanceKm: number;
      priceSatang: number | null;
      priceDiffSatang: number | null;
      dueSatang: number | null;
      available: boolean;
      reason: "SOLD_OUT" | "NO_PRICE_AVAILABLE" | "RACE_NOT_ELIGIBLE" | null;
    }[];
  };
}

export interface Transfer {
  id: string;
  status: "pending" | "accepted" | "completed" | "rejected" | "expired" | "cancelled";
  toEmail: string;
  sender: string;
  feeSatang: number;
  expiresAt: string;
  createdAt: string;
  completedAt: string | null;
  feeOrderId: string | null;
  registrationId: string | null;
  race: { id: string; code: string; distanceKm: number };
  event: { slug: string; name: string; eventDate: string };
  shirtSize: string | null;
  /** Only on transfers the user sent. */
  registrationNo?: string;
  runner?: { en: string; th: string | null };
}

export interface RunnerProfile {
  id: string;
  isSelf: boolean;
  nickname: string | null;
  firstNameTh: string | null;
  lastNameTh: string | null;
  firstNameEn: string;
  lastNameEn: string;
  gender: "male" | "female" | "other";
  birthDate: string;
  nationality: string;
  idDocType: "thai_id" | "passport";
  idDocLast4: string | null;
  email: string | null;
  phone: string | null;
  bloodType: string;
  emergencyName: string | null;
  emergencyPhone: string | null;
  emergencyRelation: string | null;
  shirtSize: string | null;
  clubName: string | null;
  updatedAt: string;
}
