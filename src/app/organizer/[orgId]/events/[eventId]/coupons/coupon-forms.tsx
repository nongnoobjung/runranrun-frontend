"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, smallButtonClass, smallGhostButtonClass } from "@/components/backoffice";
import { SubmitButton } from "@/components/submit-button";
import { inputClass } from "@/components/ui";
import { isoToBangkokInput, satangToInput } from "@/lib/form";
import type { Coupon } from "@/lib/org";
import type { OrgFormState } from "@/lib/org-actions";
import { createCoupon, setCouponActive, updateCoupon } from "./actions";

type FieldErrors = Record<string, string> | undefined;

/** The fields shared by create and edit. `locked` disables the discount once runners have used the code. */
function CouponFields({ coupon, errors, locked = false }: { coupon?: Coupon; errors: FieldErrors; locked?: boolean }) {
  const [type, setType] = useState<"percent" | "fixed">(coupon?.discountType ?? "percent");
  const value = coupon ? (coupon.discountType === "percent" ? String(coupon.discountValue / 100) : satangToInput(coupon.discountValue)) : "";
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {!coupon && (
        <Field label="โค้ด" hint="ตัวอักษรอังกฤษ ตัวเลข - หรือ _ 3–30 ตัว" error={errors?.code}>
          <input name="code" required minLength={3} maxLength={30} pattern="[A-Za-z0-9_\-]{3,30}" className={`${inputClass} uppercase`} placeholder="EARLY10" />
        </Field>
      )}
      <Field label="รายละเอียด (ไม่บังคับ)" error={errors?.description} className={coupon ? "sm:col-span-2 lg:col-span-3" : "sm:col-span-1 lg:col-span-2"}>
        <input name="description" maxLength={200} defaultValue={coupon?.description ?? ""} className={inputClass} placeholder="เช่น สำหรับสมาชิกชมรม" />
      </Field>
      <Field label="ประเภทส่วนลด" error={errors?.discountType}>
        <select
          name="discountType"
          value={type}
          onChange={(e) => setType(e.target.value as "percent" | "fixed")}
          disabled={locked}
          className={inputClass}
        >
          <option value="percent">เปอร์เซ็นต์</option>
          <option value="fixed">จำนวนเงิน</option>
        </select>
      </Field>
      <Field label={type === "percent" ? "ส่วนลด (%)" : "ส่วนลด (บาท)"} error={errors?.discountValue} hint={locked ? "มีคนใช้โค้ดแล้ว แก้ส่วนลดไม่ได้" : undefined}>
        <input
          name="discountValue"
          inputMode="decimal"
          required={!locked}
          disabled={locked}
          defaultValue={value}
          className={inputClass}
          placeholder={type === "percent" ? "10" : "100"}
        />
      </Field>
      <Field label="ลดสูงสุด (บาท)" hint={type === "percent" ? "เว้นว่าง = ไม่จำกัด" : "ใช้กับส่วนลดแบบเปอร์เซ็นต์"} error={errors?.maxDiscountSatang}>
        <input
          name="maxDiscount"
          inputMode="decimal"
          disabled={locked || type !== "percent"}
          defaultValue={satangToInput(coupon?.maxDiscountSatang)}
          className={inputClass}
        />
      </Field>
      <Field label="จำนวนสิทธิ์ทั้งหมด" hint="เว้นว่าง = ไม่จำกัด" error={errors?.usageLimit}>
        <input name="usageLimit" type="number" min={1} defaultValue={coupon?.usageLimit ?? ""} className={inputClass} />
      </Field>
      <Field label="ใช้ได้ต่อคน" hint="เว้นว่าง = ไม่จำกัด" error={errors?.usagePerUser}>
        <input name="usagePerUser" type="number" min={1} defaultValue={coupon?.usagePerUser ?? ""} className={inputClass} />
      </Field>
      <Field label="เริ่มใช้ได้" hint="เว้นว่าง = ใช้ได้ทันที" error={errors?.startsAt}>
        <input name="startsAt" type="datetime-local" defaultValue={isoToBangkokInput(coupon?.startsAt)} className={inputClass} />
      </Field>
      <Field label="หมดอายุ" hint="เว้นว่าง = ไม่หมดอายุ" error={errors?.endsAt}>
        <input name="endsAt" type="datetime-local" defaultValue={isoToBangkokInput(coupon?.endsAt)} className={inputClass} />
      </Field>
    </div>
  );
}

export function CreateCouponForm({ orgId, eventId }: { orgId: string; eventId: string }) {
  const [state, action] = useActionState<OrgFormState, FormData>(createCoupon.bind(null, orgId, eventId), {});
  // Remount the fields after each successful create so the form starts empty again.
  const [round, setRound] = useState(0);
  const [lastNotice, setLastNotice] = useState<string | undefined>();
  if (state.notice && state.notice !== lastNotice) {
    setLastNotice(state.notice);
    setRound((r) => r + 1);
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <CouponFields key={round} errors={state.fieldErrors} />
      <FormMessage state={state} />
      <div>
        <SubmitButton className={smallButtonClass} pendingLabel="กำลังสร้าง…">
          สร้างโค้ด
        </SubmitButton>
      </div>
    </form>
  );
}

export function EditCouponForm({ orgId, eventId, coupon }: { orgId: string; eventId: string; coupon: Coupon }) {
  const [state, action] = useActionState<OrgFormState, FormData>(updateCoupon.bind(null, orgId, eventId, coupon.id, coupon.used), {});
  return (
    <form action={action} className="flex flex-col gap-4 pt-3">
      <CouponFields coupon={coupon} errors={state.fieldErrors} locked={coupon.used > 0} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={coupon.isActive} className="h-4 w-4 accent-brand" />
        เปิดให้ใช้โค้ดนี้
      </label>
      <FormMessage state={state} />
      <div>
        <SubmitButton className={smallButtonClass}>บันทึก</SubmitButton>
      </div>
    </form>
  );
}

export function ToggleCouponButton({ orgId, eventId, coupon }: { orgId: string; eventId: string; coupon: Coupon }) {
  return (
    <form action={setCouponActive.bind(null, orgId, eventId, coupon.id, !coupon.isActive)}>
      <SubmitButton className={smallGhostButtonClass} pendingLabel="…">
        {coupon.isActive ? "ปิดใช้" : "เปิดใช้"}
      </SubmitButton>
    </form>
  );
}
