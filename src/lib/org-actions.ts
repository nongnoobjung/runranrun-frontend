import "server-only";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "./api";
import { problemMessage } from "./format";
import type { ApiProblem } from "./types";

/** State returned by backoffice form actions. Field errors are keyed by the API's field path (e.g. "capacity"). */
export interface OrgFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  notice?: string;
}

export type MutationResult<T> = { ok: true; data: T } | { ok: false; state: OrgFormState };

/**
 * Calls a write endpoint under /v1/org/:orgId from a Server Action. On success the page is
 * refreshed so server components show the new data; on failure the problem becomes form state.
 */
export async function orgMutation<T = unknown>(
  orgId: string,
  path: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
): Promise<MutationResult<T>> {
  const res = await api<T>(`/v1/org/${orgId}${path}`, body instanceof FormData ? { method, form: body, auth: true } : { method, body, auth: true });
  if (!res.ok) {
    if (res.status === 401) redirect(`/login?next=${encodeURIComponent("/organizer")}`);
    return { ok: false, state: problemState(res.problem) };
  }
  refresh();
  return { ok: true, data: res.data };
}

/** Validation details the API sends without a field path. */
const VALIDATION_DETAIL_TH: Record<string, string> = {
  "The price must end after it starts": "วันสิ้นสุดราคาต้องอยู่หลังวันเริ่ม",
  "Registration must close after it opens": "วันปิดรับสมัครต้องอยู่หลังวันเปิด",
  "The last bib number must not be lower than the first": "เลขบิบสุดท้ายต้องไม่น้อยกว่าเลขแรก",
  "A percentage cannot exceed 100%": "ส่วนลดเกิน 100% ไม่ได้",
  "The CSV needs a bib column and chip_time, gun_time or status": "ไฟล์ต้องมีคอลัมน์ bib และ chip_time, gun_time หรือ status",
  "The CSV has no result rows": "ไฟล์ไม่มีแถวผล",
  "Pick a time in the future": "เลือกเวลาในอนาคต",
  "The refund cannot be more than the runner paid": "คืนเงินเกินกว่าที่นักวิ่งจ่ายไม่ได้",
  "Give at least two choices": "ใส่ตัวเลือกอย่างน้อย 2 ข้อ (บรรทัดละข้อ)",
  "The minimum must not be above the maximum": "ค่าต่ำสุดต้องไม่มากกว่าค่าสูงสุด",
  "Pick races of this event": "เลือกระยะของงานนี้",
  "The CSV needs registration_no and bib columns": "ไฟล์ต้องมีคอลัมน์ registration_no และ bib",
  "The CSV has no rows with a bib number": "ไม่มีแถวไหนกรอกเลขบิบ",
  "Import at most 20,000 rows at a time": "นำเข้าได้ครั้งละไม่เกิน 20,000 แถว",
};

/** Field messages the API sets itself (the rest are Zod's English defaults). */
const FIELD_MESSAGE_TH: Record<string, string> = {
  "A valid 13-digit tax ID": "เลขผู้เสียภาษีไม่ถูกต้อง ตรวจ 13 หลักอีกครั้ง",
  "Thai phone number": "เบอร์โทรไม่ถูกต้อง",
  "5 digits": "รหัสไปรษณีย์ 5 หลัก",
  "10–15 digits": "เลขบัญชี 10–15 หลัก",
};

export function problemState(p: ApiProblem): OrgFormState {
  const fieldErrors: Record<string, string> = {};
  // Zod's messages are English; the field highlight plus a Thai hint is enough for organisers.
  for (const e of p.errors ?? []) fieldErrors[e.path] = FIELD_MESSAGE_TH[e.message] ?? "ตรวจสอบค่าในช่องนี้";
  const detail = p.detail ? VALIDATION_DETAIL_TH[p.detail] : undefined;
  return { error: detail ?? problemMessage(p), fieldErrors };
}
