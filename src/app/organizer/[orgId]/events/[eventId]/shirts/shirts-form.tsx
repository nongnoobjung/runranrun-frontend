"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";
import {
  Field,
  FormMessage,
  smallGhostButtonClass,
} from "@/components/backoffice";
import { buttonClass, inputClass } from "@/components/ui";
import type { ShirtSize } from "@/lib/org";
import type { OrgFormState } from "@/lib/org-actions";

interface Row {
  key: string;
  label: string;
  chestIn: number | null;
  stock: number | null;
  ordered: number;
}

const STARTER = ["S", "M", "L", "XL"];

export function ShirtsForm({
  action,
  nameTh,
  sizes,
  readOnly,
}: {
  action: (prev: OrgFormState, fd: FormData) => Promise<OrgFormState>;
  nameTh: string;
  sizes: ShirtSize[];
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [, startTransition] = useTransition();
  const [rows, setRows] = useState<Row[]>(() =>
    sizes.length > 0
      ? sizes.map((s) => ({
          key: s.id,
          label: s.label,
          chestIn: s.chestIn,
          stock: s.stock,
          ordered: s.sold + s.reserved,
        }))
      : STARTER.map((label) => ({
          key: label,
          label,
          chestIn: null,
          stock: null,
          ordered: 0,
        })),
  );
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    // Catch the commonest mistake here, where we know which size it is.
    const stocks = data.getAll("stock").map((v) => String(v).trim());
    const errors: Record<number, string> = {};
    rows.forEach((r, i) => {
      if (stocks[i] !== "" && Number(stocks[i]) < r.ordered)
        errors[i] = `สั่งไปแล้ว ${r.ordered} ตัว สต็อกต้องไม่น้อยกว่านี้`;
    });
    setRowErrors(errors);
    if (Object.keys(errors).length > 0) return;
    startTransition(() => formAction(data));
  };

  const err = (i: number, field: string) =>
    rowErrors[i] && field === "stock"
      ? rowErrors[i]
      : state.fieldErrors?.[`sizes.${i}.${field}`];

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <fieldset disabled={readOnly} className="flex flex-col gap-5">
        <Field
          label="ชื่อสินค้า"
          error={state.fieldErrors?.nameTh}
          className="max-w-md"
        >
          <input
            name="nameTh"
            defaultValue={nameTh}
            maxLength={100}
            className={inputClass}
          />
        </Field>

        <div className="flex flex-col gap-2">
          <div className="hidden grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 px-1 text-[13px] text-muted sm:grid">
            <span>ไซซ์</span>
            <span>รอบอก (นิ้ว)</span>
            <span>สต็อก (เว้นว่าง = ไม่จำกัด)</span>
            <span>สั่งแล้ว</span>
            <span className="w-14" />
          </div>
          <ul className="flex flex-col gap-2">
            {rows.map((r, i) => {
              // Sold and stock figures come from the server so they stay current after a save.
              const live = sizes.find((s) => s.label === r.label);
              const ordered = live ? live.sold + live.reserved : 0;
              return (
                <li
                  key={r.key}
                  className="grid grid-cols-3 items-start gap-x-2 gap-y-1 rounded-2xl bg-tint p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:gap-3 sm:bg-transparent sm:p-0"
                >
                  <label className="flex flex-col gap-1">
                    <span className="text-[13px] text-muted sm:sr-only">
                      ไซซ์
                    </span>
                    <input
                      name="label"
                      defaultValue={r.label}
                      maxLength={10}
                      aria-label={`ไซซ์แถวที่ ${i + 1}`}
                      className={`${inputClass} uppercase`}
                    />
                    {err(i, "label") && (
                      <span className="text-[13px] text-bad">
                        {err(i, "label")}
                      </span>
                    )}
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[13px] text-muted sm:sr-only">
                      รอบอก (นิ้ว)
                    </span>
                    <input
                      name="chestIn"
                      inputMode="decimal"
                      defaultValue={r.chestIn ?? ""}
                      className={inputClass}
                    />
                    {err(i, "chestIn") && (
                      <span className="text-[13px] text-bad">
                        {err(i, "chestIn")}
                      </span>
                    )}
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[13px] text-muted sm:sr-only">
                      สต็อก
                    </span>
                    <input
                      name="stock"
                      inputMode="numeric"
                      defaultValue={r.stock ?? ""}
                      placeholder="ไม่จำกัด"
                      className={inputClass}
                    />
                    {err(i, "stock") && (
                      <span className="text-[13px] text-bad">
                        {err(i, "stock")}
                      </span>
                    )}
                  </label>
                  <span className="col-span-2 flex flex-wrap items-baseline gap-x-2 text-sm tabular-nums sm:col-span-1 sm:min-h-12 sm:flex-col sm:justify-center sm:gap-0">
                    <span className="text-[13px] text-muted sm:sr-only">
                      สั่งแล้ว
                    </span>
                    {ordered.toLocaleString("th-TH")}
                    {live && live.stock !== null && (
                      <span className="text-[13px] text-muted">
                        เหลือ {(live.stock - ordered).toLocaleString("th-TH")}
                      </span>
                    )}
                  </span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        setRows((all) => all.filter((x) => x.key !== r.key))
                      }
                      disabled={rows.length === 1}
                      className="min-h-10 justify-self-end px-2 text-sm text-bad hover:underline disabled:opacity-40 sm:min-h-12 sm:w-14"
                      aria-label={`ลบไซซ์ ${r.label || `แถวที่ ${i + 1}`}`}
                    >
                      ลบ
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {state.fieldErrors?.sizes && (
            <p className="text-[13px] text-bad">ชื่อไซซ์ต้องไม่ซ้ำกัน</p>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={() =>
                setRows((all) => [
                  ...all,
                  {
                    key: crypto.randomUUID(),
                    label: "",
                    chestIn: null,
                    stock: null,
                    ordered: 0,
                  },
                ])
              }
              className={`${smallGhostButtonClass} self-start`}
            >
              + เพิ่มไซซ์
            </button>
          )}
        </div>
        <p className="text-[13px] text-muted">
          ไซซ์ที่ลบออกแต่มีคนสั่งไปแล้ว จะถูกซ่อนจากหน้าสมัคร
          ส่วนคำสั่งซื้อเดิมยังอยู่ครบ
        </p>
      </fieldset>
      {!readOnly && (
        <>
          <FormMessage state={state} />
          <div>
            <button type="submit" disabled={pending} className={buttonClass}>
              {pending ? "กำลังบันทึก…" : "บันทึกไซซ์เสื้อ"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
