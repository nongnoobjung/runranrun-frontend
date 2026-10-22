import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import Link from "@/i18n/link";
import { getLocale, getT } from "@/i18n/server";
import { COMPANY, COMPANY_EN } from "@/lib/legal";
import { LegalPage } from "../legal-page";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).privacy.legal.privacy };
}

export default async function PrivacyPage() {
  const Content = CONTENT[await getLocale()];
  return <Content />;
}

/** The Thai text is the binding one; the English is a translation of it. */
const CONTENT: Record<Locale, () => React.ReactNode> = { th: PrivacyTh, en: PrivacyEn };

function PrivacyTh() {
  return (
    <LegalPage
      title="นโยบายความเป็นส่วนตัว"
      intro={
        <p>
          {COMPANY.name} (&ldquo;ก้าว&rdquo; หรือ &ldquo;เรา&rdquo;) ให้บริการเว็บรับสมัครงานวิ่ง นโยบายนี้อธิบายว่าเราเก็บ ใช้ และเปิดเผยข้อมูลส่วนบุคคลของคุณอย่างไร
          ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) และคุณมีสิทธิ์อะไรบ้าง
        </p>
      }
      sections={[
        {
          heading: "ใครเป็นผู้ควบคุมข้อมูล",
          body: (
            <>
              <p>
                เราเป็นผู้ควบคุมข้อมูลของบัญชีผู้ใช้และการสมัครผ่านเว็บนี้ ส่วนผู้จัดงานแต่ละงานได้รับข้อมูลผู้สมัครงานของตัวเองไปใช้จัดงาน (เช่น ออกบิบ มอบเสื้อ
                จับเวลา ดูแลความปลอดภัยในวันแข่ง) และเป็นผู้ควบคุมข้อมูลในส่วนนั้นด้วย
              </p>
              <p>
                ติดต่อเรา: {COMPANY.address} · {COMPANY.email} · เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล: {COMPANY.dpoEmail}
              </p>
            </>
          ),
        },
        {
          heading: "ข้อมูลที่เราเก็บ",
          body: (
            <ul>
              <li>บัญชีผู้ใช้: อีเมล ชื่อที่แสดง และภาษาที่เลือก</li>
              <li>
                ข้อมูลผู้วิ่งตอนสมัคร: ชื่อภาษาไทยและอังกฤษ เพศ วันเกิด สัญชาติ เลขบัตรประชาชนหรือพาสปอร์ต เบอร์โทร ผู้ติดต่อฉุกเฉิน ไซซ์เสื้อ
                และคำตอบคำถามเพิ่มเติมของผู้จัด
              </li>
              <li>ข้อมูลผู้วิ่งที่คุณเลือกบันทึกไว้ใช้สมัครครั้งหน้า</li>
              <li>คำสั่งซื้อและการชำระเงิน: รายการที่สมัคร ยอดเงิน วิธีชำระ และสถานะ ส่วนเลขบัตรเครดิตอยู่กับผู้ให้บริการชำระเงิน เราไม่ได้เก็บ</li>
              <li>บัญชีธนาคารสำหรับรับเงินคืน (เมื่อคุณขอคืนเงินที่จ่ายด้วย PromptPay)</li>
              <li>ผลการแข่งขัน: เลขบิบ เวลา อันดับ และรุ่นอายุ</li>
              <li>ผู้จัดงาน: ข้อมูลนิติบุคคล เอกสารยืนยันตัวตน (KYC) และบัญชีรับเงิน</li>
              <li>ข้อมูลทางเทคนิค: หมายเลข IP และชนิดเบราว์เซอร์ เมื่อคุณให้ความยินยอม และเพื่อป้องกันการใช้งานเกินกำหนด</li>
            </ul>
          ),
        },
        {
          heading: "เราใช้ข้อมูลเพื่ออะไร และอาศัยฐานทางกฎหมายใด",
          body: (
            <ul>
              <li>รับสมัคร รับชำระเงิน ออกบัตรวิ่ง และส่งข้อมูลให้ผู้จัดงานจัดงาน: เพื่อปฏิบัติตามสัญญาที่คุณสมัคร และตามความยินยอมที่คุณให้ตอนสมัคร</li>
              <li>ตรวจว่าบัตรใบเดียวสมัครระยะเดียวกันซ้ำหรือไม่ (ใช้ค่า hash ของเลขบัตร ไม่ใช่เลขจริง): ประโยชน์โดยชอบด้วยกฎหมาย</li>
              <li>คืนเงิน โอนสิทธิ์ และเปลี่ยนระยะตามนโยบายของงาน: เพื่อปฏิบัติตามสัญญา</li>
              <li>เก็บหลักฐานการเงินและภาษี: หน้าที่ตามกฎหมาย</li>
              <li>ป้องกันการทุจริตและรักษาความปลอดภัยของระบบ: ประโยชน์โดยชอบด้วยกฎหมาย</li>
              <li>ส่งข่าวสารงานวิ่งอื่น ๆ ของก้าว: เฉพาะเมื่อคุณยินยอม และถอนความยินยอมได้ทุกเมื่อ</li>
            </ul>
          ),
        },
        {
          heading: "เราเปิดเผยข้อมูลให้ใคร",
          body: (
            <ul>
              <li>ผู้จัดงานที่คุณสมัคร: เฉพาะข้อมูลผู้สมัครงานนั้น ทีมงานของผู้จัดเห็นเลขบัตรแบบปิดไว้ การดูเลขเต็มและการส่งออกข้อมูลถูกบันทึกทุกครั้ง</li>
              <li>ผู้ให้บริการชำระเงิน ผู้ให้บริการระบบ และผู้ส่งอีเมล ที่ทำงานแทนเราตามสัญญา</li>
              <li>สาธารณะ: ผลการแข่งขัน (ชื่อ บิบ เวลา อันดับ) เมื่อผู้จัดประกาศผล</li>
              <li>หน่วยงานรัฐเมื่อกฎหมายกำหนด</li>
            </ul>
          ),
        },
        {
          heading: "เราเก็บข้อมูลไว้นานเท่าไร",
          body: (
            <ul>
              <li>บัญชีและผู้วิ่งที่บันทึกไว้: จนกว่าคุณจะลบหรือปิดบัญชี</li>
              <li>ข้อมูลการสมัคร คำสั่งซื้อ และการชำระเงิน: ตามระยะเวลาที่กฎหมายบัญชีและภาษีกำหนด [ระบุระยะเวลา] แม้คุณปิดบัญชีแล้ว</li>
              <li>ผลการแข่งขัน: ตามที่ผู้จัดเผยแพร่</li>
            </ul>
          ),
        },
        {
          heading: "สิทธิ์ของคุณ",
          body: (
            <>
              <p>คุณมีสิทธิ์ขอเข้าถึงและรับสำเนา ขอแก้ไข ขอลบ ขอระงับหรือคัดค้านการใช้ ขอโอนย้ายข้อมูล และถอนความยินยอม</p>
              <ul>
                <li>
                  ดาวน์โหลดข้อมูลของคุณ เปลี่ยนความยินยอมรับข่าวสาร และปิดบัญชีได้เองที่หน้า <Link href="/me/privacy">ความเป็นส่วนตัวและข้อมูลของฉัน</Link>
                </li>
                <li>แก้ไขผู้วิ่งที่บันทึกไว้ได้ที่หน้าข้อมูลผู้วิ่ง ส่วนข้อมูลในการสมัครที่ส่งให้ผู้จัดแล้ว ติดต่อผู้จัดงานหรือเราเพื่อแก้ไข</li>
                <li>ร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.) ได้</li>
              </ul>
            </>
          ),
        },
        {
          heading: "การรักษาความปลอดภัย",
          body: (
            <p>
              เลขบัตรประชาชนหรือพาสปอร์ตและเลขบัญชีธนาคารเก็บแบบเข้ารหัส และแสดงแค่ 4 ตัวท้าย ทีมผู้จัดเข้าถึงได้ตามบทบาท และการดูข้อมูลอ่อนไหวถูกบันทึกไว้
              การเข้าสู่ระบบใช้คุกกี้ที่เบราว์เซอร์อ่านไม่ได้
            </p>
          ),
        },
        {
          heading: "คุกกี้",
          body: (
            <p>
              เราใช้เฉพาะคุกกี้ที่จำเป็นให้เว็บทำงาน ได้แก่ การเข้าสู่ระบบ การจองคิวสมัคร และภาษาที่เลือก เราไม่ใช้คุกกี้โฆษณาหรือคุกกี้ติดตามจากบุคคลอื่น
            </p>
          ),
        },
        {
          heading: "การเปลี่ยนแปลงนโยบาย",
          body: <p>เมื่อมีการเปลี่ยนแปลงสำคัญ เราจะแจ้งบนเว็บและขอความยินยอมใหม่เมื่อจำเป็น วันที่มีผลอยู่ด้านบนของหน้านี้</p>,
        },
      ]}
    />
  );
}

function PrivacyEn() {
  return (
    <LegalPage
      title="Privacy policy"
      intro={
        <p>
          {COMPANY_EN.name} (&ldquo;Kao&rdquo; or &ldquo;we&rdquo;) runs a running event registration website. This policy explains how we collect, use and
          disclose your personal data under the Personal Data Protection Act B.E. 2562 (2019) (PDPA), and what rights you have.
        </p>
      }
      sections={[
        {
          heading: "Who controls the data",
          body: (
            <>
              <p>
                We are the data controller for accounts and registrations made on this website. Each event&rsquo;s organiser receives the data of their own
                event&rsquo;s runners to run it (for example bibs, kit, timing and race-day safety), and is also a data controller for that part.
              </p>
              <p>
                Contact us: {COMPANY_EN.address} · {COMPANY_EN.email} · Data protection officer: {COMPANY_EN.dpoEmail}
              </p>
            </>
          ),
        },
        {
          heading: "Data we collect",
          body: (
            <ul>
              <li>Accounts: email, display name and chosen language</li>
              <li>
                Runner details when registering: Thai and English names, gender, date of birth, nationality, ID card or passport number, phone, emergency contact,
                shirt size and answers to the organiser&rsquo;s extra questions
              </li>
              <li>Runner details you choose to save for next time</li>
              <li>Orders and payments: what you registered for, amounts, payment method and status. Card numbers stay with the payment provider; we do not store them</li>
              <li>Bank accounts for refunds (when you ask for a refund of a PromptPay payment)</li>
              <li>Results: bib number, time, rank and age group</li>
              <li>Organisers: company details, identity documents (KYC) and payout accounts</li>
              <li>Technical data: IP address and browser type, when you give consent, and to prevent excessive use</li>
            </ul>
          ),
        },
        {
          heading: "What we use data for, and on what legal basis",
          body: (
            <ul>
              <li>Taking registrations and payments, issuing race tickets and sending data to organisers to run events: to perform the contract you enter, and with the consent you give when registering</li>
              <li>Checking whether one ID registers twice for the same race (using a hash of the ID number, not the number itself): legitimate interest</li>
              <li>Refunds, transfers and race changes under each event&rsquo;s policy: to perform the contract</li>
              <li>Keeping financial and tax records: legal obligation</li>
              <li>Preventing fraud and keeping the system secure: legitimate interest</li>
              <li>Sending news of other Kao running events: only with your consent, which you can withdraw at any time</li>
            </ul>
          ),
        },
        {
          heading: "Who we disclose data to",
          body: (
            <ul>
              <li>The organiser of the event you register for: only that event&rsquo;s registration data. Organiser staff see ID numbers masked; viewing a full number and exporting data are logged every time</li>
              <li>Payment providers, system providers and email senders working for us under contract</li>
              <li>The public: results (name, bib, time, rank) when the organiser publishes them</li>
              <li>Government authorities when the law requires it</li>
            </ul>
          ),
        },
        {
          heading: "How long we keep data",
          body: (
            <ul>
              <li>Accounts and saved runners: until you delete them or close your account</li>
              <li>Registrations, orders and payments: for the period required by accounting and tax law [state the period], even after you close your account</li>
              <li>Results: as published by the organiser</li>
            </ul>
          ),
        },
        {
          heading: "Your rights",
          body: (
            <>
              <p>You have the right to access and get a copy of your data, to correct it, to delete it, to restrict or object to its use, to move it, and to withdraw consent.</p>
              <ul>
                <li>
                  Download your data, change your consent to news and close your account yourself on the <Link href="/me/privacy">privacy and my data</Link> page
                </li>
                <li>Edit saved runners on the saved runners page. To correct details in a registration already sent to an organiser, contact the organiser or us</li>
                <li>You can complain to the Personal Data Protection Committee Office (PDPC)</li>
              </ul>
            </>
          ),
        },
        {
          heading: "Security",
          body: (
            <p>
              ID card or passport numbers and bank account numbers are stored encrypted and shown with only the last 4 digits. Organiser teams have access by role, and
              viewing sensitive data is logged. Sign-in uses a cookie that the browser&rsquo;s scripts cannot read.
            </p>
          ),
        },
        {
          heading: "Cookies",
          body: (
            <p>
              We use only cookies needed for the website to work: sign-in, your place in a registration queue and your chosen language. We do not use advertising
              cookies or third-party tracking cookies.
            </p>
          ),
        },
        {
          heading: "Changes to this policy",
          body: <p>When there are important changes, we will announce them on the website and ask for consent again when needed. The effective date is at the top of this page.</p>,
        },
      ]}
    />
  );
}
