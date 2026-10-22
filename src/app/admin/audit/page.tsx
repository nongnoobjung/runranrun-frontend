import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, Field, PageHeader, smallButtonClass, smallGhostButtonClass } from "@/components/backoffice";
import { inputClass } from "@/components/ui";
import { adminGet, AUDIT_ACTION, type AdminOrgSummary, type AuditItem } from "@/lib/admin";

export const metadata: Metadata = { title: "บันทึกการทำงาน" };

type Props = PageProps<"/admin/audit">;

const FILTERS = ["organizationId", "eventId", "entityId", "actor", "action", "from", "to"] as const;

const ACTION_GROUPS: [string, string][] = [
  ["admin.", "แอดมินแพลตฟอร์ม"],
  ["admin.platform_fee", "ค่าธรรมเนียมแพลตฟอร์ม"],
  ["admin.user", "บัญชีผู้ใช้"],
  ["admin.settlement", "รอบจ่ายเงิน"],
  ["event.", "งาน"],
  ["kyc.", "KYC"],
  ["refund.", "คืนเงิน"],
  ["registration", "ผู้สมัคร"],
  ["member.", "ทีมงานผู้จัด"],
];

const at = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Asia/Bangkok",
});

export default function AuditPage({ searchParams }: Props) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="บันทึกการทำงาน" />
          <div className="h-48 animate-pulse rounded-[28px] bg-white" aria-busy="true" />
        </>
      }
    >
      <Audit searchParams={searchParams} />
    </Suspense>
  );
}

async function Audit({ searchParams }: Pick<Props, "searchParams">) {
  const sp = await searchParams;
  const value = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const filters = new URLSearchParams();
  for (const k of FILTERS) if (value(k)) filters.set(k, value(k));
  const query = new URLSearchParams(filters);
  if (/^\d+$/.test(value("before"))) query.set("before", value("before"));
  const here = `/admin/audit${filters.size ? `?${filters}` : ""}`;

  const [{ items, nextBefore }, orgs] = await Promise.all([
    adminGet<{ items: AuditItem[]; nextBefore: number | null }>(`/audit?${query}`, here),
    adminGet<{ items: AdminOrgSummary[] }>("/organizations?status=all", here),
  ]);
  const without = (k: string) => {
    const q = new URLSearchParams(filters);
    q.delete(k);
    return `/admin/audit${q.size ? `?${q}` : ""}`;
  };
  // Filters only reached from a link (an event page, a user page) show as chips that can be removed.
  const chips = [
    value("eventId") && {
      key: "eventId",
      label: `งาน: ${items.find((i) => i.event?.id === value("eventId"))?.event?.nameTh ?? "งานที่เลือก"}`,
    },
    value("entityId") && { key: "entityId", label: "เฉพาะรายการที่เลือก" },
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <>
      <PageHeader title="บันทึกการทำงาน" eyebrow="ทุกการเปลี่ยนแปลงสำคัญของผู้จัดและแอดมิน" />
      <form action="/admin/audit" className="flex flex-col gap-3 rounded-[28px] bg-white p-5" aria-label="กรองบันทึก">
        {value("eventId") && <input type="hidden" name="eventId" value={value("eventId")} />}
        {value("entityId") && <input type="hidden" name="entityId" value={value("entityId")} />}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="ผู้จัด">
            <select name="organizationId" defaultValue={value("organizationId")} className={`${inputClass} min-h-10`}>
              <option value="">ทุกผู้จัด</option>
              {orgs.items.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nameTh}
                </option>
              ))}
            </select>
          </Field>
          <Field label="อีเมลผู้ทำ">
            <input name="actor" defaultValue={value("actor")} placeholder="บางส่วนของอีเมล" className={`${inputClass} min-h-10`} />
          </Field>
          <Field label="การกระทำ (ขึ้นต้นด้วย)">
            <input name="action" list="audit-actions" defaultValue={value("action")} placeholder="เช่น admin." className={`${inputClass} min-h-10`} />
            <datalist id="audit-actions">
              {ACTION_GROUPS.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </datalist>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ตั้งแต่วันที่">
              <input name="from" type="date" defaultValue={value("from")} className={`${inputClass} min-h-10 px-2`} />
            </Field>
            <Field label="ถึงวันที่">
              <input name="to" type="date" defaultValue={value("to")} className={`${inputClass} min-h-10 px-2`} />
            </Field>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className={smallButtonClass}>
            กรอง
          </button>
          {filters.size > 0 && (
            <Link href="/admin/audit" className={smallGhostButtonClass}>
              ล้างตัวกรอง
            </Link>
          )}
          {chips.map((c) => (
            <Link
              key={c.key}
              href={without(c.key)}
              className="inline-flex min-h-10 items-center gap-1 rounded-full bg-ice px-3 text-sm text-brand no-underline"
            >
              {c.label} <span aria-label="เอาตัวกรองออก">×</span>
            </Link>
          ))}
        </div>
      </form>

      {items.length === 0 ? (
        <EmptyState>ไม่พบบันทึกตามตัวกรองนี้</EmptyState>
      ) : (
        <ul aria-label="บันทึกการทำงาน" className="flex flex-col gap-2">
          {items.map((i) => (
            <li key={i.id}>
              <Link
                href={`/admin/audit/${i.id}`}
                className="flex flex-col gap-0.5 rounded-[20px] bg-white px-4 py-3 text-ink no-underline hover:ring-2 hover:ring-brand"
              >
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <b className="font-semibold">{AUDIT_ACTION[i.action] ?? i.action}</b>
                  <code className="text-xs text-muted">{i.action}</code>
                </span>
                <span className="text-[13px] break-words text-muted">
                  {at.format(new Date(i.createdAt))} · {i.actor ? (i.actor.email ?? i.actor.id) : "ระบบ"}
                  {i.organization && ` · ${i.organization.nameTh}`}
                  {i.event && ` · ${i.event.nameTh}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {(value("before") || nextBefore) && (
        <nav aria-label="หน้า" className="flex flex-wrap gap-2">
          {value("before") && (
            <Link href={here} className={smallGhostButtonClass}>
              ← ล่าสุด
            </Link>
          )}
          {nextBefore && (
            <Link href={`/admin/audit?${new URLSearchParams([...filters, ["before", String(nextBefore)]])}`} className={smallGhostButtonClass}>
              เก่ากว่า →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
