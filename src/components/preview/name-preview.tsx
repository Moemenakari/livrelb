"use client";

import { useEffect, useId, useMemo, useRef, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import type { FontKey, MaterialKey, MetalTone, ChainConnection } from "@/lib/catalog/types";
import { estimateInk, measureInk, type Ink, type Point } from "./measure-ink";
import { MetalDefs, metalEdge, metalLight, toTone } from "./metal";
import { fontScale, isArabic, scriptFamily, scriptWeight } from "./script-fonts";

export const NAME_MAX_LENGTH = 10;

type Props = {
  /** What the customer typed. Empty shows the placeholder name. */
  text: string;
  material: MaterialKey | MetalTone;
  font?: FontKey;
  connection?: ChainConnection;
  /** Necklace: chain rises to the top corners. Bracelet: runs sideways. */
  variant?: "necklace" | "bracelet";
  /** Frame shape: the chain always starts at the top edge. */
  aspect?: Aspect;
  /** Light sweep across the name each time it changes. */
  shine?: boolean;
  className?: string;
};

export type Aspect = "wide" | "square" | "portrait";

/** viewBox height per frame shape (width is always 400). */
export const aspectHeight: Record<Aspect, number> = { wide: 300, square: 400, portrait: 500 };

function layoutFor(variant: "necklace" | "bracelet", aspect: Aspect) {
  const h = aspectHeight[aspect];
  return variant === "necklace"
    ? { w: 400, h, cx: 200, cy: h * 0.6, maxW: 300, maxH: 150 }
    : { w: 400, h, cx: 200, cy: h / 2, maxW: 250, maxH: 100 };
}

const RING_R = 7;

function subscribeFonts(onChange: () => void) {
  document.fonts.addEventListener("loadingdone", onChange);
  return () => document.fonts.removeEventListener("loadingdone", onChange);
}

function baseFontSize(length: number): number {
  if (length <= 1) return 150;
  if (length <= 3) return 100;
  return 82;
}

/**
 * Live preview of a name necklace or bracelet, drawn as SVG: the name in the
 * product's script with a metallic fill for the chosen material, jump rings
 * where the chain attaches, and a fine chain. Reused by the product page,
 * the homepage hero and product cards.
 */
export function NamePreview({
  text,
  material,
  font = "beirut",
  connection = "sides",
  variant = "necklace",
  aspect = "wide",
  shine = false,
  className = "",
}: Props) {
  const t = useTranslations("namePreview");
  const id = `np${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const tone = toTone(material);
  const shown = [...(text.trim() || t("placeholder"))].slice(0, NAME_MAX_LENGTH).join("");
  const arabic = isArabic(shown);
  const length = [...shown].length;
  const fontSize = Math.round(baseFontSize(length) * fontScale[font] * (variant === "bracelet" ? 0.8 : 1));
  const family = scriptFamily(font, arabic);
  const fontCss = `${scriptWeight(arabic)} ${fontSize}px ${family}`;
  // A bracelet always hangs from two side rings.
  const connectionStyle: ChainConnection = variant === "bracelet" ? "sides" : connection;

  // Measure only once the font is loaded. Server and first client render use
  // the estimate so hydration matches.
  const fontReady = useSyncExternalStore(
    subscribeFonts,
    () => document.fonts.check(fontCss, shown),
    () => false,
  );
  useEffect(() => {
    if (!fontReady) document.fonts.load(fontCss, shown).catch(() => {});
  }, [fontCss, shown, fontReady]);

  const ink: Ink = useMemo(
    () => (fontReady && measureInk(shown, fontCss, arabic)) || estimateInk(shown, fontSize),
    [fontReady, shown, fontCss, arabic, fontSize],
  );

  const L = layoutFor(variant, aspect);
  const inkW = ink.right - ink.left;
  const inkH = ink.bottom - ink.top;
  const scale = Math.min(1, L.maxW / inkW, L.maxH / inkH);
  const inkCx = (ink.left + ink.right) / 2;
  const inkCy = (ink.top + ink.bottom) / 2;
  const place = (p: Point): Point => ({
    x: L.cx + (p.x - inkCx) * scale,
    y: L.cy + (p.y - inkCy) * scale,
  });
  const textTransform = `translate(${L.cx} ${L.cy}) scale(${scale}) translate(${-inkCx} ${-inkCy})`;

  const left = place(ink.leftAttach);
  const right = place(ink.rightAttach);
  const top = place(ink.topAttach);
  const ringLeft = { x: left.x - RING_R * 0.55, y: left.y };
  const ringRight = { x: right.x + RING_R * 0.55, y: right.y };
  const ringTop = { x: top.x, y: top.y - RING_R * 0.6 };

  let chains: string[];
  let ringPoints: Point[];
  if (variant === "bracelet") {
    const droop = L.cy + 10;
    chains = [
      `M -4 ${droop - 4} Q ${ringLeft.x / 2} ${droop + 8} ${ringLeft.x - RING_R} ${ringLeft.y}`,
      `M ${L.w + 4} ${droop - 4} Q ${(L.w + ringRight.x) / 2} ${droop + 8} ${ringRight.x + RING_R} ${ringRight.y}`,
    ];
    ringPoints = [ringLeft, ringRight];
  } else if (connectionStyle === "center") {
    const low = ringTop.y - RING_R + 1.2;
    chains = [
      `M 44 -4 C 70 ${low * 0.8} ${ringTop.x - 80} ${low} ${ringTop.x} ${low} S ${L.w - 70} ${low * 0.8} ${L.w - 44} -4`,
    ];
    ringPoints = [ringTop];
  } else {
    chains = [
      `M 56 -4 Q ${ringLeft.x - 14} ${ringLeft.y * 0.62} ${ringLeft.x - RING_R * 0.8} ${ringLeft.y - RING_R * 0.5}`,
      `M ${L.w - 56} -4 Q ${ringRight.x + 14} ${ringRight.y * 0.62} ${ringRight.x + RING_R * 0.8} ${ringRight.y - RING_R * 0.5}`,
    ];
    ringPoints = [ringLeft, ringRight];
  }

  // Restart the light sweep whenever the name, font or metal changes.
  const sweepRef = useRef<SVGAnimateTransformElement>(null);
  useEffect(() => {
    if (!shine || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    sweepRef.current?.beginElement();
  }, [shine, shown, font, tone]);

  return (
    <svg
      viewBox={`0 0 ${L.w} ${L.h}`}
      role="img"
      aria-label={t("label", { name: shown })}
      className={`block h-auto w-full overflow-visible ${className}`}
    >
      <defs>
        <MetalDefs id={id} tone={tone} />
        {shine && (
          <linearGradient
            id={`${id}-shine`}
            x1="0"
            y1="0"
            x2="1"
            y2="0.4"
            gradientTransform="translate(-1 0)"
          >
            <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
            <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
            <animateTransform
              ref={sweepRef}
              attributeName="gradientTransform"
              type="translate"
              from="-1 0"
              to="1 0"
              dur="1.1s"
              begin="indefinite"
              fill="freeze"
            />
          </linearGradient>
        )}
      </defs>

      <g filter={`url(#${id}-metal)`}>
        {chains.map((d) => (
          <g key={d} fill="none" strokeLinecap="round">
            <path d={d} stroke={metalEdge[tone]} strokeWidth="2.4" strokeDasharray="3.2 1.5" />
            <path
              d={d}
              stroke={metalLight[tone]}
              strokeWidth="1"
              strokeDasharray="1.4 3.3"
              strokeDashoffset="-0.8"
            />
          </g>
        ))}
        {ringPoints.map(({ x, y }) => (
          <circle
            key={`${x},${y}`}
            cx={x}
            cy={y}
            r={RING_R}
            fill="none"
            stroke={`url(#${id}-fill)`}
            strokeWidth="2.6"
          />
        ))}
        <text
          transform={textTransform}
          textAnchor="middle"
          direction={arabic ? "rtl" : "ltr"}
          fontSize={fontSize}
          fontWeight={scriptWeight(arabic)}
          fill={`url(#${id}-fill)`}
          stroke={metalEdge[tone]}
          strokeWidth={1.3}
          paintOrder="stroke"
          style={{ fontFamily: family }}
        >
          {shown}
        </text>
      </g>
      {shine && (
        <text
          aria-hidden
          transform={textTransform}
          textAnchor="middle"
          direction={arabic ? "rtl" : "ltr"}
          fontSize={fontSize}
          fontWeight={scriptWeight(arabic)}
          fill={`url(#${id}-shine)`}
          style={{ fontFamily: family }}
          pointerEvents="none"
        >
          {shown}
        </text>
      )}
    </svg>
  );
}
