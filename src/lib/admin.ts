import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { api } from "./api";
import type { KycAddress, KycDocument, OrgEvent } from "./org";

export type PlatformRole = "support" | "finance" | "admin" | "superadmin";
export type AdminPermission = "view" | "review_events" | "manage_orgs" | "payouts";
export type OrgStatus = "pending_kyc" | "active" | "suspended";

export interface AdminMe {
  role: PlatformRole;
  can: Record<AdminPermission, boolean>;
}

export interface AdminOverview {
  pendingReview: number;
  pendingKyc: number;
  suspended: number;
  settlementsOpen: number;
  toSettleSatang: number;
  eventsToSettle: number;
}

export interface ReviewItem {
  id: string;
  slug: string;
  nameTh: string;
  eventDate: string;
  province: string | null;
  submittedAt: string | null;
  races: number;
  capacity: number;
  organization: { id: string; nameTh: string; status: OrgStatus };
}

export interface AdminEvent {
  event: OrgEvent;
  organization: { id: string; nameTh: string; status: OrgStatus; reviewEvents: boolean };
}

export interface AdminOrgSummary {
  id: string;
  slug: string;
  nameTh: string;
  status: OrgStatus;
  reviewEvents: boolean;
  contactEmail: string | null;
  createdAt: string;
  kycApprovedAt: string | null;
  events: number;
  pendingReview: number;
  pendingDocs: number;
  bankVerified: boolean;
  bankSubmitted: boolean;
}

export interface AdminOrg {
  id: string;
  slug: string;
  nameTh: string;
  nameEn: string | null;
  legalName: string | null;
  taxId: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  isVatRegistered: boolean;
  address: KycAddress | null;
  status: OrgStatus;
  statusNote: string | null;
  reviewEvents: boolean;
  kycApprovedAt: string | null;
  kycApprovedBy: string | null;
  createdAt: string;
  members: { email: string; name: string | null; role: string; accepted: boolean }[];
  documents: KycDocument[];
  bankAccount: { bankCode: string; accountName: string; accountLast4: string; branch: string | null; verified: boolean } | null;
  /** Sent by the owner and not verified yet; the full number only for staff who may verify it. */
  submittedBankAccount: { bankCode: string; accountName: string; accountLast4: string; accountNumber: string | null; branch: string | null; submittedAt: string } | null;
  events: { id: string; nameTh: string; status: string; eventDate: string }[];
}

export interface SettlementRow {
  id: string;
  status: "calculated" | "approved" | "paid";
  event: { id: string; nameTh: string };
  organization: { id: string; nameTh: string };
  periodStart: string;
  periodEnd: string;
  orders: number;
  grossSatang: number;
  refundsSatang: number;
  platformFeeSatang: number;
  netSatang: number;
  createdAt: string;
  approvedAt: string | null;
  payout: { status: string; transferRef: string | null; paidAt: string | null; bankCode: string; accountLast4: string } | null;
}

export interface AdminPayouts {
  events: {
    eventId: string;
    nameTh: string;
    eventDate: string;
    organization: { id: string; nameTh: string };
    netSatang: number;
    settledSatang: number;
    paidOutSatang: number;
    toSettleSatang: number;
    openSettlement: string | null;
    bankVerified: boolean;
  }[];
  settlements: SettlementRow[];
}

export const ORG_STATUS: Record<OrgStatus, { label: string; className: string }> = {
  pending_kyc: { label: "รอตรวจ KYC", className: "bg-warn-soft text-warn" },
  active: { label: "ใช้งานได้", className: "bg-ok-soft text-ok" },
  suspended: { label: "ระงับ", className: "bg-bad-soft text-bad" },
};

/** GET under /v1/admin. Signed-out people go to the login page; anyone who is not platform staff gets a 404. */
export async function adminGet<T>(path: string, next = "/admin"): Promise<T> {
  const res = await api<T>(`/v1/admin${path}`, { auth: true });
  if (res.ok) return res.data;
  if (res.status === 401) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (res.status === 403 || res.status === 404) notFound();
  throw new Error(res.problem.title);
}

/** The caller's platform role (deduplicated per request). */
export const adminMe = cache(() => adminGet<AdminMe>("/me"));

/** The caller's platform role, or null when they are signed out or not platform staff. */
export const adminMeOrNull = cache(async () => {
  const res = await api<AdminMe>("/v1/admin/me", { auth: true });
  return res.ok ? res.data : null;
});
