import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import Link from "@/i18n/link";
import { getLocale, getT } from "@/i18n/server";
import { LegalPage } from "../legal-page";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).privacy.legal.refund };
}

export default async function RefundPolicyPage() {
  const Content = CONTENT[await getLocale()];
  return <Content />;
}

/** The Thai text is the binding one; the English is a translation of it. */
const CONTENT: Record<Locale, () => React.ReactNode> = { th: RefundPolicyTh, en: RefundPolicyEn };

function RefundPolicyTh() {
  return (
    <LegalPage
      title="นโยบายคืนเงิน"
      intro={<p>ผู้จัดงานแต่ละงานกำหนดเองว่าจะคืนเงินหรือไม่ คืนกี่เปอร์เซ็นต์ และขอได้ถึงวันไหน ดูเงื่อนไขของงานได้ในหน้างานและในบัตรวิ่งของคุณ</p>}
      sections={[
        {
          heading: "ขอคืนเงินได้เมื่อไร",
          body: (
            <ul>
              <li>งานเปิดให้คืนเงิน และยังไม่เลยวันสุดท้ายที่ผู้จัดกำหนด (ถ้าไม่กำหนด ขอได้จนถึงวันแข่ง)</li>
              <li>ชำระเงินแล้ว และยังไม่ได้รับเสื้อและบิบที่หน้างาน</li>
              <li>ไม่มีการโอนสิทธิ์หรือเปลี่ยนระยะที่รอดำเนินการอยู่</li>
            </ul>
          ),
        },
        {
          heading: "ได้เงินคืนเท่าไร",
          body: (
            <ul>
              <li>ตามเปอร์เซ็นต์ที่ผู้จัดกำหนด คิดจากค่าสมัครที่จ่ายจริงหลังหักส่วนลด</li>
              <li>ค่าธรรมเนียมชำระเงิน ค่าธรรมเนียมโอนสิทธิ์ และส่วนต่างหรือค่าธรรมเนียมเปลี่ยนระยะ ไม่คืน</li>
            </ul>
          ),
        },
        {
          heading: "ขั้นตอน",
          body: (
            <ul>
              <li>
                ขอคืนเงินได้จากบัตรวิ่งใน <Link href="/me/events">งานของฉัน</Link> ระหว่างรอผู้จัดตอบ รับของหน้างานไม่ได้
              </li>
              <li>จ่ายด้วย PromptPay: กรอกบัญชีธนาคารรับเงินคืน ผู้จัดโอนให้หลังอนุมัติ [ระบุระยะเวลาโอนคืน เช่น ภายใน 14 วันทำการ]</li>
              <li>อนุมัติแล้วบัตรวิ่งและ QR ใช้ไม่ได้ และที่ว่างกลับไปเปิดรับสมัครหรือเสนอให้คิว waitlist</li>
            </ul>
          ),
        },
        {
          heading: "ไปวิ่งไม่ได้แต่ไม่อยากขอคืนเงิน",
          body: <p>ถ้างานเปิดให้โอนสิทธิ์หรือเปลี่ยนระยะ ทำได้จากบัตรวิ่งเช่นกัน ตามค่าธรรมเนียมและกำหนดเวลาของงาน</p>,
        },
        {
          heading: "งานยกเลิกหรือเลื่อน",
          body: <p>ผู้จัดงานเป็นผู้ประกาศการคืนเงินกรณีงานยกเลิกหรือเลื่อน ก้าวจะช่วยประสานและแจ้งผู้สมัครทางอีเมล</p>,
        },
      ]}
    />
  );
}

function RefundPolicyEn() {
  return (
    <LegalPage
      title="Refund policy"
      intro={<p>Each event&rsquo;s organiser decides whether to refund, how much, and until when. See an event&rsquo;s conditions on its event page and on your race ticket.</p>}
      sections={[
        {
          heading: "When you can ask for a refund",
          body: (
            <ul>
              <li>The event allows refunds, and the organiser&rsquo;s last day has not passed (if none is set, you can ask until race day)</li>
              <li>You have paid, and have not picked up your shirt and bib at the event</li>
              <li>No transfer or race change is in progress</li>
            </ul>
          ),
        },
        {
          heading: "How much you get back",
          body: (
            <ul>
              <li>The percentage the organiser set, of the entry fee you actually paid after discounts</li>
              <li>Payment fees, transfer fees, and race change differences or fees are not refunded</li>
            </ul>
          ),
        },
        {
          heading: "Steps",
          body: (
            <ul>
              <li>
                Ask for a refund from your race ticket in <Link href="/me/events">My events</Link>. While you wait for the organiser&rsquo;s answer, you cannot pick up your kit
              </li>
              <li>Paid with PromptPay: enter the bank account for the refund; the organiser transfers it after approval [state the refund time, e.g. within 14 working days]</li>
              <li>Once approved, the race ticket and QR no longer work, and the place goes back on sale or is offered to the waitlist</li>
            </ul>
          ),
        },
        {
          heading: "Can't run but don't want a refund",
          body: <p>If the event allows transfers or race changes, you can do these from your race ticket too, under the event&rsquo;s fees and deadlines.</p>,
        },
        {
          heading: "Cancelled or postponed events",
          body: <p>The organiser announces refunds when an event is cancelled or postponed. Kao will help coordinate and tell runners by email.</p>,
        },
      ]}
    />
  );
}
