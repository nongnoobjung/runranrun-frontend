"use client";

import { inputClass } from "@/components/ui";
import { useT } from "@/i18n/client";
import type { FormQuestion } from "@/lib/types";

/** A saved runner as the API returns it; the ID number is only ever its last four digits. */
export interface RunnerDefaults {
  firstNameTh?: string | null;
  lastNameTh?: string | null;
  firstNameEn?: string;
  lastNameEn?: string;
  gender?: string;
  birthDate?: string;
  nationality?: string;
  idDocType?: string;
  idDocLast4?: string | null;
  phone?: string | null;
  emergencyName?: string | null;
  emergencyPhone?: string | null;
}

/**
 * One runner's details. Field names are `<prefix>.<field>`, the way the server actions read them. With `saved`, the
 * fields start from a saved runner and the ID number may stay empty: the API reads it from that profile.
 */
export function RunnerFields({ prefix, err, saved }: { prefix: string; err: (name: string) => string | undefined; saved?: RunnerDefaults & { id: string } }) {
  const t = useT().checkout.runner;
  const d: RunnerDefaults = saved ?? {};
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {saved && <input type="hidden" name={`${prefix}.profileId`} value={saved.id} />}
      <Field label={t.firstNameTh} name={`${prefix}.firstNameTh`} defaultValue={d.firstNameTh ?? undefined} error={err(`${prefix}.firstNameTh`)} autoComplete="given-name" />
      <Field label={t.lastNameTh} name={`${prefix}.lastNameTh`} defaultValue={d.lastNameTh ?? undefined} error={err(`${prefix}.lastNameTh`)} autoComplete="family-name" />
      <Field label={t.firstNameEn} name={`${prefix}.firstNameEn`} defaultValue={d.firstNameEn} error={err(`${prefix}.firstNameEn`)} required />
      <Field label={t.lastNameEn} name={`${prefix}.lastNameEn`} defaultValue={d.lastNameEn} error={err(`${prefix}.lastNameEn`)} required />
      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-muted">{t.gender}</span>
        <select name={`${prefix}.gender`} defaultValue={d.gender ?? "male"} className={inputClass}>
          <option value="male">{t.male}</option>
          <option value="female">{t.female}</option>
          <option value="other">{t.otherGender}</option>
        </select>
      </label>
      <Field label={t.birthDate} name={`${prefix}.birthDate`} type="date" defaultValue={d.birthDate} error={err(`${prefix}.birthDate`)} required />
      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-muted">{t.idDocType}</span>
        <select name={`${prefix}.idDocType`} defaultValue={d.idDocType ?? "thai_id"} className={inputClass}>
          <option value="thai_id">{t.thaiId}</option>
          <option value="passport">{t.passport}</option>
        </select>
      </label>
      <Field
        label={t.idDocNumber}
        name={`${prefix}.idDocNumber`}
        error={err(`${prefix}.idDocNumber`)}
        required={!saved}
        inputMode="numeric"
        placeholder={saved?.idDocLast4 ? t.savedIdPlaceholder(saved.idDocLast4) : undefined}
      />
      <Field label={t.phone} name={`${prefix}.phone`} type="tel" defaultValue={d.phone ?? undefined} error={err(`${prefix}.phone`)} autoComplete="tel" />
      <Field label={t.nationality} name={`${prefix}.nationality`} defaultValue={d.nationality ?? "TH"} maxLength={2} error={err(`${prefix}.nationality`)} />
      <Field label={t.emergencyName} name={`${prefix}.emergencyName`} defaultValue={d.emergencyName ?? undefined} error={err(`${prefix}.emergencyName`)} required />
      <Field label={t.emergencyPhone} name={`${prefix}.emergencyPhone`} type="tel" defaultValue={d.emergencyPhone ?? undefined} error={err(`${prefix}.emergencyPhone`)} required />
    </div>
  );
}

/**
 * The organiser's questions for one runner. Field names say how the action reads them:
 * p0.q.<key> one value, p0.qm.<key> several ticked choices, p0.qc.<key> a single tick.
 */
export function Questions({ index, questions, err }: { index: number; questions: FormQuestion[]; err: (name: string) => string | undefined }) {
  const t = useT().checkout.questions;
  if (questions.length === 0) return null;
  return (
    <fieldset className="flex flex-col gap-4 rounded-card bg-white p-5">
      <legend className="sr-only">{t.legend(index + 1)}</legend>
      <h3 className="text-lg font-semibold">{t.title}</h3>
      {questions.map((q) => {
        const name = `p${index}.q.${q.key}`;
        const error = err(name);
        const label = (
          <span className="text-[13px] text-muted">
            {q.label}
            {q.required && <span className="text-bad"> *</span>}
          </span>
        );
        const help = q.helpText && <span className="text-xs text-muted">{q.helpText}</span>;
        const problem = error && <span className="text-sm text-bad">{error}</span>;
        const cls = `${inputClass} ${error ? "border-bad" : ""}`;
        if (q.type === "checkbox") {
          return (
            <div key={q.key} className="flex flex-col gap-1">
              <label className="flex min-h-11 items-start gap-3 text-[15px]">
                <input type="checkbox" name={`p${index}.qc.${q.key}`} value="1" aria-invalid={Boolean(error)} className="mt-0.5 h-5 w-5 flex-none accent-brand" />
                <span>
                  {q.label}
                  {q.required && <span className="text-bad"> *</span>}
                </span>
              </label>
              {help}
              {problem}
            </div>
          );
        }
        if (q.type === "multiselect") {
          return (
            <fieldset key={q.key} className="flex flex-col gap-1.5">
              <legend className="mb-1.5">{label}</legend>
              <div className="flex flex-wrap gap-2">
                {q.options?.map((o) => (
                  <label key={o} className="cursor-pointer">
                    <input type="checkbox" name={`p${index}.qm.${q.key}`} value={o} className="peer sr-only" />
                    <span className="flex min-h-11 items-center rounded-full bg-ice px-4 text-sm peer-checked:bg-brand peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-brand">
                      {o}
                    </span>
                  </label>
                ))}
              </div>
              {help}
              {problem}
            </fieldset>
          );
        }
        return (
          <label key={q.key} className="flex flex-col gap-1">
            {label}
            {q.type === "select" ? (
              <select name={name} defaultValue="" aria-invalid={Boolean(error)} className={cls}>
                <option value="">{t.choose}</option>
                {q.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : q.type === "textarea" ? (
              <textarea name={name} rows={3} maxLength={2000} aria-invalid={Boolean(error)} className={`${cls} min-h-24 py-2.5`} />
            ) : (
              <input
                name={name}
                type={q.type === "date" ? "date" : "text"}
                inputMode={q.type === "number" ? "decimal" : undefined}
                maxLength={q.type === "text" ? 200 : undefined}
                aria-invalid={Boolean(error)}
                className={cls}
              />
            )}
            {help}
            {problem}
          </label>
        );
      })}
    </fieldset>
  );
}

export function Field({
  label,
  error,
  ...input
}: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[13px] text-muted">
        {label}
        {input.required && <span className="text-bad"> *</span>}
      </span>
      <input {...input} aria-invalid={Boolean(error)} className={`${inputClass} ${error ? "border-bad" : ""}`} />
      {error && <span className="text-sm text-bad">{error}</span>}
    </label>
  );
}
