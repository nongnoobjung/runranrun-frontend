"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";
import { submitCheckout, type FormState } from "@/app/actions";
import { Countdown } from "@/components/countdown";
import { Field, Questions, RunnerFields } from "@/components/runner-fields";
import { buttonClass, ErrorNote } from "@/components/ui";
import { baht } from "@/lib/format";
import type { FormQuestion } from "@/lib/types";

export interface Slot {
  raceId: string;
  code: string;
  priceSatang: number;
  tierName: string;
}

export interface SizeOption {
  id: string;
  label: string;
  chestIn?: number;
  soldOut: boolean;
}

export function CheckoutForm({
  sessionId,
  eventName,
  expiresAt,
  slots,
  sizes,
  questions,
}: {
  sessionId: string;
  eventName: string;
  expiresAt: string;
  slots: Slot[];
  sizes: SizeOption[];
  questions: FormQuestion[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(submitCheckout, {});
  const [, startTransition] = useTransition();
  const [active, setActive] = useState(0);
  const [expired, setExpired] = useState(false);
  const err = (name: string) => state.fieldErrors?.[name];

  // Submit through a transition instead of <form action>, so React does not reset
  // what the runner typed when the server sends back a validation error.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  // Runners whose tab gets a red ring because something in their part of the form needs fixing.
  const withErrors = new Set(Object.keys(state.fieldErrors ?? {}).map((k) => k.match(/^p(\d+)\./)?.[1]));
  const total = slots.reduce((s, x) => s + x.priceSatang, 0);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="count" value={slots.length} />
      <input type="hidden" name="needsShirt" value={sizes.length > 0 ? "1" : "0"} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-white px-4 py-3">
        <div>
          <div className="font-semibold">{eventName}</div>
          <div className="text-[13px] text-muted">ขั้น 2 จาก 3 · ข้อมูลผู้วิ่ง</div>
        </div>
        <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${expired ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn"}`}>
          {expired ? "หมดเวลาจองที่" : <>จองที่ไว้ <Countdown until={expiresAt} onExpire={() => setExpired(true)} /></>}
        </span>
      </div>

      {slots.length > 1 && (
        <div role="tablist" aria-label="ผู้วิ่ง" className="flex gap-2 overflow-x-auto">
          {slots.map((s, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={active === i}
              onClick={() => setActive(i)}
              className={`flex min-h-12 flex-none items-center gap-2 rounded-full border-2 bg-white py-1 pl-1.5 pr-4 ${active === i ? "border-brand" : "border-white"} ${withErrors.has(String(i)) ? "ring-2 ring-bad" : ""}`}
            >
              <span className={`grid h-9 w-9 place-items-center rounded-full font-semibold ${active === i ? "bg-brand text-white" : "bg-ice text-brand"}`}>{i + 1}</span>
              <span className="text-left leading-tight">
                <b className="font-semibold">ผู้วิ่ง {i + 1}</b>
                <br />
                <span className="text-xs text-muted">{s.code}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {slots.map((s, i) => (
        <section key={i} hidden={active !== i} aria-label={`ผู้วิ่งคนที่ ${i + 1}`} className="flex flex-col gap-4">
          <input type="hidden" name={`p${i}.raceId`} value={s.raceId} />
          <div className="flex flex-col gap-3 rounded-card bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                ผู้วิ่ง {i + 1} · {s.code}
              </h2>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="self" value={String(i)} defaultChecked={i === 0} className="h-5 w-5 accent-brand" />
                นี่คือฉัน
              </label>
            </div>
            <RunnerFields prefix={`p${i}`} err={err} />
          </div>

          {sizes.length > 0 && (
            <fieldset className="flex flex-col gap-3 rounded-card bg-white p-5">
              <legend className="sr-only">ไซซ์เสื้อ ผู้วิ่ง {i + 1}</legend>
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold">ไซซ์เสื้อ</h3>
                <span className="text-xs text-muted">ตัวเลข = รอบอก (นิ้ว)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {sizes.map((z) => (
                  <label key={z.id} className={`relative ${z.soldOut ? "cursor-not-allowed" : "cursor-pointer"}`}>
                    <input type="radio" name={`p${i}.shirt`} value={z.id} disabled={z.soldOut} className="peer sr-only" />
                    <span className="flex min-h-14 flex-col items-center justify-center rounded-2xl bg-ice leading-tight peer-checked:bg-brand peer-checked:text-white peer-disabled:bg-tint peer-disabled:text-muted peer-disabled:line-through peer-focus-visible:outline-2 peer-focus-visible:outline-brand">
                      <b className="font-semibold">{z.label}</b>
                      <span className="text-xs">{z.soldOut ? "หมด" : z.chestIn ? `${z.chestIn}"` : ""}</span>
                    </span>
                  </label>
                ))}
              </div>
              {err(`p${i}.shirt`) && <span className="text-sm text-bad">{err(`p${i}.shirt`)}</span>}
            </fieldset>
          )}

          <Questions index={i} questions={questions.filter((q) => !q.raceIds || q.raceIds.includes(s.raceId))} err={err} />

          {i < slots.length - 1 && (
            <button type="button" onClick={() => setActive(i + 1)} className="self-end font-semibold text-brand">
              ผู้วิ่งคนถัดไป →
            </button>
          )}
        </section>
      ))}

      <section className="flex flex-col gap-3 rounded-card bg-white p-5">
        <h2 className="text-lg font-semibold">ผู้ชำระเงิน</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="ชื่อ-นามสกุล" name="buyer.name" error={err("buyer.name")} required autoComplete="name" />
          <Field label="อีเมล (รับใบเสร็จ)" name="buyer.email" type="email" error={err("buyer.email")} required autoComplete="email" />
          <Field label="เบอร์โทร" name="buyer.phone" type="tel" error={err("buyer.phone")} required autoComplete="tel" />
        </div>
        <Field label="โค้ดส่วนลด (ถ้ามี)" name="coupon" placeholder="เช่น RUN10" />
      </section>

      <ErrorNote message={state.error} />

      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 rounded-t-card bg-white px-4 pb-5 pt-3.5 shadow-[0_-8px_24px_rgba(14,42,71,.08)] sm:mx-0 sm:rounded-card">
        <div className="flex-1 leading-tight">
          <div className="text-xs text-muted">{slots.length} ผู้วิ่ง · ก่อนส่วนลดและค่าธรรมเนียม</div>
          <div className="text-2xl font-bold tabular-nums">{baht(total)}</div>
        </div>
        <button type="submit" disabled={pending || expired} className={buttonClass}>
          {pending ? "กำลังสร้างคำสั่งซื้อ…" : "ไปชำระเงิน"}
        </button>
      </div>
    </form>
  );
}
