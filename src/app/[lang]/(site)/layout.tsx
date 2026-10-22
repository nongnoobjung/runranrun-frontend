import { SiteFooter, SiteHeader } from "@/components/site-header";

export default function SiteLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
