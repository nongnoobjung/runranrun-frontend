import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { api } from "./api";
import { baht } from "./format";
import type { KycAddress, KycDocument, OrgEvent } from "./org";

export type PlatformRole = "support" | "finance" | "admin" | "superadmin";
export type AdminPermission = "view" | "review_events" | "manage_orgs" | "payouts" | "fees" | "manage_users" | "manage_roles";
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
  platformFee: OrgPlatformFee;
}

export interface FeeRow {
  id: string;
  percentBps: number;
  fixedPerRegistrationSatang: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
  createdBy: string | null;
  state: "scheduled" | "current" | "ended";
}

export interface OrgPlatformFee {
  /** What new orders pay now: the organisation's own rate, else the platform default; null = no fee. */
  current: { percentBps: number; fixedPerRegistrationSatang: number; effectiveFrom: string; source: "organization" | "default" } | null;
  /** The organisation's own rates, newest first. */
  history: FeeRow[];
}

export interface AdminFees {
  default: { current: FeeRow | null; history: FeeRow[] };
  organizations: { id: string; nameTh: string; current: FeeRow | null; scheduled: FeeRow[] }[];
}

/** "3% + ฿10 ต่อผู้วิ่ง", "ไม่เก็บ" for a zero rate. */
export function feeLabel(r: { percentBps: number; fixedPerRegistrationSatang: number } | null): string {
  if (!r || (r.percentBps === 0 && r.fixedPerRegistrationSatang === 0)) return "ไม่เก็บค่าธรรมเนียม";
  const parts = [r.percentBps ? `${(r.percentBps / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%` : null, r.fixedPerRegistrationSatang ? `${baht(r.fixedPerRegistrationSatang)} ต่อผู้วิ่ง` : null];
  return parts.filter(Boolean).join(" + ");
}

export interface AuditItem {
  id: number;
  createdAt: string;
  action: string;
  actor: { id: string; email: string | null; name: string | null } | null;
  actorType: string;
  organization: { id: string; nameTh: string } | null;
  event: { id: string; nameTh: string } | null;
  entityType: string;
  entityId: string | null;
}

export interface AuditEntry extends AuditItem {
  before: unknown;
  after: unknown;
  requestId: string | null;
}

/** What the audit log's action codes mean; unknown codes are shown as they are. */
export const AUDIT_ACTION: Record<string, string> = {
  "admin.event_approve": "อนุมัติงาน",
  "admin.event_reject": "ส่งงานกลับให้แก้",
  "admin.org_approve": "อนุมัติ KYC ผู้จัด",
  "admin.org_suspend": "ระงับผู้จัด",
  "admin.org_reactivate": "ยกเลิกการระงับผู้จัด",
  "admin.org_settings": "ตั้งค่าการตรวจงานของผู้จัด",
  "admin.org_bank_account": "บันทึกบัญชีรับเงินผู้จัด",
  "admin.org_bank_verify": "ยืนยันบัญชีรับเงินผู้จัด",
  "admin.kyc_doc_approve": "เอกสาร KYC ผ่าน",
  "admin.kyc_doc_reject": "ส่งเอกสาร KYC กลับ",
  "admin.kyc_doc_view": "แอดมินเปิดเอกสาร KYC",
  "admin.settlement_create": "สร้างรอบจ่าย",
  "admin.settlement_approve": "อนุมัติรอบจ่าย",
  "admin.settlement_paid": "บันทึกการโอนรอบจ่าย",
  "admin.settlement_void": "ยกเลิกรอบจ่าย",
  "admin.platform_fee_set": "ตั้งค่าธรรมเนียมแพลตฟอร์ม",
  "admin.platform_fee_clear": "กลับไปใช้ค่าธรรมเนียม default",
  "admin.user_suspend": "ระงับบัญชีผู้ใช้",
  "admin.user_reactivate": "ยกเลิกการระงับบัญชี",
  "admin.user_role": "เปลี่ยนสิทธิ์แพลตฟอร์ม",
  "org.create": "สมัครเปิดทีมผู้จัด",
  "kyc.company_update": "แก้ข้อมูลบริษัท",
  "kyc.document_upload": "อัปโหลดเอกสาร KYC",
  "kyc.document_delete": "ลบเอกสาร KYC",
  "kyc.document_view": "เปิดเอกสาร KYC",
  "kyc.bank_submit": "ส่งบัญชีรับเงิน",
  "event.create": "สร้างงาน",
  "event.update": "แก้ไขงาน",
  "event.published": "เปิดรับสมัคร",
  "event.pending_review": "ส่งงานให้แอดมินตรวจ",
  "event.closed": "ปิดรับสมัคร",
  "event.image_upload": "อัปโหลดรูปงาน",
  "event.image_delete": "ลบรูปงาน",
  "event.gallery_update": "จัดแกลเลอรี",
  "race.create": "เพิ่มระยะ",
  "race.update": "แก้ระยะ",
  "race.delete": "ลบระยะ",
  "price_tier.create": "เพิ่มช่วงราคา",
  "price_tier.update": "แก้ช่วงราคา",
  "price_tier.delete": "ลบช่วงราคา",
  "shirts.update": "แก้ไซซ์เสื้อ",
  "coupon.create": "สร้างคูปอง",
  "coupon.update": "แก้คูปอง",
  "question.create": "เพิ่มคำถามในฟอร์ม",
  "question.update": "แก้คำถามในฟอร์ม",
  "question.delete": "ลบคำถามในฟอร์ม",
  "question.reorder": "เรียงคำถามในฟอร์ม",
  "registration.reveal_id_doc": "ดูเลขบัตรเต็ม",
  "registrations.export": "Export ผู้สมัคร",
  "registration.kit_pickup": "รับเสื้อและบิบ",
  "registration.cancel": "ยกเลิกสิทธิ์",
  "registration.race_change": "เปลี่ยนระยะ",
  "checkins.roster_download": "ดาวน์โหลดรายชื่อออฟไลน์",
  "bib.set": "ให้เลขบิบ",
  "bibs.assign": "ออกเลขบิบ",
  "bibs.import": "นำเข้าเลขบิบ",
  "finance.export": "Export ธุรกรรม",
  "refund.request": "ขอคืนเงิน",
  "refund.approve": "อนุมัติคืนเงิน",
  "refund.reject": "ปฏิเสธคืนเงิน",
  "refund.transferred": "บันทึกโอนคืนเงิน",
  "transfer.create": "เริ่มโอนสิทธิ์",
  "transfer.complete": "รับโอนสิทธิ์",
  "results.import": "นำเข้าผลการแข่งขัน",
  "results.publish": "เผยแพร่ผล",
  "results.unpublish": "ซ่อนผล",
  "broadcast.create": "ร่างข่าว",
  "broadcast.update": "แก้ข่าว",
  "broadcast.delete": "ลบข่าว",
  "broadcast.send": "ส่งข่าว",
  "broadcast.schedule": "ตั้งเวลาส่งข่าว",
  "broadcast.unschedule": "ยกเลิกเวลาส่งข่าว",
  "member.invite": "เชิญทีมงาน",
  "member.role": "เปลี่ยนบทบาททีมงาน",
  "member.remove": "นำทีมงานออก",
  "member.uninvite": "ยกเลิกคำเชิญ",
  "member.accept": "ตอบรับคำเชิญ",
};

export type UserStatus = "active" | "suspended" | "deleted";

export interface AdminUserSummary {
  id: string;
  email: string | null;
  displayName: string | null;
  platformRole: PlatformRole | "user";
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminUser extends AdminUserSummary {
  statusNote: string | null;
  emailVerifiedAt: string | null;
  /** The signed-in admin's own account: nothing can be changed on it here. */
  self: boolean;
  registrations: { total: number; active: number };
  orderCount: number;
  orders: { id: string; orderNo: string; status: string; totalSatang: number; createdAt: string; registrations: number; event: { id: string; nameTh: string } }[];
  teams: { id: string; nameTh: string; status: string; role: string; accepted: boolean }[];
}

export const PLATFORM_ROLE: Record<PlatformRole | "user", string> = {
  user: "ผู้ใช้ทั่วไป",
  support: "ซัพพอร์ต",
  finance: "การเงิน",
  admin: "แอดมิน",
  superadmin: "ซูเปอร์แอดมิน",
};

export const USER_STATUS: Record<UserStatus, { label: string; className: string }> = {
  active: { label: "ใช้งานได้", className: "bg-ok-soft text-ok" },
  suspended: { label: "ระงับ", className: "bg-bad-soft text-bad" },
  deleted: { label: "ปิดบัญชีแล้ว", className: "bg-tint text-muted" },
};

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
export async function adminGet<T>(path: string, next = "/"): Promise<T> {
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
