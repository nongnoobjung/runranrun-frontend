import { describe, expect, it } from "vitest";
import { pick } from "../content";

describe("pick", () => {
  it("shows the page's language and falls back to Thai when English is empty", () => {
    expect(pick({ th: "วิ่ง", en: "Run" }, "th")).toBe("วิ่ง");
    expect(pick({ th: "วิ่ง", en: "Run" }, "en")).toBe("Run");
    expect(pick({ th: "วิ่ง", en: null }, "en")).toBe("วิ่ง");
    expect(pick({ th: "วิ่ง", en: "  " }, "en")).toBe("วิ่ง");
    expect(pick({ th: null, en: null }, "en")).toBeNull();
  });
});
