import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { api, type ApiResult } from "./api";
import type { EventType, FormQuestion } from "./types";

/** Response shapes of the organizer backoffice API (/v1/org). Money is integer satang. */

export type OrgRole = "owner" | "admin" | "finance" | "staff" | "viewer";
export type EventStatus = "draft" | "pending_review" | "published" | "closed" | "cancelled";
export type RegistrationStatus = "pending" | "confirmed" | "cancelled" | "transferred" | "refunded";

export interface MyOrg {
  id: string;
  slug: string;
  nameTh: string;
  status: "pending_kyc" | "active" | "suspended";
  role: OrgRole;
}

export interface OrgEventSummary {
  id: string;
  slug: string;
  nameTh: string;
  status: EventStatus;
  eventType: EventType;
  eventDate: string;
  coverImageUrl: string | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  capacity: number;
  sold: number;
  revenueSatang: number;
}

export interface PriceTier {
  id: string;
  name: string;
  priceSatang: number;
  startsAt: string;
  endsAt: string;
  quota: number | null;
  sold: number;
  reserved: number;
}

export interface OrgRace {
  id: string;
  code: string;
  nameTh: string;
  distanceKm: number;
  capacity: number;
  sold: number;
  reserved: number;
  startAt: string | null;
  cutoffMinutes: number | null;
  ageMin: number | null;
  bibPrefix: string | null;
  bibStart: number | null;
  bibEnd: number | null;
  bibNext: number | null;
  tiers: PriceTier[];
}

export interface ShirtSize {
  id: string;
  label: string;
  chestIn: number | null;
  stock: number | null;
  sold: number;
  reserved: number;
}

export type ReadinessKey = "basics" | "registration_window" | "races" | "prices" | "organization";

export interface OrgEvent {
  id: string;
  slug: string;
  status: EventStatus;
  nameTh: string;
  nameEn: string | null;
  eventType: EventType;
  eventDate: string;
  provinceCode: string | null;
  venueName: string | null;
  venueAddress: string | null;
  summaryTh: string | null;
  descriptionTh: string | null;
  coverImageUrl: string | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  holdMinutes: number;
  publishedAt: string | null;
  races: OrgRace[];
  shirt: { productId: string; nameTh: string; sizes: ShirtSize[] } | null;
  readiness: { key: ReadinessKey; ok: boolean }[];
}

export interface Dashboard {
  event: { nameTh: string; status: EventStatus; eventDate: string; slug: string };
  kpis: { confirmed: number; pendingPayment: number; pickedUp: number; last24h: number; revenueSatang: number; capacity: number };
  daily: { day: string; count: number }[];
  races: { id: string; code: string; distanceKm: number; capacity: number; sold: number; reserved: number; currentPriceSatang: number | null }[];
  shirts: ShirtSize[];
  recent: { id: string; name: string; raceCode: string; confirmedAt: string }[];
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: "percent" | "fixed";
  /** percent: basis points (1000 = 10%); fixed: satang. */
  discountValue: number;
  maxDiscountSatang: number | null;
  usageLimit: number | null;
  usagePerUser: number | null;
  used: number;
  discountGivenSatang: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
}

export interface OrgRegistration {
  id: string;
  registrationNo: string;
  bibNumber: string | null;
  status: RegistrationStatus;
  name: { th: string | null; en: string };
  gender: "male" | "female" | "other";
  age: number;
  ageGroup: string | null;
  race: { id: string; code: string };
  shirtSize: string | null;
  email: string | null;
  phone: string | null;
  orderNo: string | null;
  kitPickedUpAt: string | null;
  createdAt: string;
}

export interface RegistrationList {
  items: OrgRegistration[];
  total: number;
  counts: { all: number; confirmed: number; pending: number; not_picked: number };
}

export interface RegistrationDetail extends OrgRegistration {
  birthDate: string;
  nationality: string;
  idDocType: "thai_id" | "passport";
  idDocMasked: string;
  bloodType: string | null;
  emergency: { name: string | null; phone: string | null };
  /** Answers to the organiser's questions, in form order. */
  answers: { key: string; label: string; type: FormQuestion["type"]; value: unknown }[];
  pricePaidSatang: number;
  order: { orderNo: string; status: string; totalSatang: number; paidAt: string | null; buyerName: string | null; buyerEmail: string | null } | null;
  timeline: { at: string; kind: "registered" | "paid" | "kit_pickup" | "checkin_voided"; detail: string | null }[];
}

/** A question as the form builder sees it; `answered` counts registrations that hold an answer. */
export interface OrgQuestion extends FormQuestion {
  id: string;
  answered: number;
}

export interface BibRace {
  raceId: string;
  code: string;
  prefix: string | null;
  start: number | null;
  end: number | null;
  /** The number the next paid runner gets; null when the race has no range. */
  next: number | null;
  autoAssign: boolean;
  rangeFull: boolean;
  confirmed: number;
  assigned: number;
  waiting: number;
}

export interface BibOverview {
  races: BibRace[];
  totals: { confirmed: number; assigned: number };
  /** Paid runners without a number, oldest payment first (at most 200). */
  waiting: { id: string; registrationNo: string; name: string; raceCode: string }[];
}

export interface BibImportResult {
  rows: number;
  changes: { line: number; registrationNo: string; name: string; from: string | null; to: string }[];
  errors: { line: number; registrationNo: string; bib: string; message: string }[];
  applied: boolean;
}

/** How a bib number prints: prefix plus at least four digits, the way the API issues them. */
export function bibLabel(prefix: string | null, n: number): string {
  return `${prefix ?? ""}${String(n).padStart(4, "0")}`;
}

/** Money for one event (or summed for the organisation). All satang; net = sales − discounts − platformFees − refunds. */
export interface FinanceSummary {
  orders: number;
  runners: number;
  salesSatang: number;
  discountsSatang: number;
  /** Paid by runners on top of the price; goes to the platform, not part of net. */
  runnerFeesSatang: number;
  platformFeesSatang: number;
  collectedSatang: number;
  refundCount: number;
  refundsSatang: number;
  refundsPaidSatang: number;
  pendingOrders: number;
  pendingSatang: number;
  netSatang: number;
  paidOutSatang: number;
  toPayOutSatang: number;
}

export interface SettlementRound {
  id: string;
  event: { id: string; nameTh: string } | null;
  periodStart: string;
  periodEnd: string;
  status: "open" | "calculated" | "approved" | "paid";
  orders: number;
  grossSatang: number;
  refundsSatang: number;
  feesSatang: number;
  withholdingTaxSatang: number;
  adjustmentsSatang: number;
  netSatang: number;
  payout: { status: "pending" | "processing" | "paid" | "failed"; amountSatang: number; transferRef: string | null; paidAt: string | null; bankCode: string | null; accountLast4: string | null } | null;
}

export interface PayoutAccount {
  bankCode: string;
  accountName: string;
  accountLast4: string;
  branch: string | null;
  verified: boolean;
}

export interface EventFinance {
  summary: FinanceSummary;
  payouts: SettlementRound[];
  bankAccount: PayoutAccount | null;
}

export interface OrgFinance {
  totals: FinanceSummary;
  events: (FinanceSummary & { eventId: string; nameTh: string; eventDate: string })[];
  payouts: SettlementRound[];
  bankAccount: PayoutAccount | null;
}

export type TransactionStatus = "pending_payment" | "paid" | "partially_refunded" | "refunded" | "cancelled";

export interface FinanceTransaction {
  orderNo: string;
  status: TransactionStatus;
  createdAt: string;
  paidAt: string | null;
  method: string | null;
  buyerName: string | null;
  runners: number;
  salesSatang: number;
  discountSatang: number;
  runnerFeeSatang: number;
  totalSatang: number;
  platformFeeSatang: number;
  refundedSatang: number;
  /** What the order adds to the payout; null until it is paid. */
  netSatang: number | null;
}

export interface CheckinRegistration extends OrgRegistration {
  emergencyName: string | null;
}

export interface OrgMember {
  id: string;
  email: string;
  name: string | null;
  role: OrgRole;
  /** "invited" until the person signs in with the invited email. */
  status: "invited" | "active";
  /** The signed-in user. */
  you: boolean;
  invitedAt: string;
  acceptedAt: string | null;
  lastLoginAt: string | null;
}

/** Mirrors the API's role table so the UI hides what the API would refuse anyway. */
const PERMISSIONS = {
  view: ["owner", "admin", "finance", "staff", "viewer"],
  manage_event: ["owner", "admin"],
  view_pii: ["owner", "admin"],
  checkin: ["owner", "admin", "staff"],
  manage_team: ["owner"],
  view_finance: ["owner", "admin", "finance"],
} as const satisfies Record<string, readonly OrgRole[]>;

export type OrgPermission = keyof typeof PERMISSIONS;

export function can(role: OrgRole, permission: OrgPermission): boolean {
  return (PERMISSIONS[permission] as readonly OrgRole[]).includes(role);
}

export const ROLE_LABEL: Record<OrgRole, string> = {
  owner: "เจ้าของ",
  admin: "ผู้ดูแล",
  finance: "การเงิน",
  staff: "ทีมงานหน้างาน",
  viewer: "ดูอย่างเดียว",
};

export const EVENT_STATUS: Record<EventStatus, { label: string; className: string }> = {
  draft: { label: "ฉบับร่าง", className: "bg-ice text-muted" },
  pending_review: { label: "รอตรวจ", className: "bg-warn-soft text-warn" },
  published: { label: "เปิดรับสมัคร", className: "bg-ok-soft text-ok" },
  closed: { label: "ปิดรับสมัคร", className: "bg-ice text-muted" },
  cancelled: { label: "ยกเลิก", className: "bg-bad-soft text-bad" },
};

export const REGISTRATION_STATUS: Record<RegistrationStatus, { label: string; className: string }> = {
  pending: { label: "รอชำระ", className: "bg-warn-soft text-warn" },
  confirmed: { label: "ยืนยันแล้ว", className: "bg-ok-soft text-ok" },
  cancelled: { label: "ยกเลิก", className: "bg-bad-soft text-bad" },
  transferred: { label: "โอนแล้ว", className: "bg-ice text-muted" },
  refunded: { label: "คืนเงินแล้ว", className: "bg-ice text-muted" },
};

/** Sends people who are signed out to the login page, and outsiders to a 404, the way the API does. */
async function orThrow<T>(res: ApiResult<T>, next: string): Promise<T> {
  if (res.ok) return res.data;
  if (res.status === 401) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (res.status === 404 || res.status === 403) notFound();
  throw new Error(res.problem.title);
}

/** Organisations the signed-in user belongs to (deduplicated per request). */
export const myOrgs = cache(async (): Promise<MyOrg[]> => {
  const res = await api<{ items: MyOrg[] }>("/v1/org", { auth: true });
  return (await orThrow(res, "/organizer")).items;
});

/** The caller's membership of one organisation, or a 404. */
export const membership = cache(async (orgId: string): Promise<MyOrg> => {
  const org = (await myOrgs()).find((o) => o.id === orgId);
  if (!org) notFound();
  return org;
});

export const orgEvent = cache(async (orgId: string, eventId: string): Promise<OrgEvent> => {
  const res = await api<OrgEvent>(`/v1/org/${orgId}/events/${eventId}`, { auth: true });
  return orThrow(res, `/organizer/${orgId}/events/${eventId}`);
});

/** GET helper for backoffice pages; the path is relative to /v1/org/:orgId. */
export async function orgGet<T>(orgId: string, path: string, next = "/organizer"): Promise<T> {
  return orThrow(await api<T>(`/v1/org/${orgId}${path}`, { auth: true }), next);
}

export function eventPath(orgId: string, eventId: string, section = ""): string {
  return `/organizer/${orgId}/events/${eventId}${section ? `/${section}` : ""}`;
}
