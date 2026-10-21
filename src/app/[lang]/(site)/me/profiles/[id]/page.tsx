import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { api } from "@/lib/api";
import type { RunnerProfile } from "@/lib/types";
import { ProfileForm } from "../profile-form";

export const metadata: Metadata = { title: "แก้ไขผู้วิ่ง" };

type Props = PageProps<"/[lang]/me/profiles/[id]">;

export default function EditProfilePage({ params }: Props) {
  return (
    <div className="bg-tint pb-10">
      <div className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 pt-6">
        <Link href="/me/profiles" className="self-start font-semibold text-ink">
          ← ข้อมูลผู้วิ่ง
        </Link>
        <h1 className="text-3xl font-bold">แก้ไขผู้วิ่ง</h1>
        <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-white" aria-busy="true" />}>
          <Edit params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function Edit({ params }: Pick<Props, "params">) {
  const { id } = await params;
  const res = await api<{ items: RunnerProfile[] }>("/v1/me/profiles", { auth: true });
  if (!res.ok) {
    if (res.status === 401) redirect(`/login?next=/me/profiles/${id}`);
    throw new Error(res.problem.title);
  }
  const profile = res.data.items.find((p) => p.id === id);
  if (!profile) notFound();
  return <ProfileForm profile={profile} />;
}
