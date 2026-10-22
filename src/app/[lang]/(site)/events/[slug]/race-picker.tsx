"use client";

import { useActionState, useState } from "react";
import { joinWaitlist, startCheckout, type FormState } from "@/app/actions";
import { buttonClass, ErrorNote } from "@/components/ui";
import { useT } from "@/i18n/client";
import { baht } from "@/lib/format";
import type { RaceDetail } from "@/lib/types";

const MAX_RUNNERS = 10;

export function RacePicker({ eventId, slug, races, waitlist }: { eventId: string; slug: string; races: RaceDetail[]; waitlist: boolean }) {
  const t = useT().events.picker;
  const firstOpen = races.find((r) => r.available > 0 && r.priceSatang !== null);
  const [qty, setQty] = useState<Record<string, number>>(firstOpen ? { [firstOpen.id]: 1 } : {});
  const [state, formAction, pending] = useActionState<FormState, FormData>(startCheckout, {});
  // A full race offers its waitlist from the same form, through the button's own action.
  const [waitState, waitAction, waiting] = useActionState<FormState, FormData>(joinWaitlist, {});

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
                {soldOut ? t.full : t.left(r.available)}
              </span>
              {soldOut && waitlist && r.availability !== "closed" && r.availability !== "not_open" && (
                <button
                  type="submit"
                  formAction={(fd: FormData) => {
                    // React takes over the name of a button with its own action, so the race goes in here.
                    fd.set("raceId", r.id);
                    waitAction(fd);
                  }}
                  disabled={waiting}
                  className="min-h-11 rounded-full bg-white px-4 text-sm font-semibold text-brand ring-1 ring-line-strong"
                >
                  {waiting ? "…" : t.joinWaitlist(r.code)}
                </button>
              )}
              {!soldOut && (
                <div className="flex items-center gap-1" role="group" aria-label={t.runners(r.code)}>
                  <button
                    type="button"
                    aria-label={t.fewer(r.code)}
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
                    aria-label={t.more(r.code)}
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
      <ErrorNote message={state.error ?? waitState.error} />
      <button type="submit" disabled={runners === 0 || pending} className={`${buttonClass} min-h-14 rounded-[18px] text-[17px]`}>
        {pending ? t.holding : runners === 0 ? t.chooseFirst : t.register(runners, baht(total))}
      </button>
      <p className="text-center text-[13px] text-muted">{t.holdNote}</p>
    </form>
  );
}
