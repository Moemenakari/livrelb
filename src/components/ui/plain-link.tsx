import type { ComponentProps } from "react";
import NextLink from "next/link";

// next/link without prefetching (same reason as src/i18n/navigation.tsx). Used by the admin panel.
export default function Link(props: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />;
}
