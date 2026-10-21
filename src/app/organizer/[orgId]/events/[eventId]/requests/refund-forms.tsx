"use client";

import { useActionState, useState, useTransition } from "react";
import { dangerButtonClass, Field, FormMessage, smallButtonClass, smallGhostButtonClass } from "@/components/backoffice";
import { SubmitButton } from "@/components/submit-button";
import { inputClass } from "@/components/ui";
import type { OrgFormState } from "@/lib/org-actions";
import { approveRefund, cancelRegistration, markTransferred, rejectRefund } from "./actions";

type Ids = { orgId: string; eventId: string; refundId: string };

/** Approve, or open a small form to reject with a note the runner will see. */
export function DecideRefund({ orgId, eventId, refundId, amountLabel }: Ids & { amountLabel: string }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<OrgFormState>({});
  const [rejecting, setRejecting] = useState(false);
  const [rejectState, rejectAction] = useActionState<OrgFormState, FormData>(rejectRefund.bind(null, orgId, eventId, refundId), {});
  return (
    <div className="flex flex-col gap-2">
      {rejecting ? (
        <form action={rejectAction} className="flex flex-col gap-2">
          <Field label="เหตุผลที่ปฏิเสธ" error={rejectState.fieldErrors?.note}>
            <input name="note" maxLength={500} required className={`${inputClass} min-h-10`} placeholder="เช่น เลยกำหนดตามนโยบาย" />
          </Field>
          <div className="flex flex-wrap gap-2">
            <SubmitButton className={dangerButtonClass} pendingLabel="…">
              ปฏิเสธคำขอ
            </SubmitButton>
            <button type="button" onClick={() => setRejecting(false)} className={smallGhostButtonClass}>
              ยกเลิก
            </button>
          </div>
          <FormMessage state={rejectState} />
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(async () => setState(await approveRefund(orgId, eventId, refundId)))}
            className={smallButtonClass}
          >
            {pending ? "กำลังอนุมัติ…" : `อนุมัติคืน ${amountLabel}`}
          </button>
          <button type="button" disabled={pending} onClick={() => setRejecting(true)} className={smallGhostButtonClass}>
            ปฏิเสธ
          </button>
        </div>
      )}
      <FormMessage state={state} />
    </div>
  );
}

export function TransferredForm({ orgId, eventId, refundId }: Ids) {
  const [state, action] = useActionState<OrgFormState, FormData>(markTransferred.bind(null, orgId, eventId, refundId), {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="เลขอ้างอิงการโอน" error={state.fieldErrors?.reference} className="min-w-0 flex-1">
          <input name="reference" maxLength={100} required className={`${inputClass} min-h-10`} placeholder="จากสลิปโอนเงิน" />
        </Field>
        <SubmitButton className={smallButtonClass} pendingLabel="…">
          บันทึกว่าโอนคืนแล้ว
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

/** On the runner detail: cancel a paid place, paying back what the organiser types (default: the policy amount). */
export function CancelRegistrationForm({
  orgId,
  eventId,
  registrationId,
  defaultRefund,
  maxRefund,
}: {
  orgId: string;
  eventId: string;
  registrationId: string;
  defaultRefund: number;
  maxRefund: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<OrgFormState, FormData>(cancelRegistration.bind(null, orgId, eventId, registrationId), {});
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${smallGhostButtonClass} self-start`}>
        ยกเลิกสิทธิ์ / คืนเงิน
      </button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3 rounded-[20px] bg-bad-soft/50 p-4">
      <Field label="คืนเงิน (บาท)" hint={`สูงสุด ${(maxRefund / 100).toLocaleString("th-TH")} บาท · 0 = ยกเลิกโดยไม่คืนเงิน`} error={state.fieldErrors?.refundSatang}>
        <input name="refund" inputMode="decimal" defaultValue={defaultRefund / 100} className={`${inputClass} min-h-10`} />
      </Field>
      <Field label="เหตุผล" error={state.fieldErrors?.reason}>
        <input name="reason" required maxLength={500} className={`${inputClass} min-h-10`} placeholder="เช่น สมัครซ้ำ, นักวิ่งแจ้งยกเลิกทางโทรศัพท์" />
      </Field>
      <p className="text-[13px] text-muted">สิทธิ์ บิบ และ QR ใช้ไม่ได้ทันที ที่ว่างกลับไปเปิดขาย ย้อนกลับไม่ได้</p>
      <div className="flex flex-wrap gap-2">
        <SubmitButton className={dangerButtonClass} pendingLabel="กำลังยกเลิก…">
          ยืนยันยกเลิกสิทธิ์
        </SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className={smallGhostButtonClass}>
          ไม่ใช่
        </button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
