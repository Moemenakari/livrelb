import { getTranslations } from "next-intl/server";
import { whatsappUrl } from "@/config/site";
import { getCatalog } from "@/lib/catalog";
import { WhatsAppIcon } from "@/components/icons/brand-icons";

// Floating WhatsApp button (restart brief), bottom corner on the end side.
// Hidden until the owner sets the WhatsApp number (site_settings).
export async function WhatsAppFloat() {
  const t = await getTranslations("whatsapp");
  const { settings } = await getCatalog();
  if (!settings.whatsappNumber) return null;

  return (
    <a
      href={whatsappUrl(settings.whatsappNumber)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("float")}
      title={t("float")}
      className="fixed end-4 bottom-4 z-30 flex size-14 items-center justify-center rounded-full bg-cedar text-white shadow-[0_8px_24px_rgba(31,26,23,0.22)] transition-transform hover:scale-105 lg:end-6 lg:bottom-6"
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
