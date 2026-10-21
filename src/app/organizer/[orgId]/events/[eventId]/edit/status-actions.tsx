"use client";

import { useActionState, type FormEvent } from "react";
import { FormMessage } from "@/components/backoffice";
import { buttonClass, ghostButtonClass } from "@/components/ui";
import type { EventStatus } from "@/lib/org";
import type { OrgFormState } from "@/lib/org-actions";

type StatusAction = (prev: OrgFormState) => Promise<OrgFormState>;

/** Open or close registration. Closing asks first, since runners mid-checkout are turned away. */
export function StatusActions({
  status,
  ready,
  publish,
  close,
}: {
  status: EventStatus;
  ready: boolean;
  publish: StatusAction;
  close: StatusAction;
}) {
  // One state for both buttons, so the message always belongs to the last thing done.
  const [state, formAction, pending] = useActionState(
    (prev: OrgFormState, fd: FormData) => (fd.get("intent") === "close" ? close(prev) : publish(prev)),
    {},
  );
  const canPublish = status === "draft" || status === "closed";

  const confirmClose = (e: FormEvent<HTMLFormElement>) => {
    if (!window.confirm("ปิดรับสมัครตอนนี้? นักวิ่งจะสมัครเพิ่มไม่ได้จนกว่าคุณจะเปิดอีกครั้ง")) e.preventDefault();
  };

  return (
    <div className="flex flex-col gap-3">
      {canPublish && (
        <form action={formAction}>
          <input type="hidden" name="intent" value="publish" />
          <button type="submit" disabled={!ready || pending} className={`${buttonClass} w-full`}>
            {pending ? "กำลังเปิด…" : status === "closed" ? "เปิดรับสมัครอีกครั้ง" : "เปิดรับสมัคร"}
          </button>
        </form>
      )}
      {canPublish && !ready && <p className="text-[13px] text-muted">ทำรายการที่ยังขาดด้านบนให้ครบก่อน จึงจะเปิดรับสมัครได้</p>}
      {status === "published" && (
        <form action={formAction} onSubmit={confirmClose}>
          <input type="hidden" name="intent" value="close" />
          <button type="submit" disabled={pending} className={`${ghostButtonClass} w-full`}>
            {pending ? "กำลังปิด…" : "ปิดรับสมัคร"}
          </button>
        </form>
      )}
      <FormMessage state={state} />
    </div>
  );
}
