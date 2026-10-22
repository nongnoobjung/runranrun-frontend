import type { Metadata } from "next";
import Form from "next/form";
import { Suspense } from "react";
import { EventCard } from "@/components/event-card";
import { buttonClass, inputClass } from "@/components/ui";
import { localePath, type Locale } from "@/i18n/config";
import Link from "@/i18n/link";
import { getLocale, getT } from "@/i18n/server";
import { apiOrThrow } from "@/lib/api";
import { fmtFor, provinceName } from "@/lib/format";
import type { EventSummary, EventType } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.events.list.title };
}

type Props = PageProps<"/[lang]/events">;

const PAGE_SIZE = 12;

const DISTANCES = ["short", "10k", "half", "full", "ultra"] as const;

const TYPES: EventType[] = ["road", "trail", "ultra", "fun_run", "virtual"];

const monthLabel: Record<Locale, Intl.DateTimeFormat> = {
  th: new Intl.DateTimeFormat("th-TH-u-ca-gregory", { month: "long", year: "numeric", timeZone: "Asia/Bangkok" }),
  en: new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "Asia/Bangkok" }),
};

interface Filters {
  q?: string;
  province?: string;
  month?: string;
  type?: string;
  distance?: string;
  open?: string;
  page: number;
}

function readFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const one = (k: string) => {
    const v = sp[k];
    const s = (Array.isArray(v) ? v[0] : v)?.trim();
    return s ? s : undefined;
  };
  return {
    q: one("q"),
    province: one("province"),
    month: one("month")?.match(/^\d{4}-\d{2}$/)?.[0],
    type: TYPES.some((t) => t === one("type")) ? one("type") : undefined,
    distance: DISTANCES.some((d) => d === one("distance")) ? one("distance") : undefined,
    open: one("open") === "1" ? "1" : undefined,
    page: Math.max(1, Number(one("page")) || 1),
  };
}

/** The search URL with some filters changed; any change goes back to the first page. */
function href(f: Filters, changes: Partial<Filters> = {}): string {
  const next: Filters = { ...f, page: 1, ...changes };
  const p = new URLSearchParams();
  for (const k of ["q", "province", "month", "type", "distance", "open"] as const) if (next[k]) p.set(k, next[k]!);
  if (next.page > 1) p.set("page", String(next.page));
  const qs = p.toString();
  return qs ? `/events?${qs}` : "/events";
}

export default async function EventsPage({ searchParams }: Props) {
  const t = await getT();
  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-4 py-8 sm:px-7">
      <h1 className="text-3xl font-bold sm:text-4xl">{t.events.list.title}</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-tint" aria-busy="true" />}>
        <Search searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Search({ searchParams }: Pick<Props, "searchParams">) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const l = t.events.list;
  const num = fmtFor(locale).num;
  const f = readFilters(await searchParams);
  const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((f.page - 1) * PAGE_SIZE) });
  for (const k of ["q", "province", "month", "type", "distance", "open"] as const) if (f[k]) query.set(k, f[k]!);
  const [{ items, total }, facets] = await Promise.all([
    apiOrThrow<{ items: EventSummary[]; total: number }>(`/v1/events?${query}`),
    apiOrThrow<{ provinces: { code: string; count: number }[]; months: { month: string; count: number }[] }>("/v1/events/filters"),
  ]);
  const filtered = Boolean(f.q || f.province || f.month || f.type || f.distance || f.open);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const chip = (active: boolean) =>
    `flex min-h-10 items-center rounded-full px-4 text-sm whitespace-nowrap no-underline ${active ? "bg-brand font-semibold text-white" : "bg-ice text-ink hover:bg-sky"}`;

  return (
    <>
      <Form action={localePath(locale, "/events")} role="search" className="flex flex-col gap-3 rounded-card bg-tint p-4 sm:p-5">
        {f.distance && <input type="hidden" name="distance" value={f.distance} />}
        {f.open && <input type="hidden" name="open" value={f.open} />}
        <div className="flex gap-2">
          <label className="flex-1">
            <span className="sr-only">{l.queryLabel}</span>
            <input name="q" type="search" defaultValue={f.q} placeholder={l.queryPlaceholder} className={inputClass} />
          </label>
          <button type="submit" className={`${buttonClass} px-5`}>
            {t.events.search}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">{l.province}</span>
            <select name="province" defaultValue={f.province ?? ""} className={inputClass}>
              <option value="">{l.allProvinces}</option>
              {facets.provinces.map((p) => (
                <option key={p.code} value={p.code}>
                  {provinceName(p.code, locale)} ({num(p.count)})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">{l.month}</span>
            <select name="month" defaultValue={f.month ?? ""} className={inputClass}>
              <option value="">{l.allMonths}</option>
              {facets.months.map((m) => (
                <option key={m.month} value={m.month}>
                  {monthLabel[locale].format(new Date(`${m.month}-15T12:00:00+07:00`))} ({num(m.count)})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">{l.type}</span>
            <select name="type" defaultValue={f.type ?? ""} className={inputClass}>
              <option value="">{l.allTypes}</option>
              {TYPES.map((value) => (
                <option key={value} value={value}>
                  {t.events.types[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Form>

      <nav aria-label={l.distanceNav} className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <Link href={href(f, { distance: undefined })} className={chip(!f.distance)} aria-current={!f.distance ? "true" : undefined}>
          {l.allDistances}
        </Link>
        {DISTANCES.map((value) => (
          <Link key={value} href={href(f, { distance: f.distance === value ? undefined : value })} className={chip(f.distance === value)} aria-current={f.distance === value ? "true" : undefined}>
            {l.distances[value]}
          </Link>
        ))}
        <Link href={href(f, { open: f.open ? undefined : "1" })} className={chip(Boolean(f.open))} aria-current={f.open ? "true" : undefined}>
          {f.open ? "✓ " : ""}
          {l.openOnly}
        </Link>
      </nav>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted" role="status">
          {l.found(total)}
        </p>
        {filtered && (
          <Link href="/events" className="text-sm font-semibold">
            {l.clearFilters}
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card bg-tint p-10 text-center">
          <p className="font-semibold">{l.noMatch}</p>
          <p className="text-sm text-muted">{l.noMatchHint}</p>
        </div>
      ) : (
        <ul aria-label={l.resultsLabel} className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
          {items.map((e) => (
            <li key={e.id} className="grid">
              <EventCard event={e} />
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label={t.events.pager.label} className="flex items-center justify-center gap-3">
          {f.page > 1 ? (
            <Link href={href(f, { page: f.page - 1 })} className="rounded-full bg-ice px-4 py-2 text-sm font-semibold no-underline" rel="prev">
              ← {t.events.pager.prev}
            </Link>
          ) : (
            <span className="rounded-full px-4 py-2 text-sm text-muted">← {t.events.pager.prev}</span>
          )}
          <span className="text-sm tabular-nums">
            {f.page} / {pages}
          </span>
          {f.page < pages ? (
            <Link href={href(f, { page: f.page + 1 })} className="rounded-full bg-ice px-4 py-2 text-sm font-semibold no-underline" rel="next">
              {t.events.pager.next} →
            </Link>
          ) : (
            <span className="rounded-full px-4 py-2 text-sm text-muted">{t.events.pager.next} →</span>
          )}
        </nav>
      )}
    </>
  );
}
