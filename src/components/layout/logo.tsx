import { Link } from "@/i18n/navigation";

type Props = {
  name: string;
  homeLabel: string;
  className?: string;
};

// Text placeholder until the coin-badge logo is drawn (brief §2).
export function Logo({ name, homeLabel, className = "" }: Props) {
  return (
    <Link
      href="/"
      aria-label={homeLabel}
      className={`font-logo font-semibold text-gold ${className}`}
    >
      {/* Latin wordmark on every locale; the negative end margin cancels the
          trailing letter-spacing so the word stays optically centered. */}
      <span lang="en" className="-me-[0.2em] tracking-[0.2em]">
        {name}
      </span>
    </Link>
  );
}
