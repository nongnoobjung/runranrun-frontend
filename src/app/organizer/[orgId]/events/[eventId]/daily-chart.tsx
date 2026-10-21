"use client";

import { useState } from "react";

const dayLabel = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
const label = (day: string) => dayLabel.format(new Date(`${day}T12:00:00+07:00`));

/** Paid sign-ups per day: one series, so no legend; each bar shows its value on hover or focus. */
export function DailyChart({ days }: { days: { day: string; count: number }[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.count));
  // A rounded top tick so the gridline value reads cleanly.
  const step = 10 ** Math.floor(Math.log10(max));
  const top = Math.ceil(max / step) * step;
  const shown = active === null ? null : days[active];

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative h-48">
        <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col justify-between text-[11px] text-muted">
          {[top, top / 2, 0].map((v) => (
            <div key={v} className="flex items-center gap-2">
              <span className="w-8 text-right tabular-nums">{v.toLocaleString("th-TH")}</span>
              <span className="h-px flex-1 bg-line" />
            </div>
          ))}
        </div>
        <ul className="absolute inset-y-0 right-0 left-10 flex items-end gap-0.5" onPointerLeave={() => setActive(null)}>
          {days.map((d, i) => (
            <li
              key={d.day}
              tabIndex={0}
              aria-label={`${label(d.day)} ${d.count} คน`}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="group flex h-full flex-1 cursor-default items-end justify-center outline-none"
            >
              <span
                className={`w-full max-w-7 rounded-t-[4px] transition-colors ${active === i ? "bg-brand-dark" : "bg-brand"}`}
                style={{ height: `${(d.count / top) * 100}%`, minHeight: d.count > 0 ? 2 : 0 }}
              />
            </li>
          ))}
        </ul>
        {shown && active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute -top-2 rounded-xl bg-ink px-3 py-1.5 text-xs whitespace-nowrap text-white shadow-lg"
            style={{ left: `calc(2.5rem + (100% - 2.5rem) * ${(active + 0.5) / days.length})`, transform: "translate(-50%, -100%)" }}
          >
            <b className="text-sm">{shown.count.toLocaleString("th-TH")} คน</b> · {label(shown.day)}
          </div>
        )}
      </div>
      <div aria-hidden className="ml-10 flex justify-between text-[11px] text-muted">
        <span>{label(days[0].day)}</span>
        <span>{label(days[days.length - 1].day)}</span>
      </div>
      <figcaption className="sr-only">
        <table>
          <caption>ผู้สมัครที่ชำระแล้วรายวัน</caption>
          <tbody>
            {days.map((d) => (
              <tr key={d.day}>
                <th scope="row">{label(d.day)}</th>
                <td>{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
