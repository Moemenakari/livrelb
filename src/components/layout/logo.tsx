import { Link } from "@/i18n/navigation";
import { CedarMark } from "@/components/icons/cedar-mark";

type Props = {
  name: string;
  homeLabel: string;
  className?: string;
  /** Gold cedar for dark backgrounds (cedar green disappears on ink). */
  onDark?: boolean;
};

// Placeholder until the coin-badge logo is drawn (brief §2): a cedar in cedar
// green over the LIVRE wordmark in gold. Sizes follow the font size.
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
      <span lang="en" className="-me-[0.22em] tracking-[0.22em] text-gold">
        {name}
      </span>
    </Link>
  );
}
