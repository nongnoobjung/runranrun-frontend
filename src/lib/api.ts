import "server-only";
import { headers as requestHeaders } from "next/headers";
import { connection } from "next/server";
import { getToken } from "./session";
import type { ApiProblem } from "./types";

export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; problem: ApiProblem };

interface Options {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** A multipart body (file uploads); fetch sets the content type with its boundary. */
  form?: FormData;
  auth?: boolean;
  idempotencyKey?: string;
  headers?: Record<string, string>;
}

function baseUrl(): string {
  const url = process.env.API_URL;
  if (!url) throw new Error("API_URL is not set");
  return url.replace(/\/$/, "");
}

/**
 * Server-side call to the kao API. Request time only (never prerendered),
 * and the JWT stays on the server: the browser only holds the httpOnly cookie.
 */
export async function api<T>(path: string, opts: Options = {}): Promise<ApiResult<T>> {
  await connection();
  const headers: Record<string, string> = { accept: "application/json" };
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.idempotencyKey) headers["idempotency-key"] = opts.idempotencyKey;
  Object.assign(headers, opts.headers);
  await forwardClientIp(headers);
  if (opts.auth) {
    const token = await getToken();
    if (!token) return { ok: false, status: 401, problem: { status: 401, code: "UNAUTHORIZED", title: "Sign in to continue" } };
    headers.authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.form ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 503, problem: { status: 503, code: "API_UNREACHABLE", title: "ระบบไม่ตอบสนอง ลองใหม่อีกครั้ง" } };
  }

  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;
  if (res.ok) return { ok: true, status: res.status, data: json as T };
  return { ok: false, status: res.status, problem: (json as ApiProblem) ?? { status: res.status, code: "HTTP_ERROR", title: res.statusText } };
}

/**
 * Every API call comes from this server, so the API's per-IP rate limits would see one address for everybody.
 * With WEB_PROXY_SECRET (same value as the API's) the visitor's address goes along: the one the nearest proxy saw,
 * i.e. the last x-forwarded-for entry, which the visitor cannot choose.
 */
async function forwardClientIp(headers: Record<string, string>): Promise<void> {
  const secret = process.env.WEB_PROXY_SECRET;
  if (!secret) return;
  const h = await requestHeaders();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  if (!ip) return;
  headers["x-kao-client-ip"] = ip;
  headers["x-kao-proxy-secret"] = secret;
}

/** For pages: returns the data or throws, letting error.tsx / notFound handle it. */
export async function apiOrThrow<T>(path: string, opts: Options = {}): Promise<T> {
  const res = await api<T>(path, opts);
  if (!res.ok) throw new ApiError(res.problem);
  return res.data;
}

export class ApiError extends Error {
  constructor(readonly problem: ApiProblem) {
    super(`${problem.code}: ${problem.title}`);
  }
}
