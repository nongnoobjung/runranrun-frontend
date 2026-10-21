import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, PageHeader } from "@/components/backoffice";
import { can, membership, orgEvent } from "@/lib/org";
import { saveShirts } from "./actions";
import { ShirtsForm } from "./shirts-form";

export const metadata: Metadata = { title: "เสื้อและไซซ์" };

export default function ShirtsPage({ params }: PageProps<"/organizer/[orgId]/events/[eventId]/shirts">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[28px] bg-white" aria-busy="true" />}>
      <Shirts params={params} />
    </Suspense>
  );
}

async function Shirts({ params }: Pick<PageProps<"/organizer/[orgId]/events/[eventId]/shirts">, "params">) {
  const { orgId, eventId } = await params;
  const [org, event] = await Promise.all([membership(orgId), orgEvent(orgId, eventId)]);
  const sizes = event.shirt?.sizes ?? [];
  const ordered = sizes.reduce((s, x) => s + x.sold + x.reserved, 0);
  return (
    <>
      <PageHeader
        eyebrow={event.shirt ? `${sizes.length} ไซซ์ · สั่งแล้ว ${ordered.toLocaleString("th-TH")} ตัว` : event.nameTh}
        title="เสื้อและไซซ์"
      />
      <Card>
        <p className="text-sm text-muted">
          เสื้อรวมอยู่ในค่าสมัคร นักวิ่งทุกคนต้องเลือกไซซ์ตอนสมัคร ระบบกันไม่ให้ขายเกินสต็อกของแต่ละไซซ์
        </p>
        <ShirtsForm
          action={saveShirts.bind(null, orgId, eventId)}
          nameTh={event.shirt?.nameTh ?? "เสื้อวิ่ง"}
          sizes={sizes}
          readOnly={!can(org.role, "manage_event")}
        />
      </Card>
    </>
  );
}
