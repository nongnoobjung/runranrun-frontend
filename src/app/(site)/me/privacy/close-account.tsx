"use client";

import { useActionState, useState } from "react";
import { closeAccount, type FormState } from "@/app/actions";
import { ErrorNote } from "@/components/ui";

/** Closing the account asks for a tick first, since it cannot be undone. */
export function CloseAccountForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(closeAccount, {});
  const [sure, setSure] = useState(false);
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="confirm" value="1" checked={sure} onChange={(e) => setSure(e.target.checked)} className="mt-0.5 h-5 w-5 flex-none accent-brand" />
        เข้าใจแล้วว่าปิดบัญชีแล้วกู้คืนไม่ได้ ผู้วิ่งที่บันทึกไว้จะถูกลบ และเข้าดูบัตรวิ่งเก่าไม่ได้อีก
      </label>
      <ErrorNote message={state.error} />
      <button
        type="submit"
        disabled={!sure || pending}
        className="inline-flex min-h-11 items-center justify-center self-start rounded-full bg-bad-soft px-5 text-sm font-semibold text-bad hover:bg-bad hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "กำลังปิดบัญชี…" : "ปิดบัญชี"}
      </button>
    </form>
  );
}
