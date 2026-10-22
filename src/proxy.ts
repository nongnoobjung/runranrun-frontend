import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_HEADER, type Locale } from "@/i18n/config";
import { areaOfHost, JUMP_HEADER, jumpOf } from "@/lib/hosts";

const YEAR = 60 * 60 * 24 * 365;

/**
 * One app, three domains (lib/hosts.ts): the organiser backoffice and admin each get their own host, where their pages
 * live at plain URLs (organizer.kao.run/<org> is app/organizer/<org>). /organizer/..., /admin/... and /_site/... jump to
 * the front they name, so links between fronts and old bookmarks keep working.
 *
 * On the runner site, Thai pages live at plain URLs and are rewritten to app/[lang] with lang=th; English pages are /en/...
 * /th/... is the language switch back to Thai: it remembers the choice and redirects to the plain URL.
 * A visitor who last picked English and opens a plain URL is sent to its /en version.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const area = areaOfHost(host);

  const jump = jumpOf(pathname);
  if (jump) {
    if (jump.area === area) return NextResponse.redirect(new URL(`${jump.path}${req.nextUrl.search}`, req.url));
    const url = req.nextUrl.clone();
    url.pathname = "/area-jump";
    const headers = new Headers(req.headers);
    headers.set(JUMP_HEADER, JSON.stringify({ area: jump.area, path: `${jump.path}${req.nextUrl.search}` }));
    return NextResponse.rewrite(url, { request: { headers } });
  }
  if (area !== "site") {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? `/${area}` : `/${area}${pathname}`;
    return NextResponse.rewrite(url);
  }
  return site(req, pathname);
}

/** The runner site: Thai at plain URLs, English under /en. */
function site(req: NextRequest, pathname: string) {
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
  // Everything except Next internals, files with an extension (favicon, the check-in service worker)
  // and event images (/media), which every front serves as they are.
  matcher: ["/((?!_next/|media/|.*\\.[\\w]+$).*)"],
};
