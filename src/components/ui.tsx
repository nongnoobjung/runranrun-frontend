import Link from "next/link";
import type { Availability } from "@/lib/types";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-ink no-underline">
      <span aria-hidden className="grid h-[30px] w-[30px] place-items-center rounded-full bg-sky">
        <span className="h-3 w-3 rounded-full bg-white" />
      </span>
      <span className="text-2xl font-bold">ก้าว</span>
    </Link>
  );
}

const AVAILABILITY: Record<Availability, { label: string; className: string }> = {
  open: { label: "เปิดรับ", className: "bg-white text-brand" },
  almost_full: { label: "ใกล้เต็ม", className: "bg-warn-soft text-warn" },
  sold_out: { label: "เต็มแล้ว", className: "bg-bad-soft text-bad" },
  not_open: { label: "ยังไม่เปิด", className: "bg-ice text-muted" },
  closed: { label: "ปิดรับแล้ว", className: "bg-ice text-muted" },
};

export function AvailabilityPill({ value, className = "" }: { value: Availability; className?: string }) {
  const a = AVAILABILITY[value];
  return <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${a.className} ${className}`}>{a.label}</span>;
}

export function Chip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`rounded-full bg-ice px-3 py-0.5 text-sm font-semibold text-brand ${className}`}>{children}</span>;
}

export function DateBlock({ day, month, className = "" }: { day: string; month: string; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white px-3 py-1.5 text-center leading-tight ${className}`}>
      <div className="text-2xl font-bold">{day}</div>
      <div className="text-xs text-muted">{month}</div>
    </div>
  );
}

export function Meter({ value, className = "bg-brand" }: { value: number; className?: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-ice">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function ErrorNote({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">
      {message}
    </p>
  );
}

export const buttonClass =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-brand px-6 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60";
export const ghostButtonClass =
  "inline-flex min-h-12 items-center justify-center rounded-full border-[1.5px] border-line-strong bg-white px-6 font-medium text-ink transition hover:border-brand";
export const inputClass =
  "min-h-12 w-full rounded-[14px] border-[1.5px] border-line-strong bg-white px-3.5 text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none";
