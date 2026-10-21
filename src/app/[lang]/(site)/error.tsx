"use client";

import { useT } from "@/i18n/client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-start gap-3 px-4 py-16">
      <h1 className="text-3xl font-bold">{t.common.error.title}</h1>
      <p className="text-muted">{t.common.error.text}</p>
      <button type="button" onClick={reset} className="rounded-full bg-brand px-6 py-3 font-semibold text-white">
        {t.common.error.retry}
      </button>
    </div>
  );
}
