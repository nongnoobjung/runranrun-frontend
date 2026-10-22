import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, dangerButtonClass, PageHeader, Pill, smallGhostButtonClass } from "@/components/backoffice";
import { approveDocument, approveOrg, clearOrgFee, reactivateOrg, rejectDocument, setBankAccount, setOrgFee, setReviewEvents, suspendOrg, verifyBankAccount } from "@/app/admin/actions";
import { adminGet, adminMe, feeLabel, ORG_STATUS, type AdminOrg } from "@/lib/admin";
import { fmt } from "@/lib/format";
import { EVENT_STATUS, fileSize, KYC_DOC_STATUS, KYC_DOC_TYPE, type EventStatus } from "@/lib/org";
import { BANKS } from "@/lib/types";
import { ActionButton, TextActionForm } from "../../action-button";
import { FeeForm } from "../../fee-form";
import { FeeHistory } from "../../fee-history";
import { BankForm } from "./bank-form";

export const metadata: Metadata = { title: "ผู้จัดงาน" };

type Props = PageProps<"/admin/organizations/[orgId]">;

const at = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });

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
  const [me, o] = await Promise.all([adminMe(), adminGet<AdminOrg>(`/organizations/${orgId}`, `/organizations/${orgId}`)]);
  const manage = me.can.manage_orgs;
  const fee = o.platformFee;
  const status = ORG_STATUS[o.status];
  const info: [string, React.ReactNode][] = [
    ["ชื่อนิติบุคคล", o.legalName ?? "–"],
    ["เลขผู้เสียภาษี", o.taxId ? `${o.taxId}${o.isVatRegistered ? " · จด VAT" : ""}` : "–"],
    ["ที่อยู่", o.address ? [o.address.line1, o.address.subdistrict, o.address.district, o.address.province, o.address.postcode].filter(Boolean).join(" ") : "–"],
    ["อีเมล", o.contactEmail ?? "–"],
    ["โทร", o.contactPhone ?? "–"],
    ["เว็บไซต์", o.websiteUrl ?? "–"],
    ["สมัครเมื่อ", at.format(new Date(o.createdAt))],
    ["KYC", o.kycApprovedAt ? `ผ่านเมื่อ ${at.format(new Date(o.kycApprovedAt))}${o.kycApprovedBy ? ` โดย ${o.kycApprovedBy}` : ""}` : "ยังไม่ผ่าน"],
  ];

  return (
    <>
      <Link href="/organizations" className="self-start text-sm font-semibold">
        ← ผู้จัดงาน
      </Link>
      <PageHeader
        title={o.nameTh}
        eyebrow={<Pill label={status.label} className={status.className} />}
        actions={
          <Link href={`/audit?organizationId=${o.id}`} className={smallGhostButtonClass}>
            ดูบันทึกการทำงาน
          </Link>
        }
      />
      {o.statusNote && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">เหตุผลที่ระงับ: {o.statusNote}</p>}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
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
              <p className="text-sm text-muted">ผู้จัดยังไม่ได้ส่งเอกสาร</p>
            ) : (
              <ul aria-label="เอกสาร KYC" className="flex flex-col divide-y divide-line">
                {o.documents.map((d) => {
                  const s = KYC_DOC_STATUS[d.status];
                  return (
                    <li key={d.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex min-w-0 flex-1 basis-56 flex-col text-sm leading-snug">
                          <a href={`/organizations/${o.id}/documents/${d.id}`} target="_blank" rel="noreferrer" className="font-semibold">
                            {KYC_DOC_TYPE[d.type]}
                          </a>
                          <span className="truncate text-[13px] text-muted">
                            {d.fileName} · {fileSize(d.sizeBytes)} · {at.format(new Date(d.createdAt))}
                          </span>
                          {d.status === "rejected" && d.rejectReason && <span className="text-[13px] text-bad">เหตุผล: {d.rejectReason}</span>}
                        </span>
                        <Pill label={s.label} className={s.className} />
                      </div>
                      {manage && (
                        <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
                          {d.status !== "approved" && <ActionButton action={approveDocument.bind(null, o.id, d.id)} label="เอกสารผ่าน" pendingLabel="…" className={smallGhostButtonClass} />}
                          {d.status !== "rejected" && (
                            <TextActionForm
                              action={rejectDocument.bind(null, o.id, d.id)}
                              name="reason"
                              label="ไม่ผ่าน เพราะ (ผู้จัดเห็นข้อความนี้)"
                              placeholder="เช่น ภาพไม่ชัด"
                              submitLabel="ส่งกลับให้แก้"
                              className={dangerButtonClass}
                            />
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
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
              <p className="text-sm text-muted">ยังไม่มีบัญชีที่ตรวจแล้ว จ่ายเงินผู้จัดไม่ได้จนกว่าจะบันทึก</p>
            )}
            {o.submittedBankAccount && (
              <div className="flex flex-col gap-3 rounded-2xl bg-warn-soft p-4 text-sm">
                <b>ผู้จัดส่งบัญชีมาให้ตรวจ ({at.format(new Date(o.submittedBankAccount.submittedAt))})</b>
                <dl className="grid grid-cols-[90px_minmax(0,1fr)] gap-x-3 gap-y-1">
                  <dt className="text-muted">ธนาคาร</dt>
                  <dd>{BANKS[o.submittedBankAccount.bankCode as keyof typeof BANKS] ?? o.submittedBankAccount.bankCode}</dd>
                  <dt className="text-muted">เลขบัญชี</dt>
                  <dd className="tabular-nums">{o.submittedBankAccount.accountNumber ?? `••••${o.submittedBankAccount.accountLast4}`}</dd>
                  <dt className="text-muted">ชื่อบัญชี</dt>
                  <dd className="break-words">{o.submittedBankAccount.accountName}</dd>
                  {o.submittedBankAccount.branch && (
                    <>
                      <dt className="text-muted">สาขา</dt>
                      <dd>{o.submittedBankAccount.branch}</dd>
                    </>
                  )}
                </dl>
                {manage && (
                  <>
                    <span className="text-muted">เทียบกับหน้าสมุดบัญชีในเอกสาร KYC ก่อนยืนยัน</span>
                    <ActionButton action={verifyBankAccount.bind(null, o.id)} label="ยืนยันบัญชีนี้" pendingLabel="กำลังยืนยัน…" />
                  </>
                )}
              </div>
            )}
            {manage && <BankForm action={setBankAccount.bind(null, o.id)} banks={Object.entries(BANKS)} />}
          </Card>

          <Card title="ค่าธรรมเนียมแพลตฟอร์ม">
            <p className="text-sm">
              คำสั่งซื้อใหม่: <b>{feeLabel(fee.current)}</b>
              <span className="block text-[13px] text-muted">
                {fee.current?.source === "organization" ? "อัตราเฉพาะของผู้จัดนี้" : "ใช้อัตรา default ของแพลตฟอร์ม"}
              </span>
            </p>
            <FeeHistory rows={fee.history} label="อัตราของผู้จัดนี้" />
            {me.can.fees && (
              <div className="flex flex-col gap-3 border-t border-line pt-3">
                <FeeForm action={setOrgFee.bind(null, o.id)} current={fee.current} submitLabel="ตั้งอัตราเฉพาะผู้จัดนี้" />
                {fee.history.some((r) => r.state !== "ended") && (
                  <ActionButton action={clearOrgFee.bind(null, o.id)} label="กลับไปใช้อัตรา default" className={smallGhostButtonClass} />
                )}
              </div>
            )}
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
                      {e.status === "pending_review" ? <Link href={`/reviews/${e.id}`}>{e.nameTh}</Link> : <span>{e.nameTh}</span>}
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
