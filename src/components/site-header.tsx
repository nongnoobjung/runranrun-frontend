import { Suspense } from "react";
import { logout } from "@/app/actions";
import Link from "@/i18n/link";
import { getT } from "@/i18n/server";
import { getToken } from "@/lib/session";
import { LocaleSwitch } from "./locale-switch";
import { Logo } from "./ui";

async function AccountLinks() {
  const t = await getT();
  const signedIn = Boolean(await getToken());
  if (!signedIn) {
    return (
      <Link href="/login" className="whitespace-nowrap rounded-full bg-brand px-5 py-2.5 text-[15px] font-semibold text-white no-underline hover:bg-brand-dark">
        {t.common.nav.signIn}
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Link href="/me/events" className="whitespace-nowrap rounded-full border-[1.5px] border-line-strong px-4 py-2 text-[15px] text-ink no-underline hover:border-brand">
        {t.common.nav.myEvents}
      </Link>
      <form action={logout}>
        <button type="submit" className="hidden whitespace-nowrap px-3 py-2 text-sm text-muted hover:text-ink sm:block">
          {t.common.nav.signOut}
        </button>
      </form>
    </div>
  );
}

export async function SiteHeader() {
  const t = await getT();
  return (
    <header className="bg-white print:hidden">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-x-9 gap-y-3 px-4 py-4 sm:px-7">
        <Logo />
        <nav aria-label={t.common.nav.label} className="hidden flex-1 gap-7 text-[15px] md:flex">
          <Link href="/events" className="font-semibold text-ink no-underline">
            {t.common.nav.events}
          </Link>
          <Link href="/results" className="text-ink no-underline">
            {t.common.nav.results}
          </Link>
          <Link href="/organizer" className="text-ink no-underline">
            {t.common.nav.organizers}
          </Link>
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <LocaleSwitch />
          <Suspense fallback={<div className="h-11 w-28" />}>
            <AccountLinks />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const t = await getT();
  return (
    <footer className="mt-16 bg-tint print:hidden">
      <div className="mx-auto flex max-w-[1240px] flex-wrap gap-10 px-4 py-9 text-sm text-muted sm:px-7">
        <div className="flex flex-[2_1_260px] flex-col gap-1.5">
          <b className="text-xl text-ink">{t.common.brand}</b>
          <span>{t.common.footer.tagline}</span>
        </div>
        <div className="flex flex-[1_1_150px] flex-col gap-1.5">
          <b className="text-ink">{t.common.footer.runners}</b>
          <Link href="/results" className="text-muted no-underline hover:text-ink">
            {t.common.footer.results}
          </Link>
          <span>{t.common.footer.howTo}</span>
          <Link href="/refund-policy" className="text-muted no-underline hover:text-ink">
            {t.common.footer.refundPolicy}
          </Link>
        </div>
        <div className="flex flex-[1_1_150px] flex-col gap-1.5">
          <b className="text-ink">{t.common.footer.organizers}</b>
          <Link href="/organizer/new" className="text-muted no-underline hover:text-ink">
            {t.common.footer.openTeam}
          </Link>
          <Link href="/organizer" className="text-muted no-underline hover:text-ink">
            {t.common.footer.organizerSignIn}
          </Link>
        </div>
        <div className="flex flex-[1_1_150px] flex-col gap-1.5">
          <b className="text-ink">{t.common.footer.info}</b>
          <Link href="/privacy" className="text-muted no-underline hover:text-ink">
            {t.common.footer.privacy}
          </Link>
          <Link href="/terms" className="text-muted no-underline hover:text-ink">
            {t.common.footer.terms}
          </Link>
        </div>
      </div>
    </footer>
  );
}
