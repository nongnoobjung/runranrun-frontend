"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, localePath, type Locale } from "./config";
import { dictionary } from "./dictionaries";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Set once in app/[lang]/layout.tsx; Client Components outside it (organiser, admin) read Thai. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

/** The page's language in Client Components. */
export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** The strings for the page's language: `const t = useT(); t.common.nav.events`. */
export function useT() {
  return dictionary(useLocale());
}

/** Turns a site path into the page's language, for router.push and friends. */
export function useLocalePath(): (path: string) => string {
  const locale = useLocale();
  return (path) => localePath(locale, path);
}
