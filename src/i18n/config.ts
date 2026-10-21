/**
 * The runner-facing site speaks Thai and English. Thai lives at the plain URLs (/events),
 * English under /en (/en/events); src/proxy.ts rewrites the plain URLs to app/[lang] with lang=th.
 * The organiser backoffice and admin stay Thai and outside app/[lang].
 */
export const LOCALES = ["th", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "th";

/** Remembers the last language a visitor picked, so plain URLs send them back to /en. */
export const LOCALE_COOKIE = "kao_locale";
/** Set by the proxy on every site request: Server Actions cannot read next/root-params. */
export const LOCALE_HEADER = "x-kao-locale";

export function isLocale(value: unknown): value is Locale {
  return value === "th" || value === "en";
}

/** Strips a leading /th or /en: "/en/events?x=1" → "/events?x=1", "/en" → "/". */
export function unlocalizedPath(path: string): string {
  const m = path.match(/^\/(th|en)(?=\/|\?|#|$)/);
  if (!m) return path;
  const rest = path.slice(m[0].length);
  return rest.startsWith("/") ? rest : `/${rest}`;
}

/** The Thai-only backoffice, outside app/[lang]: never prefixed. */
const UNLOCALIZED = /^\/(organizer|admin)(?=\/|\?|#|$)/;

/** A site path in the given language: localePath("en", "/events") → "/en/events"; Thai stays unprefixed. */
export function localePath(locale: Locale, path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const bare = unlocalizedPath(path);
  if (locale === DEFAULT_LOCALE || UNLOCALIZED.test(bare)) return bare;
  return bare === "/" ? "/en" : bare.startsWith("/?") || bare.startsWith("/#") ? `/en${bare.slice(1)}` : `/en${bare}`;
}

/** Organiser-written text in the page's language, falling back to the other one: localized("en", event.name). */
export function localized(locale: Locale, text: { th: string | null; en: string | null }): string {
  return (locale === "en" ? text.en || text.th : text.th || text.en) ?? "";
}
