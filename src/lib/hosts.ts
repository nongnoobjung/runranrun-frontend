/**
 * The three fronts of the app and their domains: the runner site, the organiser backoffice and platform admin.
 * One Next app serves all three; proxy.ts tells them apart by host. Each has its own sign-in and session cookie.
 *
 * SITE_HOST, ORGANIZER_HOST and ADMIN_HOST name the domains (e.g. kao.run, organizer.kao.run, admin.kao.run).
 * Without a port, links between fronts keep the port of the current request, so the defaults work on any local port
 * (browsers send *.localhost to this machine).
 */
export type Area = "site" | "organizer" | "admin";

function configuredHost(area: Area): string {
  if (area === "organizer") return process.env.ORGANIZER_HOST || "organizer.localhost";
  if (area === "admin") return process.env.ADMIN_HOST || "admin.localhost";
  return process.env.SITE_HOST || "localhost";
}

const hostname = (host: string) => host.replace(/:\d+$/, "").toLowerCase();

/** Which front a request is for, from its Host (or X-Forwarded-Host behind a tunnel or proxy). Anything else is the site. */
export function areaOfHost(host: string | null | undefined): Area {
  const name = hostname(host ?? "");
  if (name === hostname(configuredHost("admin"))) return "admin";
  if (name === hostname(configuredHost("organizer"))) return "organizer";
  return "site";
}

/** Origin of another front, seen from a request to `current` (its protocol, and its port unless the host names one). */
export function areaOrigin(area: Area, current: { protocol: string; host: string }): string {
  const host = configuredHost(area);
  const port = current.host.match(/:(\d+)$/)?.[1];
  return `${current.protocol.replace(/:$/, "")}://${host}${!host.includes(":") && port ? `:${port}` : ""}`;
}

/**
 * Paths that jump to another front: /organizer/... and /admin/... (also old links) and /_site/... for the runner site,
 * which a backoffice page cannot link to directly. Returns the front and the path there.
 */
export function jumpOf(pathname: string): { area: Area; path: string } | null {
  const m = pathname.match(/^\/(organizer|admin|_site)(?=\/|$)(.*)$/);
  if (!m) return null;
  return { area: m[1] === "_site" ? "site" : (m[1] as Area), path: m[2] || "/" };
}

/** Where proxy.ts asks app/area-jump to send a jump: {"area", "path"}. Set by the proxy only (it replaces any sent). */
export const JUMP_HEADER = "x-kao-jump";

/**
 * Links to another front, for a plain <a> (the client router stays on one domain), e.g. siteHref(`/events/${slug}`)
 * from a backoffice page. The proxy redirects them to that front's domain.
 */
export function siteHref(path: string): string {
  return `/_site${path}`;
}

export function organizerHref(path = "/"): string {
  return path === "/" ? "/organizer" : `/organizer${path}`;
}
