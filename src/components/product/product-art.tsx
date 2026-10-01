"use client";

import { useId, type ReactNode } from "react";
import type { FontKey, MaterialKey, Piece, ProductArt as Art, ChainConnection } from "@/lib/catalog/types";
import { NamePreview, aspectHeight, type Aspect } from "@/components/preview/name-preview";
import { MetalDefs, coinTint, metalEdge, toTone } from "@/components/preview/metal";
import { scriptFace } from "@/components/preview/script-fonts";
import { useBevel } from "@/components/preview/use-bevel";

// Drawn stand-ins for product photos: every product shows its real shape in
// the selected metal until the owner uploads photos (product.media).

type Props = {
  art: Art;
  material: MaterialKey;
  /** Name/initial for personalizable pieces. */
  text?: string;
  font?: FontKey;
  connection?: ChainConnection;
  /** Worn as a necklace or a bracelet; the art's own variant when missing. */
  piece?: Piece;
  aspect?: Aspect;
  shine?: boolean;
  className?: string;
};

export function ProductArt({
  art,
  material,
  text = "",
  font,
  connection,
  piece,
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
        connection={connection}
        variant={piece ?? art.variant}
        aspect={aspect}
        shine={shine}
        className={className}
      />
    );
  }
  return (
    <ShapeArt
      art={art}
      material={material}
      text={text}
      font={font}
      connection={connection}
      piece={piece}
      aspect={aspect}
      className={className}
    />
  );
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

type Pt = { x: number; y: number };

/** Necklace chain from the top corners down to a pendant at (200, y). */
const drape = (y: number) =>
  `M 44 -4 C 70 ${y * 0.8} 150 ${y} 200 ${y} S 330 ${y * 0.8} 356 -4`;

function ShapeArt({
  art,
  material,
  text,
  font = "beirut",
  connection = "center",
  piece,
  aspect,
  className,
}: {
  art: Exclude<Art, { kind: "name" }>;
  material: MaterialKey;
  text: string;
  font?: FontKey;
  connection?: ChainConnection;
  piece?: Piece;
  aspect: Aspect;
  className: string;
}) {
  const id = `pa${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const bevel = useBevel();
  const tone = toTone(material);
  const h = aspectHeight[aspect];
  const cy = h * 0.6;
  const fill = `url(#${id}-fill)`;
  const edge = metalEdge[tone];

  const coin = (cx: number, y: number, r: number) => (
    <g>
      <image
        href={art.kind === "coin" && art.coin ? `/coin/lira-${art.coin}-back.webp` : "/coin/coin.webp"}
        x={cx - r}
        y={y - r}
        width={r * 2}
        height={r * 2}
        filter={`url(#${id}-tint)`}
      />
      <circle cx={cx} cy={y} r={r - 1} fill="none" stroke={fill} strokeWidth="3" />
    </g>
  );

  const ring = ({ x, y }: Pt) => (
    <circle key={`${x},${y}`} cx={x} cy={y} r="6" fill="none" stroke={fill} strokeWidth="2.8" />
  );

  // The chain and jump rings of a pendant worn as a necklace or a bracelet,
  // from one ring on top (center) or two rings on its sides.
  const hang = (worn: Piece, at: { top: Pt; left: Pt; right: Pt }) => {
    const { top, left, right } = at;
    if (worn === "necklace" && connection === "center") {
      return (
        <>
          <Chain d={drape(top.y - 6)} tone={tone} />
          {ring(top)}
        </>
      );
    }
    if (worn === "necklace") {
      return (
        <>
          <Chain d={`M 44 -4 Q ${left.x - 12} ${left.y * 0.55} ${left.x - 4} ${left.y - 5}`} tone={tone} />
          <Chain d={`M 356 -4 Q ${right.x + 12} ${right.y * 0.55} ${right.x + 4} ${right.y - 5}`} tone={tone} />
          {ring(left)}
          {ring(right)}
        </>
      );
    }
    if (connection === "center") {
      const y = top.y - 6;
      return (
        <>
          <Chain d={`M -4 ${y - 10} Q ${top.x / 2} ${y + 4} ${top.x} ${y}`} tone={tone} />
          <Chain d={`M 404 ${y - 10} Q ${(400 + top.x) / 2} ${y + 4} ${top.x} ${y}`} tone={tone} />
          {ring(top)}
        </>
      );
    }
    return (
      <>
        <Chain d={`M -4 ${left.y - 8} Q ${left.x / 2} ${left.y + 8} ${left.x - 6} ${left.y}`} tone={tone} />
        <Chain d={`M 404 ${right.y - 8} Q ${(400 + right.x) / 2} ${right.y + 8} ${right.x + 6} ${right.y}`} tone={tone} />
        {ring(left)}
        {ring(right)}
      </>
    );
  };

  let body: ReactNode;
  switch (art.kind) {
    case "coin": {
      const worn = art.variant === "earrings" ? undefined : (piece ?? art.variant);
      if (worn) {
        const r = worn === "necklace" ? 62 : 44;
        // Side rings: up on the shoulders of a necklace pendant, level on a bracelet.
        const side = worn === "necklace" ? { dx: (r + 5) * 0.8, dy: -(r + 5) * 0.6 } : { dx: r + 3, dy: 0 };
        body = (
          <>
            {hang(worn, {
              top: { x: 200, y: cy - r - 5 },
              left: { x: 200 - side.dx, y: cy + side.dy },
              right: { x: 200 + side.dx, y: cy + side.dy },
            })}
            {coin(200, cy, r)}
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
    }
    case "cedar": {
      const worn = piece ?? art.variant ?? "necklace";
      // The cedar drawing is 32 x 24 units; s = its scale.
      const s = worn === "necklace" ? 4 : 3;
      const ox = 200 - 16 * s;
      const oy = worn === "necklace" ? cy - 72 : cy - 12 * s;
      body = (
        <>
          {hang(worn, {
            top: { x: 200, y: oy + 2 * s - 6 },
            left: { x: ox + 2 * s - 6, y: oy + 19 * s - 2 },
            right: { x: ox + 30 * s + 6, y: oy + 19 * s - 2 },
          })}
          <g transform={`translate(${ox} ${oy}) scale(${s})`} fill={fill} stroke={edge} strokeWidth="0.3">
            <path d="M16 2 19.5 5.5h-7z" />
            <path d="M16 5l6.5 4.5h-13z" />
            <path d="M16 8.5 26 14H6z" />
            <path d="M16 12.5 30 19H2z" />
            <rect x="14.9" y="19" width="2.2" height="5" rx="0.5" />
          </g>
        </>
      );
      break;
    }
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
                fontSize={Math.round(44 * scriptFace(font, text || "L").scale)}
                fontWeight={scriptFace(font, text || "L").weight}
                fill={edge}
                fillOpacity="0.85"
                style={{ fontFamily: scriptFace(font, text || "L").family }}
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
      <g filter={bevel ? `url(#${id}-metal)` : undefined}>{body}</g>
    </svg>
  );
}
