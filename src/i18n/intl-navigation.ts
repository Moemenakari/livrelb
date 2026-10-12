import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware replacements for next/link and next/navigation. Use "@/i18n/navigation" in the app: it re-exports
// these and swaps in the Link of src/components/ui/site-link.tsx.
export const navigation = createNavigation(routing);
