import { notFound } from "next/navigation";

/** Unknown paths under the site get its own not-found page (with header and footer) in the visitor's language. */
export default function UnknownPage() {
  notFound();
}

// Nothing to prefetch: it only ever renders the not-found page.
export const instant = false;
