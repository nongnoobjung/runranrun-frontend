import Link from "next/link";
import { Suspense } from "react";
import { Pill } from "@/components/backoffice";
import { OrganizerBadge } from "@/components/organizer-bar";
import { Logo } from "@/components/ui";
import { can, EVENT_STATUS, eventPath, membership, orgEvent } from "@/lib/org";
import { EventNav, type NavItem } from "./event-nav";

const SOON = ["โอนสิทธิ์ / เปลี่ยนระยะ", "ส่งข่าว"];

export default function EventLayout({ children, params }: LayoutProps<"/organizer/[orgId]/events/[eventId]">) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="flex flex-col gap-4 bg-white px-4 pt-4 pb-3 md:sticky md:top-0 md:h-dvh md:w-[260px] md:flex-none md:overflow-y-auto md:rounded-r-[28px] md:px-3.5 md:py-5">
        <div className="flex items-center gap-2 md:px-2.5">
          <Logo />
          <OrganizerBadge />
        </div>
        <Suspense fallback={<div className="h-72" aria-busy="true" />}>
          <Sidebar params={params} />
        </Suspense>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}

async function Sidebar({ params }: Pick<LayoutProps<"/organizer/[orgId]/events/[eventId]">, "params">) {
  const { orgId, eventId } = await params;
  const [org, event] = await Promise.all([membership(orgId), orgEvent(orgId, eventId)]);
  const p = (section = "") => eventPath(orgId, eventId, section);
  const items: NavItem[] = [
    { href: p(), label: "ภาพรวม" },
    { href: p("edit"), label: "ข้อมูลงาน" },
    { href: p("races"), label: "ระยะและราคา" },
    { href: p("form"), label: "ฟอร์มสมัคร" },
    { href: p("shirts"), label: "เสื้อและไซซ์" },
    { href: p("coupons"), label: "คูปอง" },
    { href: p("registrations"), label: "ผู้สมัคร" },
    { href: p("bibs"), label: "บิบ" },
    ...(can(org.role, "manage_refunds") ? [{ href: p("requests"), label: "คำขอคืนเงิน" }] : []),
    ...(can(org.role, "checkin") ? [{ href: p("checkin"), label: "หน้างาน · รับของ" }] : []),
    { href: p("results"), label: "ผลการแข่งขัน" },
    ...(can(org.role, "view_finance") ? [{ href: p("finance"), label: "การเงิน" }] : []),
    { href: p("team"), label: "ทีมงาน" },
  ];
  const status = EVENT_STATUS[event.status];
  return (
    <>
      <div className="flex flex-col gap-1.5 md:px-2.5">
        <Link href={`/organizer/${orgId}`} className="text-[13px] text-muted no-underline hover:text-ink">
          ← งานทั้งหมดของ {org.nameTh}
        </Link>
        <b className="leading-snug font-semibold">{event.nameTh}</b>
        <Pill label={status.label} className={`self-start ${status.className}`} />
      </div>
      <EventNav items={items} soon={SOON} />
    </>
  );
}
