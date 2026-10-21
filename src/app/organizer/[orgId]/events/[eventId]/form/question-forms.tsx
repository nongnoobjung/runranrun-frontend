"use client";

import { useActionState, useState, useTransition } from "react";
import { dangerButtonClass, Field, FormMessage, smallButtonClass, smallGhostButtonClass } from "@/components/backoffice";
import { SubmitButton } from "@/components/submit-button";
import { inputClass } from "@/components/ui";
import { QUESTION_TYPE_LABEL } from "@/lib/format";
import type { OrgQuestion } from "@/lib/org";
import type { OrgFormState } from "@/lib/org-actions";
import type { QuestionType } from "@/lib/types";
import { createQuestion, deleteQuestion, reorderQuestions, updateQuestion } from "./actions";

export interface RaceOption {
  id: string;
  code: string;
}

type FieldErrors = Record<string, string> | undefined;

/** Fields shared by add and edit. The type is locked once runners have answered. */
function QuestionFields({ question, races, errors }: { question?: OrgQuestion; races: RaceOption[]; errors: FieldErrors }) {
  const [type, setType] = useState<QuestionType>(question?.type ?? "text");
  const locked = (question?.answered ?? 0) > 0;
  const choice = type === "select" || type === "multiselect";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="คำถาม" error={errors?.label} className="sm:col-span-2">
        <input name="label" required maxLength={200} defaultValue={question?.label} className={inputClass} placeholder="เช่น ชื่อทีมหรือชมรมวิ่ง" />
      </Field>
      <Field label="ประเภท" error={errors?.type} hint={locked ? "มีคนตอบแล้ว เปลี่ยนประเภทไม่ได้" : undefined}>
        <select name="type" value={type} onChange={(e) => setType(e.target.value as QuestionType)} disabled={locked} className={inputClass}>
          {(Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]).map((t) => (
            <option key={t} value={t}>
              {QUESTION_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        {/* A disabled select is not submitted; keep sending the current type. */}
        {locked && <input type="hidden" name="type" value={type} />}
      </Field>
      <Field label="คำอธิบาย (ไม่บังคับ)" error={errors?.helpText}>
        <input name="helpText" maxLength={300} defaultValue={question?.helpText ?? ""} className={inputClass} placeholder="แสดงใต้คำถาม" />
      </Field>
      {choice && (
        <Field label="ตัวเลือก (บรรทัดละข้อ)" error={errors?.options} hint="อย่างน้อย 2 ข้อ" className="sm:col-span-2">
          <textarea
            name="options"
            rows={4}
            defaultValue={question?.options?.join("\n") ?? ""}
            className={`${inputClass} min-h-28 py-2.5`}
            placeholder={"เคย\nไม่เคย"}
          />
        </Field>
      )}
      {type === "number" && (
        <>
          <Field label="ค่าต่ำสุด (ไม่บังคับ)" error={errors?.min}>
            <input name="min" inputMode="decimal" defaultValue={question?.min ?? ""} className={inputClass} />
          </Field>
          <Field label="ค่าสูงสุด (ไม่บังคับ)" error={errors?.max}>
            <input name="max" inputMode="decimal" defaultValue={question?.max ?? ""} className={inputClass} />
          </Field>
        </>
      )}
      {races.length > 1 && (
        <fieldset className="flex flex-col gap-2 sm:col-span-2">
          <legend className="text-sm font-medium">ถามเฉพาะระยะ</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {races.map((r) => (
              <label key={r.id} className="flex min-h-10 items-center gap-2 text-sm">
                <input type="checkbox" name="raceIds" value={r.id} defaultChecked={question?.raceIds?.includes(r.id)} className="h-5 w-5 accent-brand" />
                {r.code}
              </label>
            ))}
          </div>
          <span className="text-[13px] text-muted">ไม่ติ๊กเลย = ถามทุกระยะ</span>
        </fieldset>
      )}
      <label className="flex min-h-10 items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="required" defaultChecked={question?.required} className="h-5 w-5 accent-brand" />
        {type === "checkbox" ? "ต้องติ๊กก่อนสมัครได้" : "บังคับตอบ"}
      </label>
    </div>
  );
}

export function CreateQuestionForm({ orgId, eventId, races }: { orgId: string; eventId: string; races: RaceOption[] }) {
  const [state, action] = useActionState<OrgFormState, FormData>(createQuestion.bind(null, orgId, eventId), {});
  // Start empty again after each question is added.
  const [round, setRound] = useState(0);
  const [lastNotice, setLastNotice] = useState<string | undefined>();
  if (state.notice && state.notice !== lastNotice) {
    setLastNotice(state.notice);
    setRound((r) => r + 1);
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <QuestionFields key={round} races={races} errors={state.fieldErrors} />
      <FormMessage state={state} />
      <div>
        <SubmitButton className={smallButtonClass} pendingLabel="กำลังเพิ่ม…">
          เพิ่มคำถาม
        </SubmitButton>
      </div>
    </form>
  );
}

export function EditQuestionForm({ orgId, eventId, question, races }: { orgId: string; eventId: string; question: OrgQuestion; races: RaceOption[] }) {
  const [state, action] = useActionState<OrgFormState, FormData>(updateQuestion.bind(null, orgId, eventId, question.id), {});
  return (
    <form action={action} className="flex flex-col gap-4 pt-3">
      <QuestionFields question={question} races={races} errors={state.fieldErrors} />
      <FormMessage state={state} />
      <div>
        <SubmitButton className={smallButtonClass}>บันทึก</SubmitButton>
      </div>
    </form>
  );
}

/** Move up / down and remove. `ids` is the current order of every question. */
export function QuestionActions({ orgId, eventId, ids, index, answered }: { orgId: string; eventId: string; ids: string[]; index: number; answered: number }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<OrgFormState>({});
  const [confirming, setConfirming] = useState(false);
  const id = ids[index];

  function move(to: number) {
    const next = [...ids];
    next.splice(index, 1);
    next.splice(to, 0, id);
    startTransition(async () => setState(await reorderQuestions(orgId, eventId, next)));
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => move(index - 1)} disabled={pending || index === 0} aria-label="เลื่อนขึ้น" className={smallGhostButtonClass}>
          ↑
        </button>
        <button type="button" onClick={() => move(index + 1)} disabled={pending || index === ids.length - 1} aria-label="เลื่อนลง" className={smallGhostButtonClass}>
          ↓
        </button>
        {confirming ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(async () => setState(await deleteQuestion(orgId, eventId, id)))}
              className={dangerButtonClass}
            >
              {pending ? "กำลังลบ…" : "ยืนยันลบ"}
            </button>
            <button type="button" disabled={pending} onClick={() => setConfirming(false)} className={smallGhostButtonClass}>
              ไม่ใช่
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={smallGhostButtonClass}>
            ลบ
          </button>
        )}
      </div>
      {confirming && answered > 0 && <p className="text-right text-[13px] text-muted">นักวิ่ง {answered} คนตอบแล้ว คำตอบเดิมยังดูได้ในหน้าผู้สมัครและ CSV</p>}
      <FormMessage state={state} />
    </div>
  );
}
