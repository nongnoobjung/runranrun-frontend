import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, dangerButtonClass, PageHeader, Pill, smallGhostButtonClass } from "@/components/backoffice";
import { approveOrg, reactivateOrg, setBankAccount, setReviewEvents, suspendOrg } from "@/app/admin/actions";
import { adminGet, adminMe, ORG_STATUS, type AdminOrg } from "@/lib/admin";
import { fmt } from "@/lib/format";
import { EVENT_STATUS, type EventStatus } from "@/lib/org";
import { BANKS } from "@/lib/types";
import { ActionButton, TextActionForm } from "../../action-button";
import { BankForm } from "./bank-form";

export const metadata: Metadata = { title: "ผู้จัดงาน" };

type Props = PageProps<"/admin/organizations/[orgId]">;

const at = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });

const DOC_TYPE: Record<string, string> = {
  company_certificate: "หนังสือรับรองบริษัท",
  vat_registration: "ภ.พ.20",
  id_card: "บัตรประชาชนผู้มีอำนาจ",
  bank_book: "หน้าสมุดบัญชี",
  other: "อื่น ๆ",
};

const ROLE: Record<string, string> = { owner: "เจ้าของ", admin: "แอดมิน", finance: "การเงิน", staff: "หน้างาน", viewer: "ดูอย่างเดียว" };

export default function OrganizationPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[28px] bg-white" aria-busy="true" />}>
      <Organization params={params} />
    </Suspense>
  );
}

async function Organization({ params }: Pick<Props, "params">) {
  const { orgId } = await params;
  const [me, o] = await Promise.all([adminMe(), adminGet<AdminOrg>(`/organizations/${orgId}`, `/admin/organizations/${orgId}`)]);
  const manage = me.can.manage_orgs;
  const status = ORG_STATUS[o.status];
  const info: [string, React.ReactNode][] = [
    ["ชื่อนิติบุคคล", o.legalName ?? "–"],
    ["เลขผู้เสียภาษี", o.taxId ?? "–"],
    ["อีเมล", o.contactEmail ?? "–"],
    ["โทร", o.contactPhone ?? "–"],
    ["เว็บไซต์", o.websiteUrl ?? "–"],
    ["สมัครเมื่อ", at.format(new Date(o.createdAt))],
    ["KYC", o.kycApprovedAt ? `ผ่านเมื่อ ${at.format(new Date(o.kycApprovedAt))}${o.kycApprovedBy ? ` โดย ${o.kycApprovedBy}` : ""}` : "ยังไม่ผ่าน"],
  ];

  return (
    <>
      <Link href="/admin/organizations" className="self-start text-sm font-semibold">
        ← ผู้จัดงาน
      </Link>
      <PageHeader title={o.nameTh} eyebrow={<Pill label={status.label} className={status.className} />} />
      {o.statusNote && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">เหตุผลที่ระงับ: {o.statusNote}</p>}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4">
          <Card title="ข้อมูลผู้จัด">
            <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              {info.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd className="break-words">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card title="เอกสาร KYC">
            {o.documents.length === 0 ? (
              <p className="text-sm text-muted">ยังไม่มีเอกสารแนบในระบบ ขอเอกสารทางอีเมลแล้วตรวจก่อนอนุมัติ</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {o.documents.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-2">
                    <a href={d.fileUrl} target="_blank" rel="noreferrer">
                      {DOC_TYPE[d.type] ?? d.type}
                    </a>
                    <span className="text-muted">{d.status === "approved" ? "ตรวจแล้ว" : d.status === "rejected" ? `ไม่ผ่าน: ${d.rejectReason ?? ""}` : "รอตรวจ"}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="บัญชีรับเงิน">
            {o.bankAccount ? (
              <p className="text-sm">
                {BANKS[o.bankAccount.bankCode as keyof typeof BANKS] ?? o.bankAccount.bankCode} ••••{o.bankAccount.accountLast4} · {o.bankAccount.accountName}
                {o.bankAccount.branch && ` · สาขา${o.bankAccount.branch}`} · {o.bankAccount.verified ? <span className="text-ok">ตรวจแล้ว</span> : "ยังไม่ตรวจ"}
              </p>
            ) : (
              <p className="text-sm text-muted">ยังไม่มีบัญชีรับเงิน จ่ายเงินผู้จัดไม่ได้จนกว่าจะบันทึก</p>
            )}
            {manage && <BankForm action={setBankAccount.bind(null, o.id)} banks={Object.entries(BANKS)} />}
          </Card>

          <Card title="ทีมงาน">
            <ul className="flex flex-col gap-1.5 text-sm">
              {o.members.map((m) => (
                <li key={m.email} className="flex flex-wrap gap-2">
                  <span className="break-all">{m.email}</span>
                  <span className="text-muted">
                    {ROLE[m.role] ?? m.role}
                    {!m.accepted && " · ยังไม่ตอบรับ"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="งาน">
            {o.events.length === 0 ? (
              <p className="text-sm text-muted">ยังไม่มีงาน</p>
            ) : (
              <ul className="flex flex-col gap-1.5 text-sm">
                {o.events.map((e) => {
                  const s = EVENT_STATUS[e.status as EventStatus];
                  return (
                    <li key={e.id} className="flex flex-wrap items-center gap-2">
                      {e.status === "pending_review" ? <Link href={`/admin/reviews/${e.id}`}>{e.nameTh}</Link> : <span>{e.nameTh}</span>}
                      <span className="text-muted">{fmt.date(e.eventDate)}</span>
                      {s && <Pill label={s.label} className={s.className} />}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-4">
          {manage ? (
            <Card title="จัดการ">
              {o.status === "pending_kyc" && <ActionButton action={approveOrg.bind(null, o.id)} label="อนุมัติ KYC" pendingLabel="กำลังอนุมัติ…" />}
              {o.status === "suspended" ? (
                <ActionButton action={reactivateOrg.bind(null, o.id)} label="ยกเลิกการระงับ" className={smallGhostButtonClass} />
              ) : (
                <TextActionForm
                  action={suspendOrg.bind(null, o.id)}
                  name="reason"
                  label="ระงับผู้จัด (เปิดงานใหม่ไม่ได้ งานที่เปิดอยู่ยังเปิด)"
                  placeholder="เหตุผล ผู้จัดเห็นข้อความนี้"
                  submitLabel="ระงับ"
                  className={dangerButtonClass}
                />
              )}
              <div className="flex flex-col gap-2 border-t border-line pt-3 text-sm">
                <span>{o.reviewEvents ? "งานใหม่ต้องรอแอดมินตรวจก่อนเปิดรับสมัคร" : "เปิดรับสมัครได้เองโดยไม่ต้องรอตรวจ"}</span>
                <ActionButton
                  action={setReviewEvents.bind(null, o.id, !o.reviewEvents)}
                  label={o.reviewEvents ? "ให้เปิดงานเองได้" : "ให้รอตรวจก่อนเปิด"}
                  className={smallGhostButtonClass}
                />
              </div>
            </Card>
          ) : (
            <p className="rounded-[24px] bg-white p-5 text-sm text-muted">สิทธิ์ของคุณดูได้อย่างเดียว</p>
          )}
        </div>
      </div>
    </>
  );
}
