import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, Pill, smallButtonClass } from "@/components/backoffice";
import { EventBanner } from "@/components/banner";
import { OrganizerBar } from "@/components/organizer-bar";
import { Meter } from "@/components/ui";
import { baht, fmt } from "@/lib/format";
import { can, EVENT_STATUS, eventPath, membership, orgGet, type OrgEventSummary } from "@/lib/org";

export default function OrganizationPage({ params }: PageProps<"/organizer/[orgId]">) {
  return (
    <>
      <OrganizerBar>
        <Suspense fallback={null}>
          <OrgName params={params} />
        </Suspense>
      </OrganizerBar>
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 py-8 sm:px-7">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-[28px] bg-white" aria-busy="true" />}>
          <Events params={params} />
        </Suspense>
      </div>
    </>
  );
}

async function OrgName({ params }: Pick<PageProps<"/organizer/[orgId]">, "params">) {
  const org = await membership((await params).orgId);
  return <span className="ml-1 hidden text-sm text-muted sm:inline">{org.nameTh}</span>;
}

async function Events({ params }: Pick<PageProps<"/organizer/[orgId]">, "params">) {
  const { orgId } = await params;
  const org = await membership(orgId);
  const { items } = await orgGet<{ items: OrgEventSummary[] }>(orgId, "/events", `/organizer/${orgId}`);
  const canCreate = can(org.role, "manage_event");
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-sm text-muted">{org.nameTh}</span>
          <h1 className="text-3xl font-bold">งานทั้งหมด</h1>
        </div>
        {canCreate && (
          <Link href={`/organizer/${orgId}/events/new`} className={`${smallButtonClass} no-underline`}>
            + สร้างงานใหม่
          </Link>
        )}
      </div>
      {org.status !== "active" && (
        <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
          ทีมนี้ยังรอตรวจเอกสาร (KYC) สร้างงานและกรอกข้อมูลได้ แต่จะเปิดรับสมัครได้หลังเอกสารผ่าน
        </p>
      )}
      {items.length === 0 ? (
        <EmptyState>ยังไม่มีงาน {canCreate && "กด “สร้างงานใหม่” เพื่อเริ่ม"}</EmptyState>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {items.map((e) => {
            const status = EVENT_STATUS[e.status];
            return (
              <li key={e.id}>
                <Link href={eventPath(orgId, e.id)} className="flex h-full flex-col overflow-hidden rounded-[28px] bg-white text-ink no-underline transition hover:-translate-y-0.5">
                  <EventBanner slug={e.slug} type={e.eventType} title={e.nameTh} imageUrl={e.coverImageUrl} className="h-32" titleSize="text-base">
                    <Pill label={status.label} className={`absolute right-3 top-3 ${status.className}`} />
                  </EventBanner>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <b className="font-semibold leading-snug">{e.nameTh}</b>
                    <span className="text-sm text-muted">วันงาน {fmt.date(e.eventDate)}</span>
                    <div className="mt-auto flex flex-col gap-1.5 pt-2">
                      <div className="flex justify-between text-sm">
                        <span>
                          สมัครแล้ว <b>{e.sold.toLocaleString("th-TH")}</b> / {e.capacity.toLocaleString("th-TH")}
                        </span>
                        <b>{baht(e.revenueSatang)}</b>
                      </div>
                      <Meter value={e.capacity ? (e.sold / e.capacity) * 100 : 0} />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
