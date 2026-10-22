import { defineDict } from "../define";

export default defineDict({
  th: {
    steps: [
      { title: "เลือกงานและระยะ", text: "ดูเส้นทาง เวลาตัดตัว และที่ว่างแบบเรียลไทม์" },
      { title: "จ่ายด้วย PromptPay", text: "สมัครให้เพื่อนและครอบครัวได้ในคำสั่งซื้อเดียว" },
      { title: "รับบัตรวิ่งพร้อม QR", text: "โชว์ QR ตอนรับเสื้อ แล้วดูผลวิ่งได้ทันที" },
    ],
    stepsLabel: "ขั้นตอนการสมัคร",
    howToLink: "ดูวิธีสมัครทีละขั้นตอน →",
    season: "ฤดูกาล 2026–27",
    heroLine1: "ทุกเส้นชัย",
    heroLine2: "เริ่มต้นที่นี่",
    heroText: "หางานวิ่งใกล้บ้าน สมัครในไม่กี่นาที จ่ายด้วย PromptPay แล้วรับบัตรวิ่งพร้อม QR",
    heroCta: "ดูงานที่เปิดรับสมัคร",
    upcoming: "งานที่กำลังมา",
    empty: "ยังไม่มีงานที่เปิดรับสมัครตอนนี้ แวะมาดูใหม่เร็ว ๆ นี้",
    openCount: (n: number) => `เปิดรับสมัคร ${n} งาน`,
    searchLink: "ค้นหาตามจังหวัด เดือน และระยะ →",
    loadingEvents: "กำลังโหลดรายการงาน",
  },
  en: {
    steps: [
      { title: "Pick an event and race", text: "See the route, cut-off times and places left in real time" },
      { title: "Pay with PromptPay", text: "Register friends and family in a single order" },
      { title: "Get a ticket with a QR code", text: "Show the QR at kit pickup, then see your result right after" },
    ],
    stepsLabel: "How to register",
    howToLink: "See how to register, step by step →",
    season: "Season 2026–27",
    heroLine1: "Every finish line",
    heroLine2: "starts here",
    heroText: "Find a run near you, register in minutes, pay with PromptPay and get your race ticket with a QR code",
    heroCta: "See open events",
    upcoming: "Upcoming events",
    empty: "No events are open for registration right now. Check back soon",
    openCount: (n: number) => `${n} ${n === 1 ? "event" : "events"} open for registration`,
    searchLink: "Search by province, month and distance →",
    loadingEvents: "Loading events",
  },
});
