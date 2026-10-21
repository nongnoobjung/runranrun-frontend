import type { Metadata } from "next";
import { Document } from "@/components/document";
import { NotFoundThai } from "@/components/not-found-thai";

export const metadata: Metadata = { title: "ไม่พบหน้านี้ · ก้าว" };

/** URLs no route matches. Site paths are caught by app/[lang]/[...rest]; this is mostly the backoffice. */
export default function GlobalNotFound() {
  return (
    <Document lang="th">
      <NotFoundThai />
    </Document>
  );
}
