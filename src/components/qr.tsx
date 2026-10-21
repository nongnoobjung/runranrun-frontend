"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** Renders a string as a QR code image in the browser (PromptPay payload or ticket token). */
export function Qr({ value, size = 220, label }: { value: string; size?: number; label: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { width: size * 2, margin: 1, color: { dark: "#0e2a47", light: "#ffffff" } }).then((url) => {
      if (alive) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [value, size]);

  if (!src) return <div className="animate-pulse rounded-xl bg-tint" style={{ width: size, height: size }} aria-label={label} role="img" />;
  // eslint-disable-next-line @next/next/no-img-element -- generated data URL
  return <img src={src} width={size} height={size} alt={label} className="rounded-xl" />;
}
