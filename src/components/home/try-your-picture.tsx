import { getTranslations } from "next-intl/server";
import { categoryHref } from "@/config/navigation";
import { homeSection, type Catalog } from "@/lib/catalog";
import type { Locale } from "@/i18n/routing";
import { PhotoPendant } from "./photo-pendant";
import { SectionTitle } from "./section-title";
import { homeCover } from "./layout";

// "Try your picture": a photo inside a pendant, in the browser. The button
// goes to the photo pendant product, set on the admin's Home page (a page of
// the shop); until then it opens the Gifts category.
export async function TryYourPicture({ catalog, locale }: { catalog: Catalog; locale: Locale }) {
  const t = await getTranslations("home.photo");
  const section = homeSection(catalog, "try_picture");
  if (!section.visible) return null;

  return (
    <section data-coin-cover className={`${homeCover} bg-surface`}>
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
        <SectionTitle title={section.title?.[locale] ?? t("title")} subtitle={section.subtitle?.[locale] ?? t("subtitle")} />
        <PhotoPendant href={section.ctaHref ?? categoryHref("gifts")} />
      </div>
    </section>
  );
}
