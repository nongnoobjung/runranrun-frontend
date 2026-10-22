import type { Metadata } from "next";
import { Suspense } from "react";
import { BackofficeLoginForm } from "@/components/backoffice-login";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-col gap-6 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">เข้าสู่ระบบแอดมิน</h1>
        <p className="text-muted">สำหรับทีมงานก้าวเท่านั้น</p>
      </div>
      <div className="rounded-card bg-white p-5">
        <Suspense fallback={<div className="h-40" />}>
          <FormWithNext searchParams={searchParams} />
        </Suspense>
      </div>
      <p className="text-[13px] text-muted">ระหว่างพัฒนา: เข้าสู่ระบบด้วยอีเมลได้ทันทีโดยไม่ต้องยืนยัน ระบบจริงจะมีการยืนยันตัวตนสองชั้น</p>
    </div>
  );
}

async function FormWithNext({ searchParams }: Pick<PageProps<"/admin/login">, "searchParams">) {
  const next = (await searchParams).next;
  return <BackofficeLoginForm next={typeof next === "string" ? next : "/"} />;
}
