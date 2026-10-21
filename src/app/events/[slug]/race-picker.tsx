"use client";

import { useActionState, useState } from "react";
import { startCheckout, type FormState } from "@/app/actions";
import { buttonClass, ErrorNote } from "@/components/ui";
import { baht } from "@/lib/format";
import type { RaceDetail } from "@/lib/types";

const MAX_RUNNERS = 10;

export function RacePicker({ eventId, slug, races }: { eventId: string; slug: string; races: RaceDetail[] }) {
  const firstOpen = races.find((r) => r.available > 0 && r.priceSatang !== null);
  const [qty, setQty] = useState<Record<string, number>>(firstOpen ? { [firstOpen.id]: 1 } : {});
  const [state, formAction, pending] = useActionState<FormState, FormData>(startCheckout, {});

  const runners = Object.values(qty).reduce((s, q) => s + q, 0);
  const total = races.reduce((s, r) => s + (qty[r.id] ?? 0) * (r.priceSatang ?? 0), 0);
  const set = (id: string, n: number) => setQty((q) => ({ ...q, [id]: n }));

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="slug" value={slug} />
      {races.map((r) => {
        const n = qty[r.id] ?? 0;
        const soldOut = r.available <= 0 || r.priceSatang === null;
        const maxHere = Math.min(r.available, MAX_RUNNERS - (runners - n));
        return (
          <div
            key={r.id}
            className={`flex flex-col gap-2 rounded-[20px] border-2 px-4 py-3.5 ${n > 0 ? "border-brand bg-tint" : "border-line bg-white"} ${soldOut ? "opacity-70" : ""}`}
          >
            <input type="hidden" name={`qty:${r.id}`} value={n} />
            <div className="flex items-center gap-3">
              <b className="flex-1 text-[22px] font-bold">{r.code}</b>
              <span className="text-right leading-tight">
                <b className="text-lg">{r.priceSatang !== null ? baht(r.priceSatang) : "–"}</b>
                {r.tierName && <span className="block text-xs text-muted">{r.tierName}</span>}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className={`text-[13px] font-medium ${soldOut ? "text-bad" : r.availability === "almost_full" ? "text-warn" : "text-muted"}`}>
                {soldOut ? "เต็มแล้ว" : `เหลือ ${r.available.toLocaleString()} ที่`}
              </span>
              {!soldOut && (
                <div className="flex items-center gap-1" role="group" aria-label={`จำนวนผู้วิ่ง ${r.code}`}>
                  <button
                    type="button"
                    aria-label={`ลดจำนวน ${r.code}`}
                    disabled={n === 0}
                    onClick={() => set(r.id, n - 1)}
                    className="grid h-11 w-11 place-items-center rounded-full bg-white text-xl text-brand ring-1 ring-line-strong disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-lg font-semibold tabular-nums" aria-live="polite">
                    {n}
                  </span>
                  <button
                    type="button"
                    aria-label={`เพิ่มจำนวน ${r.code}`}
                    disabled={n >= maxHere}
                    onClick={() => set(r.id, n + 1)}
                    className="grid h-11 w-11 place-items-center rounded-full bg-white text-xl text-brand ring-1 ring-line-strong disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
      <ErrorNote message={state.error} />
      <button type="submit" disabled={runners === 0 || pending} className={`${buttonClass} min-h-14 rounded-[18px] text-[17px]`}>
        {pending ? "กำลังจองที่…" : runners === 0 ? "เลือกระยะก่อน" : `สมัคร ${runners} คน · ${baht(total)}`}
      </button>
      <p className="text-center text-[13px] text-muted">กดสมัครแล้วระบบจะจองที่ไว้ให้ 15 นาทีระหว่างกรอกข้อมูล</p>
    </form>
  );
}
