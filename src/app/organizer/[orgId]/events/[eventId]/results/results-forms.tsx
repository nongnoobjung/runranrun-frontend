"use client";

import { useState, useTransition } from "react";
import { FormMessage, smallButtonClass, smallGhostButtonClass } from "@/components/backoffice";
import { buttonClass } from "@/components/ui";
import type { OrgFormState } from "@/lib/org-actions";
import { importResults, publishResults, type ImportState } from "./actions";

/** Thai text for the API's codes about lines of a results file. */
export const RESULT_ISSUE_TH: Record<string, string> = {
  MISSING_BIB: "ไม่มีเลขบิบ",
  INVALID_STATUS: "สถานะต้องเป็น FIN, DNF, DNS หรือ DQ",
  INVALID_TIME: "อ่านเวลาไม่ได้ ใช้รูปแบบ ชม:นาที:วินาที",
  MISSING_TIME: "FIN ต้องมีเวลา",
  BIB_NOT_FOUND: "ไม่มีบิบนี้ในผู้สมัครที่ชำระเงินแล้ว",
  DUPLICATE_BIB: "บิบซ้ำในไฟล์",
  OVER_CUTOFF: "เกินเวลาตัดตัว",
  TOO_FAST: "เร็วผิดปกติ อาจจับเวลาผิด",
  GUN_BEFORE_CHIP: "เวลา gun น้อยกว่า chip",
};

/** Upload → check every line → import. Warnings do not block; errors do. */
export function ImportResultsForm({ orgId, eventId }: { orgId: string; eventId: string }) {
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
    startTransition(async () => setState(await importResults(orgId, eventId, csv, dryRun)));
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">ไฟล์ CSV จากผู้จับเวลา</span>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => choose(e.target.files?.[0])}
          className="text-sm file:mr-3 file:min-h-10 file:rounded-full file:border-0 file:bg-ice file:px-4 file:font-semibold file:text-brand"
        />
        <span className="text-[13px] text-muted">
          คอลัมน์ bib, chip_time, gun_time (ชม:นาที:วินาที) และ status (FIN, DNF, DNS, DQ ไม่ใส่ = FIN ถ้ามีเวลา) ไฟล์ใหม่แทนที่ผลเดิมทั้งหมด
        </span>
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
            {fileName} · {result.rows.toLocaleString("th-TH")} แถว · ตรงกับผู้สมัคร {result.matched.toLocaleString("th-TH")} คน
            {result.races.length > 0 && ` (${result.races.map((r) => `${r.code} เข้าเส้นชัย ${r.FIN}`).join(", ")})`}
          </p>
          {result.errors.length > 0 && <IssueList title={`ผิด ${result.errors.length} แถว`} issues={result.errors} tone="bad" />}
          {result.warnings.length > 0 && <IssueList title={`ควรตรวจ ${result.warnings.length} แถว`} issues={result.warnings} tone="warn" />}
          {result.applied ? (
            <p role="status" className="rounded-2xl bg-ok-soft px-4 py-3 text-sm text-ok">
              นำเข้าผลแล้ว {result.matched.toLocaleString("th-TH")} คน คำนวณอันดับใหม่แล้ว
            </p>
          ) : result.errors.length === 0 ? (
            <div>
              <button type="button" disabled={pending} onClick={() => run(false)} className={smallButtonClass}>
                {pending && !checking ? "กำลังนำเข้า…" : `นำเข้าผล ${result.matched.toLocaleString("th-TH")} คน`}
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted">แก้แถวที่ผิดในไฟล์ แล้วเลือกไฟล์ใหม่อีกครั้ง ยังไม่มีอะไรถูกเปลี่ยน</p>
          )}
        </div>
      )}
    </div>
  );
}

export function IssueList({ title, issues, tone }: { title: string; issues: { line: number; bib: string; code: string }[]; tone: "bad" | "warn" }) {
  return (
    <div className={`flex flex-col gap-1 rounded-2xl p-3 text-sm ${tone === "bad" ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn"}`}>
      <b className="font-semibold">{title}</b>
      <ul className="flex max-h-56 flex-col gap-0.5 overflow-y-auto" aria-label={title}>
        {issues.map((i) => (
          <li key={`${i.line}-${i.code}`}>
            แถว {i.line} · บิบ {i.bib || "–"} · {RESULT_ISSUE_TH[i.code] ?? i.code}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PublishButton({ orgId, eventId, published, finishers }: { orgId: string; eventId: string; published: boolean; finishers: number }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<OrgFormState>({});
  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => setState(await publishResults(orgId, eventId, !published)))}
        className={published ? smallGhostButtonClass : buttonClass}
      >
        {pending ? "…" : published ? "ซ่อนผลจากหน้างาน" : `เผยแพร่ผล (${finishers.toLocaleString("th-TH")} คนเข้าเส้นชัย)`}
      </button>
      <FormMessage state={state} />
    </div>
  );
}
