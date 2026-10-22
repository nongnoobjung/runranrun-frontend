import type { Locale } from "./config";
import actions from "./dict/actions";
import checkout from "./dict/checkout";
import common from "./dict/common";
import events from "./dict/events";
import home from "./dict/home";
import me from "./dict/me";
import privacy from "./dict/privacy";
import receipts from "./dict/receipts";

/** Every area's strings. Add an area here after creating its file in ./dict. */
const AREAS = { common, home, events, checkout, me, privacy, receipts, actions };

type Areas = typeof AREAS;
export type Dict = { [K in keyof Areas]: Areas[K]["th"] };

function build(locale: Locale): Dict {
  return Object.fromEntries(Object.entries(AREAS).map(([k, v]) => [k, v[locale]])) as Dict;
}

const DICTS: Record<Locale, Dict> = { th: build("th"), en: build("en") };

export function dictionary(locale: Locale): Dict {
  return DICTS[locale];
}
