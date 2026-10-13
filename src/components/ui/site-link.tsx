"use client";

import type { ComponentProps } from "react";
import { navigation } from "@/i18n/intl-navigation";

type Props = ComponentProps<typeof navigation.Link>;

/**
 * The shop's link. Two choices, both for the free Cloudflare plan (10 ms of CPU per Worker request):
 * - no prefetching: every prefetch was a Worker request, and a page shows ~10 links at once (error 1102);
 * - a tap opens the page with a normal browser navigation. The shop's pages are static files (see
 *   scripts/static-pages.mjs); the soft navigation of Next.js would ask the Worker for each page's data first
 *   and, getting a file instead, load the page a second time.
 * Ctrl/Cmd/Shift/middle clicks and target="_blank" keep the browser's own behaviour.
 */
export function SiteLink({ onClick, replace, ...props }: Props) {
  return (
    <navigation.Link
      {...props}
      replace={replace}
      prefetch={false}
      onClick={(event) => {
        onClick?.(event);
        const link = event.currentTarget;
        const own = !link.target || link.target === "_self";
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !own || link.hasAttribute("download")) return;
        event.preventDefault();
        if (replace) window.location.replace(link.href);
        else window.location.assign(link.href);
      }}
    />
  );
}
