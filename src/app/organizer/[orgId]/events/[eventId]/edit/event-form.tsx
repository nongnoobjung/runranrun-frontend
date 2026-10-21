"use client";

import { useActionState, useTransition, type FormEvent } from "react";
import { Card, Field, FormMessage } from "@/components/backoffice";
import { buttonClass, inputClass } from "@/components/ui";
import { isoToBangkokInput, satangToInput } from "@/lib/form";
import type { OrgFormState } from "@/lib/org-actions";
import type { EventType } from "@/lib/types";
import { EVENT_TYPES } from "../../event-types";

export interface EventFormValues {
  slug: string;
  nameTh: string;
  nameEn: string | null;
  eventType: EventType;
  eventDate: string;
  provinceCode: string | null;
  venueName: string | null;
  venueAddress: string | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  holdMinutes: number;
  allowRefund: boolean;
  refundDeadline: string | null;
  refundPercentBps: number;
  waitlistEnabled: boolean;
  allowTransfer: boolean;
  transferFeeSatang: number;
  transferDeadline: string | null;
  allowRaceChange: boolean;
  raceChangeFeeSatang: number;
  raceChangeDeadline: string | null;
}

export function EventForm({
  action,
  event,
  slugLocked,
  readOnly,
  provinces,
  contentLink,
}: {
  action: (prev: OrgFormState, fd: FormData) => Promise<OrgFormState>;
  event: EventFormValues;
  slugLocked: boolean;
  readOnly: boolean;
  provinces: [string, string][];
  /** Where the description, rules, FAQ and images are edited. */
  contentLink: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [, startTransition] = useTransition();
  const err = (name: string) => state.fieldErrors?.[name];
  // A transition instead of the form action prop, so a rejected save does not wipe the form.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <fieldset disabled={readOnly} className="flex flex-col gap-4">
        <Card title="ชื่อและประเภท">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ชื่องาน (ภาษาไทย)" error={err("nameTh")}>
              <input name="nameTh" defaultValue={event.nameTh} maxLength={200} className={inputClass} />
            </Field>
            <Field label="ชื่องาน (English)" error={err("nameEn")}>
              <input name="nameEn" defaultValue={event.nameEn ?? ""} maxLength={200} className={inputClass} />
            </Field>
            <Field
              label="ลิงก์ของงาน"
              hint={slugLocked ? "เปลี่ยนไม่ได้หลังเปิดรับสมัคร เพราะลิงก์ถูกแชร์ออกไปแล้ว" : "ตัวอักษร a-z ตัวเลข และขีด (-)"}
              error={err("slug")}
            >
              <span className="flex items-center gap-1 text-sm text-muted">
                /events/
                <input name="slug" defaultValue={event.slug} disabled={slugLocked} maxLength={100} className={`${inputClass} disabled:bg-tint`} />
              </span>
            </Field>
            <Field label="ประเภทงาน" error={err("eventType")}>
              <select name="eventType" defaultValue={event.eventType} className={inputClass}>
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {contentLink}
        </Card>

        <Card title="วัน เวลา และสถานที่">
          <div id="basics" className="grid scroll-mt-6 gap-4 sm:grid-cols-2">
            <Field label="วันแข่ง" error={err("eventDate")}>
              <input name="eventDate" type="date" defaultValue={event.eventDate} className={inputClass} />
            </Field>
            <Field label="จังหวัด" error={err("provinceCode")}>
              <select name="provinceCode" defaultValue={event.provinceCode ?? ""} className={inputClass}>
                <option value="">ยังไม่เลือก</option>
                {provinces.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="สถานที่จัดงาน" error={err("venueName")}>
              <input name="venueName" defaultValue={event.venueName ?? ""} maxLength={200} className={inputClass} placeholder="เช่น สวนลุมพินี" />
            </Field>
            <Field label="ที่อยู่ / จุดนัดพบ" error={err("venueAddress")}>
              <input name="venueAddress" defaultValue={event.venueAddress ?? ""} maxLength={500} className={inputClass} />
            </Field>
          </div>
        </Card>

        <Card title="การรับสมัคร">
          <div id="window" className="grid scroll-mt-6 gap-4 sm:grid-cols-3">
            <Field label="เปิดรับสมัคร" hint="เวลาไทย" error={err("registrationOpensAt")}>
              <input
                name="registrationOpensAt"
                type="datetime-local"
                defaultValue={isoToBangkokInput(event.registrationOpensAt)}
                className={inputClass}
              />
            </Field>
            <Field label="ปิดรับสมัคร" hint="เวลาไทย" error={err("registrationClosesAt")}>
              <input
                name="registrationClosesAt"
                type="datetime-local"
                defaultValue={isoToBangkokInput(event.registrationClosesAt)}
                className={inputClass}
              />
            </Field>
            <Field label="จองที่ไว้ระหว่างกรอกข้อมูล (นาที)" hint="5–120 นาที" error={err("holdMinutes")}>
              <input name="holdMinutes" type="number" min={5} max={120} defaultValue={event.holdMinutes} className={inputClass} />
            </Field>
          </div>
        </Card>

        <Card title="คิว waitlist">
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input type="checkbox" name="waitlistEnabled" defaultChecked={event.waitlistEnabled} className="h-5 w-5 accent-brand" />
            ให้นักวิ่งเข้าคิวได้เมื่อระยะเต็ม
          </label>
          <p className="text-[13px] text-muted">ที่ว่างจากการยกเลิกหรือเพิ่มโควต้าจะเสนอให้คิวตามลำดับ คนละ 24 ชั่วโมงก่อนส่งต่อคิวถัดไป</p>
        </Card>

        <Card title="โอนสิทธิ์">
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input type="checkbox" name="allowTransfer" defaultChecked={event.allowTransfer} className="h-5 w-5 accent-brand" />
            ให้นักวิ่งโอนสิทธิ์ให้คนอื่นได้
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ค่าธรรมเนียมรับโอน (บาท)" hint="ผู้รับโอนจ่าย · 0 = ฟรี" error={err("transferFeeSatang")}>
              <input name="transferFee" type="number" min={0} step="any" inputMode="decimal" defaultValue={satangToInput(event.transferFeeSatang)} className={inputClass} />
            </Field>
            <Field label="โอนได้ถึง" hint="เวลาไทย · เว้นว่าง = จนถึงวันแข่ง" error={err("transferDeadline")}>
              <input name="transferDeadline" type="datetime-local" defaultValue={isoToBangkokInput(event.transferDeadline)} className={inputClass} />
            </Field>
          </div>
          <p className="text-[13px] text-muted">ผู้รับกรอกข้อมูลผู้วิ่งของตัวเอง สิทธิ์ เลขบิบ และไซซ์เสื้อย้ายไปทั้งหมด โอนไม่ได้หลังรับของหน้างาน</p>
        </Card>

        <Card title="เปลี่ยนระยะ">
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input type="checkbox" name="allowRaceChange" defaultChecked={event.allowRaceChange} className="h-5 w-5 accent-brand" />
            ให้นักวิ่งเปลี่ยนระยะเองได้
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ค่าธรรมเนียมเปลี่ยนระยะ (บาท)" hint="บวกกับส่วนต่างราคา · 0 = ฟรี" error={err("raceChangeFeeSatang")}>
              <input name="raceChangeFee" type="number" min={0} step="any" inputMode="decimal" defaultValue={satangToInput(event.raceChangeFeeSatang)} className={inputClass} />
            </Field>
            <Field label="เปลี่ยนได้ถึง" hint="เวลาไทย · เว้นว่าง = จนถึงวันแข่ง" error={err("raceChangeDeadline")}>
              <input name="raceChangeDeadline" type="datetime-local" defaultValue={isoToBangkokInput(event.raceChangeDeadline)} className={inputClass} />
            </Field>
          </div>
          <p className="text-[13px] text-muted">ไประยะที่แพงกว่าจ่ายส่วนต่างตามราคาที่เปิดขายตอนนั้น ไประยะที่ถูกกว่าไม่คืนส่วนต่าง ผู้จัดย้ายระยะให้เองได้ที่รายละเอียดผู้สมัคร</p>
        </Card>

        <Card title="นโยบายคืนเงิน">
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input type="checkbox" name="allowRefund" defaultChecked={event.allowRefund} className="h-5 w-5 accent-brand" />
            ให้นักวิ่งขอคืนเงินได้
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="คืนกี่ % ของค่าสมัคร" hint="ค่าธรรมเนียมชำระเงินไม่คืน" error={err("refundPercentBps")}>
              <input
                name="refundPercent"
                type="number"
                min={0}
                max={100}
                step="any"
                defaultValue={event.refundPercentBps / 100}
                className={inputClass}
              />
            </Field>
            <Field label="ขอคืนได้ถึง" hint="เวลาไทย · เว้นว่าง = จนถึงวันแข่ง" error={err("refundDeadline")}>
              <input name="refundDeadline" type="datetime-local" defaultValue={isoToBangkokInput(event.refundDeadline)} className={inputClass} />
            </Field>
          </div>
        </Card>
      </fieldset>

      {!readOnly && (
        <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 bg-tint/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
          <FormMessage state={state} />
          <div>
            <button type="submit" disabled={pending} className={buttonClass}>
              {pending ? "กำลังบันทึก…" : "บันทึกข้อมูลงาน"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
