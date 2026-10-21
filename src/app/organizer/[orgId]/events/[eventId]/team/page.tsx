import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, PageHeader, Pill } from "@/components/backoffice";
import { can, eventPath, membership, orgGet, ROLE_LABEL, type OrgMember, type OrgPermission, type OrgRole } from "@/lib/org";
import { InviteForm, MemberControls, type RoleOption } from "./team-forms";

export const metadata: Metadata = { title: "ทีมงาน" };

type Props = PageProps<"/organizer/[orgId]/events/[eventId]/team">;

const ROLES: OrgRole[] = ["owner", "admin", "finance", "staff", "viewer"];
const ROLE_OPTIONS: RoleOption[] = ROLES.map((value) => ({ value, label: ROLE_LABEL[value] }));

/** What the backoffice lets each role do today, read from the same table that hides buttons. */
const ABILITIES: [string, OrgPermission][] = [
  ["ดูภาพรวมและรายชื่อผู้สมัคร", "view"],
  ["แก้ข้อมูลงาน ระยะ ราคา เสื้อ และคูปอง", "manage_event"],
  ["เปิด / ปิดรับสมัคร", "manage_event"],
  ["ดูเลขบัตรเต็มและ Export CSV", "view_pii"],
  ["รับของหน้างาน", "checkin"],
  ["เชิญ เปลี่ยนบทบาท และนำสมาชิกออก", "manage_team"],
];

export default function TeamPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[28px] bg-white" aria-busy="true" />}>
      <Team params={params} />
    </Suspense>
  );
}

const when = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Bangkok",
});

function lastSeen(m: OrgMember): string {
  if (m.status === "invited") return "รอตอบรับคำเชิญ";
  return m.lastLoginAt ? `เข้าระบบล่าสุด ${when.format(new Date(m.lastLoginAt))}` : "เข้าทีมแล้ว";
}

async function Team({ params }: Pick<Props, "params">) {
  const { orgId, eventId } = await params;
  const [org, { items }] = await Promise.all([
    membership(orgId),
    orgGet<{ items: OrgMember[] }>(orgId, "/members", eventPath(orgId, eventId, "team")),
  ]);
  const canManage = can(org.role, "manage_team");
  const active = items.filter((m) => m.status === "active").length;

  return (
    <>
      <PageHeader
        eyebrow={`องค์กร ${org.nameTh} · ใช้กับทุกงานขององค์กร`}
        title={
          <>
            ทีมงาน <span className="text-xl font-medium text-muted">{active.toLocaleString("th-TH")} คน</span>
          </>
        }
      />

      <div className="flex flex-wrap items-start gap-4">
        <Card title="สมาชิก" className="min-w-0 flex-[999_1_520px]">
          <ul className="-mx-1 flex flex-col" aria-label="สมาชิกในทีม">
            {items.map((m) => (
              <li key={m.id} className="flex flex-col gap-3 border-t border-line px-1 py-3 first:border-t-0 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`grid h-10 w-10 flex-none place-items-center rounded-full font-semibold ${
                      m.status === "invited" ? "bg-tint text-muted" : m.role === "owner" ? "bg-sky text-ink" : "bg-ice text-brand"
                    }`}
                  >
                    {initial(m)}
                  </span>
                  <div className="flex min-w-0 flex-col leading-snug">
                    <span className="flex flex-wrap items-center gap-x-2">
                      <b className="font-semibold">{m.name ?? m.email.split("@")[0]}</b>
                      {m.you && <span className="text-xs text-muted">(คุณ)</span>}
                    </span>
                    <span className="text-[13px] break-all text-muted">{m.email}</span>
                    <span className="text-xs text-muted">{lastSeen(m)}</span>
                  </div>
                </div>
                {canManage ? (
                  <MemberControls orgId={orgId} member={m} roles={ROLE_OPTIONS} />
                ) : (
                  <Pill label={ROLE_LABEL[m.role]} className="self-start bg-ice text-brand sm:self-center" />
                )}
              </li>
            ))}
          </ul>
        </Card>

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          {canManage ? (
            <Card title="เชิญสมาชิก">
              <InviteForm orgId={orgId} roles={ROLE_OPTIONS} />
              <p className="text-[13px] text-muted">
                ยังไม่มีอีเมลเชิญ แจ้งให้คนที่เชิญเข้าสู่ระบบด้วยอีเมลนั้น แล้วเปิดหน้าผู้จัดงาน ระบบจะพาเข้าทีมให้เอง
              </p>
            </Card>
          ) : (
            <Card title="เชิญสมาชิก">
              <p className="text-sm text-muted">เฉพาะ{ROLE_LABEL.owner}ที่เชิญหรือเปลี่ยนบทบาทสมาชิกได้</p>
            </Card>
          )}
          <p className="rounded-3xl bg-warn-soft px-5 py-4 text-sm leading-relaxed text-warn">
            ทีมต้องมี{ROLE_LABEL.owner}อย่างน้อยหนึ่งคนเสมอ ทุกการเชิญ เปลี่ยนบทบาท และนำออก ถูกบันทึกในประวัติการใช้งาน
          </p>
        </aside>
      </div>

      <Card title="สิทธิ์ของแต่ละบทบาท">
        <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
          <table className="w-full min-w-[600px] border-collapse text-sm">
            <thead>
              <tr className="text-[13px] text-muted">
                <th className="py-2 pr-2 text-left font-medium">การกระทำ</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-2 py-2 font-medium">
                    {ROLE_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ABILITIES.map(([label, permission]) => (
                <tr key={label} className="border-t border-line text-center">
                  <td className="py-2.5 pr-2 text-left">{label}</td>
                  {ROLES.map((r) =>
                    can(r, permission) ? (
                      <td key={r} className="px-2 py-2.5 font-bold text-ok">
                        <span aria-label="ทำได้">✓</span>
                      </td>
                    ) : (
                      <td key={r} className="px-2 py-2.5 text-muted">
                        <span aria-label="ทำไม่ได้">–</span>
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[13px] text-muted">
          บทบาท{ROLE_LABEL.finance}จะใช้กับหน้าการเงินซึ่งยังไม่เปิด ตอนนี้ทำได้เท่ากับ{ROLE_LABEL.viewer}
        </p>
      </Card>
    </>
  );
}

function initial(m: OrgMember): string {
  return (Array.from(m.name ?? m.email)[0] ?? "?").toUpperCase();
}
