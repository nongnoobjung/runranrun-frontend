"use server";

import { createHash, randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { api } from "@/lib/api";
import { problemMessage } from "@/lib/format";
import { clearQueueToken, clearToken, getQueueToken, getToken, setQueueToken, setToken } from "@/lib/session";
import type { CheckoutSession, Order, Payment, QueueStatus } from "@/lib/types";

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

  const eventId = String(formData.get("eventId") ?? "");
  // Events with a waiting room want the admission the queue gave this runner.
  const queueToken = z.string().uuid().safeParse(eventId).success ? await getQueueToken(eventId) : undefined;
  const res = await api<CheckoutSession>("/v1/checkout/sessions", {
    method: "POST",
    auth: true,
    body: { eventId, races },
    headers: queueToken ? { "x-queue-admission": queueToken } : undefined,
  });
  if (!res.ok) {
    if (res.status === 401) redirect(`/login?next=/events/${encodeURIComponent(slug)}`);
    if (res.problem.code === "QUEUE_REQUIRED" || res.problem.code === "QUEUE_TOKEN_EXPIRED") {
      if (queueToken) await clearQueueToken(eventId);
      redirect(`/events/${encodeURIComponent(slug)}/queue${res.problem.code === "QUEUE_TOKEN_EXPIRED" ? "?expired=1" : ""}`);
    }
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
 * participants.0.answers.q_ab12 → p0.q.q_ab12. A single runner's paths (runner.birthDate, answers.q_ab12) map to p0.
 */
function toFieldErrors(errors: { path: string; message: string }[] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of errors ?? []) {
    if (/^(runner|answers)\./.test(e.path)) e.path = `participants.0.${e.path}`;
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

/** Reads one runner's fields (see RunnerFields), noting the required ones left empty in `fieldErrors`. */
function runnerOf(formData: FormData, i: number, fieldErrors: Record<string, string>) {
  const runner: Record<string, string | undefined> = {};
  for (const f of RUNNER_FIELDS) {
    const v = formData.get(`p${i}.${f}`);
    runner[f] = typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  }
  // A saved runner's ID number stays on the server; the API reads it from the profile.
  const profileId = formData.get(`p${i}.profileId`);
  for (const f of ["firstNameEn", "lastNameEn", "birthDate", "idDocNumber", "emergencyName", "emergencyPhone"] as const) {
    if (!runner[f] && !(f === "idDocNumber" && profileId)) fieldErrors[`p${i}.${f}`] = "จำเป็นต้องกรอก";
  }
  return { ...runner, nationality: runner.nationality ?? "TH" };
}

/** The saved runner a form started from, and whether to save a newly typed one. */
function profileChoiceOf(formData: FormData, i: number) {
  const profileId = formData.get(`p${i}.profileId`);
  return {
    profileId: typeof profileId === "string" && profileId ? profileId : undefined,
    saveProfile: formData.get(`p${i}.saveProfile`) === "1" || undefined,
  };
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
    const runner = runnerOf(formData, i, fieldErrors);
    const shirt = get(`p${i}.shirt`);
    if (formData.get("needsShirt") === "1" && !shirt) fieldErrors[`p${i}.shirt`] = "เลือกไซซ์เสื้อ";
    return {
      raceId: get(`p${i}.raceId`)!,
      shirtVariantId: shirt,
      isSelf: formData.get("self") === String(i),
      runner,
      answers: answersOf(formData, i),
      ...profileChoiceOf(formData, i),
    };
  });
  const buyer = { name: get("buyer.name"), email: get("buyer.email"), phone: get("buyer.phone") };
  for (const [k, v] of Object.entries(buyer)) if (!v) fieldErrors[`buyer.${k}`] = "จำเป็นต้องกรอก";
  const consents = consentsOf(formData, fieldErrors);
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

  const body = { checkoutSessionId: sessionId, couponCode: get("coupon"), buyer, participants, consents };
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

// ---------------------------------------------------------------- waiting room

export interface QueuePoll {
  status?: QueueStatus;
  error?: string;
  /** Set when the API asked us to slow down. */
  retryAfterSeconds?: number;
}

/**
 * Joins an event's waiting room (`join`, idempotent: the place is kept) or reads the runner's place in it.
 * Once admitted, the token goes into an httpOnly cookie for startCheckout; the browser never sees it.
 */
export async function pollQueue(eventId: string, join: boolean): Promise<QueuePoll> {
  if (!z.string().uuid().safeParse(eventId).success) return { error: "ไม่พบงานนี้" };
  const res = join
    ? await api<QueueStatus>("/v1/checkout/queue", { method: "POST", auth: true, body: { eventId } })
    : await api<QueueStatus>(`/v1/checkout/queue/${eventId}`, { auth: true });
  if (!res.ok) {
    const retry = res.problem.retryAfterSeconds;
    return { error: problemMessage(res.problem), retryAfterSeconds: typeof retry === "number" ? retry : undefined };
  }
  if (res.data.admission) await setQueueToken(eventId, res.data.admission.token, res.data.admission.expiresAt);
  // The token stays on the server.
  return { status: { ...res.data, admission: res.data.admission && { token: "", expiresAt: res.data.admission.expiresAt } } };
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

// ---------------------------------------------------------------- waitlist

/** Joins the queue of the full race whose button was pressed (its value is the race id). */
export async function joinWaitlist(_prev: FormState, formData: FormData): Promise<FormState> {
  const slug = String(formData.get("slug") ?? "");
  if (!(await getToken())) redirect(`/login?next=/events/${encodeURIComponent(slug)}`);
  const res = await api("/v1/me/waitlist", { method: "POST", auth: true, body: { raceId: formData.get("raceId") } });
  if (!res.ok && res.problem.code !== "ALREADY_IN_WAITLIST") {
    if (res.status === 401) redirect(`/login?next=/events/${encodeURIComponent(slug)}`);
    return { error: problemMessage(res.problem) };
  }
  redirect("/me/waitlist");
}

export async function leaveWaitlist(entryId: string): Promise<void> {
  await api(`/v1/me/waitlist/${encodeURIComponent(entryId)}`, { method: "DELETE", auth: true });
  redirect("/me/waitlist");
}

/** Takes up an offered place and goes to the checkout that now holds it. */
export async function claimWaitlist(entryId: string): Promise<FormState> {
  const res = await api<{ checkoutSessionId: string }>(`/v1/me/waitlist/${encodeURIComponent(entryId)}/claim`, { method: "POST", auth: true });
  if (!res.ok) return { error: problemMessage(res.problem) };
  redirect(`/checkout/${res.data.checkoutSessionId}`);
}

// ---------------------------------------------------------------- transfers and race changes

/** Offers the place to someone else by email. */
export async function createTransfer(registrationId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const toEmail = String(formData.get("toEmail") ?? "").trim();
  if (!z.string().email().safeParse(toEmail).success) return { fieldErrors: { toEmail: "ใส่อีเมลให้ถูกต้อง" } };
  const res = await api(`/v1/me/registrations/${encodeURIComponent(registrationId)}/transfers`, { method: "POST", auth: true, body: { toEmail } });
  if (!res.ok) return { error: problemMessage(res.problem) };
  redirect(`/me/registrations/${registrationId}/transfer`);
}

export async function cancelTransfer(transferId: string, back: string): Promise<void> {
  await api(`/v1/me/transfers/${encodeURIComponent(transferId)}`, { method: "DELETE", auth: true });
  redirect(back);
}

export async function declineTransfer(transferId: string): Promise<void> {
  await api(`/v1/me/transfers/${encodeURIComponent(transferId)}/decline`, { method: "POST", auth: true });
  redirect("/me/transfers");
}

/** The recipient takes the place: straight to their ticket, or to paying the transfer fee first. */
export async function acceptTransfer(transferId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const fieldErrors: Record<string, string> = {};
  const runner = runnerOf(formData, 0, fieldErrors);
  const consents = consentsOf(formData, fieldErrors);
  if (Object.keys(fieldErrors).length) return { error: "กรอกข้อมูลให้ครบก่อนรับสิทธิ์", fieldErrors };
  const res = await api<{ status: "completed"; registrationId: string } | { status: "pending_payment"; orderId: string }>(
    `/v1/me/transfers/${encodeURIComponent(transferId)}/accept`,
    { method: "POST", auth: true, body: { runner, answers: answersOf(formData, 0), consents, ...profileChoiceOf(formData, 0) } },
  );
  if (!res.ok) return { error: problemMessage(res.problem), fieldErrors: toFieldErrors(res.problem.errors) };
  if (res.data.status === "pending_payment") redirect(`/orders/${res.data.orderId}/pay`);
  redirect(`/me/registrations/${res.data.registrationId}`);
}

/** Moves the place to another race: at once when nothing is due, otherwise through paying the difference. */
export async function requestRaceChange(registrationId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const toRaceId = String(formData.get("toRaceId") ?? "");
  if (!toRaceId) return { error: "เลือกระยะที่จะเปลี่ยนไป" };
  const res = await api<{ status: "completed" | "pending_payment"; orderId: string }>(
    `/v1/me/registrations/${encodeURIComponent(registrationId)}/race-changes`,
    { method: "POST", auth: true, body: { toRaceId } },
  );
  if (!res.ok) {
    if (res.problem.code === "RACE_CHANGE_IN_PROGRESS" && typeof res.problem.orderId === "string") redirect(`/orders/${res.problem.orderId}/pay`);
    return { error: problemMessage(res.problem) };
  }
  if (res.data.status === "pending_payment") redirect(`/orders/${res.data.orderId}/pay`);
  redirect(`/me/registrations/${registrationId}?changed=1`);
}

export async function cancelRaceChange(raceChangeId: string, registrationId: string): Promise<void> {
  await api(`/v1/me/race-changes/${encodeURIComponent(raceChangeId)}`, { method: "DELETE", auth: true });
  redirect(`/me/registrations/${registrationId}/race-change`);
}

// ---------------------------------------------------------------- saved runners

const PROFILE_EXTRAS = ["nickname", "emergencyRelation", "shirtSize", "clubName"] as const;

/** Creates a saved runner, or updates one (where an empty ID number keeps the saved one). */
export async function saveProfile(profileId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const fieldErrors: Record<string, string> = {};
  const runner = runnerOf(formData, 0, fieldErrors);
  if (profileId && fieldErrors["p0.idDocNumber"]) delete fieldErrors["p0.idDocNumber"];
  if (Object.keys(fieldErrors).length) return { error: "กรอกข้อมูลให้ครบก่อนบันทึก", fieldErrors };
  const body: Record<string, unknown> = { ...runner, isSelf: formData.get("isSelf") === "on" };
  for (const f of PROFILE_EXTRAS) {
    const v = String(formData.get(f) ?? "").trim();
    if (v) body[f] = v;
  }
  if (!body.idDocNumber) delete body.idDocNumber;
  const res = await api(profileId ? `/v1/me/profiles/${encodeURIComponent(profileId)}` : "/v1/me/profiles", {
    method: profileId ? "PATCH" : "POST",
    auth: true,
    body,
  });
  if (!res.ok) {
    if (res.status === 401) redirect("/login?next=/me/profiles");
    return { error: problemMessage(res.problem), fieldErrors: toFieldErrors(res.problem.errors?.map((e) => ({ ...e, path: `runner.${e.path}` }))) };
  }
  redirect("/me/profiles");
}

export async function deleteProfile(profileId: string): Promise<void> {
  await api(`/v1/me/profiles/${encodeURIComponent(profileId)}`, { method: "DELETE", auth: true });
  redirect("/me/profiles");
}

/** The consents ticked on a registration form; the required one must be ticked before anything is sent. */
function consentsOf(formData: FormData, fieldErrors: Record<string, string>) {
  if (formData.get("consent") !== "1") fieldErrors.consent = "ติ๊กยอมรับก่อนสมัคร";
  return { terms: true, privacy: true, shareWithOrganizer: true, marketing: formData.get("marketing") === "1" };
}

// ---------------------------------------------------------------- privacy (PDPA)

export async function setMarketingConsent(granted: boolean): Promise<void> {
  await api("/v1/me/consents", { method: "POST", auth: true, body: { purpose: "marketing", granted } });
  redirect("/me/privacy");
}

/** Closes the account, signs out and goes home. */
export async function closeAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("confirm") !== "1") return { error: "ติ๊กยืนยันก่อนปิดบัญชี" };
  const res = await api("/v1/me", { method: "DELETE", auth: true, body: { confirm: true } });
  if (!res.ok) {
    if (res.status === 401) redirect("/login?next=/me/privacy");
    return { error: problemMessage(res.problem) };
  }
  await clearToken();
  redirect("/?closed=1");
}
