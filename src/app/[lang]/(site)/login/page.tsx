import type { Metadata } from "next";
import { Suspense } from "react";
import { getT } from "@/i18n/server";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.checkout.login.title };
}

export default async function LoginPage({ searchParams }: PageProps<"/[lang]/login">) {
  const t = (await getT()).checkout.login;
  return (
    <div className="mx-auto flex max-w-[440px] flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <p className="text-muted">{t.intro}</p>
      </div>

      <button
        type="button"
        disabled
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-line-green px-6 font-semibold text-white opacity-60"
      >
        {t.line}
      </button>

      <div className="flex items-center gap-3 text-sm text-muted">
        <span className="h-px flex-1 bg-line" />
        {t.orEmail}
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="rounded-card bg-tint p-5">
        <Suspense fallback={<div className="h-40" />}>
          <LoginWithNext searchParams={searchParams} />
        </Suspense>
      </div>
      <p className="text-[13px] text-muted">{t.devNote}</p>
    </div>
  );
}

async function LoginWithNext({ searchParams }: Pick<PageProps<"/[lang]/login">, "searchParams">) {
  const next = (await searchParams).next;
  return <LoginForm next={typeof next === "string" ? next : "/"} />;
}
