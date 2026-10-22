import type { Locale } from "@/i18n/config";
import type { Localized } from "./types";

/** Languages event pages can be shown in: the page's locale (see getLocale / useLocale). */
export type Lang = Locale;

/** The text in the page's language, falling back to Thai when the English side is empty. */
export function pick<T extends string | null>(value: Localized<T>, lang: Lang): T | string {
  if (lang === "en" && value.en?.trim()) return value.en;
  return value.th;
}
