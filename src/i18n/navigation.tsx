import type { ComponentProps } from "react";
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware replacements for next/link and next/navigation.
const navigation = createNavigation(routing);
export const { redirect, usePathname, useRouter, getPathname } = navigation;

// Links never prefetch: every prefetch is a Worker request and a page shows ~10 links at once, which
// on the free Cloudflare plan ends in error 1102. Pages still open normally when she taps a link.
export function Link(props: ComponentProps<typeof navigation.Link>) {
  return <navigation.Link prefetch={false} {...props} />;
}
