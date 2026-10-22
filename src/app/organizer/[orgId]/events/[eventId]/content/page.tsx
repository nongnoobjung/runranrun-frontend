import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader, smallGhostButtonClass } from "@/components/backoffice";
import { can, membership, orgEvent } from "@/lib/org";
import { updateContent, uploadImage } from "./actions";
import { ContentForm } from "./content-form";
import { EventImages } from "./images";

export const metadata: Metadata = { title: "เนื้อหาและรูปภาพ" };

export default function EventContentPage({ params }: PageProps<"/organizer/[orgId]/events/[eventId]/content">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[28px] bg-white" aria-busy="true" />}>
      <EventContent params={params} />
    </Suspense>
  );
}

async function EventContent({ params }: Pick<PageProps<"/organizer/[orgId]/events/[eventId]/content">, "params">) {
  const { orgId, eventId } = await params;
  const [org, event] = await Promise.all([membership(orgId), orgEvent(orgId, eventId)]);
  const canEdit = can(org.role, "manage_event");
  const live = event.status === "published" || event.status === "closed";

  return (
    <>
      <PageHeader
        eyebrow={event.nameTh}
        title="เนื้อหาและรูปภาพ"
        actions={
          live && (
            <>
              {/* /th/... and /en/... pick the language even after the other preview remembered its own. */}
              <Link href={`/th/events/${event.slug}`} target="_blank" className={smallGhostButtonClass}>
                ดูหน้างาน ↗
              </Link>
              <Link href={`/en/events/${event.slug}`} target="_blank" className={smallGhostButtonClass}>
                English ↗
              </Link>
            </>
          )
        }
      />
      {!canEdit && <p className="rounded-2xl bg-ice px-4 py-3 text-sm text-muted">บทบาทของคุณดูข้อมูลได้อย่างเดียว เจ้าของทีมและแอดมินแก้เนื้อหาและรูปได้</p>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="order-2 flex min-w-0 flex-col gap-4 xl:order-1">
          <ContentForm
            action={updateContent.bind(null, orgId, eventId)}
            upload={uploadImage.bind(null, orgId, eventId, "description")}
            values={{
              summaryTh: event.summaryTh, summaryEn: event.summaryEn, descriptionTh: event.descriptionTh, descriptionEn: event.descriptionEn,
              rulesTh: event.rulesTh, rulesEn: event.rulesEn, faq: event.faq,
            }}
            readOnly={!canEdit}
          />
        </div>
        <div className="order-1 flex min-w-0 flex-col gap-4 xl:order-2">
          <EventImages
            orgId={orgId}
            eventId={eventId}
            coverUrl={event.coverImageUrl}
            gallery={event.gallery.map((g) => ({ id: g.id, url: g.url, captionTh: g.captionTh, captionEn: g.captionEn }))}
            races={event.races.map((r) => ({ id: r.id, code: r.code, routeMapUrl: r.routeMapUrl }))}
            readOnly={!canEdit}
          />
        </div>
      </div>
    </>
  );
}
