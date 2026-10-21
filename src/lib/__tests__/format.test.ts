import { describe, expect, it } from "vitest";
import { answerText, baht, countdown, duration, fmt, fmtFor, pace, problemMessage, profileLabel, provinceName, waitLabel } from "../format";

describe("format", () => {
  it("shows baht from satang, with satang only when needed", () => {
    expect(baht(120_000)).toBe("฿1,200");
    expect(baht(110_160)).toBe("฿1,101.60");
    expect(baht(0)).toBe("฿0");
  });

  it("formats event dates in Thai with the Gregorian year, on the Bangkok calendar day", () => {
    expect(fmt.date("2027-02-14")).toBe("14 ก.พ. 2027");
    expect(fmt.dayOfMonth("2027-02-04")).toBe("04");
  });

  it("counts down as mm:ss (h:mm:ss past an hour) and never goes negative", () => {
    expect(countdown(14 * 60_000 + 59_400)).toBe("14:59");
    expect(countdown(-5000)).toBe("00:00");
    expect(countdown(23 * 3_600_000 + 41 * 60_000 + 9_000)).toBe("23:41:09");
  });

  it("translates known API problems and falls back to the API's text", () => {
    expect(problemMessage({ code: "SOLD_OUT", title: "This race is full" })).toBe("ระยะนี้เต็มแล้ว");
    expect(problemMessage({ code: "SOMETHING_NEW", title: "t", detail: "d" })).toBe("d");
    expect(provinceName("BKK")).toBe("กรุงเทพฯ");
    expect(provinceName("XYZ")).toBe("XYZ");
  });

  it("puts a waiting room estimate into words", () => {
    expect(waitLabel(45)).toBe("ไม่ถึง 1 นาที");
    expect(waitLabel(400)).toBe("ประมาณ 7 นาที");
    expect(waitLabel(3600)).toBe("ประมาณ 1 ชม.");
    expect(waitLabel(5400)).toBe("ประมาณ 1 ชม. 30 นาที");
  });

  it("says how long to wait when the API is rate limiting", () => {
    expect(problemMessage({ code: "RATE_LIMITED", title: "Too many requests", retryAfterSeconds: 42 })).toBe(
      "มีคนใช้งานพร้อมกันจำนวนมาก รอ 42 วินาทีแล้วลองใหม่",
    );
    expect(problemMessage({ code: "RATE_LIMITED", title: "Too many requests" })).toBe("มีคนใช้งานพร้อมกันจำนวนมาก รอสักครู่แล้วลองใหม่");
  });
});

describe("English formatting", () => {
  it("formats dates the British way on the Bangkok calendar day, and numbers with commas", () => {
    const f = fmtFor("en");
    expect(f.date("2027-02-14")).toBe("14 Feb 2027");
    expect(f.weekday("2027-02-14")).toBe("Sunday");
    expect(f.monthShort("2027-02-14")).toBe("Feb");
    expect(f.time("2027-02-13T23:30:00Z")).toBe("06:30");
    expect(f.num(12_345)).toBe("12,345");
    expect(fmtFor("th")).toBe(fmt);
  });

  it("translates API problems, provinces, pace and answers", () => {
    expect(problemMessage({ code: "SOLD_OUT", title: "t" }, "en")).toBe("This race is full");
    expect(problemMessage({ code: "SOMETHING_NEW", title: "t", detail: "d" }, "en")).toBe("d");
    expect(provinceName("BKK", "en")).toBe("Bangkok");
    expect(pace(313, "en")).toBe("5:13 /km");
    expect(answerText(true, "en")).toBe("Yes");
    expect(waitLabel(5400, "en")).toBe("about 1 hr 30 min");
    expect(problemMessage({ code: "RATE_LIMITED", title: "t", retryAfterSeconds: 42 }, "en")).toBe("Lots of people are here at once. Wait 42 seconds and try again");
    const me = { isSelf: true, nickname: "Chai", firstNameTh: "สมชาย", lastNameTh: "ใจดี", firstNameEn: "Somchai", lastNameEn: "Jaidee" };
    expect(profileLabel(me, "en")).toBe("Me · Chai · Somchai Jaidee");
    expect(profileLabel(me)).toBe("ตัวฉัน · Chai · สมชาย ใจดี");
  });
});

describe("duration and pace", () => {
  it("formats race times and pace", () => {
    expect(duration(6_728_000)).toBe("1:52:08");
    expect(duration(3_128_400)).toBe("52:08");
    expect(duration(null)).toBe("–");
    expect(pace(313)).toBe("5:13 /กม.");
    expect(pace(null)).toBe("–");
  });
});
