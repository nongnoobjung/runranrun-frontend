"use server";

import { text } from "@/lib/form";
import { orgMutation, type OrgFormState } from "@/lib/org-actions";

const optionalNumber = (v: FormDataEntryValue) => {
  const t = String(v).trim().replaceAll(",", "");
  return t === "" ? null : Number(t);
};

export async function saveShirts(orgId: string, eventId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const labels = fd.getAll("label");
  const chest = fd.getAll("chestIn");
  const stock = fd.getAll("stock");
  const sizes = labels.map((label, i) => ({
    label: String(label).trim(),
    chestIn: optionalNumber(chest[i] ?? ""),
    stock: optionalNumber(stock[i] ?? ""),
  }));
  const res = await orgMutation(orgId, `/events/${eventId}/shirts`, "PUT", { nameTh: text(fd, "nameTh") ?? "เสื้อวิ่ง", sizes });
  return res.ok ? { notice: "บันทึกไซซ์เสื้อแล้ว" } : res.state;
}
