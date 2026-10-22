import { Prompt } from "next/font/google";
import "@/app/globals.css";

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/** The <html> shell shared by the root layouts: the site (app/[lang]), the organiser backoffice and admin. */
export function Document({ lang, children }: { lang: string; children: React.ReactNode }) {
  return (
    <html lang={lang} className={`${prompt.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
