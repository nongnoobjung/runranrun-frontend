import type { Metadata } from "next";
import Form from "next/form";
import { Suspense } from "react";
import { ResultsEventCard } from "@/components/event-card";
import { buttonClass, inputClass } from "@/components/ui";
import { localePath } from "@/i18n/config";
import Link from "@/i18n/link";
import { getLocale, getT } from "@/i18n/server";
import { api, apiOrThrow } from "@/lib/api";
import { duration, fmtFor, pace, RESULT_STATUS } from "@/lib/format";
import type { ResultsEvent, RunnerResult } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.events.resultsIndex.title };
}

type Props = PageProps<"/[lang]/results">;

const PAGE_SIZE = 12;

export default async function ResultsIndexPage({ searchParams }: Props) {
  const t = await getT();
  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-4 py-8 sm:px-7">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">{t.events.resultsIndex.title}</h1>
        <p className="mt-1 text-muted">{t.events.resultsIndex.intro}</p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-tint" aria-busy="true" />}>
        <ResultsIndex searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ResultsIndex({ searchParams }: Pick<Props, "searchParams">) {
  const sp = await searchParams;
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const ri = t.events.resultsIndex;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = one(sp.q).trim();
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const form = (
    <Form action={localePath(locale, "/results")} role="search" className="flex gap-2 rounded-card bg-tint p-4 sm:p-5">
      <label className="min-w-0 flex-1">
        <span className="sr-only">{ri.query}</span>
        <input name="q" type="search" defaultValue={q} placeholder={ri.query} className={inputClass} />
      </label>
      <button type="submit" className={`${buttonClass} px-5`}>
        {t.events.search}
      </button>
    </Form>
  );

  if (q) {
    return (
      <>
        {form}
        <Link href="/results" className="self-start text-sm font-semibold">
          ← {ri.allEvents}
        </Link>
        <SearchResults q={q} />
      </>
    );
  }

  const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
  const { items, total } = await apiOrThrow<{ items: ResultsEvent[]; total: number }>(`/v1/results?${query}`);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (n: number) => (n > 1 ? `/results?page=${n}` : "/results");

  return (
    <>
      {form}
      {page === 1 && (
        <Suspense fallback={null}>
          <MyResults />
        </Suspense>
      )}
      <h2 className="text-xl font-bold">{ri.published}</h2>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card bg-tint p-10 text-center">
          <p className="font-semibold">{ri.noneYet}</p>
          <p className="text-sm text-muted">{ri.noneYetHint}</p>
        </div>
      ) : (
        <EventGrid events={items} label={ri.published} />
      )}
      {pages > 1 && (
        <nav aria-label={t.events.pager.label} className="flex items-center justify-center gap-3">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="rounded-full bg-ice px-4 py-2 text-sm font-semibold no-underline" rel="prev">
              ← {t.events.pager.prev}
            </Link>
          ) : (
            <span className="rounded-full px-4 py-2 text-sm text-muted">← {t.events.pager.prev}</span>
          )}
          <span className="text-sm tabular-nums">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link href={pageHref(page + 1)} className="rounded-full bg-ice px-4 py-2 text-sm font-semibold no-underline" rel="next">
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

/** One box finds both runners (name or bib) and events (name). */
async function SearchResults({ q }: { q: string }) {
  const ri = (await getT()).events.resultsIndex;
  if (q.length < 2) return <p className="rounded-card bg-tint p-6 text-muted">{ri.minChars}</p>;
  const [runners, events] = await Promise.all([
    apiOrThrow<{ items: RunnerResult[]; hasMore: boolean }>(`/v1/results/search?${new URLSearchParams({ q })}`),
    apiOrThrow<{ items: ResultsEvent[]; total: number }>(`/v1/results?${new URLSearchParams({ q, limit: String(PAGE_SIZE) })}`),
  ]);
  if (runners.items.length === 0 && events.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card bg-tint p-10 text-center">
        <p className="font-semibold">{ri.notFound(q)}</p>
        <p className="text-sm text-muted">{ri.notFoundHint}</p>
      </div>
    );
  }
  return (
    <>
      {runners.items.length > 0 && (
        <section aria-labelledby="found-runners" className="flex flex-col gap-2">
          <h2 id="found-runners" className="text-xl font-bold">
            {ri.runners}
          </h2>
          <RunnerList items={runners.items} label={ri.runnersFound} />
          {runners.hasMore && <p className="text-sm text-muted">{ri.hasMore}</p>}
        </section>
      )}
      {events.items.length > 0 && (
        <section aria-labelledby="found-events" className="flex flex-col gap-3">
          <h2 id="found-events" className="text-xl font-bold">
            {ri.events}
          </h2>
          <EventGrid events={events.items} label={ri.eventsFound} />
        </section>
      )}
    </>
  );
}

/** The signed-in runner's own results; nothing at all for guests or runners without one. */
async function MyResults() {
  const t = await getT();
  const res = await api<{ items: RunnerResult[] }>("/v1/me/results", { auth: true });
  if (!res.ok || res.data.items.length === 0) return null;
  return (
    <section aria-labelledby="my-results" className="flex flex-col gap-2">
      <h2 id="my-results" className="text-xl font-bold">
        {t.events.resultsIndex.mine}
      </h2>
      <RunnerList items={res.data.items} label={t.events.resultsIndex.mine} />
    </section>
  );
}

function EventGrid({ events, label }: { events: ResultsEvent[]; label: string }) {
  return (
    <ul aria-label={label} className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
      {events.map((e) => (
        <li key={e.slug} className="grid">
          <ResultsEventCard event={e} />
        </li>
      ))}
    </ul>
  );
}

async function RunnerList({ items, label }: { items: RunnerResult[]; label: string }) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const f = fmtFor(locale);
  return (
    <ol aria-label={label} className="flex flex-col rounded-card bg-tint p-2">
      {items.map((x) => (
        <li key={`${x.race.id}-${x.bib}`}>
          <Link
            href={`/events/${x.event.slug}/results?${new URLSearchParams({ race: x.race.id, q: x.bib })}`}
            className="flex items-center gap-3 rounded-[18px] px-3 py-3 text-ink no-underline hover:bg-white"
          >
            <span
              className={`grid h-11 w-11 flex-none place-items-center rounded-full text-sm font-bold tabular-nums ${
                x.status !== "FIN" ? "bg-white text-muted" : x.rankOverall && x.rankOverall <= 3 ? "bg-sky text-ink" : "bg-ice text-brand"
              }`}
              aria-label={x.status === "FIN" ? t.events.rank(x.rankOverall) : RESULT_STATUS[locale][x.status]}
            >
              {x.status === "FIN" ? x.rankOverall : x.status}
            </span>
            <span className="flex min-w-0 flex-1 flex-col leading-snug">
              <b className="truncate font-semibold">{x.name}</b>
              <span className="truncate text-[13px] text-muted">
                {x.event.name} · {x.race.code}
              </span>
              <span className="text-[13px] text-muted">
                {f.date(x.event.eventDate)} · {t.events.bib(x.bib)}
              </span>
            </span>
            <span className="flex flex-none flex-col items-end leading-snug">
              {x.status === "FIN" ? (
                <>
                  <b className="text-lg font-bold tabular-nums">{duration(x.chipTimeMs ?? x.gunTimeMs)}</b>
                  <span className="text-xs text-muted">{pace(x.paceSecPerKm, locale)}</span>
                </>
              ) : (
                <span className="text-sm text-muted">{RESULT_STATUS[locale][x.status]}</span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
