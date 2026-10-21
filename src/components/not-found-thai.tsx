import Link from "next/link";
import { Logo } from "./ui";

/** The 404 for the Thai-only organiser and admin areas, and for URLs no route matches. */
export function NotFoundThai() {
  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-start gap-3 px-4 py-16">
      <Logo />
      <h1 className="text-3xl font-bold">ไม่พบหน้านี้</h1>
      <p className="text-muted">ลิงก์อาจหมดอายุ หรือคุณไม่มีสิทธิ์ดูข้อมูลนี้</p>
      <Link href="/" className="font-semibold">
        กลับหน้าแรก
      </Link>
    </main>
  );
}
