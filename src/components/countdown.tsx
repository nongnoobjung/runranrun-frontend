"use client";

import { useEffect, useState } from "react";
import { countdown } from "@/lib/format";

/** Ticks down to `until`; calls onExpire once when it reaches zero. */
export function Countdown({ until, onExpire, className = "" }: { until: string; onExpire?: () => void; className?: string }) {
  const end = new Date(until).getTime();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    let fired = false;
    const tick = () => {
      const ms = end - Date.now();
      setLeft(ms);
      if (ms <= 0 && !fired) {
        fired = true;
        onExpire?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [end, onExpire]);

  return (
    <span className={`tabular-nums ${className}`} aria-live="off">
      {left === null ? "--:--" : countdown(left)}
    </span>
  );
}
