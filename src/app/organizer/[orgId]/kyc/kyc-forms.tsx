"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";
import { dangerButtonClass, Field, FormMessage, smallButtonClass, smallGhostButtonClass } from "@/components/backoffice";
import { SubmitButton } from "@/components/submit-button";
import { inputClass } from "@/components/ui";
import type { OrgFormState } from "@/lib/org-actions";
import { deleteDocument, submitBankAccount, updateCompany, uploadDocument } from "./actions";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

/** Values for the company form; passed from the server because lib/org is server-only. */
export interface CompanyValues {
  nameTh: string;
  nameEn: string;
  legalName: string;
  taxId: string;
  isVatRegistered: boolean;
  contactEmail: string;
  contactPhone: string;
  address: { line1: string; subdistrict: string; district: string; province: string; postcode: string };
}

/** Submits through a transition so what was typed stays on screen when the API rejects it. */
function useKeptForm(action: (prev: OrgFormState, fd: FormData) => Promise<OrgFormState>) {
  const [state, formAction, pending] = useActionState(action, {});
  const [, startTransition] = useTransition();
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };
  return { state, pending, onSubmit, err: (name: string) => state.fieldErrors?.[name] };
}

export function CompanyForm({ orgId, values, locked }: { orgId: string; values: CompanyValues; locked: boolean }) {
  const { state, pending, onSubmit, err } = useKeptForm(updateCompany.bind(null, orgId));
  const lockedHint = locked ? "ผ่านการตรวจแล้ว แก้ไม่ได้ ติดต่อทีมงานก้าวหากต้องเปลี่ยน" : undefined;
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ชื่อทีม (ภาษาไทย)" error={err("nameTh")}>
          <input name="nameTh" defaultValue={values.nameTh} maxLength={120} className={inputClass} />
        </Field>
        <Field label="ชื่อทีม (English)" error={err("nameEn")}>
          <input name="nameEn" defaultValue={values.nameEn} maxLength={120} className={inputClass} />
        </Field>
        <Field label="ชื่อตามทะเบียน (บริษัทหรือบุคคล)" hint={lockedHint} error={err("legalName")}>
          <input name="legalName" defaultValue={values.legalName} disabled={locked} maxLength={200} className={`${inputClass} disabled:bg-tint`} />
        </Field>
        <Field label="เลขประจำตัวผู้เสียภาษี 13 หลัก" hint={lockedHint} error={err("taxId")}>
          <input name="taxId" defaultValue={values.taxId} disabled={locked} inputMode="numeric" maxLength={17} className={`${inputClass} disabled:bg-tint`} />
        </Field>
        <Field label="อีเมลติดต่อ" error={err("contactEmail")}>
          <input name="contactEmail" type="email" defaultValue={values.contactEmail} className={inputClass} />
        </Field>
        <Field label="เบอร์โทรติดต่อ" error={err("contactPhone")}>
          <input name="contactPhone" type="tel" inputMode="tel" defaultValue={values.contactPhone} className={inputClass} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        {!locked && <input type="hidden" name="vatField" value="1" />}
        <input type="checkbox" name="isVatRegistered" defaultChecked={values.isVatRegistered} disabled={locked} className="h-5 w-5 accent-brand" />
        จดทะเบียนภาษีมูลค่าเพิ่ม (VAT)
      </label>
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-sm font-semibold">ที่อยู่ตามทะเบียน</legend>
        <Field label="เลขที่ ถนน" error={err("address.line1")}>
          <input name="address.line1" defaultValue={values.address.line1} maxLength={200} autoComplete="address-line1" className={inputClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="แขวง / ตำบล" error={err("address.subdistrict")}>
            <input name="address.subdistrict" defaultValue={values.address.subdistrict} maxLength={100} className={inputClass} />
          </Field>
          <Field label="เขต / อำเภอ" error={err("address.district")}>
            <input name="address.district" defaultValue={values.address.district} maxLength={100} className={inputClass} />
          </Field>
          <Field label="จังหวัด" error={err("address.province")}>
            <input name="address.province" defaultValue={values.address.province} maxLength={100} autoComplete="address-level1" className={inputClass} />
          </Field>
          <Field label="รหัสไปรษณีย์" error={err("address.postcode")}>
            <input name="address.postcode" defaultValue={values.address.postcode} inputMode="numeric" maxLength={5} autoComplete="postal-code" className={inputClass} />
          </Field>
        </div>
      </fieldset>
      <FormMessage state={state} />
      <div>
        <button type="submit" disabled={pending} className={smallButtonClass}>
          {pending ? "กำลังบันทึก…" : "บันทึกข้อมูลบริษัท"}
        </button>
      </div>
    </form>
  );
}

/** One document per upload; checks type and size before sending so a big file fails fast. */
export function UploadForm({ orgId, types }: { orgId: string; types: [string, string][] }) {
  const [state, action] = useActionState<OrgFormState, FormData>(uploadDocument.bind(null, orgId), {});
  const [fileError, setFileError] = useState<string | undefined>();
  const error = fileError ?? state.fieldErrors?.file;
  function check(file: File | undefined) {
    if (!file) return setFileError(undefined);
    if (file.size > MAX_BYTES) return setFileError("ไฟล์ใหญ่เกิน 10 MB");
    if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) return setFileError("รองรับเฉพาะไฟล์ PDF, JPG หรือ PNG");
    setFileError(undefined);
  }
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (fileError) e.preventDefault();
      }}
      className="flex flex-col gap-3 border-t border-line pt-4"
    >
      <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
        <Field label="ประเภทเอกสาร" error={state.fieldErrors?.type}>
          <select name="type" defaultValue="id_card" className={`${inputClass} min-h-10`}>
            {types.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ไฟล์" hint="PDF, JPG หรือ PNG ไม่เกิน 10 MB" error={error}>
          <input
            name="file"
            type="file"
            required
            accept={ACCEPT}
            onChange={(e) => check(e.currentTarget.files?.[0])}
            className="min-h-10 w-full min-w-0 text-sm file:mr-3 file:min-h-10 file:rounded-full file:border-0 file:bg-ice file:px-4 file:font-semibold file:text-brand"
          />
        </Field>
      </div>
      <FormMessage state={state.fieldErrors?.file ? undefined : state} />
      <div>
        <SubmitButton className={smallButtonClass} pendingLabel="กำลังอัปโหลด…">
          อัปโหลดเอกสาร
        </SubmitButton>
      </div>
    </form>
  );
}

export function DeleteDocumentButton({ orgId, docId, label }: { orgId: string; docId: string; label: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<OrgFormState>({});
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={smallGhostButtonClass} aria-label={`ลบ ${label}`}>
        ลบ
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={pending} onClick={() => startTransition(async () => setState(await deleteDocument(orgId, docId)))} className={dangerButtonClass}>
        {pending ? "กำลังลบ…" : "ยืนยันลบ"}
      </button>
      <button type="button" disabled={pending} onClick={() => setConfirming(false)} className={smallGhostButtonClass}>
        ไม่ลบ
      </button>
      <FormMessage state={state} />
    </span>
  );
}

export function BankAccountForm({ orgId, banks }: { orgId: string; banks: [string, string][] }) {
  const { state, pending, onSubmit, err } = useKeptForm(submitBankAccount.bind(null, orgId));
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="ธนาคาร" error={err("bankCode")}>
          <select name="bankCode" defaultValue="" className={`${inputClass} min-h-10`}>
            <option value="">เลือกธนาคาร</option>
            {banks.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="เลขบัญชี" error={err("accountNumber")}>
          <input name="accountNumber" inputMode="numeric" autoComplete="off" className={`${inputClass} min-h-10`} />
        </Field>
        <Field label="ชื่อบัญชี" hint="ตรงกับชื่อตามทะเบียนหรือหน้าสมุดบัญชี" error={err("accountName")}>
          <input name="accountName" className={`${inputClass} min-h-10`} />
        </Field>
        <Field label="สาขา (ถ้ามี)" error={err("branch")}>
          <input name="branch" className={`${inputClass} min-h-10`} />
        </Field>
      </div>
      <FormMessage state={state} />
      <div>
        <button type="submit" disabled={pending} className={smallButtonClass}>
          {pending ? "กำลังส่ง…" : "ส่งบัญชีให้ตรวจ"}
        </button>
      </div>
    </form>
  );
}
