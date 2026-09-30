// Small gold coin for LIVRE Points (price block, cards, summaries).
export function LivreCoin({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <linearGradient id="livre-coin-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3dca0" />
          <stop offset=".5" stopColor="#c9a35d" />
          <stop offset="1" stopColor="#8a6a3b" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10.5" fill="url(#livre-coin-g)" />
      <circle cx="12" cy="12" r="8" fill="none" stroke="#fff6dc" strokeOpacity=".7" strokeWidth=".8" />
      <text
        x="12"
        y="15.6"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fontFamily="Georgia, serif"
        fill="#5e4524"
      >
        {"L"}
      </text>
    </svg>
  );
}
