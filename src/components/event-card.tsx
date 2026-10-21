import { localized, type Locale } from "@/i18n/config";
import Link from "@/i18n/link";
import { getLocale, getT } from "@/i18n/server";
import { baht, fmtFor, provinceName } from "@/lib/format";
import type { EventSummary, ResultsEvent } from "@/lib/types";
import { EventBanner } from "./banner";
import { AvailabilityPill, Chip, DateBlock } from "./ui";

/** The banner shows the name in the other language (Thai pages have long shown the English one), the heading the page's. */
function bannerTitle(locale: Locale, name: { th: string; en: string | null }): string {
  return localized(locale === "th" ? "en" : "th", name);
}

export async function EventCard({ event }: { event: EventSummary }) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const f = fmtFor(locale);
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex flex-col overflow-hidden rounded-card bg-tint p-2 text-ink no-underline transition hover:-translate-y-0.5"
    >
      <EventBanner
        slug={event.slug}
        type={event.type}
        title={bannerTitle(locale, event.name)}
        subtitle={provinceName(event.province, locale) ?? undefined}
        imageUrl={event.coverImageUrl}
        className="h-44 rounded-[18px]"
        titleSize="text-lg"
      >
        <AvailabilityPill value={event.availability} className="absolute right-3 top-3" />
        <DateBlock day={f.dayOfMonth(event.eventDate)} month={f.monthShort(event.eventDate)} className="absolute bottom-3 left-3" />
      </EventBanner>
      <div className="mt-2 flex flex-1 flex-col gap-2.5 rounded-[18px] bg-white px-3.5 pb-3.5 pt-4">
        <h3 className="text-[19px] font-semibold leading-snug">{localized(locale, event.name)}</h3>
        <span className="text-sm text-muted">
          {[event.venue, f.date(event.eventDate)].filter(Boolean).join(" · ")}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {event.races.map((r) => (
            <Chip key={r.code}>{r.code}</Chip>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-sm text-muted">
            {event.fromPriceSatang !== null ? (
              <>
                {t.events.card.from} <b className="text-xl text-ink">{baht(event.fromPriceSatang)}</b>
              </>
            ) : (
              t.events.card.notOnSale
            )}
          </span>
          <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full bg-brand text-white transition group-hover:bg-brand-dark">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}

/** An event in the results index: links to its results, with finishers per race instead of prices. */
export async function ResultsEventCard({ event }: { event: ResultsEvent }) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const f = fmtFor(locale);
  const finishers = t.events.card.finishers;
  return (
    <Link
      href={`/events/${event.slug}/results`}
      className="group flex flex-col overflow-hidden rounded-card bg-tint p-2 text-ink no-underline transition hover:-translate-y-0.5"
    >
      <EventBanner
        slug={event.slug}
        type={event.type}
        title={bannerTitle(locale, event.name)}
        subtitle={provinceName(event.province, locale) ?? undefined}
        imageUrl={event.coverImageUrl}
        className="h-36 rounded-[18px]"
        titleSize="text-lg"
      >
        <DateBlock day={f.dayOfMonth(event.eventDate)} month={f.monthShort(event.eventDate)} className="absolute bottom-3 left-3" />
      </EventBanner>
      <div className="mt-2 flex flex-1 flex-col gap-2.5 rounded-[18px] bg-white px-3.5 pb-3.5 pt-4">
        <h3 className="text-[19px] font-semibold leading-snug">{localized(locale, event.name)}</h3>
        <span className="text-sm text-muted">
          {[event.venue, f.date(event.eventDate)].filter(Boolean).join(" · ")}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {event.races.map((r) => (
            <Chip key={r.id}>
              {r.code} <span className="font-normal">· {f.num(r.finishers)}</span>
            </Chip>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-sm text-muted">
            {finishers.before && `${finishers.before} `}
            <b className="text-xl text-ink">{f.num(event.finishers)}</b> {event.finishers === 1 ? finishers.one : finishers.many}
          </span>
          <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full bg-brand text-white transition group-hover:bg-brand-dark">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
