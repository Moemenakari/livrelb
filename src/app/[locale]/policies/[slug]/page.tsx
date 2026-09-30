import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveLocale } from "@/i18n/resolve-locale";
import { policies, type PolicySlug } from "@/content/pages";
import { InfoPage } from "@/components/ui/info-page";

const slugs = Object.keys(policies) as PolicySlug[];
const isPolicy = (slug: string): slug is PolicySlug => (slugs as string[]).includes(slug);

export function generateStaticParams() {
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/policies/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isPolicy(slug) || (locale !== "en" && locale !== "ar")) return {};
  const page = policies[slug][locale];
  return { title: page.title, description: page.intro };
}

// Shipping, returns, privacy and terms: draft templates (Nour reviews them).
export default async function PolicyPage({ params }: PageProps<"/[locale]/policies/[slug]">) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  if (!isPolicy(slug)) notFound();
  const page = policies[slug][locale];
  return <InfoPage title={page.title} intro={page.intro} blocks={page.blocks} draft />;
}
