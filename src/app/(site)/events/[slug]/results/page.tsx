import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { inputClass } from "@/components/ui";
import { api } from "@/lib/api";
import { duration, fmt, pace, RESULT_STATUS_TH as STATUS_TH } from "@/lib/format";
import type { PublicResults } from "@/lib/types";

export const metadata: Metadata = { title: "ผลการแข่งขัน" };

type Props = PageProps<"/events/[slug]/results">;

const PAGE_SIZE = 50;
const GENDER = { male: "ชาย", female: "หญิง" } as const;

export default function ResultsPage({ params, searchParams }: Props) {
  return (
    <div className="bg-tint pb-12">
      <div className="mx-auto flex max-w-[960px] flex-col gap-5 px-4 pt-6 sm:px-7">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-white" aria-busy="true" />}>
          <Results params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Results({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const race = one(sp.race);
  const q = one(sp.q).trim();
  const gender = one(sp.gender) === "male" || one(sp.gender) === "female" ? one(sp.gender) : "";
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
  if (race) query.set("race", race);
  if (q) query.set("q", q);
  if (gender) query.set("gender", gender);
  const res = await api<PublicResults>(`/v1/events/${encodeURIComponent(slug)}/results?${query}`);
  if (!res.ok) {
    if (res.problem.code !== "RESULTS_NOT_PUBLISHED") notFound();
    return (
      <>
        <Link href={`/events/${slug}`} className="self-start font-semibold text-ink">
          ← หน้างาน
        </Link>
        <div className="rounded-card bg-white p-8 text-center">
          <h1 className="text-2xl font-bold">ผลการแข่งขันยังไม่ออก</h1>
          <p className="mt-1 text-muted">ผู้จัดกำลังตรวจผล กลับมาดูอีกครั้งหลังจบงาน</p>
        </div>
      </>
    );
  }
  const r = res.data;
  const current = r.races.find((x) => x.id === r.raceId);
  const href = (next: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { race: r.raceId ?? "", q, gender, page: 1, ...next };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "page" && Number(v) === 1)) p.set(k, String(v));
    return `/events/${slug}/results${p.size ? `?${p}` : ""}`;
  };
  const pages = Math.max(1, Math.ceil(r.total / PAGE_SIZE));

  return (
    <>
      <Link href={`/events/${slug}`} className="self-start font-semibold text-ink">
        ← หน้างาน
      </Link>
      <div>
        <span className="text-sm text-muted">{fmt.date(r.event.eventDate)}</span>
        <h1 className="text-3xl leading-tight font-bold">ผลการแข่งขัน {r.event.name}</h1>
      </div>

      {r.races.length > 1 && (
        <nav aria-label="ระยะ" className="flex gap-2 overflow-x-auto">
          {r.races.map((x) => (
            <Link
              key={x.id}
              href={href({ race: x.id, q: undefined, gender: undefined })}
              aria-current={x.id === r.raceId ? "page" : undefined}
              className={`flex min-h-11 flex-none items-center rounded-full px-5 font-semibold no-underline ${x.id === r.raceId ? "bg-brand text-white" : "bg-white text-ink"}`}
            >
              {x.code}
            </Link>
          ))}
        </nav>
      )}

      <Form action={`/events/${slug}/results`} className="flex flex-wrap gap-2 rounded-card bg-white p-4" role="search">
        <input type="hidden" name="race" value={r.raceId ?? ""} />
        <label className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
          <span className="text-[13px] text-muted">ค้นหาชื่อหรือเลขบิบ</span>
          <input name="q" defaultValue={q} className={inputClass} placeholder="เช่น สมชาย หรือ 0457" />
        </label>
        <label className="flex flex-[0_1_160px] flex-col gap-1">
          <span className="text-[13px] text-muted">เพศ</span>
          <select name="gender" defaultValue={gender} className={inputClass}>
            <option value="">ทั้งหมด</option>
            <option value="male">ชาย</option>
            <option value="female">หญิง</option>
          </select>
        </label>
        <button type="submit" className="min-h-12 self-end rounded-full bg-brand px-6 font-semibold text-white">
          ค้นหา
        </button>
      </Form>

      <section aria-label={`ผล ${current?.code ?? ""}`} className="flex flex-col rounded-card bg-white p-2 sm:p-3">
        <p className="px-3 py-2 text-sm text-muted">
          {current && `${current.code} · เข้าเส้นชัย ${current.finishers.toLocaleString("th-TH")} จาก ${current.total.toLocaleString("th-TH")} คน · `}
          {q || gender ? `พบ ${r.total.toLocaleString("th-TH")} คน` : "เรียงตามเวลา chip"}
        </p>
        {r.items.length === 0 ? (
          <p className="px-3 py-8 text-center text-muted">ไม่พบผลที่ค้นหา</p>
        ) : (
          <ol className="flex flex-col">
            {r.items.map((x) => (
              <li key={x.bib} className="flex items-center gap-3 border-t border-line px-3 py-3 first:border-t-0">
                <span
                  className={`grid h-11 w-11 flex-none place-items-center rounded-full text-sm font-bold tabular-nums ${
                    x.status !== "FIN" ? "bg-tint text-muted" : x.rankOverall && x.rankOverall <= 3 ? "bg-sky text-ink" : "bg-ice text-brand"
                  }`}
                  aria-label={x.status === "FIN" ? `อันดับ ${x.rankOverall}` : STATUS_TH[x.status]}
                >
                  {x.status === "FIN" ? x.rankOverall : x.status}
                </span>
                <span className="flex min-w-0 flex-1 flex-col leading-snug">
                  <b className="truncate font-semibold">{x.name}</b>
                  <span className="text-[13px] text-muted">
                    บิบ {x.bib}
                    {x.gender && x.gender !== "other" && ` · ${GENDER[x.gender]}${x.rankGender ? ` อันดับ ${x.rankGender}` : ""}`}
                    {x.ageGroup && ` · ${x.ageGroup}${x.rankAgeGroup ? ` อันดับ ${x.rankAgeGroup}` : ""}`}
                  </span>
                </span>
                <span className="flex flex-col items-end leading-snug">
                  {x.status === "FIN" ? (
                    <>
                      <b className="text-lg font-bold tabular-nums">{duration(x.chipTimeMs ?? x.gunTimeMs)}</b>
                      <span className="text-xs text-muted">{pace(x.paceSecPerKm)}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted">{STATUS_TH[x.status]}</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-muted">
            <span>
              หน้า {page} จาก {pages}
            </span>
            <span className="flex gap-2">
              {page > 1 && (
                <Link href={href({ page: page - 1 })} className="rounded-full bg-tint px-4 py-2 no-underline">
                  ก่อนหน้า
                </Link>
              )}
              {page < pages && (
                <Link href={href({ page: page + 1 })} className="rounded-full bg-tint px-4 py-2 no-underline">
                  ถัดไป
                </Link>
              )}
            </span>
          </div>
        )}
      </section>
    </>
  );
}
