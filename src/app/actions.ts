"use server";

import { createHash, randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { api } from "@/lib/api";
import { problemMessage } from "@/lib/format";
import { clearToken, getToken, setToken } from "@/lib/session";
import type { CheckoutSession, Order, Payment } from "@/lib/types";

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** Only same-site paths, so ?next= cannot send people to another domain. */
function safeNext(value: FormDataEntryValue | null): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

// ---------------------------------------------------------------- auth

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = z.string().trim().email().safeParse(formData.get("email"));
  if (!email.success) return { fieldErrors: { email: "กรอกอีเมลให้ถูกต้อง" } };
  // Temporary: the API's development login. LINE Login / OTP replace this.
  const res = await api<{ accessToken: string; expiresIn: number }>("/v1/dev/login", { method: "POST", body: { email: email.data } });
  if (!res.ok) return { error: problemMessage(res.problem) };
  await setToken(res.data.accessToken, res.data.expiresIn);
  redirect(safeNext(formData.get("next")));
}

export async function logout(): Promise<void> {
  await clearToken();
  redirect("/");
}

// ---------------------------------------------------------------- checkout

export async function startCheckout(_prev: FormState, formData: FormData): Promise<FormState> {
  const slug = String(formData.get("slug") ?? "");
  if (!(await getToken())) redirect(`/login?next=/events/${encodeURIComponent(slug)}`);

  const races = [...formData.entries()]
    .filter(([k]) => k.startsWith("qty:"))
    .map(([k, v]) => ({ raceId: k.slice(4), quantity: Number(v) }))
    .filter((r) => r.quantity > 0);
  if (races.length === 0) return { error: "เลือกระยะและจำนวนผู้วิ่งอย่างน้อย 1 คน" };

  const res = await api<CheckoutSession>("/v1/checkout/sessions", {
    method: "POST",
    auth: true,
    body: { eventId: formData.get("eventId"), races },
  });
  if (!res.ok) {
    if (res.status === 401) redirect(`/login?next=/events/${encodeURIComponent(slug)}`);
    return { error: problemMessage(res.problem) };
  }
  redirect(`/checkout/${res.data.id}`);
}

const RUNNER_FIELDS = [
  "firstNameTh", "lastNameTh", "firstNameEn", "lastNameEn", "gender", "birthDate", "nationality",
  "idDocType", "idDocNumber", "phone", "emergencyName", "emergencyPhone",
] as const;

/** The API's messages for answers to the organiser's questions. */
const ANSWER_ERROR_TH: Record<string, string> = {
  required: "จำเป็นต้องตอบ",
  "must be ticked": "ต้องติ๊กก่อนสมัคร",
  "must be a number": "ใส่เป็นตัวเลข",
  "out of range": "ตัวเลขอยู่นอกช่วงที่ผู้จัดกำหนด",
};

/**
 * Turns API validation paths into form field names: participants.0.runner.birthDate → p0.birthDate,
 * participants.0.answers.q_ab12 → p0.q.q_ab12.
 */
function toFieldErrors(errors: { path: string; message: string }[] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of errors ?? []) {
    const answer = e.path.match(/^participants\.(\d+)\.answers\.(\w+)$/);
    if (answer) {
      out[`p${answer[1]}.q.${answer[2]}`] = ANSWER_ERROR_TH[e.message] ?? "คำตอบไม่ถูกต้อง";
      continue;
    }
    const m = e.path.match(/^participants\.(\d+)\.(?:runner\.)?(\w+)/);
    if (m) out[`p${m[1]}.${m[2]}`] = e.message;
    else if (e.path.startsWith("buyer.")) out[e.path] = e.message;
  }
  return out;
}

/** Collects one runner's answers; see the field names in the checkout form's Questions. The API checks them. */
function answersOf(formData: FormData, i: number): Record<string, unknown> {
  const answers: Record<string, unknown> = {};
  for (const [name, value] of formData.entries()) {
    const m = name.match(new RegExp(`^p${i}\\.(q|qm|qc)\\.(\\w+)$`));
    if (!m || typeof value !== "string") continue;
    const [, kind, key] = m;
    if (kind === "qm") answers[key] = [...((answers[key] as string[] | undefined) ?? []), value];
    else if (kind === "qc") answers[key] = true;
    else if (value.trim() !== "") answers[key] = value.trim();
  }
  return answers;
}

export async function submitCheckout(_prev: FormState, formData: FormData): Promise<FormState> {
  const sessionId = String(formData.get("sessionId"));
  const count = Number(formData.get("count"));
  const get = (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  };

  const fieldErrors: Record<string, string> = {};
  const participants = Array.from({ length: count }, (_, i) => {
    const runner: Record<string, string | undefined> = {};
    for (const f of RUNNER_FIELDS) runner[f] = get(`p${i}.${f}`);
    for (const f of ["firstNameEn", "lastNameEn", "birthDate", "idDocNumber", "emergencyName", "emergencyPhone"] as const) {
      if (!runner[f]) fieldErrors[`p${i}.${f}`] = "จำเป็นต้องกรอก";
    }
    const shirt = get(`p${i}.shirt`);
    if (formData.get("needsShirt") === "1" && !shirt) fieldErrors[`p${i}.shirt`] = "เลือกไซซ์เสื้อ";
    return {
      raceId: get(`p${i}.raceId`)!,
      shirtVariantId: shirt,
      isSelf: formData.get("self") === String(i),
      runner: { ...runner, nationality: runner.nationality ?? "TH" },
      answers: answersOf(formData, i),
    };
  });
  const buyer = { name: get("buyer.name"), email: get("buyer.email"), phone: get("buyer.phone") };
  for (const [k, v] of Object.entries(buyer)) if (!v) fieldErrors[`buyer.${k}`] = "จำเป็นต้องกรอก";
  if (Object.keys(fieldErrors).length) return { error: "กรอกข้อมูลให้ครบก่อนไปต่อ", fieldErrors };

  // Hold the chosen shirt sizes first; a sold-out size comes back before the order is created.
  if (formData.get("needsShirt") === "1") {
    const counts = new Map<string, number>();
    for (const p of participants) counts.set(p.shirtVariantId!, (counts.get(p.shirtVariantId!) ?? 0) + 1);
    const sizes = await api(`/v1/checkout/sessions/${sessionId}/variants`, {
      method: "PUT",
      auth: true,
      body: { variants: [...counts].map(([variantId, quantity]) => ({ variantId, quantity })) },
    });
    if (!sizes.ok) return { error: problemMessage(sizes.problem) };
  }

  const body = { checkoutSessionId: sessionId, couponCode: get("coupon"), buyer, participants };
  // Same form data → same key, so a double submit or a retry after a network error cannot create two orders.
  const key = createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 40);
  const res = await api<Order>("/v1/orders", { method: "POST", auth: true, body, idempotencyKey: `order-${key}` });
  if (!res.ok) {
    if (res.problem.code === "ORDER_EXISTS" && typeof res.problem.orderId === "string") redirect(`/orders/${res.problem.orderId}/pay`);
    return { error: problemMessage(res.problem), fieldErrors: toFieldErrors(res.problem.errors) };
  }
  redirect(`/orders/${res.data.id}/pay`);
}

// ---------------------------------------------------------------- payment

export async function createPayment(orderId: string, method: "promptpay"): Promise<{ payment?: Payment; error?: string }> {
  const res = await api<Payment>(`/v1/orders/${orderId}/payments`, {
    method: "POST",
    auth: true,
    body: { method },
    idempotencyKey: `pay-${randomUUID()}`,
  });
  return res.ok ? { payment: res.data } : { error: problemMessage(res.problem) };
}

export async function orderStatus(orderId: string): Promise<Order["status"] | null> {
  const res = await api<Order>(`/v1/orders/${orderId}`, { auth: true });
  return res.ok ? res.data.status : null;
}

/** Development only: pretends the runner scanned the QR and paid. */
export async function devCompletePayment(orderId: string): Promise<{ error?: string }> {
  if (process.env.ENABLE_DEV_TOOLS !== "true") return { error: "dev tools are disabled" };
  const res = await api(`/v1/dev/orders/${orderId}/complete-payment`, { method: "POST", body: { status: "successful" } });
  return res.ok ? {} : { error: problemMessage(res.problem) };
}

export async function cancelCheckout(sessionId: string, slug: string): Promise<void> {
  await api(`/v1/checkout/sessions/${sessionId}`, { method: "DELETE", auth: true });
  redirect(`/events/${slug}`);
}

// ---------------------------------------------------------------- refunds

/** A runner gives up their place and asks for the policy amount back, into the bank account they type. */
export async function requestRefund(registrationId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const get = (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  };
  const choice = get("reasonChoice");
  const reason = choice === "อื่น ๆ" || !choice ? get("reasonOther") : [choice, get("reasonOther")].filter(Boolean).join(" · ");
  const needsBank = formData.get("needsBank") === "1";
  const fieldErrors: Record<string, string> = {};
  if (!reason) fieldErrors.reasonOther = "บอกเหตุผลสั้น ๆ";
  const bank = needsBank ? { bankCode: get("bankCode"), accountNumber: get("accountNumber"), accountName: get("accountName") } : undefined;
  if (bank) for (const [k, v] of Object.entries(bank)) if (!v) fieldErrors[`bank.${k}`] = "จำเป็นต้องกรอก";
  if (Object.keys(fieldErrors).length) return { error: "กรอกข้อมูลให้ครบก่อนส่งคำขอ", fieldErrors };

  const res = await api(`/v1/me/registrations/${encodeURIComponent(registrationId)}/refund-requests`, { method: "POST", auth: true, body: { reason, bank } });
  if (!res.ok) {
    if (res.status === 401) redirect(`/login?next=/me/registrations/${registrationId}/refund`);
    const errors: Record<string, string> = {};
    for (const e of res.problem.errors ?? []) if (e.path.startsWith("bank.")) errors[e.path] = e.path === "bank.accountNumber" ? "เลขบัญชี 10–15 หลัก" : "ตรวจสอบช่องนี้";
    return { error: problemMessage(res.problem), fieldErrors: errors };
  }
  redirect(`/me/registrations/${registrationId}?refund=requested`);
}
