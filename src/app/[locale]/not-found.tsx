import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { primaryButton } from "@/components/ui/styles";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-28 text-center">
      <h1 className="text-4xl">{t("title")}</h1>
      <p className="text-muted">{t("description")}</p>
      <Link href="/" className={`mt-4 ${primaryButton}`}>
        {t("backHome")}
      </Link>
    </section>
  );
}
