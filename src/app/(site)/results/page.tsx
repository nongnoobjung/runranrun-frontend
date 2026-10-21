import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { ResultsEventCard } from "@/components/event-card";
import { buttonClass, inputClass } from "@/components/ui";
import { api, apiOrThrow } from "@/lib/api";
import { duration, fmt, pace, RESULT_STATUS_TH } from "@/lib/format";
import type { ResultsEvent, RunnerResult } from "@/lib/types";

export const metadata: Metadata = { title: "ผลการแข่งขัน" };

type Props = PageProps<"/results">;

const PAGE_SIZE = 12;

export default function ResultsIndexPage({ searchParams }: Props) {
  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-4 py-8 sm:px-7">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">ผลการแข่งขัน</h1>
        <p className="mt-1 text-muted">ผลของทุกงานที่ผู้จัดเผยแพร่แล้ว ค้นหาตัวเองด้วยชื่อหรือเลขบิบ</p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-tint" aria-busy="true" />}>
        <ResultsIndex searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ResultsIndex({ searchParams }: Pick<Props, "searchParams">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = one(sp.q).trim();
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const form = (
    <Form action="/results" role="search" className="flex gap-2 rounded-card bg-tint p-4 sm:p-5">
      <label className="min-w-0 flex-1">
        <span className="sr-only">ชื่อนักวิ่ง เลขบิบ หรือชื่องาน</span>
        <input name="q" type="search" defaultValue={q} placeholder="ชื่อนักวิ่ง เลขบิบ หรือชื่องาน" className={inputClass} />
      </label>
      <button type="submit" className={`${buttonClass} px-5`}>
        ค้นหา
      </button>
    </Form>
  );

  if (q) {
    return (
      <>
        {form}
        <Link href="/results" className="self-start text-sm font-semibold">
          ← ดูงานทั้งหมด
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
      <h2 className="text-xl font-bold">งานที่ประกาศผลแล้ว</h2>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card bg-tint p-10 text-center">
          <p className="font-semibold">ยังไม่มีงานที่ประกาศผล</p>
          <p className="text-sm text-muted">ผลจะขึ้นที่นี่หลังผู้จัดเผยแพร่</p>
        </div>
      ) : (
        <EventGrid events={items} label="งานที่ประกาศผลแล้ว" />
      )}
      {pages > 1 && (
        <nav aria-label="หน้า" className="flex items-center justify-center gap-3">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="rounded-full bg-ice px-4 py-2 text-sm font-semibold no-underline" rel="prev">
              ← ก่อนหน้า
            </Link>
          ) : (
            <span className="rounded-full px-4 py-2 text-sm text-muted">← ก่อนหน้า</span>
          )}
          <span className="text-sm tabular-nums">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link href={pageHref(page + 1)} className="rounded-full bg-ice px-4 py-2 text-sm font-semibold no-underline" rel="next">
              ถัดไป →
            </Link>
          ) : (
            <span className="rounded-full px-4 py-2 text-sm text-muted">ถัดไป →</span>
          )}
        </nav>
      )}
    </>
  );
}

/** One box finds both runners (name or bib) and events (name). */
async function SearchResults({ q }: { q: string }) {
  if (q.length < 2) return <p className="rounded-card bg-tint p-6 text-muted">พิมพ์อย่างน้อย 2 ตัวอักษร</p>;
  const [runners, events] = await Promise.all([
    apiOrThrow<{ items: RunnerResult[]; hasMore: boolean }>(`/v1/results/search?${new URLSearchParams({ q })}`),
    apiOrThrow<{ items: ResultsEvent[]; total: number }>(`/v1/results?${new URLSearchParams({ q, limit: String(PAGE_SIZE) })}`),
  ]);
  if (runners.items.length === 0 && events.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card bg-tint p-10 text-center">
        <p className="font-semibold">ไม่พบผลของ “{q}”</p>
        <p className="text-sm text-muted">ลองค้นด้วยชื่อจริงภาษาไทยหรือเลขบิบเต็ม ผลจะขึ้นหลังผู้จัดเผยแพร่เท่านั้น</p>
      </div>
    );
  }
  return (
    <>
      {runners.items.length > 0 && (
        <section aria-labelledby="found-runners" className="flex flex-col gap-2">
          <h2 id="found-runners" className="text-xl font-bold">
            นักวิ่ง
          </h2>
          <RunnerList items={runners.items} label="นักวิ่งที่ค้นพบ" />
          {runners.hasMore && <p className="text-sm text-muted">แสดงเฉพาะรายการแรก ๆ พิมพ์ชื่อเต็มหรือเลขบิบเพื่อให้แคบลง</p>}
        </section>
      )}
      {events.items.length > 0 && (
        <section aria-labelledby="found-events" className="flex flex-col gap-3">
          <h2 id="found-events" className="text-xl font-bold">
            งาน
          </h2>
          <EventGrid events={events.items} label="งานที่ค้นพบ" />
        </section>
      )}
    </>
  );
}

/** The signed-in runner's own results; nothing at all for guests or runners without one. */
async function MyResults() {
  const res = await api<{ items: RunnerResult[] }>("/v1/me/results", { auth: true });
  if (!res.ok || res.data.items.length === 0) return null;
  return (
    <section aria-labelledby="my-results" className="flex flex-col gap-2">
      <h2 id="my-results" className="text-xl font-bold">
        ผลของฉัน
      </h2>
      <RunnerList items={res.data.items} label="ผลของฉัน" />
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

function RunnerList({ items, label }: { items: RunnerResult[]; label: string }) {
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
              aria-label={x.status === "FIN" ? `อันดับ ${x.rankOverall}` : RESULT_STATUS_TH[x.status]}
            >
              {x.status === "FIN" ? x.rankOverall : x.status}
            </span>
            <span className="flex min-w-0 flex-1 flex-col leading-snug">
              <b className="truncate font-semibold">{x.name}</b>
              <span className="truncate text-[13px] text-muted">
                {x.event.name} · {x.race.code}
              </span>
              <span className="text-[13px] text-muted">
                {fmt.date(x.event.eventDate)} · บิบ {x.bib}
              </span>
            </span>
            <span className="flex flex-none flex-col items-end leading-snug">
              {x.status === "FIN" ? (
                <>
                  <b className="text-lg font-bold tabular-nums">{duration(x.chipTimeMs ?? x.gunTimeMs)}</b>
                  <span className="text-xs text-muted">{pace(x.paceSecPerKm)}</span>
                </>
              ) : (
                <span className="text-sm text-muted">{RESULT_STATUS_TH[x.status]}</span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
