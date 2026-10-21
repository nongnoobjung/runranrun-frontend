import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/backoffice";
import { can, membership, orgEvent } from "@/lib/org";
import { Scanner } from "./scanner";

export const metadata: Metadata = { title: "หน้างาน · รับของ" };

export default function CheckinPage({ params }: PageProps<"/organizer/[orgId]/events/[eventId]/checkin">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[28px] bg-white" aria-busy="true" />}>
      <Checkin params={params} />
    </Suspense>
  );
}

async function Checkin({ params }: Pick<PageProps<"/organizer/[orgId]/events/[eventId]/checkin">, "params">) {
  const { orgId, eventId } = await params;
  const org = await membership(orgId);
  if (!can(org.role, "checkin")) notFound();
  const event = await orgEvent(orgId, eventId);
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5">
      <PageHeader eyebrow={event.nameTh} title="รับเสื้อและบิบ" />
      <Scanner orgId={orgId} eventId={eventId} />
    </div>
  );
}
