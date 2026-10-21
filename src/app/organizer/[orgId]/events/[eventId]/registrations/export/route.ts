import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "@/lib/session";

const FORWARDED = ["q", "raceId", "status", "pickup"] as const;

/**
 * Streams the runner CSV from the API. The browser never holds the API token, so this
 * handler adds it from the session cookie; the API checks the role and audits the export.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/organizer/[orgId]/events/[eventId]/registrations/export">) {
  const { orgId, eventId } = await ctx.params;
  const back = `/organizer/${orgId}/events/${eventId}/registrations`;
  const token = await getToken();
  if (!token) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(back)}`, req.url));

  const apiUrl = process.env.API_URL?.replace(/\/$/, "");
  if (!apiUrl) return new NextResponse("API_URL is not set", { status: 500 });

  const query = new URLSearchParams();
  for (const key of FORWARDED) {
    const v = req.nextUrl.searchParams.get(key);
    if (v) query.set(key, v);
  }
  const path = `/v1/org/${encodeURIComponent(orgId)}/events/${encodeURIComponent(eventId)}/registrations.csv`;

  let res: Response;
  try {
    res = await fetch(`${apiUrl}${path}${query.size ? `?${query}` : ""}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return new NextResponse("ระบบไม่ตอบสนอง ลองใหม่อีกครั้ง", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
  }

  if (res.status === 401) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(back)}`, req.url));
  if (!res.ok) {
    const message = res.status === 403 ? "บทบาทของคุณ Export รายชื่อไม่ได้" : res.status === 404 ? "ไม่พบงานนี้" : "Export ไม่สำเร็จ ลองใหม่อีกครั้ง";
    return new NextResponse(message, { status: res.status, headers: { "content-type": "text/plain; charset=utf-8" } });
  }

  return new NextResponse(res.body, {
    status: 200,
    headers: {
      "content-type": res.headers.get("content-type") ?? "text/csv; charset=utf-8",
      "content-disposition": res.headers.get("content-disposition") ?? `attachment; filename="registrations.csv"`,
      "cache-control": "no-store",
    },
  });
}
