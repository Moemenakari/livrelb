import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="font-display text-2xl text-gold">{t("title")}</h1>
      <p className="text-muted">{t("description")}</p>
      <Link
        href="/"
        className="mt-2 rounded-full border border-gold px-6 py-2.5 text-sm text-gold transition-colors hover:bg-gold hover:text-background"
      >
        {t("backHome")}
      </Link>
    </section>
  );
}
