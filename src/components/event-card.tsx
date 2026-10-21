import Link from "next/link";
import { baht, fmt, provinceName } from "@/lib/format";
import type { EventSummary, ResultsEvent } from "@/lib/types";
import { EventBanner } from "./banner";
import { AvailabilityPill, Chip, DateBlock } from "./ui";

export function EventCard({ event }: { event: EventSummary }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex flex-col overflow-hidden rounded-card bg-tint p-2 text-ink no-underline transition hover:-translate-y-0.5"
    >
      <EventBanner
        slug={event.slug}
        type={event.type}
        title={event.name.en ?? event.name.th}
        subtitle={provinceName(event.province) ?? undefined}
        imageUrl={event.coverImageUrl}
        className="h-44 rounded-[18px]"
        titleSize="text-lg"
      >
        <AvailabilityPill value={event.availability} className="absolute right-3 top-3" />
        <DateBlock day={fmt.dayOfMonth(event.eventDate)} month={fmt.monthShort(event.eventDate)} className="absolute bottom-3 left-3" />
      </EventBanner>
      <div className="mt-2 flex flex-1 flex-col gap-2.5 rounded-[18px] bg-white px-3.5 pb-3.5 pt-4">
        <h3 className="text-[19px] font-semibold leading-snug">{event.name.th}</h3>
        <span className="text-sm text-muted">
          {[event.venue, fmt.date(event.eventDate)].filter(Boolean).join(" · ")}
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
                เริ่ม <b className="text-xl text-ink">{baht(event.fromPriceSatang)}</b>
              </>
            ) : (
              "ยังไม่เปิดขาย"
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
export function ResultsEventCard({ event }: { event: ResultsEvent }) {
  return (
    <Link
      href={`/events/${event.slug}/results`}
      className="group flex flex-col overflow-hidden rounded-card bg-tint p-2 text-ink no-underline transition hover:-translate-y-0.5"
    >
      <EventBanner
        slug={event.slug}
        type={event.type}
        title={event.name.en ?? event.name.th}
        subtitle={provinceName(event.province) ?? undefined}
        imageUrl={event.coverImageUrl}
        className="h-36 rounded-[18px]"
        titleSize="text-lg"
      >
        <DateBlock day={fmt.dayOfMonth(event.eventDate)} month={fmt.monthShort(event.eventDate)} className="absolute bottom-3 left-3" />
      </EventBanner>
      <div className="mt-2 flex flex-1 flex-col gap-2.5 rounded-[18px] bg-white px-3.5 pb-3.5 pt-4">
        <h3 className="text-[19px] font-semibold leading-snug">{event.name.th}</h3>
        <span className="text-sm text-muted">
          {[event.venue, fmt.date(event.eventDate)].filter(Boolean).join(" · ")}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {event.races.map((r) => (
            <Chip key={r.id}>
              {r.code} <span className="font-normal">· {r.finishers.toLocaleString("th-TH")}</span>
            </Chip>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-sm text-muted">
            เข้าเส้นชัย <b className="text-xl text-ink">{event.finishers.toLocaleString("th-TH")}</b> คน
          </span>
          <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full bg-brand text-white transition group-hover:bg-brand-dark">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
