"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";
import { Card, Field, FormMessage, smallGhostButtonClass } from "@/components/backoffice";
import { buttonClass, inputClass } from "@/components/ui";
import type { OrgFormState } from "@/lib/org-actions";
import type { UploadState } from "./actions";
import { MarkdownEditor } from "./markdown-editor";

type Lang = "th" | "en";

/** Values passed from the server, because lib/org is server-only. */
export interface ContentValues {
  summaryTh: string | null;
  summaryEn: string | null;
  descriptionTh: string | null;
  descriptionEn: string | null;
  rulesTh: string | null;
  rulesEn: string | null;
  faq: { qTh: string; aTh: string; qEn: string | null; aEn: string | null }[];
}

const T = {
  title: "เนื้อหาหน้างาน",
  intro: "เขียนภาษาไทยเป็นหลัก ช่องภาษาอังกฤษที่เว้นว่างจะแสดงภาษาไทยแทนเมื่อผู้ชมเลือก English",
  tabs: { th: "ภาษาไทย", en: "English" },
  filled: "มีเนื้อหาแล้ว",
  summary: { th: "คำโปรยสั้น ๆ", en: "Summary" },
  summaryHint: "แสดงต้นหัวข้อเกี่ยวกับงาน ไม่เกิน 300 ตัวอักษร",
  description: { th: "รายละเอียดงาน", en: "Description" },
  rules: { th: "กติกาการแข่งขัน", en: "Race rules" },
  rulesHint: "ใช้ - ขึ้นต้นบรรทัดเพื่อทำเป็นรายการ",
  faq: "คำถามที่พบบ่อย",
  faqHint: "คำถามเดียวกันใส่ได้ทั้งสองภาษา คำถามภาษาไทยต้องมี",
  question: { th: "คำถาม", en: "Question" },
  answer: { th: "คำตอบ", en: "Answer" },
  addFaq: "+ เพิ่มคำถาม",
  removeFaq: "ลบคำถามนี้",
  save: "บันทึกเนื้อหา",
  saving: "กำลังบันทึก…",
};

const suffix = (lang: Lang) => (lang === "th" ? "Th" : "En");

export function ContentForm({
  action,
  upload,
  values,
  readOnly,
}: {
  action: (prev: OrgFormState, fd: FormData) => Promise<OrgFormState>;
  upload: (fd: FormData) => Promise<UploadState>;
  values: ContentValues;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [, startTransition] = useTransition();
  const [lang, setLang] = useState<Lang>("th");
  const [faq, setFaq] = useState(() => values.faq.map((f, i) => ({ ...f, key: i })));
  const err = (name: string) => state.fieldErrors?.[name];
  // A transition instead of the form action prop, so a rejected save does not wipe what was typed.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };
  const hasEnglish = Boolean(values.summaryEn || values.descriptionEn || values.rulesEn || values.faq.some((f) => f.qEn));

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <fieldset disabled={readOnly} className="flex flex-col gap-4">
        <Card title={T.title}>
          <p className="text-[13px] text-muted">{T.intro}</p>
          <div role="tablist" aria-label={T.title} className="flex gap-1 self-start rounded-full bg-tint p-1">
            {(["th", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                role="tab"
                id={`tab-${l}`}
                aria-controls={`panel-${l}`}
                aria-selected={lang === l}
                onClick={() => setLang(l)}
                className={`flex min-h-10 items-center gap-1.5 rounded-full px-5 text-sm ${lang === l ? "bg-white font-semibold shadow-sm" : "text-muted"}`}
              >
                {T.tabs[l]}
                {l === "en" && hasEnglish && <span aria-label={T.filled} className="h-2 w-2 rounded-full bg-ok" />}
              </button>
            ))}
          </div>

          {/* Both panels stay in the form; the hidden one is still submitted. */}
          {(["th", "en"] as const).map((l) => {
            const s = suffix(l);
            return (
              <div key={l} role="tabpanel" id={`panel-${l}`} aria-labelledby={`tab-${l}`} hidden={lang !== l} lang={l} className="flex flex-col gap-4">
                <Field label={T.summary[l]} hint={T.summaryHint} error={err(`summary${s}`)}>
                  <input name={`summary${s}`} defaultValue={values[`summary${s}`] ?? ""} maxLength={300} className={inputClass} />
                </Field>
                <MarkdownEditor
                  name={`description${s}`}
                  label={T.description[l]}
                  defaultValue={values[`description${s}`] ?? ""}
                  disabled={readOnly}
                  lang={l}
                  upload={upload}
                />
                {err(`description${s}`) && <span className="text-[13px] text-bad">{err(`description${s}`)}</span>}
                <Field label={T.rules[l]} hint={T.rulesHint} error={err(`rules${s}`)}>
                  <textarea name={`rules${s}`} defaultValue={values[`rules${s}`] ?? ""} rows={5} maxLength={10_000} className={`${inputClass} py-3`} />
                </Field>

                <fieldset className="flex flex-col gap-3">
                  <legend className="mb-1 text-sm font-medium">{T.faq}</legend>
                  <p className="text-[13px] text-muted">{T.faqHint}</p>
                  {faq.map((f, i) => (
                    <div key={f.key} className="flex flex-col gap-2 rounded-[20px] bg-tint p-3">
                      {l === "en" && f.qTh && <span className="text-[13px] text-muted">{f.qTh}</span>}
                      <Field label={`${T.question[l]} ${i + 1}`} error={err(`faq.${i}.q${s}`)}>
                        <input
                          name={`faq.${f.key}.q${s}`}
                          value={(l === "th" ? f.qTh : f.qEn) ?? ""}
                          onChange={(e) => setFaq(faq.map((x) => (x.key === f.key ? { ...x, [`q${s}`]: e.target.value } : x)))}
                          maxLength={300}
                          className={inputClass}
                        />
                      </Field>
                      <Field label={`${T.answer[l]} ${i + 1}`} error={err(`faq.${i}.a${s}`)}>
                        <textarea
                          name={`faq.${f.key}.a${s}`}
                          value={(l === "th" ? f.aTh : f.aEn) ?? ""}
                          onChange={(e) => setFaq(faq.map((x) => (x.key === f.key ? { ...x, [`a${s}`]: e.target.value } : x)))}
                          rows={2}
                          maxLength={2000}
                          className={`${inputClass} py-3`}
                        />
                      </Field>
                      {!readOnly && (
                        <button type="button" onClick={() => setFaq(faq.filter((x) => x.key !== f.key))} className="self-start text-sm text-bad">
                          {T.removeFaq}
                        </button>
                      )}
                    </div>
                  ))}
                  {!readOnly && faq.length < 30 && (
                    <button
                      type="button"
                      onClick={() => setFaq([...faq, { key: Math.max(-1, ...faq.map((x) => x.key)) + 1, qTh: "", aTh: "", qEn: null, aEn: null }])}
                      className={`${smallGhostButtonClass} self-start`}
                    >
                      {T.addFaq}
                    </button>
                  )}
                </fieldset>
              </div>
            );
          })}
        </Card>
      </fieldset>

      {!readOnly && (
        <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 bg-tint/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
          <FormMessage state={state} />
          <div>
            <button type="submit" disabled={pending} className={buttonClass}>
              {pending ? T.saving : T.save}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
