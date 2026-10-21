"use server";

import { bangkokToIso, num, satang, text } from "@/lib/form";
import { orgMutation, type OrgFormState } from "@/lib/org-actions";

/** Percent is typed as "10" (%) and sent as basis points; a fixed discount is typed in baht and sent as satang. */
function discountValue(fd: FormData, type: string): number | null {
  if (type === "percent") {
    const pct = num(fd, "discountValue");
    return pct === null ? null : Math.round(pct * 100);
  }
  return satang(fd, "discountValue");
}

export async function createCoupon(orgId: string, eventId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const type = text(fd, "discountType") ?? "percent";
  const res = await orgMutation(orgId, `/events/${eventId}/coupons`, "POST", {
    code: text(fd, "code") ?? "",
    description: text(fd, "description"),
    discountType: type,
    discountValue: discountValue(fd, type),
    maxDiscountSatang: type === "percent" ? satang(fd, "maxDiscount") : null,
    usageLimit: num(fd, "usageLimit"),
    usagePerUser: num(fd, "usagePerUser"),
    startsAt: bangkokToIso(text(fd, "startsAt")),
    endsAt: bangkokToIso(text(fd, "endsAt")),
  });
  if (!res.ok) return res.state;
  return { notice: `สร้างโค้ด ${(res.data as { code: string }).code} แล้ว` };
}

export async function updateCoupon(
  orgId: string,
  eventId: string,
  couponId: string,
  used: number,
  _prev: OrgFormState,
  fd: FormData,
): Promise<OrgFormState> {
  const body: Record<string, unknown> = {
    description: text(fd, "description"),
    usageLimit: num(fd, "usageLimit"),
    usagePerUser: num(fd, "usagePerUser"),
    startsAt: bangkokToIso(text(fd, "startsAt")),
    endsAt: bangkokToIso(text(fd, "endsAt")),
    isActive: fd.get("isActive") === "on",
  };
  // The API locks the discount once the code has been used; only send it while it can still change.
  if (used === 0) {
    const type = text(fd, "discountType") ?? "percent";
    body.discountType = type;
    body.discountValue = discountValue(fd, type);
    body.maxDiscountSatang = type === "percent" ? satang(fd, "maxDiscount") : null;
  }
  const res = await orgMutation(orgId, `/events/${eventId}/coupons/${couponId}`, "PATCH", body);
  if (!res.ok) return res.state;
  return { notice: "บันทึกแล้ว" };
}

export async function setCouponActive(orgId: string, eventId: string, couponId: string, isActive: boolean): Promise<void> {
  await orgMutation(orgId, `/events/${eventId}/coupons/${couponId}`, "PATCH", { isActive });
}
