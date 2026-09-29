"use client";

import { useRef } from "react";
import { Ruler, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SizeOption } from "@/lib/catalog/types";

// "Size guide" link that opens a small dialog for the product's size type.
export function SizeGuide({ size }: { size: SizeOption }) {
  const t = useTranslations("product");
  const tCommon = useTranslations("common");
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted underline underline-offset-4 transition-colors hover:text-foreground"
      >
        <Ruler className="size-4" strokeWidth={1.5} aria-hidden />
        {t("sizeGuide")}
      </button>
      <dialog
        ref={ref}
        aria-label={t("sizeGuideTitle")}
        onClick={(e) => {
          if (e.target === e.currentTarget) ref.current?.close();
        }}
        className="m-auto w-[min(92vw,28rem)] rounded-xl bg-background p-0 text-foreground backdrop:bg-foreground/30 open:animate-rise-in motion-reduce:animate-none"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-2xl">{t("sizeGuideTitle")}</h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label={tCommon("close")}
            className="flex size-9 items-center justify-center rounded-full hover:bg-surface"
          >
            <X className="size-5" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex flex-col gap-4 px-6 py-5 text-sm">
          {size.kind === "chain" ? (
            <>
              <p className="text-muted">{t("sizeGuideIntro")}</p>
              <ul className="divide-y divide-line">
                {size.values
                  .filter((v) => [35, 40, 45, 50, 55].includes(v))
                  .map((v) => (
                    <li key={v} className="flex gap-4 py-3">
                      <span className="w-14 shrink-0 font-medium">{t("cm", { value: v })}</span>
                      <span className="text-muted">
                        {t(`chainGuide.${v as 35 | 40 | 45 | 50 | 55}`)}
                      </span>
                    </li>
                  ))}
              </ul>
            </>
          ) : (
            <p className="text-muted">
              {size.kind === "bracelet" ? t("braceletGuide") : t("ringGuide")}
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}
