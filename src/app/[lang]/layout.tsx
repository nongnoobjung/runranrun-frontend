import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Document } from "@/components/document";
import { isLocale, LOCALES } from "@/i18n/config";
import { LocaleProvider } from "@/i18n/client";
import { getLocale, getT } from "@/i18n/server";

export async function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: { default: t.common.meta.title, template: t.common.meta.template }, description: t.common.meta.description };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  if (!isLocale((await params).lang)) notFound();
  const locale = await getLocale();
  return (
    <Document lang={locale}>
      <LocaleProvider locale={locale}>{children}</LocaleProvider>
    </Document>
  );
}
