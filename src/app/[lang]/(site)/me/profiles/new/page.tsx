import type { Metadata } from "next";
import Link from "next/link";
import { ProfileForm } from "../profile-form";

export const metadata: Metadata = { title: "เพิ่มผู้วิ่ง" };

export default function NewProfilePage() {
  return (
    <div className="bg-tint pb-10">
      <div className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 pt-6">
        <Link href="/me/profiles" className="self-start font-semibold text-ink">
          ← ข้อมูลผู้วิ่ง
        </Link>
        <h1 className="text-3xl font-bold">เพิ่มผู้วิ่ง</h1>
        <ProfileForm />
      </div>
    </div>
  );
}
