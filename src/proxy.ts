import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_HEADER, type Locale } from "@/i18n/config";

const YEAR = 60 * 60 * 24 * 365;

/**
 * Thai pages live at plain URLs and are rewritten to app/[lang] with lang=th; English pages are /en/...
 * /th/... is the language switch back to Thai: it remembers the choice and redirects to the plain URL.
 * A visitor who last picked English and opens a plain URL is sent to its /en version.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const prefix = pathname.match(/^\/(th|en)(?=\/|$)/)?.[1] as Locale | undefined;
  const remembered = req.cookies.get(LOCALE_COOKIE)?.value;
  // Only a page the visitor actually opens changes the remembered language: Next also prefetches links
  // (e.g. the organiser's "English" preview) and fetches RSC payloads (?_rsc=) for client-side navigation.
  const dest = req.headers.get("sec-fetch-dest");
  const opened = dest ? dest === "document" || dest === "iframe" : !req.nextUrl.searchParams.has("_rsc");
  const url = req.nextUrl.clone();

  if (prefix === "th") {
    url.pathname = pathname.slice(3) || "/";
    const res = NextResponse.redirect(url);
    return opened ? remember(res, "th") : res;
  }
  if (prefix === "en") {
    const res = NextResponse.next({ request: { headers: withLocale(req, "en") } });
    return alternates(remembered === "en" || !opened ? res : remember(res, "en"), req, pathname.slice(3) || "/");
  }
  if (remembered === "en" && req.method === "GET") {
    url.pathname = pathname === "/" ? "/en" : `/en${pathname}`;
    return NextResponse.redirect(url);
  }
  url.pathname = pathname === "/" ? `/${DEFAULT_LOCALE}` : `/${DEFAULT_LOCALE}${pathname}`;
  return alternates(NextResponse.rewrite(url, { request: { headers: withLocale(req, DEFAULT_LOCALE) } }), req, pathname);
}

function withLocale(req: NextRequest, locale: Locale): Headers {
  const headers = new Headers(req.headers);
  headers.set(LOCALE_HEADER, locale);
  return headers;
}

function remember(res: NextResponse, locale: Locale): NextResponse {
  res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: YEAR, sameSite: "lax" });
  return res;
}

/** hreflang links for search engines, so each page's Thai and English versions point at each other. */
function alternates(res: NextResponse, req: NextRequest, bare: string): NextResponse {
  const origin = req.nextUrl.origin;
  const en = bare === "/" ? "/en" : `/en${bare}`;
  res.headers.set("link", `<${origin}${bare}>; rel="alternate"; hreflang="th", <${origin}${en}>; rel="alternate"; hreflang="en"`);
  return res;
}

export const config = {
  // Everything except Next internals, files with an extension (favicon, the check-in service worker),
  // event images (/media), and the Thai-only organiser and admin areas.
  matcher: ["/((?!_next/|media/|organizer(?:/|$)|admin(?:/|$)|.*\\.[\\w]+$).*)"],
};
