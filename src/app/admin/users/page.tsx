import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, Field, PageHeader, Pill, smallButtonClass } from "@/components/backoffice";
import { inputClass } from "@/components/ui";
import { adminGet, PLATFORM_ROLE, USER_STATUS, type AdminUserSummary } from "@/lib/admin";

export const metadata: Metadata = { title: "ผู้ใช้" };

type Props = PageProps<"/admin/users">;

const STATUSES: [string, string][] = [
  ["all", "ทุกสถานะ"],
  ["active", "ใช้งานได้"],
  ["suspended", "ระงับ"],
  ["deleted", "ปิดบัญชีแล้ว"],
];
const ROLES: [string, string][] = [
  ["all", "ทุกสิทธิ์"],
  ["staff", "ทีมงานแพลตฟอร์ม"],
  ["user", "ผู้ใช้ทั่วไป"],
];

const at = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Bangkok",
});

export default function UsersPage({ searchParams }: Props) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="ผู้ใช้" />
          <div className="h-48 animate-pulse rounded-[28px] bg-white" aria-busy="true" />
        </>
      }
    >
      <Users searchParams={searchParams} />
    </Suspense>
  );
}

async function Users({ searchParams }: Pick<Props, "searchParams">) {
  const sp = await searchParams;
  const value = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const q = value("q");
  const status = STATUSES.some(([s]) => s === value("status")) ? value("status") : "all";
  const role = ROLES.some(([r]) => r === value("role")) ? value("role") : "all";
  const query = new URLSearchParams({ status, role, ...(q ? { q } : {}) });
  const { items } = await adminGet<{ items: AdminUserSummary[] }>(`/users?${query}`, `/admin/users?${query}`);

  return (
    <>
      <PageHeader title="ผู้ใช้" eyebrow="ค้นหาด้วยอีเมลหรือชื่อ" />
      <form action="/admin/users" role="search" className="flex flex-col gap-3 rounded-[28px] bg-white p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="อีเมลหรือชื่อ">
            <input name="q" type="search" defaultValue={q} placeholder="เช่น somchai@" className={`${inputClass} min-h-10`} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="สถานะ">
              <select name="status" defaultValue={status} className={`${inputClass} min-h-10`}>
                {STATUSES.map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="สิทธิ์">
              <select name="role" defaultValue={role} className={`${inputClass} min-h-10`}>
                {ROLES.map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
        <div>
          <button type="submit" className={smallButtonClass}>
            ค้นหา
          </button>
        </div>
      </form>
      {items.length === 0 ? (
        <EmptyState>ไม่พบผู้ใช้</EmptyState>
      ) : (
        <>
          <ul aria-label="รายชื่อผู้ใช้" className="flex flex-col gap-2">
            {items.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/admin/users/${u.id}`}
                  className="flex flex-wrap items-center gap-3 rounded-[20px] bg-white px-4 py-3 text-ink no-underline hover:ring-2 hover:ring-brand"
                >
                  <span className="flex min-w-0 flex-1 basis-56 flex-col leading-snug">
                    <b className="font-semibold break-all">{u.email ?? "–"}</b>
                    <span className="text-[13px] text-muted">
                      {u.displayName ? `${u.displayName} · ` : ""}
                      {PLATFORM_ROLE[u.platformRole]} · เข้าระบบล่าสุด {u.lastLoginAt ? at.format(new Date(u.lastLoginAt)) : "–"}
                    </span>
                  </span>
                  <Pill label={USER_STATUS[u.status].label} className={USER_STATUS[u.status].className} />
                </Link>
              </li>
            ))}
          </ul>
          {items.length === 50 && <p className="text-[13px] text-muted">แสดง 50 คนแรก พิมพ์ให้เจาะจงขึ้นเพื่อหาคนที่ต้องการ</p>}
        </>
      )}
    </>
  );
}
