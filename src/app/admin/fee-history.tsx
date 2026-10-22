import { Pill } from "@/components/backoffice";
import { feeLabel, type FeeRow } from "@/lib/admin";

const at = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Bangkok",
});

const STATE: Record<FeeRow["state"], { label: string; className: string }> = {
  scheduled: { label: "ตั้งเวลาไว้", className: "bg-warn-soft text-warn" },
  current: { label: "ใช้อยู่", className: "bg-ok-soft text-ok" },
  ended: { label: "สิ้นสุดแล้ว", className: "bg-tint text-muted" },
};

/** Rates over time, newest first: when each ran and who set it. */
export function FeeHistory({ rows, label }: { rows: FeeRow[]; label: string }) {
  if (rows.length === 0) return null;
  return (
    <ul aria-label={label} className="flex flex-col divide-y divide-line text-sm">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0">
          <span className="flex min-w-0 flex-1 basis-56 flex-col leading-snug">
            <b className="font-semibold">{feeLabel(r)}</b>
            <span className="break-words text-[13px] text-muted">
              {at.format(new Date(r.effectiveFrom))}
              {r.effectiveTo ? ` – ${at.format(new Date(r.effectiveTo))}` : " เป็นต้นไป"}
              {r.createdBy && ` · ตั้งโดย ${r.createdBy}`}
            </span>
          </span>
          <Pill label={STATE[r.state].label} className={STATE[r.state].className} />
        </li>
      ))}
    </ul>
  );
}
