import { expect, type Page } from "@playwright/test";

/**
 * The app's three fronts (src/lib/hosts.ts): the runner site on WEB_URL (Playwright's baseURL, so relative URLs go
 * there), the organiser backoffice on ORGANIZER_HOST and admin on ADMIN_HOST, by default organizer.localhost and
 * admin.localhost on the site's port. Chromium and Node both send *.localhost to this machine.
 */
const web = new URL(process.env.WEB_URL ?? "http://localhost:3000");

/** Like the app: a host without a port keeps the site's port. */
function originOf(host: string): string {
  return `${web.protocol}//${host}${!host.includes(":") && web.port ? `:${web.port}` : ""}`;
}

export const SITE = web.origin;
export const ORG = originOf(process.env.ORGANIZER_HOST || "organizer.localhost");
export const ADMIN = originOf(process.env.ADMIN_HOST || "admin.localhost");

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A URL on the organiser backoffice whose path matches `path` (a regex source), e.g. orgURL("/[0-9a-f-]{36}$"). */
export const orgURL = (path = "") => new RegExp(`^${escape(ORG)}${path}`);
export const adminURL = (path = "") => new RegExp(`^${escape(ADMIN)}${path}`);
export const siteURL = (path = "") => new RegExp(`^${escape(SITE)}${path}`);

/**
 * Every audience at once for the API's development login, so one token can set things up as a runner, an organiser
 * and an admin. The web app itself always asks for exactly one (the front being signed in to).
 */
export const ALL_AUDIENCES = ["site", "organizer", "admin"] as const;

async function backofficeSignIn(page: Page, origin: string, email: string, next: string) {
  await page.goto(`${origin}/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("อีเมล").filter({ visible: true }).fill(email);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
}

/** Signs in on the organiser backoffice's own login page; `next` is a path there (e.g. `/${orgId}/events/...`). */
export async function signInOrganizer(page: Page, email: string, next = "/") {
  await backofficeSignIn(page, ORG, email, next);
  await expect(page).not.toHaveURL(orgURL("/login"));
}

/** Signs in on the admin's own login page; `next` is a path there (e.g. `/reviews`). */
export async function signInAdmin(page: Page, email: string, next = "/") {
  await backofficeSignIn(page, ADMIN, email, next);
  await expect(page).not.toHaveURL(adminURL("/login"));
}
