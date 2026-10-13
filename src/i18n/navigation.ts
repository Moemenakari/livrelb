import { navigation } from "./intl-navigation";

// Locale-aware replacements for next/link and next/navigation.
export const { redirect, usePathname, useRouter, getPathname } = navigation;

// The Link never prefetches and opens pages with a normal browser navigation (the reasons are in the file).
export { SiteLink as Link } from "@/components/ui/site-link";
