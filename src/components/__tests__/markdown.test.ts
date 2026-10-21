import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "../markdown";

const html = (md: string) => renderToStaticMarkup(createElement(Markdown, null, md));

describe("Markdown", () => {
  it("renders headings under the section heading, emphasis, lists and uploaded images", () => {
    const out = html("## เส้นทาง\n\n**ปิดถนน** _ตลอดสาย_\n\n- น้ำ\n- เหรียญ\n\n1. ปล่อยตัว\n\n![จุดปล่อยตัว](/media/event-images/a.webp)");
    expect(out).toContain(">เส้นทาง</h3>");
    expect(out).toContain("<strong>ปิดถนน</strong>");
    expect(out).toContain("<em>ตลอดสาย</em>");
    expect(out).toMatch(/<ul[^>]*>\s*<li>น้ำ<\/li>/);
    expect(out).toMatch(/<ol[^>]*>\s*<li>ปล่อยตัว<\/li>/);
    expect(out).toContain('src="/media/event-images/a.webp" alt="จุดปล่อยตัว" loading="lazy"');
  });

  it("opens outside links in a new tab without handing over the page", () => {
    expect(html("[แผนที่](https://maps.example/x)")).toContain('href="https://maps.example/x" target="_blank" rel="noopener noreferrer nofollow ugc"');
  });

  it("never renders raw HTML, scripts or javascript: links", () => {
    const out = html('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n[x](javascript:alert(1)) <b onclick="x">b</b>\n\n![p](http://plain.example/a.jpg)');
    expect(out).not.toMatch(/<script|onerror|onclick|javascript:|<b>|http:\/\/plain/);
  });

  it("keeps the text of things outside the subset, such as tables", () => {
    const out = html("| a |\n|---|\n| b |");
    expect(out).not.toContain("<table");
    expect(out).toContain("a");
  });
});
