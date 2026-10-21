import type { Localized } from "./types";

/** Languages event pages can be shown in. The site-wide switch decides which; Thai is the default. */
export type Lang = "th" | "en";

/** The text in the page's language, falling back to Thai when the English side is empty. */
export function pick<T extends string | null>(value: Localized<T>, lang: Lang): T | string {
  if (lang === "en" && value.en?.trim()) return value.en;
  return value.th;
}
