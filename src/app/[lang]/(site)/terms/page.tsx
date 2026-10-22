import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import Link from "@/i18n/link";
import { getLocale, getT } from "@/i18n/server";
import { COMPANY, COMPANY_EN } from "@/lib/legal";
import { LegalPage } from "../legal-page";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).privacy.legal.terms };
}

export default async function TermsPage() {
  const Content = CONTENT[await getLocale()];
  return <Content />;
}

/** The Thai text is the binding one; the English is a translation of it. */
const CONTENT: Record<Locale, () => React.ReactNode> = { th: TermsTh, en: TermsEn };

function TermsTh() {
  return (
    <LegalPage
      title="เงื่อนไขการใช้งาน"
      intro={<p>เงื่อนไขนี้ใช้กับการใช้เว็บก้าวของ {COMPANY.name} ทั้งนักวิ่งและผู้จัดงาน การสมัครงานหรือเปิดทีมผู้จัดถือว่าคุณยอมรับเงื่อนไขนี้</p>}
      sections={[
        {
          heading: "บทบาทของก้าวและผู้จัดงาน",
          body: (
            <p>
              ก้าวเป็นแพลตฟอร์มรับสมัครและรับชำระเงินแทนผู้จัดงาน ผู้จัดงานแต่ละงานเป็นผู้รับผิดชอบการจัดงาน เส้นทาง ความปลอดภัย ของที่ระลึก และผลการแข่งขัน
              รายละเอียดของงานแต่ละงานเป็นไปตามที่ผู้จัดประกาศ
            </p>
          ),
        },
        {
          heading: "บัญชีผู้ใช้",
          body: (
            <ul>
              <li>ใช้อีเมลหรือช่องทางเข้าสู่ระบบที่เป็นของคุณ และดูแลไม่ให้ผู้อื่นใช้บัญชีของคุณ</li>
              <li>ปิดบัญชีได้เองเมื่อไม่มีงานที่สมัครไว้และยังไม่ถึงวันแข่ง</li>
            </ul>
          ),
        },
        {
          heading: "การสมัครและการชำระเงิน",
          body: (
            <ul>
              <li>ข้อมูลผู้วิ่งต้องเป็นของจริงและเป็นปัจจุบัน บัตรใบหนึ่งสมัครระยะเดียวกันได้ครั้งเดียว</li>
              <li>กดสมัครแล้วระบบจองที่ไว้ให้ชั่วคราว ถ้าไม่ชำระเงินภายในเวลา ที่จะถูกคืนให้คนอื่น</li>
              <li>ค่าธรรมเนียมชำระเงินแสดงก่อนจ่ายทุกครั้ง</li>
            </ul>
          ),
        },
        {
          heading: "คืนเงิน โอนสิทธิ์ และเปลี่ยนระยะ",
          body: (
            <p>
              ทำได้ตามนโยบายที่ผู้จัดตั้งไว้สำหรับงานนั้น ดูรายละเอียดทั่วไปที่ <Link href="/refund-policy">นโยบายคืนเงิน</Link>
            </p>
          ),
        },
        {
          heading: "สุขภาพและความเสี่ยง",
          body: <p>การวิ่งมีความเสี่ยง คุณรับรองว่าผู้วิ่งมีสุขภาพพร้อมสำหรับระยะที่สมัคร และปฏิบัติตามกติกาและคำแนะนำของผู้จัดในวันแข่ง</p>,
        },
        {
          heading: "ผู้จัดงาน",
          body: (
            <ul>
              <li>ต้องยืนยันตัวตน (KYC) และบัญชีรับเงินก่อนเปิดรับสมัคร งานแรกอาจต้องรอทีมงานก้าวตรวจก่อนเปิด</li>
              <li>ใช้ข้อมูลผู้สมัครเพื่อจัดงานเท่านั้น และดูแลตาม PDPA</li>
              <li>ก้าวโอนรายได้ให้เป็นรอบ หักค่าธรรมเนียมแพลตฟอร์มและเงินคืนที่อนุมัติแล้ว</li>
              <li>ก้าวระงับทีมผู้จัดได้เมื่อพบข้อมูลไม่ถูกต้องหรือการใช้งานที่ผิดเงื่อนไข</li>
            </ul>
          ),
        },
        {
          heading: "ข้อมูลส่วนบุคคล",
          body: (
            <p>
              เป็นไปตาม <Link href="/privacy">นโยบายความเป็นส่วนตัว</Link>
            </p>
          ),
        },
        {
          heading: "กฎหมายที่ใช้บังคับ",
          body: <p>เงื่อนไขนี้อยู่ภายใต้กฎหมายไทย ติดต่อเราได้ที่ {COMPANY.email}</p>,
        },
      ]}
    />
  );
}

function TermsEn() {
  return (
    <LegalPage
      title="Terms of use"
      intro={<p>These terms apply to anyone using the Kao website of {COMPANY_EN.name}, runners and organisers alike. Registering for an event or opening an organiser team means you accept them.</p>}
      sections={[
        {
          heading: "The roles of Kao and organisers",
          body: (
            <p>
              Kao is a platform that takes registrations and payments on behalf of organisers. Each event&rsquo;s organiser is responsible for running it: the route,
              safety, souvenirs and results. Each event&rsquo;s details are as the organiser announces them.
            </p>
          ),
        },
        {
          heading: "Accounts",
          body: (
            <ul>
              <li>Use an email or sign-in method that is yours, and do not let anyone else use your account.</li>
              <li>You can close your account yourself when you have no entries for races that have not happened yet.</li>
            </ul>
          ),
        },
        {
          heading: "Registration and payment",
          body: (
            <ul>
              <li>Runner details must be real and up to date. One ID can register for the same race only once.</li>
              <li>When you register, your places are held for a short time. If you do not pay in time, they go back to others.</li>
              <li>Payment fees are shown before you pay, every time.</li>
            </ul>
          ),
        },
        {
          heading: "Refunds, transfers and race changes",
          body: (
            <p>
              These follow the policy the organiser set for each event. See the general details in the <Link href="/refund-policy">refund policy</Link>.
            </p>
          ),
        },
        {
          heading: "Health and risk",
          body: <p>Running carries risk. You confirm that each runner is fit for the distance they enter, and will follow the organiser&rsquo;s rules and instructions on race day.</p>,
        },
        {
          heading: "Organisers",
          body: (
            <ul>
              <li>Organisers must verify their identity (KYC) and payout account before opening registration. A first event may need a check by the Kao team before it opens.</li>
              <li>Runner data may be used only to run the event, and must be handled under the PDPA.</li>
              <li>Kao pays out revenue in rounds, after the platform fee and approved refunds.</li>
              <li>Kao may suspend an organiser team for incorrect information or use that breaks these terms.</li>
            </ul>
          ),
        },
        {
          heading: "Personal data",
          body: (
            <p>
              As set out in the <Link href="/privacy">privacy policy</Link>.
            </p>
          ),
        },
        {
          heading: "Governing law",
          body: <p>These terms are governed by Thai law. Contact us at {COMPANY_EN.email}</p>,
        },
      ]}
    />
  );
}
