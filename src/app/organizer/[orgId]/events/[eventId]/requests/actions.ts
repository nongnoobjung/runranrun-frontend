"use server";

import { satang, text } from "@/lib/form";
import { orgMutation, type OrgFormState } from "@/lib/org-actions";

const base = (eventId: string, refundId: string) => `/events/${eventId}/refunds/${refundId}`;

export async function approveRefund(orgId: string, eventId: string, refundId: string): Promise<OrgFormState> {
  const res = await orgMutation(orgId, `${base(eventId, refundId)}/approve`, "POST");
  return res.ok ? { notice: "อนุมัติแล้ว สิทธิ์ถูกยกเลิก โอนเงินคืนแล้วบันทึกเลขอ้างอิง" } : res.state;
}

export async function rejectRefund(orgId: string, eventId: string, refundId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const note = text(fd, "note");
  if (!note) return { fieldErrors: { note: "บอกเหตุผลให้นักวิ่งทราบ" } };
  const res = await orgMutation(orgId, `${base(eventId, refundId)}/reject`, "POST", { note });
  return res.ok ? { notice: "ปฏิเสธแล้ว" } : res.state;
}

export async function markTransferred(orgId: string, eventId: string, refundId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const reference = text(fd, "reference");
  if (!reference) return { fieldErrors: { reference: "ใส่เลขอ้างอิงจากสลิปโอนเงิน" } };
  const res = await orgMutation(orgId, `${base(eventId, refundId)}/transferred`, "POST", { reference });
  return res.ok ? { notice: "บันทึกว่าโอนคืนแล้ว" } : res.state;
}

/** Cancels a paid place from the runner detail; the amount is typed in baht (0 = no refund). */
export async function cancelRegistration(orgId: string, eventId: string, registrationId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const res = await orgMutation<{ status: string }>(orgId, `/events/${eventId}/registrations/${registrationId}/cancel`, "POST", {
    refundSatang: satang(fd, "refund") ?? 0,
    reason: text(fd, "reason") ?? "",
  });
  if (!res.ok) return res.state;
  return { notice: res.data.status === "refunded" ? "ยกเลิกสิทธิ์แล้ว ยอดคืนเงินอยู่ในหน้าคำขอคืนเงิน" : "ยกเลิกสิทธิ์แล้ว" };
}
