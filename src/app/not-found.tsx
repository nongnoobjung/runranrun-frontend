import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-start gap-3 px-4 py-16">
      <h1 className="text-3xl font-bold">ไม่พบหน้านี้</h1>
      <p className="text-muted">ลิงก์อาจหมดอายุ หรือคุณไม่มีสิทธิ์ดูข้อมูลนี้</p>
      <Link href="/" className="font-semibold">
        กลับหน้าแรก
      </Link>
    </div>
  );
}
