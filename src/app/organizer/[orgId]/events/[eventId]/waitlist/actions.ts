"use server";

import { orgMutation, type OrgFormState } from "@/lib/org-actions";

/** Offers the event's free places to the queues now, instead of at the next 30-second run. */
export async function offerNow(orgId: string, eventId: string): Promise<OrgFormState> {
  const res = await orgMutation<{ offered: number }>(orgId, `/events/${eventId}/waitlist/offer`, "POST");
  if (!res.ok) return res.state;
  return { notice: res.data.offered ? `เสนอที่ว่างให้ ${res.data.offered} คนในคิวแล้ว` : "ยังไม่มีที่ว่างให้เสนอ เพิ่มโควต้าในหน้าระยะและราคาก่อน" };
}
