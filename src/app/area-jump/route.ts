import { NextResponse, type NextRequest } from "next/server";
import { areaOrigin, JUMP_HEADER, type Area } from "@/lib/hosts";

const AREAS: readonly Area[] = ["site", "organizer", "admin"];

/**
 * Redirect to another front's domain, for proxy.ts, which rewrites jumps here with the target in JUMP_HEADER
 * (a plain /area-jump is rewritten like any other path, so this answers nobody else). The proxy cannot answer itself:
 * Next turns a redirect to its own origin into a relative one, which on the site's host (localhost in development)
 * would leave the browser on the backoffice domain.
 */
export function GET(req: NextRequest) {
  let target: { area?: Area; path?: string } = {};
  try {
    target = JSON.parse(req.headers.get(JUMP_HEADER) ?? "{}");
  } catch {}
  const { area, path } = target;
  if (!area || !AREAS.includes(area) || typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
    return new NextResponse(null, { status: 404 });
  }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const protocol = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol;
  return NextResponse.redirect(new URL(path, areaOrigin(area, { protocol, host })));
}
