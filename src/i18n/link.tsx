"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { localePath } from "./config";
import { useLocale } from "./client";

/** next/link that keeps the visitor in their language: "/events" becomes "/en/events" on English pages. */
export default function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const locale = useLocale();
  return <NextLink href={typeof href === "string" ? localePath(locale, href) : href} {...props} />;
}
