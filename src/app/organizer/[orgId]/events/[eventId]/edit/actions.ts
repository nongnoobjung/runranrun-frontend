"use server";

import { bangkokToIso, num, satang, text } from "@/lib/form";
import { orgMutation, type OrgFormState } from "@/lib/org-actions";

export async function updateEvent(orgId: string, eventId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const body: Record<string, unknown> = {
    nameTh: text(fd, "nameTh") ?? "",
    nameEn: text(fd, "nameEn"),
    eventType: text(fd, "eventType"),
    eventDate: text(fd, "eventDate") ?? "",
    provinceCode: text(fd, "provinceCode"),
    venueName: text(fd, "venueName"),
    venueAddress: text(fd, "venueAddress"),
    summaryTh: text(fd, "summaryTh"),
    descriptionTh: text(fd, "descriptionTh"),
    coverImageUrl: text(fd, "coverImageUrl"),
    registrationOpensAt: bangkokToIso(text(fd, "registrationOpensAt")),
    registrationClosesAt: bangkokToIso(text(fd, "registrationClosesAt")),
    holdMinutes: num(fd, "holdMinutes") ?? 15,
    allowRefund: fd.get("allowRefund") === "on",
    waitlistEnabled: fd.get("waitlistEnabled") === "on",
    useWaitingRoom: fd.get("useWaitingRoom") === "on",
    queueAdmitPerMinute: num(fd, "queueAdmitPerMinute") ?? 100,
    refundDeadline: bangkokToIso(text(fd, "refundDeadline")),
    allowTransfer: fd.get("allowTransfer") === "on",
    transferFeeSatang: satang(fd, "transferFee") ?? 0,
    transferDeadline: bangkokToIso(text(fd, "transferDeadline")),
    allowRaceChange: fd.get("allowRaceChange") === "on",
    raceChangeFeeSatang: satang(fd, "raceChangeFee") ?? 0,
    raceChangeDeadline: bangkokToIso(text(fd, "raceChangeDeadline")),
  };
  // Typed as a percentage, sent as basis points.
  const pct = num(fd, "refundPercent");
  body.refundPercentBps = pct === null ? 0 : Math.round(pct * 100);
  // The link field is disabled (so not submitted) once the event is live.
  if (fd.has("slug")) body.slug = text(fd, "slug") ?? "";
  const res = await orgMutation(orgId, `/events/${eventId}`, "PATCH", body);
  return res.ok ? { notice: "บันทึกข้อมูลงานแล้ว" } : res.state;
}

export async function publishEvent(orgId: string, eventId: string): Promise<OrgFormState> {
  const res = await orgMutation<{ status: string }>(orgId, `/events/${eventId}/publish`, "POST");
  if (!res.ok) return res.state;
  return {
    notice:
      res.data.status === "pending_review"
        ? "ส่งให้ทีมงานก้าวตรวจแล้ว งานจะเปิดรับสมัครทันทีที่อนุมัติ"
        : "เปิดรับสมัครแล้ว นักวิ่งเห็นงานนี้บนหน้าเว็บแล้ว",
  };
}

export async function closeEvent(orgId: string, eventId: string): Promise<OrgFormState> {
  const res = await orgMutation(orgId, `/events/${eventId}/close`, "POST");
  return res.ok ? { notice: "ปิดรับสมัครแล้ว เปิดใหม่ได้ทุกเมื่อ" } : res.state;
}
