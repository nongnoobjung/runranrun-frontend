import { describe, expect, it } from "vitest";
import { bangkokToIso, isoToBangkokInput, num, satang, satangToInput, text } from "../form";

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

describe("form helpers", () => {
  it("reads empty fields as null and numbers with thousands separators", () => {
    const fd = form({ name: "  ", capacity: "2,000", price: "1,200.50", bad: "abc" });
    expect(text(fd, "name")).toBeNull();
    expect(text(fd, "missing")).toBeNull();
    expect(num(fd, "capacity")).toBe(2000);
    expect(satang(fd, "price")).toBe(120_050);
    expect(num(fd, "bad")).toBeNaN();
  });

  it("treats datetime-local values as Bangkok time and round-trips them", () => {
    expect(bangkokToIso("2026-11-01T10:00")).toBe("2026-11-01T10:00:00+07:00");
    expect(bangkokToIso("")).toBeNull();
    expect(isoToBangkokInput("2026-11-01T03:00:00.000Z")).toBe("2026-11-01T10:00");
    expect(isoToBangkokInput(null)).toBe("");
  });

  it("shows satang as a plain baht number", () => {
    expect(satangToInput(120_000)).toBe("1200");
    expect(satangToInput(65_050)).toBe("650.5");
    expect(satangToInput(null)).toBe("");
  });
});
