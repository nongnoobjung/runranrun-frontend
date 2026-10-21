"use client";

import { useT } from "@/i18n/client";
import type { Availability } from "@/lib/types";

const AVAILABILITY_CLASS: Record<Availability, string> = {
  open: "bg-white text-brand",
  almost_full: "bg-warn-soft text-warn",
  sold_out: "bg-bad-soft text-bad",
  not_open: "bg-ice text-muted",
  closed: "bg-ice text-muted",
};

export function AvailabilityPill({ value, className = "" }: { value: Availability; className?: string }) {
  const t = useT();
  return <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${AVAILABILITY_CLASS[value]} ${className}`}>{t.common.availability[value]}</span>;
}
