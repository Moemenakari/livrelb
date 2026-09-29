// Simplified cedar in tiers: a placeholder for the coin-badge logo (brief §2).
export function CedarMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 25"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M16 2 19.5 5.5h-7z" />
      <path d="M16 5l6.5 4.5h-13z" />
      <path d="M16 8.5 26 14H6z" />
      <path d="M16 12.5 30 19H2z" />
      <rect x="14.9" y="19" width="2.2" height="5" rx="0.5" />
    </svg>
  );
}
