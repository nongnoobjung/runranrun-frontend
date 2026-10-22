"use client";

import { localePath, unlocalizedPath } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";

/**
 * Links to this page in the other language. /th/... tells the proxy to remember Thai and drop the prefix;
 * /en/... remembers English. The href without JavaScript goes to the other language's home page.
 */
export function LocaleSwitch() {
  const locale = useLocale();
  const t = useT();
  const other = locale === "th" ? "en" : "th";
  const target = (path: string) => (other === "th" ? `/th${unlocalizedPath(path) === "/" ? "" : unlocalizedPath(path)}` : localePath("en", path));
  return (
    <a
      href={target("/")}
      hrefLang={other}
      lang={other}
      aria-label={t.common.language.switchTo}
      title={t.common.language.label}
      onClick={(e) => {
        e.preventDefault();
        window.location.assign(target(window.location.pathname + window.location.search));
      }}
      className="grid h-10 min-w-10 place-items-center rounded-full px-2.5 text-sm font-semibold text-ink no-underline hover:bg-tint"
    >
      {t.common.language.short}
    </a>
  );
}
