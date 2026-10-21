"use client";

import { useEffect, useRef } from "react";

/**
 * Scrolls to itself when the URL's hash names `hash`. Browsers jump to an anchor only while the page loads,
 * and content inside a Suspense boundary can arrive after that.
 */
export function ScrollIntoView({ hash }: { hash: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (window.location.hash === `#${hash}`) ref.current?.parentElement?.scrollIntoView({ block: "start" });
  }, [hash]);
  return <span ref={ref} hidden />;
}
