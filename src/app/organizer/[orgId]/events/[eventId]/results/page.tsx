import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, EmptyState, PageHeader, Pill } from "@/components/backoffice";
import { duration } from "@/lib/format";
import { can, eventPath, membership, orgEvent, orgGet, type ResultsSummary } from "@/lib/org";
import { ImportResultsForm, IssueList, PublishButton } from "./results-forms";
import { siteHref } from "@/lib/hosts";

export const metadata: Metadata = { title: "ผลการแข่งขัน" };

type Props = PageProps<"/organizer/[orgId]/events/[eventId]/results">;

const at = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });
const MEDAL = ["bg-[#ffe3a3]", "bg-[#dce8f3]", "bg-[#f6cbaa]"];

export default function ResultsPage({ params, searchParams }: Props) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="ผลการแข่งขัน" />
          <div className="h-72 animate-pulse rounded-[28px] bg-white" aria-busy="true" />
        </>
      }
    >
      <Results params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Results({ params, searchParams }: Props) {
  const { orgId, eventId } = await params;
  const raceParam = (await searchParams).race;
  const back = eventPath(orgId, eventId, "results");
  const [org, event, summary] = await Promise.all([membership(orgId), orgEvent(orgId, eventId), orgGet<ResultsSummary>(orgId, `/events/${eventId}/results`, back)]);
  const canEdit = can(org.role, "manage_event");
  const finishers = summary.races.reduce((s, r) => s + r.counts.FIN, 0);
  const imported = summary.races.reduce((s, r) => s + r.counts.FIN + r.counts.DNF + r.counts.DNS + r.counts.DQ, 0);
  const race = summary.races.find((r) => r.raceId === raceParam) ?? summary.races[0];

  return (
    <>
      <PageHeader
        title="ผลการแข่งขัน"
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            {imported ? `นำเข้าแล้ว ${imported.toLocaleString("th-TH")} คน · เข้าเส้นชัย ${finishers.toLocaleString("th-TH")} คน` : "ยังไม่ได้นำเข้าผล"}
            <Pill label={summary.publishedAt ? "เผยแพร่แล้ว" : "ยังไม่เผยแพร่"} className={summary.publishedAt ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"} />
          </span>
        }
        actions={canEdit && imported > 0 && <PublishButton orgId={orgId} eventId={eventId} published={Boolean(summary.publishedAt)} finishers={finishers} />}
      />

      {summary.publishedAt && (
        <p className="rounded-3xl bg-ok-soft px-5 py-3 text-sm text-ok">
          นักวิ่งดูผลได้ที่{" "}
          <a href={siteHref(`/events/${event.slug}/results`)} className="font-semibold text-ok">
            หน้าผลของงาน
          </a>{" "}
          ตั้งแต่ {at.format(new Date(summary.publishedAt))} นำเข้าไฟล์ใหม่ได้ ผลบนหน้างานจะเปลี่ยนตาม
        </p>
      )}

      <section aria-label="สรุปผลแต่ละระยะ" className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
        {summary.races.map((r) => (
          <div key={r.raceId} className="flex flex-col gap-2 rounded-3xl bg-white p-5">
            <span className="self-start rounded-full bg-ice px-3.5 py-0.5 text-lg font-bold text-brand">{r.code}</span>
            <b className="text-2xl font-bold tabular-nums">
              {r.counts.FIN.toLocaleString("th-TH")} <span className="text-sm font-medium text-muted">/ {r.runners.toLocaleString("th-TH")} คนเข้าเส้นชัย</span>
            </b>
            <span className="text-[13px] text-muted">
              DNF {r.counts.DNF} · DNS {r.counts.DNS} · DQ {r.counts.DQ}
            </span>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-start gap-4">
        <Card title="อันดับรวม 10 คนแรก" className="min-w-0 flex-[999_1_520px]">
          {summary.races.length > 1 && (
            <nav aria-label="ระยะ" className="-mx-1 flex flex-wrap gap-1">
              {summary.races.map((r) => (
                <Link
                  key={r.raceId}
                  href={`${back}?race=${r.raceId}`}
                  aria-current={r.raceId === race?.raceId ? "page" : undefined}
                  className={`flex min-h-10 items-center rounded-full px-4 text-sm no-underline ${r.raceId === race?.raceId ? "bg-brand font-semibold text-white" : "bg-tint text-ink"}`}
                >
                  {r.code}
                </Link>
              ))}
            </nav>
          )}
          {!race || race.top.length === 0 ? (
            <EmptyState>ยังไม่มีผู้เข้าเส้นชัยในระยะนี้</EmptyState>
          ) : (
            <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-[13px] text-muted">
                    <th className="py-2 pr-3 font-medium">อันดับ</th>
                    <th className="py-2 pr-3 font-medium">บิบ</th>
                    <th className="py-2 pr-3 font-medium">ชื่อ</th>
                    <th className="py-2 pr-3 font-medium">รุ่น</th>
                    <th className="py-2 pr-3 text-right font-medium">อันดับรุ่น</th>
                    <th className="py-2 pr-3 text-right font-medium">Gun</th>
                    <th className="py-2 text-right font-medium">Chip</th>
                  </tr>
                </thead>
                <tbody>
                  {race.top.map((t, i) => (
                    <tr key={t.bib} className="border-t border-line">
                      <td className="py-2.5 pr-3">
                        <span className={`grid h-8 w-8 place-items-center rounded-full font-bold ${MEDAL[i] ?? "bg-tint"}`}>{t.rankOverall}</span>
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">{t.bib}</td>
                      <td className="py-2.5 pr-3 font-medium">{t.name}</td>
                      <td className="py-2.5 pr-3 text-muted">{t.ageGroup ?? "–"}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{t.rankAgeGroup ?? "–"}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-muted">{duration(t.gunTimeMs)}</td>
                      <td className="py-2.5 text-right font-semibold tabular-nums">{duration(t.chipTimeMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          {canEdit && (
            <Card title="นำเข้าผลจับเวลา">
              <ImportResultsForm orgId={orgId} eventId={eventId} />
            </Card>
          )}
          {summary.lastImport && (
            <Card title="นำเข้าล่าสุด">
              <p className="text-sm text-muted">
                {at.format(new Date(summary.lastImport.at))} · {summary.lastImport.rows.toLocaleString("th-TH")} แถว{summary.lastImport.by && ` · โดย ${summary.lastImport.by}`}
              </p>
              {summary.lastImport.warnings.length > 0 ? (
                <IssueList title={`ควรตรวจก่อนเผยแพร่ ${summary.lastImport.warnings.length} รายการ`} issues={summary.lastImport.warnings} tone="warn" />
              ) : (
                <p className="text-sm text-ok">ไม่พบเวลาผิดปกติ</p>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
