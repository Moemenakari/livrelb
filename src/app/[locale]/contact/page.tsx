import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/resolve-locale";
import { whatsappUrl } from "@/config/site";
import { getCatalog } from "@/lib/catalog";
import { InstagramIcon, WhatsAppIcon } from "@/components/icons/brand-icons";
import { InfoPage } from "@/components/ui/info-page";
import { primaryButton, secondaryButton } from "@/components/ui/styles";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "contact" });
  return { title: t("title"), description: t("intro") };
}

// Contact: the WhatsApp and Instagram buttons only exist once their setting
// is filled in the admin (hide-when-empty rule); the help links always do.
export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  await resolveLocale(params);
  const t = await getTranslations("contact");
  const tWhatsapp = await getTranslations("whatsapp");
  const { settings } = await getCatalog();
  const { whatsappNumber, instagramUrl } = settings;

  return (
    <InfoPage title={t("title")} intro={t("intro")}>
      <div className="flex flex-col gap-3 sm:flex-row">
        {whatsappNumber && (
          <a
            href={whatsappUrl(whatsappNumber, tWhatsapp("hello"))}
            target="_blank"
            rel="noopener noreferrer"
            className={`${primaryButton} flex-1 bg-cedar hover:bg-cedar/90`}
          >
            <WhatsAppIcon className="size-5" />
            {t("whatsapp")}
          </a>
        )}
        {instagramUrl && (
          <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className={`${secondaryButton} flex-1`}>
            <InstagramIcon className="size-5" />
            {t("instagram")}
          </a>
        )}
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ["/track", "track"],
            ["/faq", "faq"],
            ["/charms", "charms"],
          ] as const
        ).map(([href, key]) => (
          <li key={key}>
            <Link href={href} className="flex h-full flex-col gap-1 rounded-xl border border-line p-4 transition-colors hover:border-gold">
              <span className="font-medium">{t(`links.${key}.title`)}</span>
              <span className="text-sm text-muted">{t(`links.${key}.text`)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">{t("hours")}</p>
    </InfoPage>
  );
}
