import type { Metadata } from "next";
import { Document } from "@/components/document";

export const metadata: Metadata = { title: { default: "ผู้จัดงาน", template: "%s · ผู้จัดงาน · ก้าว" }, robots: { index: false } };

export default function OrganizerLayout({ children }: LayoutProps<"/organizer">) {
  // A root layout of its own: the runner site's root is app/[lang]. The backoffice stays Thai.
  return (
    <Document lang="th">
      <div className="flex min-h-full flex-1 flex-col bg-tint">{children}</div>
    </Document>
  );
}
