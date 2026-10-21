import { describe, expect, it } from "vitest";
import { localePath, localized, unlocalizedPath } from "../config";
import { dictionary } from "../dictionaries";

/** Every leaf of a dictionary as "path: type", so TH and EN can be compared shape for shape. */
function shape(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) return [`${path}: array(${value.length})`, ...value.flatMap((v, i) => shape(v, `${path}[${i}]`))];
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k));
  return [`${path}: ${typeof value}`];
}

/** Leaves that are text: the strings themselves, and functions called with sample values. */
function texts(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") return [String(value(1, 2, 3))];
  if (value && typeof value === "object") return Object.values(value).flatMap(texts);
  return [];
}

describe("dictionaries", () => {
  it("have the same keys, value types and list lengths in Thai and English", () => {
    expect(shape(dictionary("en"))).toEqual(shape(dictionary("th")));
  });

  it("have no empty strings, and no Thai left in English", () => {
    const thai = /[฀-๿]/;
    for (const s of texts(dictionary("th"))) expect(s.trim()).not.toBe("");
    // The brand and the switch back to Thai are the only Thai on English pages.
    const allowed = new Set([dictionary("en").common.brand, dictionary("en").common.language.switchTo, dictionary("en").common.language.short]);
    const leftovers = texts(dictionary("en")).filter((s) => thai.test(s.replaceAll("฿", "")) && !allowed.has(s));
    expect(leftovers).toEqual([]);
  });
});

describe("locale paths", () => {
  it("prefixes English and leaves Thai plain", () => {
    expect(localePath("en", "/events")).toBe("/en/events");
    expect(localePath("en", "/")).toBe("/en");
    expect(localePath("en", "/?q=x")).toBe("/en?q=x");
    expect(localePath("en", "/login?next=/me/events")).toBe("/en/login?next=/me/events");
    expect(localePath("th", "/events")).toBe("/events");
  });

  it("is idempotent and switches language", () => {
    expect(localePath("en", "/en/events")).toBe("/en/events");
    expect(localePath("th", "/en/events?x=1")).toBe("/events?x=1");
    expect(localePath("th", "/en")).toBe("/");
    expect(unlocalizedPath("/entries")).toBe("/entries");
  });

  it("never prefixes the Thai-only backoffice or other sites", () => {
    expect(localePath("en", "/organizer/abc")).toBe("/organizer/abc");
    expect(localePath("en", "/admin")).toBe("/admin");
    expect(localePath("en", "https://example.com/x")).toBe("https://example.com/x");
    expect(localePath("en", "//evil.example")).toBe("//evil.example");
  });
});

describe("localized", () => {
  it("prefers the page's language and falls back to the other one", () => {
    expect(localized("en", { th: "งานวิ่ง", en: "Fun Run" })).toBe("Fun Run");
    expect(localized("en", { th: "งานวิ่ง", en: null })).toBe("งานวิ่ง");
    expect(localized("en", { th: "งานวิ่ง", en: "" })).toBe("งานวิ่ง");
    expect(localized("th", { th: null, en: "Somchai" })).toBe("Somchai");
    expect(localized("th", { th: "งานวิ่ง", en: "Fun Run" })).toBe("งานวิ่ง");
  });
});
