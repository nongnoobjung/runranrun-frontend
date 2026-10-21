import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, EmptyState } from "@/components/backoffice";
import { OrganizerBar } from "@/components/organizer-bar";
import { PROVINCES } from "@/lib/format";
import { can, membership } from "@/lib/org";
import { createEvent } from "./actions";
import { NewEventForm } from "./new-event-form";

export const metadata: Metadata = { title: "สร้างงานใหม่" };

export default function NewEventPage({ params }: PageProps<"/organizer/[orgId]/events/new">) {
  return (
    <>
      <OrganizerBar />
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-4 py-8 sm:px-7">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-[28px] bg-white" aria-busy="true" />}>
          <NewEvent params={params} />
        </Suspense>
      </div>
    </>
  );
}

async function NewEvent({ params }: Pick<PageProps<"/organizer/[orgId]/events/new">, "params">) {
  const { orgId } = await params;
  const org = await membership(orgId);
  const back = (
    <Link href={`/organizer/${orgId}`} className="text-sm text-muted no-underline hover:text-ink">
      ← งานทั้งหมดของ {org.nameTh}
    </Link>
  );
  if (!can(org.role, "manage_event")) {
    return (
      <>
        {back}
        <EmptyState>บทบาทของคุณในทีม ({org.nameTh}) สร้างงานใหม่ไม่ได้ ขอให้เจ้าของหรือผู้ดูแลทีมสร้างให้</EmptyState>
      </>
    );
  }
  return (
    <>
      <div className="flex flex-col gap-1">
        {back}
        <h1 className="text-3xl font-bold">สร้างงานใหม่</h1>
        <p className="text-muted">เริ่มจากข้อมูลหลัก งานจะเป็นฉบับร่างจนกว่าคุณจะกดเปิดรับสมัคร รายละเอียด ระยะ ราคา และเสื้อเพิ่มได้ในขั้นถัดไป</p>
      </div>
      <Card>
        <NewEventForm action={createEvent.bind(null, orgId)} provinces={Object.entries(PROVINCES)} />
      </Card>
    </>
  );
}
