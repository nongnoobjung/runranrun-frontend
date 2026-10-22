import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, PageHeader } from "@/components/backoffice";
import { adminGet, AUDIT_ACTION, type AuditEntry } from "@/lib/admin";

export const metadata: Metadata = { title: "บันทึกการทำงาน" };

type Props = PageProps<"/admin/audit/[id]">;

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

export default function AuditEntryPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[28px] bg-white" aria-busy="true" />}>
      <Entry params={params} />
    </Suspense>
  );
}

/** The data as the API stored it, with secrets and full ID numbers already masked by the API. */
function Json({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <p className="text-sm text-muted">ไม่มีข้อมูล</p>;
  return <pre className="rounded-2xl bg-tint p-4 text-[13px] leading-relaxed break-all whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>;
}

async function Entry({ params }: Pick<Props, "params">) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const e = await adminGet<AuditEntry>(`/audit/${id}`, `/audit/${id}`);
  const info: [string, React.ReactNode][] = [
    ["เวลา", at.format(new Date(e.createdAt))],
    ["ผู้ทำ", e.actor ? <Link href={`/users/${e.actor.id}`}>{e.actor.email ?? e.actor.id}</Link> : "ระบบ"],
    ["ผู้จัด", e.organization ? <Link href={`/organizations/${e.organization.id}`}>{e.organization.nameTh}</Link> : "–"],
    ["งาน", e.event ? <Link href={`/audit?eventId=${e.event.id}`}>{e.event.nameTh}</Link> : "–"],
    ["รายการ", `${e.entityType}${e.entityId ? ` · ${e.entityId}` : ""}`],
    ["รหัสคำขอ", e.requestId ?? "–"],
  ];
  return (
    <>
      <Link href="/audit" className="self-start text-sm font-semibold">
        ← บันทึกการทำงาน
      </Link>
      <PageHeader title={AUDIT_ACTION[e.action] ?? e.action} eyebrow={<code>{e.action}</code>} />
      <Card title="รายละเอียด">
        <dl className="grid grid-cols-[90px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
          {info.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="break-words">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card title="ก่อน">
          <Json value={e.before} />
        </Card>
        <Card title="หลัง">
          <Json value={e.after} />
        </Card>
      </div>
      <p className="text-[13px] text-muted">ข้อมูลลับ (token รหัสผ่าน) ถูกซ่อน และเลขบัตร เลขผู้เสียภาษี เลขบัญชี หรือเบอร์โทรแสดงเฉพาะ 4 ตัวท้าย</p>
    </>
  );
}
