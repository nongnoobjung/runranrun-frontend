import { SiteFooter, SiteHeader } from "@/components/site-header";
import Link from "@/i18n/link";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-start gap-3 px-4 py-16">
        <h1 className="text-3xl font-bold">{t.common.notFound.title}</h1>
        <p className="text-muted">{t.common.notFound.text}</p>
        <Link href="/" className="font-semibold">
          {t.common.notFound.home}
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
