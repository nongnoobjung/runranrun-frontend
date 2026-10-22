import "server-only";
import { cookies, headers } from "next/headers";
import { areaOfHost, type Area } from "./hosts";

/**
 * Each front signs in on its own domain and keeps its own cookie (host-only, so never sent to the other domains).
 * The names differ too, so the sessions stay apart even if two fronts ever share a host.
 */
const SESSION_COOKIES: Record<Area, string> = { site: "kao_session", organizer: "kao_org_session", admin: "kao_admin_session" };

/** The front this request is for. */
export async function currentArea(): Promise<Area> {
  const h = await headers();
  return areaOfHost(h.get("x-forwarded-host") ?? h.get("host"));
}

async function sessionCookie(): Promise<string> {
  return SESSION_COOKIES[await currentArea()];
}

export async function getToken(): Promise<string | undefined> {
  return (await cookies()).get(await sessionCookie())?.value;
}

/** Only callable from Server Actions / Route Handlers. */
export async function setToken(token: string, maxAgeSeconds: number): Promise<void> {
  (await cookies()).set(await sessionCookie(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function clearToken(): Promise<void> {
  (await cookies()).delete(await sessionCookie());
}

/** The waiting room's admission for one event, kept until it runs out; the API checks it again at checkout. */
const queueCookie = (eventId: string) => `kao_queue_${eventId}`;

export async function getQueueToken(eventId: string): Promise<string | undefined> {
  return (await cookies()).get(queueCookie(eventId))?.value;
}

/** Only callable from Server Actions / Route Handlers. */
export async function setQueueToken(eventId: string, token: string, expiresAt: string): Promise<void> {
  const maxAge = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
  if (maxAge <= 0) return;
  (await cookies()).set(queueCookie(eventId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearQueueToken(eventId: string): Promise<void> {
  (await cookies()).delete(queueCookie(eventId));
}

/** When the admission in the cookie runs out (read from the token's claims, for display only). */
export function queueTokenExpiry(token: string | undefined): Date | null {
  try {
    const claims = JSON.parse(Buffer.from(token?.split(".")[0] ?? "", "base64url").toString("utf8")) as { x?: unknown };
    return typeof claims.x === "number" && claims.x > Date.now() ? new Date(claims.x) : null;
  } catch {
    return null;
  }
}
