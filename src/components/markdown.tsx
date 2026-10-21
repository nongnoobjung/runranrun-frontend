import ReactMarkdown, { defaultUrlTransform, type Components } from "react-markdown";

/**
 * The small Markdown subset organisers write event descriptions in: headings, bold, italic, lists, links, quotes and
 * images. Raw HTML is dropped (never rendered), anything else collapses to its text, and URLs pass the library's
 * safe-protocol check (no javascript:). Headings start one level under the section's own h2.
 */
const ALLOWED = ["p", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "ul", "ol", "li", "a", "img", "blockquote", "br", "hr", "code"];

/** Uploaded event images, or images on another https host. */
const IMAGE_SRC = /^(\/media\/|https:\/\/)/;

const heading = "font-bold leading-snug text-ink";

const COMPONENTS: Components = {
  h1: ({ children }) => <h3 className={`mt-2 text-xl ${heading}`}>{children}</h3>,
  h2: ({ children }) => <h3 className={`mt-2 text-xl ${heading}`}>{children}</h3>,
  h3: ({ children }) => <h4 className={`mt-1 text-lg ${heading}`}>{children}</h4>,
  h4: ({ children }) => <h5 className={`text-base ${heading}`}>{children}</h5>,
  h5: ({ children }) => <h5 className={`text-base ${heading}`}>{children}</h5>,
  h6: ({ children }) => <h5 className={`text-base ${heading}`}>{children}</h5>,
  ul: ({ children }) => <ul className="flex list-disc flex-col gap-1 pl-6 marker:text-brand">{children}</ul>,
  ol: ({ children }) => <ol className="flex list-decimal flex-col gap-1 pl-6 marker:font-semibold">{children}</ol>,
  blockquote: ({ children }) => <blockquote className="border-l-4 border-line pl-4 text-muted">{children}</blockquote>,
  code: ({ children }) => <code className="rounded bg-tint px-1.5 py-0.5 text-[0.9em]">{children}</code>,
  hr: () => <hr className="border-line" />,
  a: ({ href, children }) =>
    href && /^https?:\/\//i.test(href) ? (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc">
        {children}
      </a>
    ) : (
      <a href={href}>{children}</a>
    ),
  img: ({ src, alt }) =>
    typeof src === "string" && IMAGE_SRC.test(src) ? (
      // eslint-disable-next-line @next/next/no-img-element -- sizes are unknown inside organiser text
      <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" className="h-auto max-w-full rounded-[20px]" />
    ) : null,
};

export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`flex max-w-[700px] flex-col gap-3 break-words text-ink/85 [&_a]:font-medium ${className}`}>
      <ReactMarkdown skipHtml allowedElements={ALLOWED} unwrapDisallowed urlTransform={defaultUrlTransform} components={COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
