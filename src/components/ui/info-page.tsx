import { getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { showDraftNotice, type Block } from "@/content/pages";
import type { ReactNode } from "react";

// Shared layout of the text pages (policies, FAQ, story, contact): a narrow
// readable column with breadcrumbs, a title and the blocks of text.
export async function InfoPage({
  title,
  intro,
  blocks,
  draft = false,
  children,
}: {
  title: string;
  intro?: string;
  blocks?: Block[];
  /** A template that Nour still has to review: shows the draft notice. */
  draft?: boolean;
  children?: ReactNode;
}) {
  const t = await getTranslations("pages");
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 pt-3 pb-20 lg:px-8 lg:pt-6">
      <Breadcrumbs label={t("breadcrumbLabel")} items={[{ label: t("home"), href: "/" }, { label: title }]} />
      <header className="flex flex-col gap-3">
        <h1 className="text-4xl lg:text-5xl">{title}</h1>
        {intro && <p className="text-lg text-muted">{intro}</p>}
      </header>
      {draft && showDraftNotice && (
        <p role="note" className="rounded-xl border border-gold/50 bg-gold/10 px-4 py-3 text-sm">
          <strong className="font-semibold">{t("draftTitle")}</strong> {t("draftText")}
        </p>
      )}
      {blocks?.map((b, i) => (
        <section key={i} className="flex flex-col gap-3">
          {b.heading && <h2 className="text-2xl lg:text-3xl">{b.heading}</h2>}
          {b.paragraphs?.map((p, j) => (
            <p key={j} className="leading-relaxed text-foreground/85">
              {p}
            </p>
          ))}
          {b.list && (
            <ul className="flex list-disc flex-col gap-1.5 ps-5 text-foreground/85 marker:text-gold">
              {b.list.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {children}
    </div>
  );
}
