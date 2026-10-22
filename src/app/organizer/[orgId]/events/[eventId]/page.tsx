import Link from "next/link";
import { Suspense } from "react";
import { Card, PageHeader, Pill, smallButtonClass, smallGhostButtonClass } from "@/components/backoffice";
import { baht, fmt } from "@/lib/format";
import { can, EVENT_STATUS, eventPath, membership, orgGet, type Dashboard } from "@/lib/org";
import { DailyChart } from "./daily-chart";
import { siteHref } from "@/lib/hosts";

export default function DashboardPage({ params }: PageProps<"/organizer/[orgId]/events/[eventId]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[28px] bg-white" aria-busy="true" />}>
      <Overview params={params} />
    </Suspense>
  );
}

function daysUntil(date: string): number {
  return Math.ceil((new Date(`${date}T00:00:00+07:00`).getTime() - Date.now()) / 86_400_000);
}

const n = (v: number) => v.toLocaleString("th-TH");

async function Overview({ params }: Pick<PageProps<"/organizer/[orgId]/events/[eventId]">, "params">) {
  const { orgId, eventId } = await params;
  const [org, d] = await Promise.all([
    membership(orgId),
    orgGet<Dashboard>(orgId, `/events/${eventId}/dashboard`, eventPath(orgId, eventId)),
  ]);
  const status = EVENT_STATUS[d.event.status];
  const left = daysUntil(d.event.eventDate);
  const kpis = [
    { label: "ผู้สมัครที่ชำระแล้ว", value: n(d.kpis.confirmed), sub: `จาก ${n(d.kpis.capacity)} ที่ · 24 ชม. ล่าสุด +${n(d.kpis.last24h)}` },
    { label: "รายได้สุทธิ", value: baht(d.kpis.revenueSatang), sub: "หลังหักยอดคืนเงิน รวมค่าธรรมเนียมนักวิ่ง" },
    { label: "รอชำระเงิน", value: n(d.kpis.pendingPayment), sub: "จองที่แล้ว ยังไม่ได้จ่าย" },
    { label: "รับของแล้ว", value: n(d.kpis.pickedUp), sub: `เหลือ ${n(d.kpis.confirmed - d.kpis.pickedUp)} คน` },
  ];

  return (
    <>
      <PageHeader
        eyebrow={`${d.event.nameTh} · วันงาน ${fmt.date(d.event.eventDate)}${left > 0 ? ` · อีก ${n(left)} วัน` : ""}`}
        title="ภาพรวม"
        actions={
          <>
            <Pill label={status.label} className={status.className} />
            {(d.event.status === "published" || d.event.status === "closed") && (
              <a href={siteHref(`/events/${d.event.slug}`)} className={smallGhostButtonClass} target="_blank">
                ดูหน้างาน ↗
              </a>
            )}
            {can(org.role, "view_pii") && (
              <a href={eventPath(orgId, eventId, "registrations/export")} className={`${smallButtonClass} no-underline`}>
                Export รายชื่อ
              </a>
            )}
          </>
        }
      />

      <section aria-label="ตัวเลขสำคัญ" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="flex min-w-0 flex-col gap-1 rounded-[28px] bg-white p-4 sm:p-5">
            <span className="text-sm text-muted">{k.label}</span>
            <b className="truncate text-2xl font-bold tabular-nums sm:text-3xl">{k.value}</b>
            <span className="text-[13px] text-muted">{k.sub}</span>
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card title="ผู้สมัครรายวัน" action={<span className="text-sm text-muted">14 วันล่าสุด · ทุกระยะ · คน</span>}>
          <DailyChart days={d.daily} />
        </Card>

        <Card title="โควต้าแต่ละระยะ">
          {d.races.length === 0 ? (
            <p className="text-muted">
              ยังไม่มีระยะ <Link href={eventPath(orgId, eventId, "races")}>เพิ่มระยะ →</Link>
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {d.races.map((r) => (
                <li key={r.id} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="rounded-full bg-ice px-3 py-0.5 text-sm font-semibold text-brand">{r.code}</span>
                    <span className="text-sm tabular-nums">
                      <b>{n(r.sold)}</b> / {n(r.capacity)}
                    </span>
                  </div>
                  <QuotaBar sold={r.sold} held={r.reserved} capacity={r.capacity} />
                  <span className="text-[13px] text-muted">
                    {r.reserved > 0 && `จองไว้ ${n(r.reserved)} · `}
                    {r.currentPriceSatang !== null ? `ราคาตอนนี้ ${baht(r.currentPriceSatang)}` : "ไม่มีราคาที่เปิดขายตอนนี้"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded-[3px] bg-brand" /> จ่ายแล้ว
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded-[3px] bg-held" /> จองไว้รอจ่าย
            </span>
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="ยอดเสื้อ" action={<Link href={eventPath(orgId, eventId, "shirts")} className="text-sm">แก้สต็อก</Link>}>
          {d.shirts.length === 0 ? (
            <p className="text-muted">ยังไม่ได้ตั้งไซซ์เสื้อ</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <th className="pb-2 font-normal">ไซซ์</th>
                  <th className="pb-2 text-right font-normal">สั่งแล้ว</th>
                  <th className="pb-2 text-right font-normal">สต็อก</th>
                  <th className="pb-2 text-right font-normal">เหลือ</th>
                </tr>
              </thead>
              <tbody>
                {d.shirts.map((s) => {
                  const ordered = s.sold + s.reserved;
                  const left = s.stock === null ? null : s.stock - ordered;
                  return (
                    <tr key={s.id} className="border-t border-line">
                      <td className="py-2 font-semibold">{s.label}</td>
                      <td className="py-2 text-right tabular-nums">{n(ordered)}</td>
                      <td className="py-2 text-right tabular-nums">{s.stock === null ? "ไม่จำกัด" : n(s.stock)}</td>
                      <td className={`py-2 text-right tabular-nums ${left !== null && left <= 10 ? "font-semibold text-bad" : ""}`}>
                        {left === null ? "–" : n(left)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="เพิ่งสมัคร" action={<Link href={eventPath(orgId, eventId, "registrations")} className="text-sm">ดูทั้งหมด</Link>}>
          {d.recent.length === 0 ? (
            <p className="text-muted">ยังไม่มีผู้สมัครที่ชำระเงินแล้ว</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {d.recent.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <span aria-hidden className="grid h-9 w-9 flex-none place-items-center rounded-full bg-ice font-semibold text-brand">
                    {Array.from(r.name)[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link href={eventPath(orgId, eventId, `registrations?selected=${r.id}`)} className="block truncate font-medium text-ink no-underline hover:text-brand">
                      {r.name}
                    </Link>
                    <span className="text-[13px] text-muted">{r.raceCode}</span>
                  </span>
                  <span className="text-[13px] text-muted">{fmt.time(r.confirmedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

/** Paid and held places as one stacked bar with a 2px gap between the segments. */
function QuotaBar({ sold, held, capacity }: { sold: number; held: number; capacity: number }) {
  const pct = (v: number) => (capacity > 0 ? (v / capacity) * 100 : 0);
  return (
    <div
      className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-ice"
      role="img"
      aria-label={`จ่ายแล้ว ${sold} จองไว้ ${held} จาก ${capacity} ที่`}
    >
      {sold > 0 && <span className="h-full rounded-full bg-brand" style={{ width: `${pct(sold)}%` }} />}
      {held > 0 && <span className="h-full rounded-full bg-held" style={{ width: `${pct(held)}%` }} />}
    </div>
  );
}
