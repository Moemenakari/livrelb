import { Link } from "@/i18n/navigation";
import { CedarMark } from "@/components/icons/cedar-mark";
import { ownerTagline } from "@/config/site";

type Props = {
  name: string;
  homeLabel: string;
  className?: string;
  /** Gold cedar for dark backgrounds (cedar green disappears on ink). */
  onDark?: boolean;
};

// Placeholder until the coin-badge logo is drawn (brief §2): a cedar in cedar
// green over the LIVRE wordmark in gold, "by Mrshop Nour" under it. Sizes
// follow the font size.
export function Logo({ name, homeLabel, className = "", onDark = false }: Props) {
  return (
    <Link
      href="/"
      aria-label={homeLabel}
      className={`inline-flex flex-col items-center gap-[0.15em] font-logo leading-none font-semibold ${className}`}
    >
      <CedarMark className={`h-[0.6em] w-auto ${onDark ? "text-gold" : "text-cedar"}`} />
      {/* Latin wordmark on every locale; the negative end margin cancels the
          trailing letter-spacing so the word stays optically centered. */}
      <span lang="en" className={`-me-[0.22em] tracking-[0.22em] ${onDark ? "text-gold" : "text-gold-dark"}`}>
        {name}
      </span>
      {/* Owner line under the wordmark, on every page. */}
      <span lang="en" className={`mt-[0.1em] font-sans text-[length:max(0.34em,9px)] font-normal tracking-[0.08em] ${onDark ? "text-white/60" : "text-muted"}`}>
        {ownerTagline}
      </span>
    </Link>
  );
}
