import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="mx-auto flex max-w-[440px] flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">เข้าสู่ระบบ</h1>
        <p className="text-muted">ใช้บัญชีเดียวสมัครได้ทุกงาน และเก็บบัตรวิ่งของคุณกับครอบครัวไว้ที่เดียว</p>
      </div>

      <button
        type="button"
        disabled
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-line-green px-6 font-semibold text-white opacity-60"
      >
        เข้าสู่ระบบด้วย LINE (เร็ว ๆ นี้)
      </button>

      <div className="flex items-center gap-3 text-sm text-muted">
        <span className="h-px flex-1 bg-line" />
        หรือใช้อีเมล
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="rounded-card bg-tint p-5">
        <Suspense fallback={<div className="h-40" />}>
          <LoginWithNext searchParams={searchParams} />
        </Suspense>
      </div>
      <p className="text-[13px] text-muted">
        ระหว่างพัฒนา: เข้าสู่ระบบด้วยอีเมลได้ทันทีโดยไม่ต้องยืนยัน ระบบจริงจะใช้ LINE Login และ OTP
      </p>
    </div>
  );
}

async function LoginWithNext({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const next = (await searchParams).next;
  return <LoginForm next={typeof next === "string" ? next : "/"} />;
}
