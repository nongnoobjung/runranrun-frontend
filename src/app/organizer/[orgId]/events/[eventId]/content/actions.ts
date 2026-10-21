"use server";

import { text } from "@/lib/form";
import { orgMutation, type OrgFormState } from "@/lib/org-actions";

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export type ImagePurpose = "cover" | "gallery" | "description" | "route_map";

export interface UploadState extends OrgFormState {
  image?: { id: string; url: string; width: number; height: number };
}

/**
 * Saves the texts in both languages. FAQ rows come as faq.<n>.qTh / aTh / qEn / aEn; a row left fully empty is
 * dropped, so clearing its fields removes it.
 */
export async function updateContent(orgId: string, eventId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const rows = new Set<number>();
  for (const key of fd.keys()) {
    const m = /^faq\.(\d+)\./.exec(key);
    if (m) rows.add(Number(m[1]));
  }
  const faq = [...rows]
    .sort((a, b) => a - b)
    .map((i) => ({ qTh: text(fd, `faq.${i}.qTh`) ?? "", aTh: text(fd, `faq.${i}.aTh`) ?? "", qEn: text(fd, `faq.${i}.qEn`), aEn: text(fd, `faq.${i}.aEn`) }))
    .filter((f) => f.qTh || f.aTh || f.qEn || f.aEn);
  const res = await orgMutation(orgId, `/events/${eventId}`, "PATCH", {
    summaryTh: text(fd, "summaryTh"),
    summaryEn: text(fd, "summaryEn"),
    descriptionTh: text(fd, "descriptionTh"),
    descriptionEn: text(fd, "descriptionEn"),
    rulesTh: text(fd, "rulesTh"),
    rulesEn: text(fd, "rulesEn"),
    faq,
  });
  return res.ok ? { notice: "บันทึกเนื้อหาแล้ว" } : res.state;
}

/** Uploads one image; the API resizes it and, for a cover, gallery or route map, puts it in place right away. */
export async function uploadImage(orgId: string, eventId: string, purpose: ImagePurpose, fd: FormData): Promise<UploadState> {
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "เลือกรูปก่อน" };
  if (file.size > MAX_BYTES) return { error: "รูปใหญ่เกิน 10 MB" };
  if (file.type && !TYPES.includes(file.type)) return { error: "รองรับเฉพาะรูป JPG, PNG หรือ WebP" };
  const form = new FormData();
  form.set("purpose", purpose);
  const raceId = text(fd, "raceId");
  if (raceId) form.set("raceId", raceId);
  form.set("file", file, file.name);
  const res = await orgMutation<UploadState["image"]>(orgId, `/events/${eventId}/images`, "POST", form);
  return res.ok ? { image: res.data, notice: "อัปโหลดรูปแล้ว" } : res.state;
}

export async function deleteImage(orgId: string, eventId: string, imageId: string): Promise<OrgFormState> {
  const res = await orgMutation(orgId, `/events/${eventId}/images/${imageId}`, "DELETE");
  return res.ok ? { notice: "ลบรูปแล้ว" } : res.state;
}

/** Takes off a cover that links to an image hosted elsewhere (an uploaded one is deleted instead). */
export async function clearCover(orgId: string, eventId: string): Promise<OrgFormState> {
  const res = await orgMutation(orgId, `/events/${eventId}`, "PATCH", { coverImageUrl: null });
  return res.ok ? { notice: "เอารูปปกออกแล้ว" } : res.state;
}

export async function saveGallery(
  orgId: string,
  eventId: string,
  items: { imageId: string; captionTh: string | null; captionEn: string | null }[],
): Promise<OrgFormState> {
  const res = await orgMutation(orgId, `/events/${eventId}/gallery`, "PUT", { items });
  return res.ok ? { notice: "บันทึกแกลเลอรีแล้ว" } : res.state;
}
