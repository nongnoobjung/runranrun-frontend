import { NextResponse, type NextRequest } from "next/server";
import { localePath } from "@/i18n/config";
import { dictionary } from "@/i18n/dictionaries";
import { actionLocale } from "@/i18n/server";
import { getToken } from "@/lib/session";

/**
 * A copy of everything the platform holds about the signed-in person, as a JSON download. The browser never holds
 * the API token, so this handler adds it from the session cookie.
 */
export async function GET(req: NextRequest) {
  const back = "/me/privacy";
  // Route Handlers cannot read next/root-params; the proxy's header says the language here too.
  const locale = await actionLocale();
  const t = dictionary(locale).privacy.me;
  const login = new URL(localePath(locale, `/login?next=${encodeURIComponent(back)}`), req.url);
  const token = await getToken();
  if (!token) return NextResponse.redirect(login);

  const apiUrl = process.env.API_URL?.replace(/\/$/, "");
  if (!apiUrl) return new NextResponse("API_URL is not set", { status: 500 });

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/v1/me/data`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
  } catch {
    return new NextResponse(t.exportDown, { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  if (res.status === 401) return NextResponse.redirect(login);
  if (!res.ok) return new NextResponse(t.exportFailed, { status: res.status, headers: { "content-type": "text/plain; charset=utf-8" } });

  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(await res.json(), null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="kao-my-data-${day}.json"`,
      "cache-control": "no-store",
    },
  });
}
