"use client";

import { useT } from "@/i18n/client";
import Link from "@/i18n/link";

/**
 * What a runner agrees to before their details are sent: the terms, the privacy policy and sharing the runners'
 * details with the event's organiser (required), and news from the platform (optional, unticked).
 */
export function ConsentFields({ organizer, error }: { organizer: string; error?: string }) {
  const { consent: c, legal: l } = useT().privacy;
  return (
    <fieldset className="flex flex-col gap-3 rounded-card bg-white p-5">
      <legend className="sr-only">{c.legend}</legend>
      <label className="flex items-start gap-3 text-[15px]">
        <input type="checkbox" name="consent" value="1" aria-invalid={Boolean(error)} className="mt-0.5 h-5 w-5 flex-none accent-brand" />
        <span>
          {c.accept}{" "}
          <Link href="/terms" target="_blank">
            {l.terms}
          </Link>{" "}
          {c.and}{" "}
          <Link href="/privacy" target="_blank">
            {l.privacy}
          </Link>
          {c.share(organizer)}
          <span className="text-bad"> *</span>
        </span>
      </label>
      {error && <span className="text-sm text-bad">{error}</span>}
      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="marketing" value="1" className="mt-0.5 h-5 w-5 flex-none accent-brand" />
        <span>{c.marketing}</span>
      </label>
    </fieldset>
  );
}
