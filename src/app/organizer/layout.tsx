import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "ผู้จัดงาน", template: "%s · ผู้จัดงาน · ก้าว" }, robots: { index: false } };

export default function OrganizerLayout({ children }: LayoutProps<"/organizer">) {
  return <div className="flex min-h-full flex-1 flex-col bg-tint">{children}</div>;
}
