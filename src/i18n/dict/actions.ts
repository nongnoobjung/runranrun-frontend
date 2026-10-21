import { defineDict } from "../define";

/** Messages the Server Actions in src/app/actions.ts return to forms. */
export default defineDict({
  th: {
    emailInvalid: "กรอกอีเมลให้ถูกต้อง",
    pickRace: "เลือกระยะและจำนวนผู้วิ่งอย่างน้อย 1 คน",
    required: "จำเป็นต้องกรอก",
    pickShirt: "เลือกไซซ์เสื้อ",
    completeCheckout: "กรอกข้อมูลให้ครบก่อนไปต่อ",
    answer: {
      required: "จำเป็นต้องตอบ",
      "must be ticked": "ต้องติ๊กก่อนสมัคร",
      "must be a number": "ใส่เป็นตัวเลข",
      "out of range": "ตัวเลขอยู่นอกช่วงที่ผู้จัดกำหนด",
    } as Record<string, string>,
    answerInvalid: "คำตอบไม่ถูกต้อง",
    refundReason: "บอกเหตุผลสั้น ๆ",
    completeRefund: "กรอกข้อมูลให้ครบก่อนส่งคำขอ",
    accountNumber: "เลขบัญชี 10–15 หลัก",
    checkField: "ตรวจสอบช่องนี้",
    transferEmail: "ใส่อีเมลให้ถูกต้อง",
    completeAccept: "กรอกข้อมูลให้ครบก่อนรับสิทธิ์",
    pickNewRace: "เลือกระยะที่จะเปลี่ยนไป",
    completeProfile: "กรอกข้อมูลให้ครบก่อนบันทึก",
  },
  en: {
    emailInvalid: "Enter a valid email address",
    pickRace: "Choose a race and at least 1 runner",
    required: "Required",
    pickShirt: "Choose a shirt size",
    completeCheckout: "Fill in all the required fields to continue",
    answer: {
      required: "An answer is required",
      "must be ticked": "Tick this box to register",
      "must be a number": "Enter a number",
      "out of range": "The number is outside the organiser's range",
    },
    answerInvalid: "This answer is not valid",
    refundReason: "Tell us the reason briefly",
    completeRefund: "Fill in all the required fields to send the request",
    accountNumber: "Account number is 10–15 digits",
    checkField: "Check this field",
    transferEmail: "Enter a valid email address",
    completeAccept: "Fill in all the required fields to accept",
    pickNewRace: "Choose the race to change to",
    completeProfile: "Fill in all the required fields to save",
  },
});
