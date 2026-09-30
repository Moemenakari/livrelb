import { redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/resolve-locale";

// "My account" in the menu: customers have no password account, so it opens
// "Track my order", where they also see their LIVRE Points.
export default async function AccountPage({ params }: PageProps<"/[locale]/account">) {
  const locale = await resolveLocale(params);
  redirect({ href: "/track", locale });
}
