import { describe, expect, it } from "vitest";
import { baht, countdown, duration, fmt, pace, problemMessage, provinceName } from "../format";

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

  it("counts down as mm:ss and never goes negative", () => {
    expect(countdown(14 * 60_000 + 59_400)).toBe("14:59");
    expect(countdown(-5000)).toBe("00:00");
  });

  it("translates known API problems and falls back to the API's text", () => {
    expect(problemMessage({ code: "SOLD_OUT", title: "This race is full" })).toBe("ระยะนี้เต็มแล้ว");
    expect(problemMessage({ code: "SOMETHING_NEW", title: "t", detail: "d" })).toBe("d");
    expect(provinceName("BKK")).toBe("กรุงเทพฯ");
    expect(provinceName("XYZ")).toBe("XYZ");
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
