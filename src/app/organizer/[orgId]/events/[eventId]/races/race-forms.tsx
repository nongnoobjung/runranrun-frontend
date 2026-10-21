"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { dangerButtonClass, Field, FormMessage, smallButtonClass, smallGhostButtonClass } from "@/components/backoffice";
import { inputClass } from "@/components/ui";
import { isoToBangkokInput, satangToInput } from "@/lib/form";
import { baht, fmt } from "@/lib/format";
import type { OrgRace, PriceTier } from "@/lib/org";
import type { OrgFormState } from "@/lib/org-actions";

type FormAction = (prev: OrgFormState, fd: FormData) => Promise<OrgFormState>;
type ButtonAction = (prev: OrgFormState) => Promise<OrgFormState>;

/**
 * Runs a form action inside a transition rather than through the form's action prop, so a
 * rejected submit keeps what was typed. `onSuccess` runs after each successful save.
 */
function useKeepForm(action: FormAction, onSuccess?: () => void) {
  const [state, formAction, pending] = useActionState(action, {});
  const [, startTransition] = useTransition();
  const success = useRef(onSuccess);
  useEffect(() => {
    success.current = onSuccess;
  });
  useEffect(() => {
    if (state.notice) success.current?.();
  }, [state]);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };
  return { state, onSubmit, pending, err: (name: string) => state.fieldErrors?.[name] };
}

function RaceFields({ race, err }: { race?: OrgRace; err: (name: string) => string | undefined }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="ชื่อย่อ" hint="เช่น 21K, 10K" error={err("code")}>
        <input name="code" defaultValue={race?.code} maxLength={20} className={inputClass} />
      </Field>
      <Field label="ชื่อระยะ" error={err("nameTh")} className="sm:col-span-1 lg:col-span-3">
        <input name="nameTh" defaultValue={race?.nameTh} maxLength={100} className={inputClass} placeholder="ฮาล์ฟมาราธอน 21.1 กม." />
      </Field>
      <Field label="ระยะทาง (กม.)" error={err("distanceKm")}>
        <input name="distanceKm" inputMode="decimal" defaultValue={race?.distanceKm} className={inputClass} />
      </Field>
      <Field label="โควต้า (คน)" error={err("capacity")}>
        <input name="capacity" inputMode="numeric" defaultValue={race?.capacity} className={inputClass} />
      </Field>
      <Field label="ปล่อยตัว" hint="เวลาไทย" error={err("startAt")}>
        <input name="startAt" type="datetime-local" defaultValue={isoToBangkokInput(race?.startAt)} className={inputClass} />
      </Field>
      <Field label="Cut-off (ชั่วโมง)" error={err("cutoffMinutes")}>
        <input
          name="cutoffHours"
          inputMode="decimal"
          defaultValue={race?.cutoffMinutes ? String(race.cutoffMinutes / 60) : ""}
          className={inputClass}
        />
      </Field>
      <Field label="อายุขั้นต่ำ" error={err("ageMin")}>
        <input name="ageMin" inputMode="numeric" defaultValue={race?.ageMin ?? ""} className={inputClass} />
      </Field>
      <Field label="ตัวนำหน้าบิบ" hint="ไม่บังคับ เช่น A" error={err("bibPrefix")}>
        <input name="bibPrefix" defaultValue={race?.bibPrefix ?? ""} maxLength={5} className={inputClass} />
      </Field>
      <Field
        label="บิบเลขแรก"
        hint={race?.bibNext != null ? "ออกบิบไปแล้ว เปลี่ยนเลขแรกไม่ได้" : undefined}
        error={err("bibStart")}
      >
        <input name="bibStart" inputMode="numeric" defaultValue={race?.bibStart ?? ""} readOnly={race?.bibNext != null} className={`${inputClass} read-only:bg-tint`} />
      </Field>
      <Field label="บิบเลขสุดท้าย" error={err("bibEnd")}>
        <input name="bibEnd" inputMode="numeric" defaultValue={race?.bibEnd ?? ""} className={inputClass} />
      </Field>
    </div>
  );
}

export function AddRaceForm({ action }: { action: FormAction }) {
  const formRef = useRef<HTMLFormElement>(null);
  const details = useRef<HTMLDetailsElement>(null);
  const { state, onSubmit, pending, err } = useKeepForm(action, () => {
    formRef.current?.reset();
    if (details.current) details.current.open = false;
  });
  return (
    <details ref={details} className="group rounded-[28px] bg-white p-5 sm:p-6">
      <summary className="cursor-pointer list-none text-lg font-semibold text-brand [&::-webkit-details-marker]:hidden">+ เพิ่มระยะ</summary>
      <form ref={formRef} onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-4">
        <RaceFields err={err} />
        <FormMessage state={state.notice ? undefined : state} />
        <div>
          <button type="submit" disabled={pending} className={smallButtonClass}>
            {pending ? "กำลังเพิ่ม…" : "เพิ่มระยะ"}
          </button>
        </div>
      </form>
      {state.notice && <p role="status" className="sr-only">{state.notice}</p>}
    </details>
  );
}

export function EditRaceForm({ action, race }: { action: FormAction; race: OrgRace }) {
  const { state, onSubmit, pending, err } = useKeepForm(action);
  return (
    <details className="rounded-2xl border border-line px-4 py-3">
      <summary className="cursor-pointer text-sm font-semibold text-brand">แก้ไขรายละเอียดระยะ</summary>
      <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-4">
        <RaceFields race={race} err={err} />
        <FormMessage state={state} />
        <div>
          <button type="submit" disabled={pending} className={smallButtonClass}>
            {pending ? "กำลังบันทึก…" : "บันทึกระยะนี้"}
          </button>
        </div>
      </form>
    </details>
  );
}

/** A delete button that asks first and shows why the API refused, if it did. */
export function DeleteButton({ action, confirmText, label }: { action: ButtonAction; confirmText: string; label: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
      className="flex flex-col items-end gap-2"
    >
      <button type="submit" disabled={pending} className={dangerButtonClass}>
        {pending ? "กำลังลบ…" : label}
      </button>
      {state.error && (
        <p role="alert" className="max-w-xs text-right text-[13px] text-bad">
          {state.error}
        </p>
      )}
    </form>
  );
}

function TierFields({ tier, err }: { tier?: PriceTier; err: (name: string) => string | undefined }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Field label="ชื่อช่วง" error={err("name")}>
        <input name="name" defaultValue={tier?.name} maxLength={60} className={inputClass} placeholder="Early bird" />
      </Field>
      <Field label="ราคา (บาท)" error={err("priceSatang")}>
        <input name="price" inputMode="decimal" defaultValue={satangToInput(tier?.priceSatang)} className={inputClass} />
      </Field>
      <Field label="เริ่มขาย" error={err("startsAt")}>
        <input name="startsAt" type="datetime-local" defaultValue={isoToBangkokInput(tier?.startsAt)} className={inputClass} />
      </Field>
      <Field label="ขายถึง" error={err("endsAt")}>
        <input name="endsAt" type="datetime-local" defaultValue={isoToBangkokInput(tier?.endsAt)} className={inputClass} />
      </Field>
      <Field label="โควต้าช่วงนี้" hint="เว้นว่าง = ไม่จำกัด" error={err("quota")}>
        <input name="quota" inputMode="numeric" defaultValue={tier?.quota ?? ""} className={inputClass} />
      </Field>
    </div>
  );
}

export type TierState = "selling" | "upcoming" | "ended" | "full";

const TIER_STATE: Record<TierState, { label: string; className: string }> = {
  selling: { label: "กำลังขาย", className: "bg-ok-soft text-ok" },
  upcoming: { label: "ยังไม่เริ่ม", className: "bg-ice text-muted" },
  ended: { label: "หมดช่วงแล้ว", className: "bg-ice text-muted" },
  full: { label: "เต็มโควต้า", className: "bg-warn-soft text-warn" },
};

const when = (iso: string) => `${fmt.date(iso)} ${fmt.time(iso)}`;

export function TierRow({
  tier,
  tierState,
  update,
  remove,
  canEdit,
}: {
  tier: PriceTier;
  tierState: TierState;
  update: FormAction;
  remove: ButtonAction;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const { state, onSubmit, pending, err } = useKeepForm(update, () => setEditing(false));
  const s = TIER_STATE[tierState];

  if (editing) {
    return (
      <li className="rounded-2xl bg-tint p-4">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
          <TierFields tier={tier} err={err} />
          <FormMessage state={state} />
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={smallButtonClass}>
              {pending ? "กำลังบันทึก…" : "บันทึก"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={smallGhostButtonClass}>
              ยกเลิก
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="grid grid-cols-2 items-center gap-x-4 gap-y-1 border-t border-line py-3 text-sm sm:grid-cols-[1.2fr_0.8fr_2fr_1fr_auto]">
      <b className="font-semibold">{tier.name}</b>
      <span className="text-right font-semibold tabular-nums sm:text-left">{baht(tier.priceSatang)}</span>
      <span className="col-span-2 text-muted sm:col-span-1">
        {when(tier.startsAt)} – {when(tier.endsAt)}
      </span>
      <span className="tabular-nums">
        ขาย {tier.sold.toLocaleString("th-TH")}
        {tier.quota !== null ? ` / ${tier.quota.toLocaleString("th-TH")}` : " · ไม่จำกัด"}
        {tier.reserved > 0 && <span className="text-muted"> · จอง {tier.reserved}</span>}
      </span>
      <span className="flex items-center justify-end gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${s.className}`}>{s.label}</span>
        {canEdit && (
          <>
            <button type="button" onClick={() => setEditing(true)} className="px-1 text-sm text-brand hover:underline">
              แก้ไข
            </button>
            {tier.sold + tier.reserved === 0 && (
              <DeleteButton action={remove} confirmText={`ลบช่วงราคา “${tier.name}”?`} label="ลบ" />
            )}
          </>
        )}
      </span>
    </li>
  );
}

export function AddTierForm({ action }: { action: FormAction }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const { state, onSubmit, pending, err } = useKeepForm(action, () => {
    formRef.current?.reset();
    setOpen(false);
  });
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${smallGhostButtonClass} self-start`}>
        + เพิ่มช่วงราคา
      </button>
    );
  }
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-3 rounded-2xl bg-tint p-4">
      <TierFields err={err} />
      <FormMessage state={state.notice ? undefined : state} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={smallButtonClass}>
          {pending ? "กำลังเพิ่ม…" : "เพิ่มช่วงราคา"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={smallGhostButtonClass}>
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
