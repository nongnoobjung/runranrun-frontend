import { defineDict } from "../define";

/** A link inside a step; the path is the same in both languages (Link adds /en). */
interface StepLink {
  href: string;
  label: string;
}

interface Step {
  title: string;
  text: string;
  links: StepLink[];
}

/** The runner-facing "how to register" page (/how-to-register). */
export default defineDict<{
  title: string;
  intro: string;
  stepsLabel: string;
  steps: Step[];
  changesTitle: string;
  changesIntro: string;
  changes: Step[];
  afterTitle: string;
  after: Step[];
  cta: string;
}>({
  th: {
    title: "วิธีสมัครวิ่ง",
    intro: "สมัครให้ตัวเอง เพื่อน และครอบครัวได้ในคำสั่งซื้อเดียว ใช้เวลาไม่กี่นาที ทำตามขั้นตอนนี้ได้เลย",
    stepsLabel: "ขั้นตอนการสมัคร",
    steps: [
      {
        title: "หางานที่อยากวิ่ง",
        text: "ค้นหาตามชื่องาน จังหวัด เดือน และระยะ ในหน้างานมีเส้นทาง เวลาปล่อยตัว cut-off ราคา และที่ว่างที่เหลือ งานที่คนสมัครเยอะอาจให้เข้าคิวก่อน รอถึงคิวแล้วระบบพาไปสมัครต่อเอง",
        links: [{ href: "/events", label: "หางานวิ่ง" }],
      },
      {
        title: "เลือกระยะและจำนวนผู้วิ่ง",
        text: "เลือกระยะ แล้วกด + ตามจำนวนคนที่จะสมัคร (เลือกหลายระยะในครั้งเดียวได้) กดสมัครแล้วระบบจองที่ไว้ให้ระหว่างกรอกข้อมูล ประมาณ 15 นาทีตามที่หน้าสมัครแสดง",
        links: [],
      },
      {
        title: "เข้าสู่ระบบ",
        text: "ใช้อีเมลเข้าสู่ระบบ บัตรวิ่ง คำสั่งซื้อ และผู้วิ่งที่บันทึกไว้จะอยู่ในบัญชีนี้",
        links: [{ href: "/login", label: "เข้าสู่ระบบ" }],
      },
      {
        title: "กรอกข้อมูลผู้วิ่ง",
        text: "ชื่อไทยและอังกฤษ วันเกิด เลขบัตรประชาชนหรือพาสปอร์ต และผู้ติดต่อฉุกเฉินของแต่ละคน เลือกจากผู้วิ่งที่บันทึกไว้ได้เลย หรือติ๊ก “บันทึกผู้วิ่งคนนี้ไว้ใช้ครั้งหน้า” เลขบัตรเก็บแบบเข้ารหัสและแสดงแค่ 4 ตัวท้าย",
        links: [{ href: "/me/profiles", label: "ผู้วิ่งที่บันทึกไว้" }],
      },
      {
        title: "ไซซ์เสื้อและคำถามของผู้จัด",
        text: "เลือกไซซ์เสื้อตามตารางรอบอกของงาน แล้วตอบคำถามที่ผู้จัดถาม (บางข้อเฉพาะบางระยะ) ใส่โค้ดส่วนลดได้ถ้ามี",
        links: [],
      },
      {
        title: "ยอมรับเงื่อนไข",
        text: "ติ๊กยอมรับเงื่อนไขการใช้งาน นโยบายความเป็นส่วนตัว และการส่งข้อมูลผู้วิ่งให้ผู้จัดงาน ส่วนการรับข่าวสารเลือกได้และเปลี่ยนได้ทุกเมื่อ",
        links: [
          { href: "/terms", label: "เงื่อนไขการใช้งาน" },
          { href: "/privacy", label: "นโยบายความเป็นส่วนตัว" },
        ],
      },
      {
        title: "จ่ายด้วย PromptPay",
        text: "สแกน QR ด้วยแอปธนาคารก่อนหมดเวลา จ่ายแล้วระบบยืนยันให้เองภายในไม่กี่วินาที ไม่ต้องส่งสลิป",
        links: [],
      },
      {
        title: "รับบัตรวิ่ง QR และเลขบิบ",
        text: "บัตรวิ่งของทุกคนในคำสั่งซื้ออยู่ในงานของฉัน มีเลขบิบ ระยะ ไซซ์เสื้อ และ QR สำหรับรับของ",
        links: [{ href: "/me/events", label: "งานของฉัน" }],
      },
      {
        title: "รับเสื้อและบิบหน้างาน",
        text: "โชว์ QR ในบัตรวิ่งที่จุดรับของตามวันและเวลาที่ผู้จัดแจ้ง ให้คนอื่นรับแทนได้โดยให้เขาโชว์ QR ของคุณ เจ้าหน้าที่จะบันทึกชื่อคนรับแทนไว้",
        links: [],
      },
    ],
    changesTitle: "ถ้าแผนเปลี่ยน",
    changesIntro: "ทำได้จากบัตรวิ่ง ตามที่แต่ละงานเปิดให้ ค่าธรรมเนียม และกำหนดเวลาของงานนั้น",
    changes: [
      {
        title: "ขอคืนเงิน",
        text: "ไปวิ่งไม่ได้ ขอยกเลิกและคืนเงินได้ถ้างานเปิดให้คืน และยังไม่ได้รับของ ได้คืนตามเปอร์เซ็นต์ที่ผู้จัดกำหนด",
        links: [{ href: "/refund-policy", label: "นโยบายคืนเงิน" }],
      },
      {
        title: "โอนสิทธิ์ให้คนอื่น",
        text: "ใส่อีเมลของคนรับ เขากรอกข้อมูลผู้วิ่งของตัวเองแล้วได้บัตรวิ่งและบิบไป",
        links: [{ href: "/me/transfers", label: "การโอนสิทธิ์" }],
      },
      {
        title: "เปลี่ยนระยะ",
        text: "เลือกระยะใหม่ที่ยังมีที่ ถ้าราคาสูงกว่าจ่ายส่วนต่าง ได้บิบของระยะใหม่",
        links: [],
      },
      {
        title: "ระยะเต็มแล้ว: เข้าคิว waitlist",
        text: "ถ้างานเปิด waitlist กดเข้าคิวในหน้างาน มีที่ว่างเมื่อไรระบบเสนอให้ตามลำดับ และกันที่ไว้ให้ระยะหนึ่งก่อนส่งต่อคนถัดไป",
        links: [{ href: "/me/waitlist", label: "คิว waitlist ของฉัน" }],
      },
    ],
    afterTitle: "หลังแข่ง",
    after: [
      {
        title: "ดูผลการแข่งขัน",
        text: "เมื่อผู้จัดประกาศผล ค้นหาด้วยชื่อหรือเลขบิบได้ทั้งในหน้างานและในผลการแข่งขันรวมทุกงาน มีเวลา อันดับรวม อันดับตามเพศและรุ่นอายุ",
        links: [{ href: "/results", label: "ผลการแข่งขัน" }],
      },
    ],
    cta: "ดูงานที่เปิดรับสมัคร",
  },
  en: {
    title: "How to register",
    intro: "Register yourself, friends and family in a single order. It takes a few minutes; here is how.",
    stepsLabel: "Registration steps",
    steps: [
      {
        title: "Find an event",
        text: "Search by name, province, month and distance. Each event page shows the route, start and cut-off times, prices and places left. Busy events may ask you to wait in a queue first; when it is your turn you go straight on to registering.",
        links: [{ href: "/events", label: "Find events" }],
      },
      {
        title: "Choose races and runners",
        text: "Pick a race and press + for each runner (you can pick several races at once). Once you press Register, your places are held while you fill in the details, about 15 minutes as the checkout shows.",
        links: [],
      },
      {
        title: "Sign in",
        text: "Sign in with your email. Your tickets, orders and saved runners stay in this account.",
        links: [{ href: "/login", label: "Sign in" }],
      },
      {
        title: "Fill in each runner's details",
        text: "Thai and English names, date of birth, ID card or passport number and an emergency contact for each runner. Choose from your saved runners, or tick “Save this runner for next time”. ID numbers are stored encrypted and only the last 4 digits are shown.",
        links: [{ href: "/me/profiles", label: "Saved runners" }],
      },
      {
        title: "Shirt size and the organiser's questions",
        text: "Choose a shirt size from the event's chest chart, then answer the organiser's questions (some only apply to some races). Add a discount code if you have one.",
        links: [],
      },
      {
        title: "Agree to the terms",
        text: "Tick to accept the terms, the privacy policy and your runners' details being sent to the organiser. News by email is optional and you can change it any time.",
        links: [
          { href: "/terms", label: "Terms of use" },
          { href: "/privacy", label: "Privacy policy" },
        ],
      },
      {
        title: "Pay with PromptPay",
        text: "Scan the QR with your banking app before the time runs out. Payment is confirmed automatically within seconds; no need to send a slip.",
        links: [],
      },
      {
        title: "Get your ticket, QR code and bib",
        text: "Every runner's ticket is in My events, with the bib number, race, shirt size and the QR code for kit pickup.",
        links: [{ href: "/me/events", label: "My events" }],
      },
      {
        title: "Pick up your shirt and bib",
        text: "Show the QR on your ticket at kit pickup on the days the organiser announces. Someone else can collect for you by showing your QR; staff note who collected it.",
        links: [],
      },
    ],
    changesTitle: "If your plans change",
    changesIntro: "Do it from your ticket, where the event allows it, with that event's fees and deadlines.",
    changes: [
      {
        title: "Request a refund",
        text: "Can't make it? Ask to cancel and get money back if the event offers refunds and you have not picked up your kit. You get the percentage the organiser set.",
        links: [{ href: "/refund-policy", label: "Refund policy" }],
      },
      {
        title: "Transfer your entry",
        text: "Enter the email of the person taking your place. They fill in their own runner details and get the ticket and bib.",
        links: [{ href: "/me/transfers", label: "Transfers" }],
      },
      {
        title: "Change race",
        text: "Pick another race that still has places. If it costs more you pay the difference, and you get a bib for the new race.",
        links: [],
      },
      {
        title: "Race full? Join the waitlist",
        text: "If the event has a waitlist, join it on the event page. When a place frees up it is offered in order and held for you for a while before it passes to the next person.",
        links: [{ href: "/me/waitlist", label: "My waitlist" }],
      },
    ],
    afterTitle: "After the race",
    after: [
      {
        title: "See your result",
        text: "Once the organiser publishes results, search by name or bib on the event page or across all events: times, overall, gender and age group places.",
        links: [{ href: "/results", label: "Results" }],
      },
    ],
    cta: "See open events",
  },
});
