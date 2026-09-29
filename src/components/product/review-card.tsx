import type { Locale } from "@/i18n/routing";
import type { Review } from "@/lib/catalog/types";
import { Stars } from "@/components/ui/stars";

// One customer review: stars, text, name and city.
export function ReviewCard({
  review,
  locale,
  starsLabel,
  productName,
  className = "",
}: {
  review: Review;
  locale: Locale;
  starsLabel: string;
  /** Shown under the name on the homepage (which piece they bought). */
  productName?: string;
  className?: string;
}) {
  const initial = [...review.author][0];
  return (
    <figure
      className={`flex flex-col gap-4 rounded-xl border border-line bg-background p-6 ${className}`}
    >
      <Stars rating={review.rating} label={starsLabel} />
      <blockquote className="flex-1 leading-relaxed">{review.text[locale]}</blockquote>
      <figcaption className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-10 items-center justify-center rounded-full bg-blush font-display text-lg text-gold-dark"
        >
          {initial}
        </span>
        <span className="flex flex-col text-sm">
          <span className="font-medium">
            {review.author}
            <span className="font-normal text-muted"> · {review.city[locale]}</span>
          </span>
          {productName && <span className="text-muted">{productName}</span>}
        </span>
      </figcaption>
    </figure>
  );
}
