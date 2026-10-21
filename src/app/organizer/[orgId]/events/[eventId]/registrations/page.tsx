import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { Card, EmptyState, PageHeader, Pill, smallButtonClass, smallGhostButtonClass } from "@/components/backoffice";
import { inputClass } from "@/components/ui";
import { api } from "@/lib/api";
import { baht } from "@/lib/format";
import {
  can,
  eventPath,
  membership,
  orgEvent,
  orgGet,
  REGISTRATION_STATUS,
  type OrgRegistration,
  type RegistrationDetail,
  type RegistrationList,
  type RegistrationStatus,
} from "@/lib/org";
import { RevealId } from "./reveal-id";

export const metadata: Metadata = { title: "ผู้สมัคร" };

type Props = PageProps<"/organizer/[orgId]/events/[eventId]/registrations">;

const PAGE_SIZE = 50;
const STATUSES = Object.keys(REGISTRATION_STATUS) as RegistrationStatus[];

const dateTime = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Bangkok",
});
const at = (iso: string) => dateTime.format(new Date(iso));
const n = (v: number) => v.toLocaleString("th-TH");

const GENDER: Record<OrgRegistration["gender"], string> = { male: "ชาย", female: "หญิง", other: "อื่น ๆ" };

interface Filters {
  q?: string;
  race?: string;
  status?: RegistrationStatus;
  pickup?: "picked" | "not_picked";
  page: number;
  selected?: string;
}

function readFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const one = (k: string) => {
    const v = sp[k];
    const s = (Array.isArray(v) ? v[0] : v)?.trim();
    return s ? s : undefined;
  };
  const status = one("status");
  const pickup = one("pickup");
  const page = Number(one("page") ?? 1);
  return {
    q: one("q"),
    race: one("race"),
    status: STATUSES.includes(status as RegistrationStatus) ? (status as RegistrationStatus) : undefined,
    pickup: pickup === "picked" || pickup === "not_picked" ? pickup : undefined,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    selected: one("selected"),
  };
}

/** Query string for this page with some filters changed; page and selection reset unless given. */
function query(f: Filters, changes: Partial<Filters> = {}): string {
  const next = { ...f, page: 1, selected: undefined, ...changes };
  const p = new URLSearchParams();
  if (next.q) p.set("q", next.q);
  if (next.race) p.set("race", next.race);
  if (next.status) p.set("status", next.status);
  if (next.pickup) p.set("pickup", next.pickup);
  if (next.page > 1) p.set("page", String(next.page));
  if (next.selected) p.set("selected", next.selected);
  const s = p.toString();
  return s ? `?${s}` : "?";
}

export default function RegistrationsPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[28px] bg-white" aria-busy="true" />}>
      <Registrations params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Registrations({ params, searchParams }: Props) {
  const { orgId, eventId } = await params;
  const f = readFilters(await searchParams);
  const base = eventPath(orgId, eventId, "registrations");

  const listQuery = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((f.page - 1) * PAGE_SIZE) });
  if (f.q) listQuery.set("q", f.q);
  if (f.race) listQuery.set("raceId", f.race);
  if (f.status) listQuery.set("status", f.status);
  if (f.pickup) listQuery.set("pickup", f.pickup);

  const [org, event, list] = await Promise.all([
    membership(orgId),
    orgEvent(orgId, eventId),
    orgGet<RegistrationList>(orgId, `/events/${eventId}/registrations?${listQuery}`, base),
  ]);
  const showPii = can(org.role, "view_pii");

  const exportQuery = new URLSearchParams();
  if (f.q) exportQuery.set("q", f.q);
  if (f.race) exportQuery.set("raceId", f.race);
  if (f.status) exportQuery.set("status", f.status);
  if (f.pickup) exportQuery.set("pickup", f.pickup);
  const filtered = Boolean(f.q || f.race || f.status || f.pickup);

  const chips: { label: string; count: number; changes: Partial<Filters>; active: boolean }[] = [
    { label: "ทั้งหมด", count: list.counts.all, changes: { status: undefined, pickup: undefined }, active: !f.status && !f.pickup },
    { label: "ยืนยันแล้ว", count: list.counts.confirmed, changes: { status: "confirmed", pickup: undefined }, active: f.status === "confirmed" && !f.pickup },
    { label: "รอชำระ", count: list.counts.pending, changes: { status: "pending", pickup: undefined }, active: f.status === "pending" && !f.pickup },
    { label: "ยังไม่รับของ", count: list.counts.not_picked, changes: { status: undefined, pickup: "not_picked" }, active: f.pickup === "not_picked" },
  ];

  const from = list.total === 0 ? 0 : (f.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(f.page * PAGE_SIZE, list.total);
  const pages = Math.max(1, Math.ceil(list.total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title={
          <>
            ผู้สมัคร <span className="text-xl font-medium text-muted">{n(list.counts.all)} คน</span>
          </>
        }
        actions={
          showPii && (
            <a
              href={`${eventPath(orgId, eventId, "registrations/export")}${exportQuery.size ? `?${exportQuery}` : ""}`}
              className={`${smallButtonClass} no-underline`}
              download
            >
              Export CSV{filtered ? " (ตามตัวกรอง)" : ""}
            </a>
          )
        }
      />

      <Form action={base} className="flex flex-col gap-3 rounded-[28px] bg-white p-4 sm:p-5" role="search">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]">
          <label className="sm:col-span-2 xl:col-span-1">
            <span className="sr-only">ค้นหาผู้สมัคร</span>
            <input name="q" type="search" defaultValue={f.q} placeholder="ชื่อ บิบ อีเมล เบอร์ หรือเลข order" className={inputClass} />
          </label>
          <label>
            <span className="sr-only">ระยะ</span>
            <select name="race" defaultValue={f.race ?? ""} className={inputClass}>
              <option value="">ทุกระยะ</option>
              {event.races.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">สถานะ</span>
            <select name="status" defaultValue={f.status ?? ""} className={inputClass}>
              <option value="">ทุกสถานะ</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {REGISTRATION_STATUS[s].label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">การรับของ</span>
            <select name="pickup" defaultValue={f.pickup ?? ""} className={inputClass}>
              <option value="">รับของ: ทั้งหมด</option>
              <option value="picked">รับแล้ว</option>
              <option value="not_picked">ยังไม่รับ</option>
            </select>
          </label>
          <button type="submit" className={`${smallButtonClass} min-h-12 px-6`}>
            ค้นหา
          </button>
        </div>
        <nav aria-label="ตัวกรองด่วน" className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <Link
              key={c.label}
              href={`${base}${query(f, c.changes)}`}
              aria-current={c.active ? "true" : undefined}
              className={`rounded-full px-3.5 py-1.5 text-sm no-underline transition ${
                c.active ? "bg-brand font-semibold text-white" : "bg-tint text-ink hover:bg-ice"
              }`}
            >
              {c.label} <span className={c.active ? "text-white/80" : "text-muted"}>{n(c.count)}</span>
            </Link>
          ))}
          {filtered && (
            <Link href={base} className="px-2 py-1.5 text-sm text-muted">
              ล้างตัวกรอง
            </Link>
          )}
        </nav>
      </Form>

      <div className={`grid items-start gap-4 ${f.selected ? "xl:grid-cols-[minmax(0,1fr)_340px]" : ""}`}>
        {f.selected && (
          <div id="detail" className="scroll-mt-4 xl:order-last xl:sticky xl:top-4">
            <Suspense fallback={<div className="h-96 animate-pulse rounded-[28px] bg-white" aria-busy="true" />}>
              <DetailPanel orgId={orgId} registrationId={f.selected} showPii={showPii} closeHref={`${base}${query(f, { page: f.page })}`} />
            </Suspense>
          </div>
        )}

        <section aria-label="รายชื่อผู้สมัคร" className="flex min-w-0 flex-col gap-3">
          {list.items.length === 0 ? (
            <EmptyState>{filtered ? "ไม่พบผู้สมัครที่ตรงกับตัวกรอง" : "ยังไม่มีผู้สมัคร"}</EmptyState>
          ) : (
            <>
              <RunnerCards items={list.items} hrefFor={(id) => `${base}${query(f, { page: f.page, selected: id })}#detail`} selected={f.selected} />
              <RunnerTable items={list.items} hrefFor={(id) => `${base}${query(f, { page: f.page, selected: id })}#detail`} selected={f.selected} />
            </>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-muted">
            <span>
              แสดง {n(from)}–{n(to)} จาก {n(list.total)}
            </span>
            <span className="flex gap-2">
              {f.page > 1 ? (
                <Link href={`${base}${query(f, { page: f.page - 1 })}`} className={smallGhostButtonClass}>
                  ก่อนหน้า
                </Link>
              ) : (
                <span className={`${smallGhostButtonClass} opacity-50`} aria-disabled="true">
                  ก่อนหน้า
                </span>
              )}
              {f.page < pages ? (
                <Link href={`${base}${query(f, { page: f.page + 1 })}`} className={smallGhostButtonClass}>
                  ถัดไป
                </Link>
              ) : (
                <span className={`${smallGhostButtonClass} opacity-50`} aria-disabled="true">
                  ถัดไป
                </span>
              )}
            </span>
          </div>
        </section>
      </div>
    </>
  );
}

function displayName(r: OrgRegistration) {
  return r.name.th ?? r.name.en;
}

function Initial({ name }: { name: string }) {
  return (
    <span aria-hidden className="grid h-9 w-9 flex-none place-items-center rounded-full bg-ice font-semibold text-brand">
      {Array.from(name)[0]}
    </span>
  );
}

function StatusPill({ status }: { status: RegistrationStatus }) {
  const s = REGISTRATION_STATUS[status];
  return <Pill label={s.label} className={s.className} />;
}

type ListProps = { items: OrgRegistration[]; hrefFor: (id: string) => string; selected?: string };

/** Phones and tablets: one card per runner. */
function RunnerCards({ items, hrefFor, selected }: ListProps) {
  return (
    <ul className="flex flex-col gap-2 lg:hidden">
      {items.map((r) => (
        <li key={r.id}>
          <Link
            href={hrefFor(r.id)}
            aria-current={r.id === selected ? "true" : undefined}
            className={`flex items-center gap-3 rounded-[22px] bg-white p-3.5 text-ink no-underline ${r.id === selected ? "ring-2 ring-brand" : ""}`}
          >
            <Initial name={displayName(r)} />
            <span className="flex min-w-0 flex-1 flex-col">
              <b className="truncate font-semibold">{displayName(r)}</b>
              <span className="truncate text-[13px] text-muted">
                {r.race.code}
                {r.ageGroup && ` · ${r.ageGroup}`}
                {r.shirtSize && ` · เสื้อ ${r.shirtSize}`}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-1.5">
                <StatusPill status={r.status} />
                {r.kitPickedUpAt && <Pill label="รับของแล้ว" className="bg-ok-soft text-ok" />}
              </span>
            </span>
            <span className="flex-none text-right">
              <span className="block text-xs text-muted">บิบ</span>
              <b className="text-lg text-brand tabular-nums">{r.bibNumber ?? "–"}</b>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Desktop table; scrolls inside its card if the panel leaves it narrow. */
function RunnerTable({ items, hrefFor, selected }: ListProps) {
  return (
    <div className="hidden overflow-x-auto rounded-[28px] bg-white p-2 lg:block">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="text-left text-muted">
          <tr>
            <th className="px-3 py-3 font-normal">บิบ</th>
            <th className="px-3 py-3 font-normal">ผู้วิ่ง</th>
            <th className="px-3 py-3 font-normal">ระยะ</th>
            <th className="px-3 py-3 font-normal">รุ่น</th>
            <th className="px-3 py-3 font-normal">เสื้อ</th>
            <th className="px-3 py-3 font-normal">Order</th>
            <th className="px-3 py-3 font-normal">สถานะ</th>
            <th className="px-3 py-3 font-normal">รับของ</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} className={`border-t border-line ${r.id === selected ? "bg-ice" : "hover:bg-tint"}`}>
              <td className="px-3 py-2.5 font-semibold text-brand tabular-nums">{r.bibNumber ?? "–"}</td>
              <td className="px-3 py-2.5">
                <Link href={hrefFor(r.id)} className="flex items-center gap-2.5 text-ink no-underline" aria-current={r.id === selected ? "true" : undefined}>
                  <Initial name={displayName(r)} />
                  <span className="flex min-w-0 flex-col">
                    <b className="font-semibold hover:text-brand">{displayName(r)}</b>
                    <span className="text-xs text-muted">{r.email ?? r.phone ?? r.name.en}</span>
                  </span>
                </Link>
              </td>
              <td className="px-3 py-2.5">{r.race.code}</td>
              <td className="px-3 py-2.5 text-muted">{r.ageGroup ?? "–"}</td>
              <td className="px-3 py-2.5 font-semibold">{r.shirtSize ?? "–"}</td>
              <td className="px-3 py-2.5 text-xs text-muted">{r.orderNo ?? "–"}</td>
              <td className="px-3 py-2.5">
                <StatusPill status={r.status} />
              </td>
              <td className="px-3 py-2.5 text-xs">{r.kitPickedUpAt ? <span className="text-ok">{at(r.kitPickedUpAt)}</span> : <span className="text-muted">–</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TIMELINE: Record<RegistrationDetail["timeline"][number]["kind"], string> = {
  registered: "สมัคร",
  paid: "ชำระเงิน",
  kit_pickup: "รับเสื้อและบิบ",
  checkin_voided: "ยกเลิกการรับของ",
};

async function DetailPanel({ orgId, registrationId, showPii, closeHref }: { orgId: string; registrationId: string; showPii: boolean; closeHref: string }) {
  const res = await api<RegistrationDetail>(`/v1/org/${orgId}/registrations/${encodeURIComponent(registrationId)}`, { auth: true });
  if (!res.ok) {
    return (
      <Card>
        <p className="text-muted">ไม่พบผู้สมัครคนนี้</p>
        <Link href={closeHref} className="text-sm">
          ปิด
        </Link>
      </Card>
    );
  }
  const r = res.data;
  const rows: [string, React.ReactNode][] = [
    ["ระยะ", r.race.code],
    ["เสื้อ", r.shirtSize ?? "–"],
    [r.idDocType === "passport" ? "พาสปอร์ต" : "บัตรประชาชน", showPii ? <RevealId key={r.id} orgId={orgId} registrationId={r.id} masked={r.idDocMasked} /> : r.idDocMasked],
    ["วันเกิด", `${new Date(`${r.birthDate}T12:00:00+07:00`).toLocaleDateString("th-TH-u-ca-gregory", { day: "numeric", month: "short", year: "numeric" })} · ${r.age} ปี`],
    ["สัญชาติ", r.nationality],
    ["กรุ๊ปเลือด", r.bloodType && r.bloodType !== "unknown" ? r.bloodType : "ไม่ระบุ"],
    ["ฉุกเฉิน", [r.emergency.name, r.emergency.phone].filter(Boolean).join(" ") || "–"],
    ["ติดต่อ", [r.email, r.phone].filter(Boolean).join(" · ") || "–"],
    ["Order", r.order ? `${r.order.orderNo} · ${baht(r.order.totalSatang)}` : "–"],
    ["ผู้ซื้อ", r.order?.buyerName ?? "–"],
    ["รับของ", r.kitPickedUpAt ? <span className="font-semibold text-ok">{at(r.kitPickedUpAt)}</span> : "ยังไม่รับ"],
  ];
  return (
    <aside aria-label={`รายละเอียด ${displayName(r)}`} className="flex flex-col gap-4 rounded-[28px] bg-white p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid h-12 w-12 flex-none place-items-center rounded-full bg-sky text-lg font-bold text-ink">
          {Array.from(displayName(r))[0]}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <b className="text-lg leading-snug font-semibold">{displayName(r)}</b>
          <span className="text-[13px] text-muted">
            {r.name.en} · {GENDER[r.gender]}
            {r.ageGroup && ` · ${r.ageGroup}`}
          </span>
          <span className="mt-1">
            <StatusPill status={r.status} />
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          {r.bibNumber && <b className="rounded-2xl bg-ice px-3 py-1 text-xl text-brand tabular-nums">{r.bibNumber}</b>}
          <Link href={closeHref} className="text-sm text-muted" aria-label="ปิดรายละเอียด" scroll={false}>
            ปิด ✕
          </Link>
        </div>
      </div>

      <dl className="flex flex-col gap-2.5 rounded-[20px] bg-tint p-4 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[96px_minmax(0,1fr)] gap-2">
            <dt className="text-muted">{label}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>
      {showPii && <p className="text-[13px] text-muted">กด “แสดง” เลขบัตรแล้ว ระบบจะบันทึกชื่อคุณไว้ในประวัติการเข้าถึง</p>}

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold">ประวัติ</h3>
        <ol className="flex flex-col gap-2.5">
          {r.timeline.map((t, i) => (
            <li key={i} className="flex gap-2.5 text-sm">
              <span aria-hidden className={`mt-1.5 h-2 w-2 flex-none rounded-full ${t.kind === "kit_pickup" ? "bg-ok" : t.kind === "paid" ? "bg-brand" : "bg-sky"}`} />
              <span className="flex flex-col">
                <span>
                  {TIMELINE[t.kind]}
                  {t.kind === "paid" && t.detail ? ` ${baht(Number(t.detail))}` : t.detail ? ` · ${t.detail}` : ""}
                </span>
                <span className="text-xs text-muted">{at(t.at)}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
