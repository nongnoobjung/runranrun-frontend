import type { EventType } from "@/lib/types";

export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "road", label: "วิ่งถนน" },
  { value: "trail", label: "เทรล" },
  { value: "ultra", label: "อัลตร้า" },
  { value: "fun_run", label: "ฟันรัน" },
  { value: "virtual", label: "เวอร์ชวลรัน" },
];
