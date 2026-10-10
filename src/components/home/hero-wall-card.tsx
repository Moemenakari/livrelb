import {
  BadgePercent,
  Clock,
  Crown,
  Flame,
  Gem,
  Gift,
  Heart,
  PartyPopper,
  Sparkles,
  Tag,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { HeroIconKey } from "@/lib/hero-cards";
import { Stars } from "@/components/ui/stars";

// One card of the wall behind the Lira coin. Shared by the homepage and the admin preview
// (no hooks, no server-only code).

export type WallCardData =
  | { kind: "review"; rating: number; text: string; author: string; city: string; product?: string }
  | { kind: "note"; icon: HeroIconKey | ""; text: string; stars: number; price: string };

// A hand-drawn loudspeaker (not an emoji) with a little 3D shading.
function Speaker() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-11 shrink-0 drop-shadow-[0_3px_3px_rgba(31,26,23,0.25)]">
      <defs>
        <linearGradient id="wall-spk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e8c876" />
          <stop offset="1" stopColor="#a67c2d" />
        </linearGradient>
      </defs>
      <path d="M8 19h8l14-9v28l-14-9H8a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z" fill="url(#wall-spk)" />
      <path d="M16 19v10l14 9V10Z" fill="#fff" fillOpacity="0.22" />
      <path d="M35 17a10 10 0 0 1 0 14M40 12a17 17 0 0 1 0 24" fill="none" stroke="#a67c2d" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const ICONS: Record<Exclude<HeroIconKey, "speaker">, LucideIcon> = {
  truck: Truck,
  percent: BadgePercent,
  sparkles: Sparkles,
  gift: Gift,
  heart: Heart,
  tag: Tag,
  clock: Clock,
  crown: Crown,
  flame: Flame,
  gem: Gem,
  party: PartyPopper,
};

export function HeroIcon({ icon, className = "size-9" }: { icon: HeroIconKey; className?: string }) {
  if (icon === "speaker") return <Speaker />;
  const Icon = ICONS[icon];
  return <Icon className={`${className} shrink-0 text-gold-dark`} strokeWidth={1.5} aria-hidden />;
}

const box = "flex h-28 w-60 shrink-0 rounded-2xl border border-line bg-white/90 p-4 shadow-sm";

export function WallCard({ card }: { card: WallCardData }) {
  if (card.kind === "note") {
    return (
      <li className={`${box} items-center gap-3`}>
        {card.icon && <HeroIcon icon={card.icon} />}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          {card.stars > 0 && <Stars rating={card.stars} className="size-3.5" />}
          {card.text && <p className="line-clamp-3 text-sm leading-snug font-medium">{card.text}</p>}
          {card.price && <p className="font-display text-xl leading-none font-medium text-gold-dark">{card.price}</p>}
        </div>
      </li>
    );
  }
  return (
    <li className={`${box} flex-col justify-between`}>
      <Stars rating={card.rating} className="size-3.5" />
      <p className="line-clamp-2 text-sm leading-snug">{card.text}</p>
      <p className="truncate text-xs text-muted">
        <span className="font-medium text-foreground">{card.author}</span>
        {card.city && ` · ${card.city}`}
        {card.product && ` · ${card.product}`}
      </p>
    </li>
  );
}
