import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, PageHeader, Pill } from "@/components/backoffice";
import { OrganizerBar } from "@/components/organizer-bar";
import { fmt } from "@/lib/format";
import { can, fileSize, KYC_DOC_STATUS, KYC_DOC_TYPE, KYC_READINESS, membership, orgKyc, type OrgKyc, type PayoutAccount } from "@/lib/org";
import { BANKS } from "@/lib/types";
import { BankAccountForm, CompanyForm, DeleteDocumentButton, UploadForm } from "./kyc-forms";

export const metadata: Metadata = { title: "ข้อมูลทีมและ KYC" };

type Props = PageProps<"/organizer/[orgId]/kyc">;

const STATUS: Record<OrgKyc["status"], { label: string; className: string; detail: string }> = {
  pending_kyc: { label: "รอตรวจเอกสาร", className: "bg-warn-soft text-warn", detail: "สร้างงานและกรอกข้อมูลได้ เปิดรับสมัครได้หลังทีมงานก้าวตรวจเอกสารผ่าน" },
  active: { label: "ผ่าน KYC แล้ว", className: "bg-ok-soft text-ok", detail: "เปิดรับสมัครได้ เงินจากงานโอนเข้าบัญชีที่ตรวจแล้ว" },
  suspended: { label: "ถูกระงับ", className: "bg-bad-soft text-bad", detail: "เปิดรับสมัครงานใหม่ไม่ได้ ติดต่อทีมงานก้าว" },
};

export default function KycPage({ params, searchParams }: Props) {
  return (
    <>
      <OrganizerBar />
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 py-8 sm:px-7">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-[28px] bg-white" aria-busy="true" />}>
          <Kyc params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

function account(a: PayoutAccount) {
  return `${BANKS[a.bankCode] ?? a.bankCode} ••••${a.accountLast4} · ${a.accountName}${a.branch ? ` · สาขา${a.branch}` : ""}`;
}

async function Kyc({ params, searchParams }: Props) {
  const { orgId } = await params;
  const [org, kyc, sp] = await Promise.all([membership(orgId), orgKyc(orgId), searchParams]);
  const owner = can(org.role, "manage_kyc");
  const openFiles = can(org.role, "view_pii");
  const status = STATUS[kyc.status];
  const locked = kyc.status !== "pending_kyc";

  return (
    <>
      <Link href={`/organizer/${orgId}`} className="self-start text-sm text-muted no-underline hover:text-ink">
        ← งานทั้งหมดของ {kyc.nameTh}
      </Link>
      <PageHeader title="ข้อมูลทีมและ KYC" eyebrow={kyc.nameTh} />
      {sp.new === "1" && (
        <p role="status" className="rounded-2xl bg-ok-soft px-4 py-3 text-sm text-ok">
          เปิดทีม {kyc.nameTh} แล้ว กรอกข้อมูลบริษัท ส่งเอกสาร และบัญชีรับเงินด้านล่างเพื่อให้ทีมงานก้าวตรวจ
        </p>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card title="ข้อมูลบริษัท">
            {owner ? (
              <CompanyForm
                orgId={orgId}
                locked={locked}
                values={{
                  nameTh: kyc.nameTh,
                  nameEn: kyc.nameEn ?? "",
                  legalName: kyc.legalName ?? "",
                  taxId: kyc.taxId ?? "",
                  isVatRegistered: kyc.isVatRegistered,
                  contactEmail: kyc.contactEmail ?? "",
                  contactPhone: kyc.contactPhone ?? "",
                  address: kyc.address ?? { line1: "", subdistrict: "", district: "", province: "", postcode: "" },
                }}
              />
            ) : (
              <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
                {(
                  [
                    ["ชื่อตามทะเบียน", kyc.legalName],
                    ["เลขผู้เสียภาษี", kyc.taxId],
                    ["อีเมล", kyc.contactEmail],
                    ["โทร", kyc.contactPhone],
                    ["ที่อยู่", kyc.address && [kyc.address.line1, kyc.address.subdistrict, kyc.address.district, kyc.address.province, kyc.address.postcode].filter(Boolean).join(" ")],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted">{k}</dt>
                    <dd className="break-words">{v || "–"}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>

          <Card title="เอกสาร KYC">
            <p className="text-sm text-muted">
              ทุกทีมส่งบัตรประชาชนผู้มีอำนาจและหน้าสมุดบัญชี นิติบุคคลส่งหนังสือรับรองบริษัท (และ ภ.พ.20 ถ้าจด VAT) เอกสารเก็บแบบส่วนตัว
              เปิดได้เฉพาะเจ้าของ ผู้ดูแลทีม และทีมงานก้าว
            </p>
            {kyc.documents.length === 0 ? (
              <p className="rounded-2xl bg-tint px-4 py-3 text-sm text-muted">ยังไม่ได้ส่งเอกสาร</p>
            ) : (
              <ul aria-label="เอกสารที่ส่งแล้ว" className="flex flex-col divide-y divide-line">
                {kyc.documents.map((d) => {
                  const s = KYC_DOC_STATUS[d.status];
                  const name = d.fileName ?? KYC_DOC_TYPE[d.type];
                  return (
                    <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                      <span className="flex min-w-0 flex-1 basis-56 flex-col leading-snug">
                        <b className="font-semibold">{KYC_DOC_TYPE[d.type]}</b>
                        <span className="truncate text-[13px] text-muted">
                          {openFiles ? (
                            <a href={`/organizer/${orgId}/kyc/documents/${d.id}`} target="_blank" rel="noreferrer">
                              {name}
                            </a>
                          ) : (
                            name
                          )}
                          {` · ${fileSize(d.sizeBytes)} · ส่งเมื่อ ${fmt.date(d.createdAt)}`}
                        </span>
                        {d.status === "rejected" && d.rejectReason && <span className="text-[13px] text-bad">เหตุผล: {d.rejectReason}</span>}
                      </span>
                      <Pill label={s.label} className={s.className} />
                      {owner && d.status !== "approved" && <DeleteDocumentButton orgId={orgId} docId={d.id} label={name} />}
                    </li>
                  );
                })}
              </ul>
            )}
            {owner && <UploadForm orgId={orgId} types={Object.entries(KYC_DOC_TYPE)} />}
          </Card>

          <Card title="บัญชีรับเงิน">
            {kyc.bankAccount && (
              <p className="text-sm">
                {account(kyc.bankAccount)} · <span className="text-ok">ตรวจแล้ว</span>
              </p>
            )}
            {kyc.submittedBankAccount && (
              <p className="text-sm">
                {account(kyc.submittedBankAccount)} · <span className="text-warn">รอทีมงานก้าวยืนยัน</span>
              </p>
            )}
            {!kyc.bankAccount && !kyc.submittedBankAccount && <p className="text-sm text-muted">ยังไม่มีบัญชีรับเงิน ทีมงานก้าวโอนเงินจากงานให้ได้เมื่อยืนยันบัญชีแล้ว</p>}
            {owner && (
              <>
                {(kyc.bankAccount || kyc.submittedBankAccount) && <p className="text-[13px] text-muted">ส่งบัญชีใหม่ได้ บัญชีเดิมยังใช้รับเงินจนกว่าทีมงานจะยืนยันบัญชีใหม่</p>}
                <BankAccountForm orgId={orgId} banks={Object.entries(BANKS)} />
              </>
            )}
          </Card>
        </div>

        <div className="order-first flex flex-col gap-4 lg:sticky lg:top-4 lg:order-none">
          <Card title="สถานะการตรวจ">
            <span>
              <Pill label={status.label} className={status.className} />
            </span>
            <p className="text-sm text-muted">{status.detail}</p>
            {kyc.statusNote && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">เหตุผล: {kyc.statusNote}</p>}
            {kyc.documents.some((d) => d.status === "rejected") && (
              <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">มีเอกสารไม่ผ่านการตรวจ ดูเหตุผลในรายการเอกสาร แล้วอัปโหลดไฟล์ใหม่</p>
            )}
            <ul aria-label="สิ่งที่ต้องส่ง" className="flex flex-col gap-2 text-sm">
              {kyc.readiness.map((r) => (
                <li key={r.key} className="flex items-center gap-2">
                  <span aria-hidden className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs ${r.ok ? "bg-ok text-white" : "bg-ice text-muted"}`}>
                    {r.ok ? "✓" : ""}
                  </span>
                  <span>
                    {KYC_READINESS[r.key]}
                    <span className="sr-only">{r.ok ? " ส่งแล้ว" : " ยังขาด"}</span>
                  </span>
                </li>
              ))}
            </ul>
            {!owner && <p className="text-[13px] text-muted">เฉพาะเจ้าของทีมแก้ข้อมูลและส่งเอกสารได้</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
