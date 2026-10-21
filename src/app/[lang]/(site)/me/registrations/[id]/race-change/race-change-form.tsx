"use client";

import { useActionState, useState } from "react";
import { requestRaceChange, type FormState } from "@/app/actions";
import { buttonClass, ErrorNote } from "@/components/ui";
import { useT } from "@/i18n/client";
import { baht } from "@/lib/format";
import type { ChangeOptions } from "@/lib/types";

export function RaceChangeForm({
  registrationId,
  options,
  feeSatang,
  until,
}: {
  registrationId: string;
  options: ChangeOptions["raceChange"]["options"];
  feeSatang: number;
  until: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(requestRaceChange.bind(null, registrationId), {});
  const [picked, setPicked] = useState(options.find((o) => o.available)?.raceId ?? "");
  const chosen = options.find((o) => o.raceId === picked);
  const tc = useT().me.raceChange;

  if (options.length === 0) {
    return <p className="rounded-card bg-white p-5 text-muted">{tc.none}</p>;
  }
  return (
    <form action={action} className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-1 text-lg font-semibold">{tc.changeTo}</legend>
        {options.map((o) => (
          <label key={o.raceId} className={o.available ? "cursor-pointer" : "cursor-not-allowed"}>
            <input
              type="radio"
              name="toRaceId"
              value={o.raceId}
              disabled={!o.available}
              checked={picked === o.raceId}
              onChange={() => setPicked(o.raceId)}
              className="peer sr-only"
            />
            <span className="flex items-center gap-3 rounded-card border-2 border-white bg-white p-4 peer-checked:border-brand peer-disabled:opacity-60 peer-focus-visible:outline-2 peer-focus-visible:outline-brand">
              <span className="rounded-full bg-ice px-3 py-0.5 text-lg font-bold text-brand">{o.code}</span>
              <span className="flex min-w-0 flex-1 flex-col leading-snug">
                <b className="truncate font-semibold">{o.name}</b>
                <span className="text-[13px] text-muted">
                  {tc.km(o.distanceKm)}{o.priceSatang !== null && ` · ${baht(o.priceSatang)}`}
                </span>
              </span>
              <span className="text-right text-sm">
                {!o.available ? (
                  <span className="text-bad">{tc.unavailable[o.reason ?? ""] ?? tc.cantChange}</span>
                ) : o.priceDiffSatang !== null && o.priceDiffSatang > 0 ? (
                  <>{tc.diff(baht(o.priceDiffSatang))}</>
                ) : (
                  <span className="text-muted">{tc.noDiff}</span>
                )}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <ErrorNote message={state.error} />
      {chosen && (
        <div className="flex flex-col gap-1.5 rounded-card bg-white p-5 tabular-nums">
          {chosen.priceDiffSatang !== null && chosen.priceDiffSatang > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">{tc.priceDiff}</span>
              <span>{baht(chosen.priceDiffSatang)}</span>
            </div>
          )}
          {feeSatang > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">{tc.changeFee}</span>
              <span>{baht(feeSatang)}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <b className="font-semibold">{tc.total}</b>
            <b className="text-2xl font-bold">{baht(chosen.dueSatang ?? 0)}</b>
          </div>
          {(chosen.dueSatang ?? 0) > 0 && <span className="text-[13px] text-muted">{tc.excludesPaymentFee}</span>}
        </div>
      )}
      <button type="submit" disabled={pending || !chosen} className={buttonClass}>
        {pending
          ? tc.changing
          : !chosen
            ? tc.noneAvailable
            : (chosen.dueSatang ?? 0) > 0
              ? tc.submitPay(chosen.code)
              : tc.submitFree(chosen.code)}
      </button>
      <span className="text-center text-[13px] text-muted">{tc.until(until)}</span>
    </form>
  );
}
