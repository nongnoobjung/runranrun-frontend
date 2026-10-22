import type { Metadata } from "next";
import Link from "@/i18n/link";
import { getT } from "@/i18n/server";
import { ProfileForm } from "../profile-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.me.profiles.newTitle };
}

export default async function NewProfilePage() {
  const t = await getT();
  return (
    <div className="bg-tint pb-10">
      <div className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 pt-6">
        <Link href="/me/profiles" className="self-start font-semibold text-ink">
          {t.me.back.profiles}
        </Link>
        <h1 className="text-3xl font-bold">{t.me.profiles.newTitle}</h1>
        <ProfileForm />
      </div>
    </div>
  );
}
