import Image from "next/image";
import type { ReactNode } from "react";
import { ImageIcon, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";

// Stand-ins for the homepage sections until the catalog phase builds them.
// They use the real layout (photo sizes, card grids, section colors) so the
// page already looks like the boutique it will become.

const tones = {
  white: "bg-background",
  ivory: "bg-surface",
  beige: "bg-beige",
} as const;

// Horizontal swipe row on mobile, grid from lg up.
const swipeRow =
  "-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:gap-6 lg:overflow-visible lg:px-0";

export function Section({
  tone = "white",
  children,
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
}) {
  return (
    <section className={tones[tone]}>
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-20">
        {children}
      </div>
    </section>
  );
}

type HeadingProps = {
  number: string;
  badge: string;
  title: string;
  description: string;
  children?: ReactNode;
};

// Section title block. The small tag shows the brief §8.1 section number.
export function SectionHeading({
  number,
  badge,
  title,
  description,
  children,
}: HeadingProps) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="tracking-caps text-[11px] font-medium text-gold-dark uppercase">
        {number} · {badge}
      </p>
      <h2 className="text-3xl lg:text-4xl">{title}</h2>
      <p className="max-w-xl text-muted">{description}</p>
      {children}
    </div>
  );
}

const photoTones = {
  ivory: "bg-surface",
  beige: "bg-beige",
  blush: "bg-blush",
} as const;

// Where a jewelry photo will go.
export function PhotoPlaceholder({
  tone = "ivory",
  className = "",
}: {
  tone?: keyof typeof photoTones;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`flex items-center justify-center rounded-xl ${photoTones[tone]} ${className}`}
    >
      <ImageIcon className="size-8 text-muted/40" strokeWidth={1} />
    </div>
  );
}

// Product cards: photo, name, price (gold).
export function ProductGridPlaceholder() {
  return (
    <ul aria-hidden className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex flex-col gap-3">
          <PhotoPlaceholder className="aspect-[4/5]" />
          <span className="h-2.5 w-3/4 rounded-full bg-line" />
          <span className="h-2.5 w-1/3 rounded-full bg-gold/40" />
        </li>
      ))}
    </ul>
  );
}

// Category cards with their real names and links.
export function CategoryGridPlaceholder({
  categories,
}: {
  categories: { href: string; label: string }[];
}) {
  return (
    <ul className={`mt-10 lg:grid-cols-4 ${swipeRow}`}>
      {categories.map(({ href, label }) => (
        <li key={href} className="w-[42%] shrink-0 snap-start sm:w-[30%] lg:w-auto">
          <Link href={href} className="group flex flex-col gap-3 text-center">
            <PhotoPlaceholder className="aspect-[4/5] transition-colors group-hover:bg-beige" />
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Review cards: stars, text, customer.
export function ReviewCardsPlaceholder() {
  return (
    <ul aria-hidden className={`mt-10 lg:grid-cols-3 ${swipeRow}`}>
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="flex w-[80%] shrink-0 snap-start flex-col gap-4 rounded-xl border border-line bg-background p-6 sm:w-[45%] lg:w-auto"
        >
          <span className="flex gap-1 text-gold">
            {[0, 1, 2, 3, 4].map((s) => (
              <Star key={s} className="size-4 fill-current" strokeWidth={0} />
            ))}
          </span>
          <span className="h-2.5 w-full rounded-full bg-line" />
          <span className="h-2.5 w-5/6 rounded-full bg-line" />
          <span className="h-2.5 w-2/3 rounded-full bg-line" />
          <span className="mt-2 flex items-center gap-3">
            <span className="size-9 rounded-full bg-blush" />
            <span className="h-2.5 w-24 rounded-full bg-line" />
          </span>
        </li>
      ))}
    </ul>
  );
}

// The 1975 coin photo until the 3D coin (Phase 6). Multiply blending turns
// the photo's white background into the ivory behind it.
export function LiraCoin({ alt }: { alt: string }) {
  return (
    <Image
      src="/brand/lira-coin-1975.jpg"
      alt={alt}
      width={1024}
      height={509}
      sizes="(min-width: 1024px) 560px, 100vw"
      className="mx-auto h-auto w-full max-w-xl mix-blend-multiply"
    />
  );
}
