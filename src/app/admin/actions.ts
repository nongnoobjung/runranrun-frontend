"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { problemState, type OrgFormState } from "@/lib/org-actions";

/** Calls a write endpoint under /v1/admin and refreshes the page, or turns the problem into form state. */
async function adminMutation(path: string, method: "POST" | "PATCH" | "PUT", body?: unknown): Promise<OrgFormState | null> {
  const res = await api(`/v1/admin${path}`, { method, body, auth: true });
  if (!res.ok) {
    if (res.status === 401) redirect("/login?next=/admin");
    return problemState(res.problem);
  }
  refresh();
  return null;
}

const text = (fd: FormData, name: string) => String(fd.get(name) ?? "").trim();

export async function approveEvent(eventId: string): Promise<OrgFormState> {
  const failed = await adminMutation(`/events/${eventId}/approve`, "POST");
  if (failed) return failed;
  redirect("/admin/reviews?approved=1");
}

export async function rejectEvent(eventId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const note = text(fd, "note");
  if (!note) return { fieldErrors: { note: "บอกผู้จัดว่าต้องแก้อะไร" } };
  const failed = await adminMutation(`/events/${eventId}/reject`, "POST", { note });
  if (failed) return failed;
  redirect("/admin/reviews?rejected=1");
}

export async function approveOrg(orgId: string): Promise<OrgFormState> {
  return (await adminMutation(`/organizations/${orgId}/approve`, "POST")) ?? { notice: "อนุมัติผู้จัดแล้ว เปิดรับสมัครงานได้" };
}

export async function suspendOrg(orgId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const reason = text(fd, "reason");
  if (!reason) return { fieldErrors: { reason: "ใส่เหตุผล" } };
  return (await adminMutation(`/organizations/${orgId}/suspend`, "POST", { reason })) ?? { notice: "ระงับผู้จัดแล้ว" };
}

export async function reactivateOrg(orgId: string): Promise<OrgFormState> {
  return (await adminMutation(`/organizations/${orgId}/reactivate`, "POST")) ?? { notice: "ยกเลิกการระงับแล้ว" };
}

export async function setReviewEvents(orgId: string, reviewEvents: boolean): Promise<OrgFormState> {
  return (await adminMutation(`/organizations/${orgId}`, "PATCH", { reviewEvents })) ?? { notice: reviewEvents ? "งานใหม่ต้องรอตรวจก่อนเปิด" : "เปิดรับสมัครได้เองโดยไม่ต้องรอตรวจ" };
}

export async function setBankAccount(orgId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const body = { bankCode: text(fd, "bankCode"), accountName: text(fd, "accountName"), accountNumber: text(fd, "accountNumber"), branch: text(fd, "branch") || undefined };
  return (await adminMutation(`/organizations/${orgId}/bank-account`, "PUT", body)) ?? { notice: "บันทึกบัญชีรับเงินแล้ว" };
}

export async function verifyBankAccount(orgId: string): Promise<OrgFormState> {
  return (await adminMutation(`/organizations/${orgId}/bank-account/verify`, "POST")) ?? { notice: "ยืนยันบัญชีแล้ว เงินจากงานโอนเข้าบัญชีนี้" };
}

export async function approveDocument(orgId: string, docId: string): Promise<OrgFormState> {
  return (await adminMutation(`/organizations/${orgId}/documents/${docId}/approve`, "POST")) ?? { notice: "เอกสารผ่านแล้ว" };
}

export async function rejectDocument(orgId: string, docId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const reason = text(fd, "reason");
  if (!reason) return { fieldErrors: { reason: "บอกผู้จัดว่าเอกสารไม่ผ่านเพราะอะไร" } };
  return (await adminMutation(`/organizations/${orgId}/documents/${docId}/reject`, "POST", { reason })) ?? { notice: "ส่งเอกสารกลับให้ผู้จัดแล้ว" };
}

export async function createSettlement(eventId: string): Promise<OrgFormState> {
  return (await adminMutation(`/events/${eventId}/settlements`, "POST")) ?? { notice: "สร้างรอบจ่ายแล้ว" };
}

export async function approveSettlement(settlementId: string): Promise<OrgFormState> {
  return (await adminMutation(`/settlements/${settlementId}/approve`, "POST")) ?? { notice: "อนุมัติแล้ว รอโอน" };
}

export async function markSettlementPaid(settlementId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const transferRef = text(fd, "transferRef");
  if (!transferRef) return { fieldErrors: { transferRef: "ใส่เลขอ้างอิงการโอน" } };
  return (await adminMutation(`/settlements/${settlementId}/paid`, "POST", { transferRef })) ?? { notice: "บันทึกการโอนแล้ว" };
}

export async function voidSettlement(settlementId: string): Promise<OrgFormState> {
  return (await adminMutation(`/settlements/${settlementId}/void`, "POST")) ?? { notice: "ยกเลิกรอบแล้ว ยอดไปรวมรอบถัดไป" };
}
