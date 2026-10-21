"use client";

import { useRef, useState, useTransition } from "react";
import { Markdown } from "@/components/markdown";
import { inputClass } from "@/components/ui";
import type { UploadState } from "./actions";
import { IMAGE_ACCEPT } from "./images";

const T = {
  heading: "หัวข้อ",
  bold: "ตัวหนา",
  italic: "ตัวเอียง",
  bullets: "รายการ",
  numbers: "รายการตัวเลข",
  link: "ลิงก์",
  linkText: "ข้อความลิงก์",
  image: "แทรกรูป",
  uploading: "กำลังอัปโหลด…",
  write: "เขียน",
  preview: "ดูตัวอย่าง",
  empty: "ยังไม่มีเนื้อหา",
  hint: "## หัวข้อ · **ตัวหนา** · _ตัวเอียง_ · - รายการ · [ลิงก์](https://…) · ไม่รองรับ HTML",
};

const toolClass =
  "inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl px-2.5 text-sm font-semibold text-ink transition hover:bg-tint disabled:opacity-50";

/**
 * A textarea for Markdown with buttons for the formats the event page shows, an image button that uploads and
 * inserts the picture where the cursor is, and a preview rendered exactly as the public page renders it.
 */
export function MarkdownEditor({
  name,
  label,
  defaultValue,
  disabled,
  lang,
  upload,
}: {
  name: string;
  label: string;
  defaultValue: string;
  disabled: boolean;
  lang?: string;
  upload: (fd: FormData) => Promise<UploadState>;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();

  /** Replaces the selection with before + selection (or a placeholder) + after, keeping the inner text selected. */
  const wrap = (before: string, after = "", placeholder = "") => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const inner = value.slice(start, end) || placeholder;
    setValue(value.slice(0, start) + before + inner + after + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + inner.length);
    });
  };

  /** Puts a prefix at the start of every selected line (headings, lists). */
  const prefixLines = (prefix: (i: number) => string) => {
    const el = area.current;
    if (!el) return;
    const start = value.lastIndexOf("\n", el.selectionStart - 1) + 1;
    const end = el.selectionEnd;
    const lines = value.slice(start, end).split("\n");
    const block = lines.map((l, i) => prefix(i) + l.replace(/^(#{1,6} |- |\d+\. )/, "")).join("\n");
    setValue(value.slice(0, start) + block + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, start + block.length);
    });
  };

  /** Inserts a block on lines of its own at the cursor. */
  const insertBlock = (block: string) => {
    const el = area.current;
    const at = el ? el.selectionEnd : value.length;
    const before = value.slice(0, at);
    const lead = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    setValue(`${before}${lead}${block}\n\n${value.slice(at).replace(/^\n+/, "")}`);
  };

  const onImage = (file: File) => {
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    startUpload(async () => {
      const res = await upload(fd);
      if (res.image) insertBlock(`![${file.name.replace(/\.[^.]+$/, "").replace(/[[\]]/g, "")}](${res.image.url})`);
      else setError(res.error ?? null);
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium" id={`${name}-label`}>
          {label}
        </span>
        <div role="tablist" aria-label={label} className="flex rounded-full bg-tint p-1 text-sm">
          {[T.write, T.preview].map((tab, i) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={preview === (i === 1)}
              onClick={() => setPreview(i === 1)}
              className={`min-h-9 rounded-full px-3.5 ${preview === (i === 1) ? "bg-white font-semibold shadow-sm" : "text-muted"}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {!disabled && !preview && (
        <div role="toolbar" aria-label={`${label} toolbar`} className="flex flex-wrap gap-0.5 rounded-[14px] border-[1.5px] border-line bg-white p-1">
          <button type="button" className={toolClass} title={T.heading} aria-label={T.heading} onClick={() => prefixLines(() => "## ")}>
            H
          </button>
          <button type="button" className={toolClass} title={T.bold} aria-label={T.bold} onClick={() => wrap("**", "**", T.bold)}>
            <b>B</b>
          </button>
          <button type="button" className={toolClass} title={T.italic} aria-label={T.italic} onClick={() => wrap("_", "_", T.italic)}>
            <i>I</i>
          </button>
          <button type="button" className={toolClass} title={T.bullets} aria-label={T.bullets} onClick={() => prefixLines(() => "- ")}>
            •
          </button>
          <button type="button" className={toolClass} title={T.numbers} aria-label={T.numbers} onClick={() => prefixLines((i) => `${i + 1}. `)}>
            1.
          </button>
          <button type="button" className={toolClass} title={T.link} aria-label={T.link} onClick={() => wrap("[", "](https://)", T.linkText)}>
            🔗
          </button>
          <label className={`${toolClass} cursor-pointer gap-1 has-[:disabled]:opacity-50`} title={T.image}>
            {uploading ? T.uploading : `🖼 ${T.image}`}
            <input
              type="file"
              accept={IMAGE_ACCEPT}
              disabled={uploading}
              aria-label={`${T.image} (${label})`}
              className="sr-only"
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                e.currentTarget.value = "";
                if (file) onImage(file);
              }}
            />
          </label>
        </div>
      )}

      {/* The textarea stays in the form while previewing so the text is always submitted. */}
      <textarea
        ref={area}
        name={name}
        aria-labelledby={`${name}-label`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        hidden={preview}
        rows={12}
        maxLength={20_000}
        lang={lang}
        className={`${inputClass} py-3 text-[15px] leading-relaxed`}
      />
      {preview && (
        <div className="min-h-40 rounded-[14px] border-[1.5px] border-line bg-white p-4">
          {value.trim() ? <Markdown>{value}</Markdown> : <p className="text-sm text-muted">{T.empty}</p>}
        </div>
      )}
      {error ? <span role="alert" className="text-[13px] text-bad">{error}</span> : <span className="text-[13px] text-muted">{T.hint}</span>}
    </div>
  );
}
