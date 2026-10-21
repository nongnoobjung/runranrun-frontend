import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "ก้าว · หางานวิ่งทั่วไทย", template: "%s · ก้าว" },
  description: "หางานวิ่งใกล้บ้าน สมัครในไม่กี่นาที จ่ายด้วย PromptPay แล้วรับบัตรวิ่งพร้อม QR",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${prompt.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
