"use client";

import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { ImagePlus, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { MetalTone } from "@/lib/catalog/types";
import { MetalDefs, metalEdge } from "@/components/preview/metal";
import { primaryButton } from "@/components/ui/styles";

type Shape = "round" | "square" | "heart";
type Metal = Extract<MetalTone, "gold" | "silver">;

const SIZE = 240;
const MAX_ZOOM = 3;

// The pendant outline, in a 240 x 240 box. The same path clips the photo and
// draws the metal rim.
const outline: Record<Shape, string> = {
  round: "M120 22a98 98 0 1 0 0.01 0Z",
  square: "M40 22h160a18 18 0 0 1 18 18v160a18 18 0 0 1-18 18H40a18 18 0 0 1-18-18V40a18 18 0 0 1 18-18Z",
  heart:
    "M120 218C46 160 18 118 18 80 18 48 42 26 72 26c20 0 38 10 48 28 10-18 28-28 48-28 30 0 54 22 54 54 0 38-28 80-102 138Z",
};

const chip = "rounded-full border px-4 py-2 text-sm transition-colors";
const chipOn = "border-ink bg-ink text-white";
const chipOff = "border-line hover:border-muted";

// "Try your picture": a photo shown inside a round, square or heart pendant
// with a gold or silver rim. Everything happens in the browser: the photo is
// never uploaded until she orders. Drag to move, pinch or slide to zoom.
export function PhotoPendant({ href }: { href: string }) {
  const t = useTranslations("home.photo");
  const tMini = useTranslations("home.mini");
  const id = `pp${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const fileRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);

  const [src, setSrc] = useState<string | null>(null);
  const [shape, setShape] = useState<Shape>("round");
  const [metal, setMetal] = useState<Metal>("gold");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Free the browser's copy of the photo when it is replaced or the page closes.
  useEffect(() => () => (src ? URL.revokeObjectURL(src) : undefined), [src]);

  const clampOffset = (x: number, y: number, z: number) => {
    const limit = (SIZE / 2) * z;
    return { x: Math.max(-limit, Math.min(limit, x)), y: Math.max(-limit, Math.min(limit, y)) };
  };

  const choose = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setSrc(URL.createObjectURL(file));
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!src) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  };

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const last = pointers.current.get(e.pointerId);
    if (!last || !svgRef.current) return;
    const units = SIZE / svgRef.current.getBoundingClientRect().width;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const next = (pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.distance;
      setZoom(Math.max(1, Math.min(MAX_ZOOM, next)));
    } else if (pointers.current.size === 1) {
      setOffset((o) => clampOffset(o.x + (e.clientX - last.x) * units, o.y + (e.clientY - last.y) * units, zoom));
    }
  };

  const onUp = (e: PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
  };

  const d = outline[shape];

  return (
    <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
      <div className="mx-auto w-full max-w-xs lg:max-w-sm">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={t("previewLabel")}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className={`w-full select-none ${src ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
        >
          <defs>
            <MetalDefs id={id} tone={metal} />
            <clipPath id={`${id}-clip`}>
              <path d={d} />
            </clipPath>
          </defs>
          <g filter={`url(#${id}-metal)`}>
            <path d={d} fill={`url(#${id}-fill)`} />
          </g>
          <g clipPath={`url(#${id}-clip)`}>
            <rect width={SIZE} height={SIZE} className="fill-surface" />
            {src && (
              <image
                href={src}
                width={SIZE}
                height={SIZE}
                preserveAspectRatio="xMidYMid slice"
                transform={`translate(${SIZE / 2 + offset.x} ${SIZE / 2 + offset.y}) scale(${zoom}) translate(${-SIZE / 2} ${-SIZE / 2})`}
              />
            )}
          </g>
          <path d={d} fill="none" stroke={`url(#${id}-fill)`} strokeWidth="9" strokeLinejoin="round" />
          <path d={d} fill="none" stroke={metalEdge[metal]} strokeOpacity="0.55" strokeWidth="1" />
          {!src && (
            <g className="fill-muted" textAnchor="middle" fontSize="13">
              <text x={SIZE / 2} y={SIZE / 2 + 4}>
                {t("empty")}
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-start">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => choose(e.target.files?.[0])} />
        <button type="button" onClick={() => fileRef.current?.click()} className={primaryButton}>
          <ImagePlus className="size-4" strokeWidth={1.5} aria-hidden />
          {src ? t("change") : t("choose")}
        </button>

        <div role="group" aria-label={t("shapeLabel")} className="flex flex-wrap justify-center gap-2 lg:justify-start">
          {(["round", "square", "heart"] as const).map((s) => (
            <button key={s} type="button" aria-pressed={shape === s} onClick={() => setShape(s)} className={`${chip} ${shape === s ? chipOn : chipOff}`}>
              {t(s)}
            </button>
          ))}
        </div>

        <div role="group" aria-label={tMini("metalLabel")} className="flex flex-wrap justify-center gap-2 lg:justify-start">
          {(["gold", "silver"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={metal === m} onClick={() => setMetal(m)} className={`${chip} ${metal === m ? chipOn : chipOff}`}>
              {tMini(m)}
            </button>
          ))}
        </div>

        {src && (
          <label className="flex w-full max-w-xs flex-col gap-1 text-sm text-muted">
            {t("zoom")}
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.05}
              value={zoom}
              onChange={(e) => {
                const z = Number(e.target.value);
                setZoom(z);
                setOffset((o) => clampOffset(o.x, o.y, z));
              }}
              className="h-8 w-full accent-[var(--cedar)]"
            />
            <span className="text-xs">{t("hint")}</span>
          </label>
        )}

        <p className="flex items-center gap-2 text-xs text-muted">
          <Lock className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
          {t("privacy")}
        </p>

        <Link href={href} className={primaryButton}>
          {t("cta")}
        </Link>
      </div>
    </div>
  );
}
