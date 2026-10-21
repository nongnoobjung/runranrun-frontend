"use client";

import { useActionState, useState, useTransition } from "react";
import { Field, FormMessage, smallButtonClass, smallGhostButtonClass } from "@/components/backoffice";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, inputClass } from "@/components/ui";
import type { OrgFormState } from "@/lib/org-actions";
import { assignWaiting, importBibs, setBib, setBibByRegistrationNo, type ImportState } from "./actions";

const bibInputClass = `${inputClass} min-h-10 uppercase tabular-nums`;

/** One runner's number: type a new one and save, or empty the field to take the number away. */
export function SetBibForm({ orgId, eventId, registrationId, current, label }: { orgId: string; eventId: string; registrationId: string; current: string | null; label: string }) {
  const [state, action] = useActionState<OrgFormState, FormData>(setBib.bind(null, orgId, eventId, registrationId), {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          name="bibNumber"
          defaultValue={current ?? ""}
          maxLength={10}
          aria-label={label}
          placeholder="เลขบิบ"
          className={`${bibInputClass} w-32`}
        />
        <SubmitButton className={smallButtonClass} pendingLabel="…">
          บันทึก
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function SetByRegistrationNoForm({ orgId, eventId }: { orgId: string; eventId: string }) {
  const [state, action] = useActionState<OrgFormState, FormData>(setBibByRegistrationNo.bind(null, orgId, eventId), {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="เลขสมัคร" error={state.fieldErrors?.registrationNo}>
          <input name="registrationNo" required className={`${inputClass} uppercase`} placeholder="R1234" />
        </Field>
        <Field label="เลขบิบ" hint="เว้นว่าง = ลบเลขเดิม" error={state.fieldErrors?.bibNumber}>
          <input name="bibNumber" maxLength={10} className={`${inputClass} uppercase`} placeholder="0001" />
        </Field>
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton className={smallButtonClass}>บันทึกเลขบิบ</SubmitButton>
      </div>
    </form>
  );
}

export function AssignWaitingButton({ orgId, eventId, waiting }: { orgId: string; eventId: string; waiting: number }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<OrgFormState>({});
  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        disabled={pending || waiting === 0}
        onClick={() => startTransition(async () => setState(await assignWaiting(orgId, eventId)))}
        className={buttonClass}
      >
        {pending ? "กำลังออกเลข…" : `ออกบิบให้คนที่ยังไม่มี (${waiting.toLocaleString("th-TH")} คน)`}
      </button>
      <FormMessage state={state} />
    </div>
  );
}

const IMPORT_ERROR_TH: Record<string, string> = {
  REGISTRATION_NOT_FOUND: "ไม่พบเลขสมัครนี้ในงาน",
  NOT_CONFIRMED: "ผู้สมัครยังไม่ได้ชำระเงิน",
  INVALID_BIB: "เลขบิบใช้ได้เฉพาะอักษรอังกฤษ ตัวเลข และ - ไม่เกิน 10 ตัว",
  DUPLICATE_REGISTRATION: "เลขสมัครนี้อยู่ในไฟล์มากกว่าหนึ่งแถว",
  DUPLICATE_BIB: "เลขบิบนี้อยู่ในไฟล์มากกว่าหนึ่งแถว",
  BIB_TAKEN: "เลขบิบนี้เป็นของผู้สมัครคนอื่นที่ไม่ได้อยู่ในไฟล์",
};

/** Upload → check every line → import. Nothing changes until the file is free of errors and confirmed. */
export function ImportForm({ orgId, eventId }: { orgId: string; eventId: string }) {
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [state, setState] = useState<ImportState>({});
  const [pending, startTransition] = useTransition();
  const [checking, setChecking] = useState(true);
  const result = state.result;

  async function choose(file: File | undefined) {
    setState({});
    setCsv(file ? await file.text() : null);
    setFileName(file?.name ?? "");
  }
  function run(dryRun: boolean) {
    if (!csv) return;
    setChecking(dryRun);
    startTransition(async () => setState(await importBibs(orgId, eventId, csv, dryRun)));
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">ไฟล์ CSV</span>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => choose(e.target.files?.[0])}
          className="text-sm file:mr-3 file:min-h-10 file:rounded-full file:border-0 file:bg-ice file:px-4 file:font-semibold file:text-brand"
        />
        <span className="text-[13px] text-muted">ต้องมีคอลัมน์ registration_no และ bib เช่นไฟล์ Export ผู้สมัครที่กรอกคอลัมน์ bib แล้ว แถวที่ bib ว่างจะไม่ถูกแตะ</span>
      </label>
      <div>
        <button type="button" disabled={!csv || pending} onClick={() => run(true)} className={smallGhostButtonClass}>
          {pending && checking ? "กำลังตรวจ…" : "ตรวจไฟล์"}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">
          {state.error}
        </p>
      )}
      {result && (
        <div className="flex flex-col gap-3" aria-live="polite">
          <p className="text-sm">
            {fileName} · {result.rows.toLocaleString("th-TH")} แถว · เปลี่ยน {result.changes.length.toLocaleString("th-TH")} คน
            {result.errors.length > 0 && <span className="font-semibold text-bad"> · ผิด {result.errors.length.toLocaleString("th-TH")} แถว</span>}
          </p>
          {result.errors.length > 0 && (
            <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-2xl bg-bad-soft p-3 text-sm text-bad" aria-label="แถวที่ผิด">
              {result.errors.map((e) => (
                <li key={`${e.line}-${e.message}`}>
                  แถว {e.line}: {e.registrationNo || "–"} → {e.bib} · {IMPORT_ERROR_TH[e.message] ?? e.message}
                </li>
              ))}
            </ul>
          )}
          {result.changes.length > 0 && (
            <div className="max-h-64 overflow-auto rounded-2xl bg-tint">
              <table className="w-full min-w-[420px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-[13px] text-muted">
                    <th className="px-3 py-2 font-medium">เลขสมัคร</th>
                    <th className="px-3 py-2 font-medium">ชื่อ</th>
                    <th className="px-3 py-2 font-medium">เดิม</th>
                    <th className="px-3 py-2 font-medium">ใหม่</th>
                  </tr>
                </thead>
                <tbody>
                  {result.changes.map((c) => (
                    <tr key={c.registrationNo} className="border-t border-line">
                      <td className="px-3 py-1.5 tabular-nums">{c.registrationNo}</td>
                      <td className="px-3 py-1.5">{c.name}</td>
                      <td className="px-3 py-1.5 text-muted tabular-nums">{c.from ?? "–"}</td>
                      <td className="px-3 py-1.5 font-semibold tabular-nums">{c.to}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {result.applied ? (
            <p role="status" className="rounded-2xl bg-ok-soft px-4 py-3 text-sm text-ok">
              นำเข้าเลขบิบ {result.changes.length.toLocaleString("th-TH")} คนแล้ว
            </p>
          ) : result.errors.length === 0 && result.changes.length > 0 ? (
            <div>
              <button type="button" disabled={pending} onClick={() => run(false)} className={smallButtonClass}>
                {pending && !checking ? "กำลังนำเข้า…" : `นำเข้า ${result.changes.length.toLocaleString("th-TH")} คน`}
              </button>
            </div>
          ) : result.errors.length === 0 ? (
            <p className="text-sm text-muted">เลขในไฟล์ตรงกับที่มีอยู่แล้ว ไม่มีอะไรต้องเปลี่ยน</p>
          ) : (
            <p className="text-sm text-muted">แก้แถวที่ผิดในไฟล์ แล้วเลือกไฟล์ใหม่อีกครั้ง ยังไม่มีอะไรถูกเปลี่ยน</p>
          )}
        </div>
      )}
    </div>
  );
}
