"use client";

import type { ComponentPropsWithoutRef } from "react";
import { localizedPath } from "../lib/i18n-routing";
import { useI18n } from "./I18n";

type SiteLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & { href: string };

// Full document navigation avoids a production RSC-prefetch race in the hosting runtime.
export function Link({ href, children, ...props }: SiteLinkProps) {
  const { locale } = useI18n();
  return <a href={localizedPath(href, locale)} {...props}>{children}</a>;
}
