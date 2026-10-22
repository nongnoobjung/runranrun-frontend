import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, dangerButtonClass, PageHeader, Pill, smallGhostButtonClass } from "@/components/backoffice";
import { reactivateUser, setUserRole, suspendUser } from "@/app/admin/actions";
import { adminGet, adminMe, PLATFORM_ROLE, USER_STATUS, type AdminUser } from "@/lib/admin";
import { baht } from "@/lib/format";
import { ActionButton, TextActionForm } from "../../action-button";
import { RoleForm } from "./role-form";

export const metadata: Metadata = { title: "ผู้ใช้" };

type Props = PageProps<"/admin/users/[userId]">;

const at = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Bangkok",
});

const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  pending_payment: { label: "รอชำระ", className: "bg-warn-soft text-warn" },
  paid: { label: "สำเร็จ", className: "bg-ok-soft text-ok" },
  partially_refunded: { label: "คืนบางส่วน", className: "bg-bad-soft text-bad" },
  refunded: { label: "คืนเงิน", className: "bg-bad-soft text-bad" },
  expired: { label: "หมดเวลา", className: "bg-ice text-muted" },
  cancelled: { label: "ยกเลิก", className: "bg-ice text-muted" },
};

const TEAM_ROLE: Record<string, string> = { owner: "เจ้าของ", admin: "แอดมิน", finance: "การเงิน", staff: "หน้างาน", viewer: "ดูอย่างเดียว" };

export default function UserPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[28px] bg-white" aria-busy="true" />}>
      <User params={params} />
    </Suspense>
  );
}

async function User({ params }: Pick<Props, "params">) {
  const { userId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(userId)) notFound();
  const [me, u] = await Promise.all([adminMe(), adminGet<AdminUser>(`/users/${userId}`, `/users/${userId}`)]);
  const status = USER_STATUS[u.status];
  // Platform staff accounts are suspended by a superadmin only; nobody changes their own account.
  const canSuspend = me.can.manage_users && !u.self && u.status !== "deleted" && (u.platformRole === "user" || me.role === "superadmin");
  const canSetRole = me.can.manage_roles && !u.self && u.status !== "deleted";
  const info: [string, React.ReactNode][] = [
    ["อีเมล", u.email ?? "–"],
    ["ชื่อ", u.displayName ?? "–"],
    ["สิทธิ์", PLATFORM_ROLE[u.platformRole]],
    ["เข้าระบบล่าสุด", u.lastLoginAt ? at.format(new Date(u.lastLoginAt)) : "–"],
    ["สมัครเมื่อ", at.format(new Date(u.createdAt))],
    ["สิทธิ์วิ่ง", `${u.registrations.active.toLocaleString("th-TH")} ที่ยืนยันแล้ว จากทั้งหมด ${u.registrations.total.toLocaleString("th-TH")}`],
    ["คำสั่งซื้อ", u.orderCount.toLocaleString("th-TH")],
  ];

  return (
    <>
      <Link href="/users" className="self-start text-sm font-semibold">
        ← ผู้ใช้
      </Link>
      <PageHeader
        title={<span className="break-all">{u.email ?? u.id}</span>}
        eyebrow={<Pill label={status.label} className={status.className} />}
        actions={
          <>
            <Link href={`/audit?entityId=${u.id}`} className={smallGhostButtonClass}>
              บันทึกเกี่ยวกับบัญชีนี้
            </Link>
            {u.email && (
              <Link href={`/audit?actor=${encodeURIComponent(u.email)}`} className={smallGhostButtonClass}>
                สิ่งที่บัญชีนี้ทำ
              </Link>
            )}
          </>
        }
      />
      {u.status === "suspended" && u.statusNote && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">เหตุผลที่ระงับ: {u.statusNote}</p>}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card title="ข้อมูลบัญชี">
            <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              {info.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd className="break-words">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card title="คำสั่งซื้อล่าสุด">
            {u.orders.length === 0 ? (
              <p className="text-sm text-muted">ยังไม่มีคำสั่งซื้อ</p>
            ) : (
              <ul aria-label="คำสั่งซื้อ" className="flex flex-col divide-y divide-line text-sm">
                {u.orders.map((o) => {
                  const s = ORDER_STATUS[o.status] ?? { label: o.status, className: "bg-ice text-muted" };
                  return (
                    <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                      <span className="flex min-w-0 flex-1 basis-56 flex-col leading-snug">
                        <b className="font-semibold tabular-nums">{o.orderNo}</b>
                        <span className="text-[13px] break-words text-muted">
                          {o.event.nameTh} · {o.registrations} ผู้วิ่ง · {baht(o.totalSatang)} · {at.format(new Date(o.createdAt))}
                        </span>
                      </span>
                      <Pill label={s.label} className={s.className} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="ทีมผู้จัด">
            {u.teams.length === 0 ? (
              <p className="text-sm text-muted">ไม่ได้อยู่ในทีมผู้จัด</p>
            ) : (
              <ul className="flex flex-col gap-1.5 text-sm">
                {u.teams.map((t) => (
                  <li key={t.id} className="flex flex-wrap gap-2">
                    <Link href={`/organizations/${t.id}`}>{t.nameTh}</Link>
                    <span className="text-muted">
                      {TEAM_ROLE[t.role] ?? t.role}
                      {!t.accepted && " · ยังไม่ตอบรับ"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-4">
          {u.self ? (
            <p className="rounded-[24px] bg-white p-5 text-sm text-muted">นี่คือบัญชีของคุณ ให้แอดมินคนอื่นเปลี่ยนสถานะหรือสิทธิ์</p>
          ) : canSuspend || canSetRole ? (
            <Card title="จัดการ">
              {canSuspend &&
                (u.status === "suspended" ? (
                  <ActionButton action={reactivateUser.bind(null, u.id)} label="ยกเลิกการระงับ" className={smallGhostButtonClass} />
                ) : (
                  <TextActionForm
                    action={suspendUser.bind(null, u.id)}
                    name="reason"
                    label="ระงับบัญชี (ออกจากระบบทันที เข้าใหม่ไม่ได้)"
                    placeholder="เหตุผล"
                    submitLabel="ระงับบัญชี"
                    className={dangerButtonClass}
                  />
                ))}
              {canSetRole && (
                <div className={canSuspend ? "border-t border-line pt-3" : ""}>
                  <RoleForm action={setUserRole.bind(null, u.id)} role={u.platformRole} roles={Object.entries(PLATFORM_ROLE)} />
                </div>
              )}
            </Card>
          ) : (
            <p className="rounded-[24px] bg-white p-5 text-sm text-muted">สิทธิ์ของคุณดูได้อย่างเดียว</p>
          )}
        </div>
      </div>
    </>
  );
}
