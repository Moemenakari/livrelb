import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { resolveLocale } from "@/i18n/resolve-locale";
import { faq } from "@/content/pages";
import { alternates } from "@/lib/seo";
import { InfoPage } from "@/components/ui/info-page";

export async function generateMetadata({ params }: PageProps<"/[locale]/faq">): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "en" && locale !== "ar") return {};
  return { title: faq.en.title, description: faq.en.intro, alternates: alternates(locale, "/faq") };
}

export default async function FaqPage({ params }: PageProps<"/[locale]/faq">) {
  await resolveLocale(params);
  const page = faq.en;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };

  return (
    <InfoPage title={page.title} intro={page.intro}>
      <div className="divide-y divide-line border-y border-line">
        {page.items.map((item) => (
          <details key={item.q} className="group py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-medium marker:hidden [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown className="size-5 shrink-0 text-gold-dark transition-transform group-open:rotate-180" strokeWidth={1.5} aria-hidden />
            </summary>
            <p className="pb-4 leading-relaxed text-foreground/85">{item.a}</p>
          </details>
        ))}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </InfoPage>
  );
}
