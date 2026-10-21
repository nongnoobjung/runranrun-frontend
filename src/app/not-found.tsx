import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-start gap-3 px-4 py-16">
        <h1 className="text-3xl font-bold">ไม่พบหน้านี้</h1>
        <p className="text-muted">ลิงก์อาจหมดอายุ หรือคุณไม่มีสิทธิ์ดูข้อมูลนี้</p>
        <Link href="/" className="font-semibold">
          กลับหน้าแรก
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
