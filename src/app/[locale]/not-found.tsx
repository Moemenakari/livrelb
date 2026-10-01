import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CedarMark } from "@/components/icons/cedar-mark";
import { primaryButton, secondaryButton } from "@/components/ui/styles";

// 404 in the brand style: cedar, a gold "404", and the ways back into the shop.
export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <CedarMark className="size-12 text-cedar" />
      <p className="font-display text-7xl leading-none text-gold lining-nums" lang="en" aria-hidden>
        404
      </p>
      <h1 className="text-4xl">{t("title")}</h1>
      <p className="text-muted">{t("description")}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Link href="/" className={primaryButton}>
          {t("backHome")}
        </Link>
        <Link href="/charms" className={secondaryButton}>
          {t("charms")}
        </Link>
      </div>
      <Link href="/track" className="text-sm text-muted underline underline-offset-4 hover:text-foreground">
        {t("track")}
      </Link>
    </section>
  );
}
