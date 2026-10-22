"use server";

import { createHash, randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { localePath, type Locale } from "@/i18n/config";
import { dictionary, type Dict } from "@/i18n/dictionaries";
import { actionLocale } from "@/i18n/server";
import { api } from "@/lib/api";
import { billingOf } from "@/lib/billing";
import { problemMessage } from "@/lib/format";
import { clearQueueToken, clearToken, getQueueToken, getToken, setQueueToken, setToken } from "@/lib/session";
import type { ApiProblem, CheckoutSession, Order, Payment, QueueStatus } from "@/lib/types";

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** Only same-site paths, so ?next= cannot send people to another domain. */
function safeNext(value: FormDataEntryValue | null): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

/** The calling page's language: messages, API problems and redirects stay in it. */
async function inLocale() {
  const locale = await actionLocale();
  return {
    t: dictionary(locale).actions,
    problem: (p: ApiProblem) => problemMessage(p, locale),
    locale,
  };
}

/** redirect() to a site path in the caller's language. */
function go(locale: Locale, path: string): never {
  redirect(localePath(locale, path));
}

type ActionText = Dict["actions"];

/** Emails to the account are written in the language the runner last used here (PUT /v1/me/locale). */
async function rememberLocale(locale: Locale, token?: string): Promise<void> {
  await api("/v1/me/locale", { method: "PUT", body: { locale }, ...(token ? { headers: { authorization: `Bearer ${token}` } } : { auth: true }) });
}

// ---------------------------------------------------------------- auth

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const { t, problem, locale } = await inLocale();
  const email = z.string().trim().email().safeParse(formData.get("email"));
  if (!email.success) return { fieldErrors: { email: t.emailInvalid } };
  // Temporary: the API's development login. LINE Login / OTP replace this.
  const res = await api<{ accessToken: string; expiresIn: number }>("/v1/dev/login", { method: "POST", body: { email: email.data } });
  if (!res.ok) return { error: problem(res.problem) };
  await setToken(res.data.accessToken, res.data.expiresIn);
  await rememberLocale(locale, res.data.accessToken);
  go(locale, safeNext(formData.get("next")));
}

export async function logout(): Promise<void> {
  const { locale } = await inLocale();
  await clearToken();
  go(locale, "/");
}

// ---------------------------------------------------------------- checkout

export async function startCheckout(_prev: FormState, formData: FormData): Promise<FormState> {
  const { t, problem, locale } = await inLocale();
  const slug = String(formData.get("slug") ?? "");
  if (!(await getToken())) go(locale, `/login?next=/events/${encodeURIComponent(slug)}`);

  const races = [...formData.entries()]
    .filter(([k]) => k.startsWith("qty:"))
    .map(([k, v]) => ({ raceId: k.slice(4), quantity: Number(v) }))
    .filter((r) => r.quantity > 0);
  if (races.length === 0) return { error: t.pickRace };

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
    if (res.status === 401) go(locale, `/login?next=/events/${encodeURIComponent(slug)}`);
    if (res.problem.code === "QUEUE_REQUIRED" || res.problem.code === "QUEUE_TOKEN_EXPIRED") {
      if (queueToken) await clearQueueToken(eventId);
      go(locale, `/events/${encodeURIComponent(slug)}/queue${res.problem.code === "QUEUE_TOKEN_EXPIRED" ? "?expired=1" : ""}`);
    }
    return { error: problem(res.problem) };
  }
  go(locale, `/checkout/${res.data.id}`);
}

const RUNNER_FIELDS = [
  "firstNameTh", "lastNameTh", "firstNameEn", "lastNameEn", "gender", "birthDate", "nationality",
  "idDocType", "idDocNumber", "phone", "emergencyName", "emergencyPhone",
] as const;

/**
 * Turns API validation paths into form field names: participants.0.runner.birthDate → p0.birthDate,
 * participants.0.answers.q_ab12 → p0.q.q_ab12. A single runner's paths (runner.birthDate, answers.q_ab12) map to p0.
 */
function toFieldErrors(errors: { path: string; message: string }[] | undefined, t: ActionText): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of errors ?? []) {
    if (/^(runner|answers)\./.test(e.path)) e.path = `participants.0.${e.path}`;
    const answer = e.path.match(/^participants\.(\d+)\.answers\.(\w+)$/);
    if (answer) {
      out[`p${answer[1]}.q.${answer[2]}`] = t.answer[e.message] ?? t.answerInvalid;
      continue;
    }
    const m = e.path.match(/^participants\.(\d+)\.(?:runner\.)?(\w+)/);
    if (m) out[`p${m[1]}.${m[2]}`] = e.message;
    else if (e.path.startsWith("buyer.") || e.path.startsWith("billing.")) out[e.path] = e.message;
  }
  return out;
}

/** Reads one runner's fields (see RunnerFields), noting the required ones left empty in `fieldErrors`. */
function runnerOf(formData: FormData, i: number, fieldErrors: Record<string, string>, t: ActionText) {
  const runner: Record<string, string | undefined> = {};
  for (const f of RUNNER_FIELDS) {
    const v = formData.get(`p${i}.${f}`);
    runner[f] = typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  }
  // A saved runner's ID number stays on the server; the API reads it from the profile.
  const profileId = formData.get(`p${i}.profileId`);
  for (const f of ["firstNameEn", "lastNameEn", "birthDate", "idDocNumber", "emergencyName", "emergencyPhone"] as const) {
    if (!runner[f] && !(f === "idDocNumber" && profileId)) fieldErrors[`p${i}.${f}`] = t.required;
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
  const { t, problem, locale } = await inLocale();
  const sessionId = String(formData.get("sessionId"));
  const count = Number(formData.get("count"));
  const get = (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  };

  const fieldErrors: Record<string, string> = {};
  const participants = Array.from({ length: count }, (_, i) => {
    const runner = runnerOf(formData, i, fieldErrors, t);
    const shirt = get(`p${i}.shirt`);
    if (formData.get("needsShirt") === "1" && !shirt) fieldErrors[`p${i}.shirt`] = t.pickShirt;
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
  for (const [k, v] of Object.entries(buyer)) if (!v) fieldErrors[`buyer.${k}`] = t.required;
  const consents = consentsOf(formData, fieldErrors, t);
  const billing = formData.get("billing.want") === "1" ? billingOf(formData, "billing", fieldErrors, dictionary(locale).receipts.tax.errors) : undefined;
  if (Object.keys(fieldErrors).length) return { error: t.completeCheckout, fieldErrors };

  // Hold the chosen shirt sizes first; a sold-out size comes back before the order is created.
  if (formData.get("needsShirt") === "1") {
    const counts = new Map<string, number>();
    for (const p of participants) counts.set(p.shirtVariantId!, (counts.get(p.shirtVariantId!) ?? 0) + 1);
    const sizes = await api(`/v1/checkout/sessions/${sessionId}/variants`, {
      method: "PUT",
      auth: true,
      body: { variants: [...counts].map(([variantId, quantity]) => ({ variantId, quantity })) },
    });
    if (!sizes.ok) return { error: problem(sizes.problem) };
  }

  const body = { checkoutSessionId: sessionId, couponCode: get("coupon"), buyer, billing, participants, consents };
  await rememberLocale(locale);
  // Same form data → same key, so a double submit or a retry after a network error cannot create two orders.
  const key = createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 40);
  const res = await api<Order>("/v1/orders", { method: "POST", auth: true, body, idempotencyKey: `order-${key}` });
  if (!res.ok) {
    if (res.problem.code === "ORDER_EXISTS" && typeof res.problem.orderId === "string") go(locale, `/orders/${res.problem.orderId}/pay`);
    return { error: problem(res.problem), fieldErrors: toFieldErrors(res.problem.errors, t) };
  }
  go(locale, `/orders/${res.data.id}/pay`);
}

// ---------------------------------------------------------------- payment

/** Turns the order's receipt into a full tax invoice made out to the details in the form. */
export async function requestTaxInvoice(orderId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { problem, locale } = await inLocale();
  const msg = dictionary(locale).receipts.tax.errors;
  const fieldErrors: Record<string, string> = {};
  const billing = billingOf(formData, "billing", fieldErrors, msg);
  if (Object.keys(fieldErrors).length) return { error: msg.complete, fieldErrors };
  const res = await api(`/v1/orders/${encodeURIComponent(orderId)}/tax-invoice`, { method: "POST", auth: true, body: billing });
  if (!res.ok) {
    return { error: problem(res.problem), fieldErrors: Object.fromEntries((res.problem.errors ?? []).map((e) => [`billing.${e.path}`, e.message])) };
  }
  go(locale, `/orders/${orderId}/receipt`);
}

export async function createPayment(orderId: string, method: "promptpay"): Promise<{ payment?: Payment; error?: string }> {
  const { problem } = await inLocale();
  const res = await api<Payment>(`/v1/orders/${orderId}/payments`, {
    method: "POST",
    auth: true,
    body: { method },
    idempotencyKey: `pay-${randomUUID()}`,
  });
  return res.ok ? { payment: res.data } : { error: problem(res.problem) };
}

export async function orderStatus(orderId: string): Promise<Order["status"] | null> {
  const res = await api<Order>(`/v1/orders/${orderId}`, { auth: true });
  return res.ok ? res.data.status : null;
}

/** Development only: pretends the runner scanned the QR and paid. */
export async function devCompletePayment(orderId: string): Promise<{ error?: string }> {
  const { problem } = await inLocale();
  if (process.env.ENABLE_DEV_TOOLS !== "true") return { error: "dev tools are disabled" };
  const res = await api(`/v1/dev/orders/${orderId}/complete-payment`, { method: "POST", body: { status: "successful" } });
  return res.ok ? {} : { error: problem(res.problem) };
}

export async function cancelCheckout(sessionId: string, slug: string): Promise<void> {
  const { locale } = await inLocale();
  await api(`/v1/checkout/sessions/${sessionId}`, { method: "DELETE", auth: true });
  go(locale, `/events/${slug}`);
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
  const { t, problem } = await inLocale();
  if (!z.string().uuid().safeParse(eventId).success) return { error: t.eventNotFound };
  const res = join
    ? await api<QueueStatus>("/v1/checkout/queue", { method: "POST", auth: true, body: { eventId } })
    : await api<QueueStatus>(`/v1/checkout/queue/${eventId}`, { auth: true });
  if (!res.ok) {
    const retry = res.problem.retryAfterSeconds;
    return { error: problem(res.problem), retryAfterSeconds: typeof retry === "number" ? retry : undefined };
  }
  if (res.data.admission) await setQueueToken(eventId, res.data.admission.token, res.data.admission.expiresAt);
  // The token stays on the server.
  return { status: { ...res.data, admission: res.data.admission && { token: "", expiresAt: res.data.admission.expiresAt } } };
}

// ---------------------------------------------------------------- refunds

/** A runner gives up their place and asks for the policy amount back, into the bank account they type. */
export async function requestRefund(registrationId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { t, problem, locale } = await inLocale();
  const get = (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  };
  const choice = get("reasonChoice");
  const reason = choice === "อื่น ๆ" || !choice ? get("reasonOther") : [choice, get("reasonOther")].filter(Boolean).join(" · ");
  const needsBank = formData.get("needsBank") === "1";
  const fieldErrors: Record<string, string> = {};
  if (!reason) fieldErrors.reasonOther = t.refundReason;
  const bank = needsBank ? { bankCode: get("bankCode"), accountNumber: get("accountNumber"), accountName: get("accountName") } : undefined;
  if (bank) for (const [k, v] of Object.entries(bank)) if (!v) fieldErrors[`bank.${k}`] = t.required;
  if (Object.keys(fieldErrors).length) return { error: t.completeRefund, fieldErrors };

  const res = await api(`/v1/me/registrations/${encodeURIComponent(registrationId)}/refund-requests`, { method: "POST", auth: true, body: { reason, bank } });
  if (!res.ok) {
    if (res.status === 401) go(locale, `/login?next=/me/registrations/${registrationId}/refund`);
    const errors: Record<string, string> = {};
    for (const e of res.problem.errors ?? []) if (e.path.startsWith("bank.")) errors[e.path] = e.path === "bank.accountNumber" ? t.accountNumber : t.checkField;
    return { error: problem(res.problem), fieldErrors: errors };
  }
  go(locale, `/me/registrations/${registrationId}?refund=requested`);
}

// ---------------------------------------------------------------- waitlist

/** Joins the queue of the full race whose button was pressed (its value is the race id). */
export async function joinWaitlist(_prev: FormState, formData: FormData): Promise<FormState> {
  const { problem, locale } = await inLocale();
  const slug = String(formData.get("slug") ?? "");
  if (!(await getToken())) go(locale, `/login?next=/events/${encodeURIComponent(slug)}`);
  const res = await api("/v1/me/waitlist", { method: "POST", auth: true, body: { raceId: formData.get("raceId") } });
  if (!res.ok && res.problem.code !== "ALREADY_IN_WAITLIST") {
    if (res.status === 401) go(locale, `/login?next=/events/${encodeURIComponent(slug)}`);
    return { error: problem(res.problem) };
  }
  go(locale, "/me/waitlist");
}

export async function leaveWaitlist(entryId: string): Promise<void> {
  const { locale } = await inLocale();
  await api(`/v1/me/waitlist/${encodeURIComponent(entryId)}`, { method: "DELETE", auth: true });
  go(locale, "/me/waitlist");
}

/** Takes up an offered place and goes to the checkout that now holds it. */
export async function claimWaitlist(entryId: string): Promise<FormState> {
  const { problem, locale } = await inLocale();
  const res = await api<{ checkoutSessionId: string }>(`/v1/me/waitlist/${encodeURIComponent(entryId)}/claim`, { method: "POST", auth: true });
  if (!res.ok) return { error: problem(res.problem) };
  go(locale, `/checkout/${res.data.checkoutSessionId}`);
}

// ---------------------------------------------------------------- transfers and race changes

/** Offers the place to someone else by email. */
export async function createTransfer(registrationId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { t, problem, locale } = await inLocale();
  const toEmail = String(formData.get("toEmail") ?? "").trim();
  if (!z.string().email().safeParse(toEmail).success) return { fieldErrors: { toEmail: t.transferEmail } };
  const res = await api(`/v1/me/registrations/${encodeURIComponent(registrationId)}/transfers`, { method: "POST", auth: true, body: { toEmail } });
  if (!res.ok) return { error: problem(res.problem) };
  go(locale, `/me/registrations/${registrationId}/transfer`);
}

export async function cancelTransfer(transferId: string, back: string): Promise<void> {
  const { locale } = await inLocale();
  await api(`/v1/me/transfers/${encodeURIComponent(transferId)}`, { method: "DELETE", auth: true });
  go(locale, back);
}

export async function declineTransfer(transferId: string): Promise<void> {
  const { locale } = await inLocale();
  await api(`/v1/me/transfers/${encodeURIComponent(transferId)}/decline`, { method: "POST", auth: true });
  go(locale, "/me/transfers");
}

/** The recipient takes the place: straight to their ticket, or to paying the transfer fee first. */
export async function acceptTransfer(transferId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { t, problem, locale } = await inLocale();
  const fieldErrors: Record<string, string> = {};
  const runner = runnerOf(formData, 0, fieldErrors, t);
  const consents = consentsOf(formData, fieldErrors, t);
  if (Object.keys(fieldErrors).length) return { error: t.completeAccept, fieldErrors };
  const res = await api<{ status: "completed"; registrationId: string } | { status: "pending_payment"; orderId: string }>(
    `/v1/me/transfers/${encodeURIComponent(transferId)}/accept`,
    { method: "POST", auth: true, body: { runner, answers: answersOf(formData, 0), consents, ...profileChoiceOf(formData, 0) } },
  );
  if (!res.ok) return { error: problem(res.problem), fieldErrors: toFieldErrors(res.problem.errors, t) };
  if (res.data.status === "pending_payment") go(locale, `/orders/${res.data.orderId}/pay`);
  go(locale, `/me/registrations/${res.data.registrationId}`);
}

/** Moves the place to another race: at once when nothing is due, otherwise through paying the difference. */
export async function requestRaceChange(registrationId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { t, problem, locale } = await inLocale();
  const toRaceId = String(formData.get("toRaceId") ?? "");
  if (!toRaceId) return { error: t.pickNewRace };
  const res = await api<{ status: "completed" | "pending_payment"; orderId: string }>(
    `/v1/me/registrations/${encodeURIComponent(registrationId)}/race-changes`,
    { method: "POST", auth: true, body: { toRaceId } },
  );
  if (!res.ok) {
    if (res.problem.code === "RACE_CHANGE_IN_PROGRESS" && typeof res.problem.orderId === "string") go(locale, `/orders/${res.problem.orderId}/pay`);
    return { error: problem(res.problem) };
  }
  if (res.data.status === "pending_payment") go(locale, `/orders/${res.data.orderId}/pay`);
  go(locale, `/me/registrations/${registrationId}?changed=1`);
}

export async function cancelRaceChange(raceChangeId: string, registrationId: string): Promise<void> {
  const { locale } = await inLocale();
  await api(`/v1/me/race-changes/${encodeURIComponent(raceChangeId)}`, { method: "DELETE", auth: true });
  go(locale, `/me/registrations/${registrationId}/race-change`);
}

// ---------------------------------------------------------------- saved runners

const PROFILE_EXTRAS = ["nickname", "emergencyRelation", "shirtSize", "clubName"] as const;

/** Creates a saved runner, or updates one (where an empty ID number keeps the saved one). */
export async function saveProfile(profileId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const { t, problem, locale } = await inLocale();
  const fieldErrors: Record<string, string> = {};
  const runner = runnerOf(formData, 0, fieldErrors, t);
  if (profileId && fieldErrors["p0.idDocNumber"]) delete fieldErrors["p0.idDocNumber"];
  if (Object.keys(fieldErrors).length) return { error: t.completeProfile, fieldErrors };
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
    if (res.status === 401) go(locale, "/login?next=/me/profiles");
    return { error: problem(res.problem), fieldErrors: toFieldErrors(res.problem.errors?.map((e) => ({ ...e, path: `runner.${e.path}` })), t) };
  }
  go(locale, "/me/profiles");
}

export async function deleteProfile(profileId: string): Promise<void> {
  const { locale } = await inLocale();
  await api(`/v1/me/profiles/${encodeURIComponent(profileId)}`, { method: "DELETE", auth: true });
  go(locale, "/me/profiles");
}

/** The consents ticked on a registration form; the required one must be ticked before anything is sent. */
function consentsOf(formData: FormData, fieldErrors: Record<string, string>, t: ActionText) {
  if (formData.get("consent") !== "1") fieldErrors.consent = t.consentRequired;
  return { terms: true, privacy: true, shareWithOrganizer: true, marketing: formData.get("marketing") === "1" };
}

// ---------------------------------------------------------------- privacy (PDPA)

export async function setMarketingConsent(granted: boolean): Promise<void> {
  const { locale } = await inLocale();
  await api("/v1/me/consents", { method: "POST", auth: true, body: { purpose: "marketing", granted } });
  go(locale, "/me/privacy");
}

/** Closes the account, signs out and goes home. */
export async function closeAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const { t, problem, locale } = await inLocale();
  if (formData.get("confirm") !== "1") return { error: t.confirmClose };
  const res = await api("/v1/me", { method: "DELETE", auth: true, body: { confirm: true } });
  if (!res.ok) {
    if (res.status === 401) go(locale, "/login?next=/me/privacy");
    return { error: problem(res.problem) };
  }
  await clearToken();
  go(locale, "/?closed=1");
}
