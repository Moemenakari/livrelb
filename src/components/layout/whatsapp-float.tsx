import { getTranslations } from "next-intl/server";
import { getCatalog } from "@/lib/catalog";
import { WhatsAppFloatLink } from "./whatsapp-float-link";

// Floating WhatsApp button (restart brief), bottom corner on the end side.
// Hidden until the owner sets the WhatsApp number (site_settings).
export async function WhatsAppFloat() {
  const t = await getTranslations("whatsapp");
  const { settings } = await getCatalog();
  if (!settings.whatsappNumber) return null;

  return <WhatsAppFloatLink number={settings.whatsappNumber} label={t("float")} />;
}
