import { headers } from "next/headers";
import { lang } from "next/root-params";
import { DEFAULT_LOCALE, isLocale, LOCALE_HEADER, type Locale } from "./config";
import { dictionary } from "./dictionaries";

/**
 * The page's language in Server Components: the [lang] segment, Thai outside it (organiser, admin).
 * It comes from the URL, so it does not make a page dynamic.
 */
export async function getLocale(): Promise<Locale> {
  const value = await lang();
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** The strings for the page's language: `const t = await getT(); t.common.nav.events`. */
export async function getT() {
  return dictionary(await getLocale());
}

/** The language of the page that called a Server Action (next/root-params is not available there). */
export async function actionLocale(): Promise<Locale> {
  const value = (await headers()).get(LOCALE_HEADER);
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
