import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { localePath } from "@/i18n/config";
import Link from "@/i18n/link";
import { getLocale, getT } from "@/i18n/server";
import { api } from "@/lib/api";
import type { RunnerProfile } from "@/lib/types";
import { ProfileForm } from "../profile-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.me.profiles.editTitle };
}

type Props = PageProps<"/[lang]/me/profiles/[id]">;

export default async function EditProfilePage({ params }: Props) {
  const t = await getT();
  return (
    <div className="bg-tint pb-10">
      <div className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 pt-6">
        <Link href="/me/profiles" className="self-start font-semibold text-ink">
          {t.me.back.profiles}
        </Link>
        <h1 className="text-3xl font-bold">{t.me.profiles.editTitle}</h1>
        <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-white" aria-busy="true" />}>
          <Edit params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function Edit({ params }: Pick<Props, "params">) {
  const [{ id }, locale] = await Promise.all([params, getLocale()]);
  const res = await api<{ items: RunnerProfile[] }>("/v1/me/profiles", { auth: true });
  if (!res.ok) {
    if (res.status === 401) redirect(localePath(locale, `/login?next=/me/profiles/${id}`));
    throw new Error(res.problem.title);
  }
  const profile = res.data.items.find((p) => p.id === id);
  if (!profile) notFound();
  return <ProfileForm profile={profile} />;
}
