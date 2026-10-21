import "server-only";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "kao_session";

export async function getToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** Only callable from Server Actions / Route Handlers. */
export async function setToken(token: string, maxAgeSeconds: number): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function clearToken(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
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
