"use client";

import { useId, type ReactNode } from "react";
import type { FontKey, MaterialKey, ProductArt as Art, RingStyle } from "@/lib/catalog/types";
import { NamePreview, aspectHeight, type Aspect } from "@/components/preview/name-preview";
import { MetalDefs, coinTint, metalEdge, toTone } from "@/components/preview/metal";
import { scriptFamily } from "@/components/preview/script-fonts";

// Drawn stand-ins for product photos: every product shows its real shape in
// the selected metal until the owner uploads photos (product.media).

type Props = {
  art: Art;
  material: MaterialKey;
  /** Name/initial for personalizable pieces. */
  text?: string;
  font?: FontKey;
  rings?: RingStyle;
  aspect?: Aspect;
  shine?: boolean;
  className?: string;
};

export function ProductArt({
  art,
  material,
  text = "",
  font,
  rings,
  aspect = "portrait",
  shine,
  className = "",
}: Props) {
  if (art.kind === "name") {
    return (
      <NamePreview
        text={text}
        material={material}
        font={font}
        rings={rings}
        variant={art.variant}
        aspect={aspect}
        shine={shine}
        className={className}
      />
    );
  }
  return <ShapeArt art={art} material={material} text={text} aspect={aspect} className={className} />;
}

type Tone = ReturnType<typeof toTone>;

function Chain({ d, tone }: { d: string; tone: Tone }) {
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke={metalEdge[tone]} strokeWidth="2.4" strokeDasharray="3.2 1.5" />
      <path
        d={d}
        stroke="#fff"
        strokeOpacity="0.55"
        strokeWidth="1"
        strokeDasharray="1.4 3.3"
        strokeDashoffset="-0.8"
      />
    </g>
  );
}

/** Necklace chain from the top corners down to a pendant at (200, y). */
const drape = (y: number) =>
  `M 44 -4 C 70 ${y * 0.8} 150 ${y} 200 ${y} S 330 ${y * 0.8} 356 -4`;

function ShapeArt({
  art,
  material,
  text,
  aspect,
  className,
}: {
  art: Exclude<Art, { kind: "name" }>;
  material: MaterialKey;
  text: string;
  aspect: Aspect;
  className: string;
}) {
  const id = `pa${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const tone = toTone(material);
  const h = aspectHeight[aspect];
  const cy = h * 0.6;
  const fill = `url(#${id}-fill)`;
  const edge = metalEdge[tone];

  const coin = (cx: number, y: number, r: number) => (
    <g>
      <image
        href="/coin/coin.webp"
        x={cx - r}
        y={y - r}
        width={r * 2}
        height={r * 2}
        filter={`url(#${id}-tint)`}
      />
      <circle cx={cx} cy={y} r={r - 1} fill="none" stroke={fill} strokeWidth="3" />
    </g>
  );

  let body: ReactNode;
  switch (art.kind) {
    case "coin":
      if (art.variant === "necklace") {
        body = (
          <>
            <Chain d={drape(cy - 76)} tone={tone} />
            <ellipse cx="200" cy={cy - 70} rx="6" ry="9" fill="none" stroke={fill} strokeWidth="3" />
            {coin(200, cy, 62)}
          </>
        );
      } else if (art.variant === "bracelet") {
        body = (
          <>
            <Chain d={`M -4 ${cy - 8} Q 70 ${cy + 8} 150 ${cy}`} tone={tone} />
            <Chain d={`M 404 ${cy - 8} Q 330 ${cy + 8} 250 ${cy}`} tone={tone} />
            <circle cx="153" cy={cy} r="6" fill="none" stroke={fill} strokeWidth="2.6" />
            <circle cx="247" cy={cy} r="6" fill="none" stroke={fill} strokeWidth="2.6" />
            {coin(200, cy, 44)}
          </>
        );
      } else {
        body = (
          <>
            {[140, 260].map((x) => (
              <g key={x}>
                <path
                  d={`M ${x} ${cy - 46} L ${x} ${cy - 92} C ${x} ${cy - 118} ${x + 26} ${cy - 118} ${x + 26} ${cy - 96} L ${x + 26} ${cy - 78}`}
                  fill="none"
                  stroke={fill}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx={x} cy={cy - 42} r="5" fill="none" stroke={fill} strokeWidth="2.4" />
                {coin(x, cy, 38)}
              </g>
            ))}
          </>
        );
      }
      break;
    case "cedar":
      body = (
        <>
          <Chain d={drape(cy - 84)} tone={tone} />
          <circle cx="200" cy={cy - 78} r="6.5" fill="none" stroke={fill} strokeWidth="2.8" />
          <g transform={`translate(136 ${cy - 72}) scale(4)`} fill={fill} stroke={edge} strokeWidth="0.3">
            <path d="M16 2 19.5 5.5h-7z" />
            <path d="M16 5l6.5 4.5h-13z" />
            <path d="M16 8.5 26 14H6z" />
            <path d="M16 12.5 30 19H2z" />
            <rect x="14.9" y="19" width="2.2" height="5" rx="0.5" />
          </g>
        </>
      );
      break;
    case "ring":
      body = (
        <>
          <ellipse cx="200" cy={cy + 10} rx="74" ry="80" fill="none" stroke={edge} strokeWidth="13" />
          <ellipse cx="200" cy={cy + 10} rx="74" ry="80" fill="none" stroke={fill} strokeWidth="10" />
          {art.engraving === "initial" && (
            <g>
              <ellipse cx="200" cy={cy - 66} rx="44" ry="30" fill={fill} stroke={edge} strokeWidth="1.5" />
              <text
                x="200"
                y={cy - 50}
                textAnchor="middle"
                fontSize="44"
                fill={edge}
                fillOpacity="0.85"
                style={{ fontFamily: scriptFamily("beirut", false) }}
              >
                {text || "L"}
              </text>
            </g>
          )}
        </>
      );
      break;
    case "hoops":
      body = (
        <>
          {[150, 250].map((x) => (
            <g key={x}>
              <path
                d={`M ${x - 4} ${cy - 44} A 34 38 0 1 0 ${x + 4} ${cy - 44}`}
                fill="none"
                stroke={fill}
                strokeWidth="8"
                strokeLinecap="round"
              />
              {art.pearl && (
                <>
                  <line x1={x} y1={cy + 32} x2={x} y2={cy + 44} stroke={edge} strokeWidth="2" />
                  <circle cx={x} cy={cy + 60} r="17" fill={`url(#${id}-pearl)`} />
                </>
              )}
            </g>
          ))}
        </>
      );
      break;
  }

  return (
    <svg
      viewBox={`0 0 400 ${h}`}
      aria-hidden
      className={`block h-auto w-full overflow-visible ${className}`}
    >
      <defs>
        <MetalDefs id={id} tone={tone} />
        <filter id={`${id}-tint`} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={coinTint[tone]} />
        </filter>
        <radialGradient id={`${id}-pearl`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#f3ece2" />
          <stop offset="1" stopColor="#cdbfae" />
        </radialGradient>
      </defs>
      <g filter={`url(#${id}-metal)`}>{body}</g>
    </svg>
  );
}
