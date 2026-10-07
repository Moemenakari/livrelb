"use client";

import { useId, useRef, useState, type PointerEvent } from "react";
import { ImagePlus, Lock, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { whatsappUrl } from "@/config/site";
import { useWhatsappNumber } from "@/lib/use-whatsapp";
import type { MetalTone } from "@/lib/catalog/types";
import { MetalDefs, metalEdge } from "@/components/preview/metal";
import { primaryButton } from "@/components/ui/styles";

type Shape = "round" | "square" | "heart";
type Metal = Extract<MetalTone, "gold" | "silver">;
type Piece = "necklace" | "keychain";

const W = 240;
const H = 300;
const TOP = 60; // the pendant hangs below the chain
const MAX_ZOOM = 3;

// Pendant outlines in a 240 x 240 box (moved down by TOP). The same path clips the photo
// and draws the metal rim. Rings sit on the outline: one on top, or two on the sides.
const outline: Record<Shape, string> = {
  round: "M120 22a98 98 0 1 0 0.01 0Z",
  square: "M40 22h160a18 18 0 0 1 18 18v160a18 18 0 0 1-18 18H40a18 18 0 0 1-18-18V40a18 18 0 0 1 18-18Z",
  heart: "M120 218C46 160 18 118 18 80 18 48 42 26 72 26c20 0 38 10 48 28 10-18 28-28 48-28 30 0 54 22 54 54 0 38-28 80-102 138Z",
};
const sideRings: Record<Shape, [number, number][]> = {
  round: [[52, 52], [188, 52]],
  square: [[30, 30], [210, 30]],
  heart: [[58, 38], [182, 38]],
};

/**
 * The picture as an engraving: black hatching on the metal, no colour. Every small cell of the
 * photo becomes a short diagonal stroke, thicker where the photo is dark, crossed where it is very
 * dark (like laser engraving). Done in the browser; the photo never leaves the phone.
 */
function engrave(img: HTMLImageElement): string {
  const S = 520;
  const CELL = 5;
  const src = document.createElement("canvas");
  src.width = src.height = S;
  const sctx = src.getContext("2d", { willReadFrequently: true })!;
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  sctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, S, S);
  const px = sctx.getImageData(0, 0, S, S).data;

  const out = document.createElement("canvas");
  out.width = out.height = S;
  const ctx = out.getContext("2d")!;
  ctx.strokeStyle = "rgba(34,24,10,0.9)";
  ctx.lineCap = "round";
  for (let y = 0; y < S; y += CELL) {
    for (let x = 0; x < S; x += CELL) {
      let sum = 0;
      for (let j = 0; j < CELL; j++) for (let i = 0; i < CELL; i++) {
        const k = ((y + j) * S + x + i) * 4;
        sum += (0.299 * px[k] + 0.587 * px[k + 1] + 0.114 * px[k + 2]) / 255;
      }
      // More contrast than the photo has, so faces and shapes read clearly.
      const dark = Math.min(1, Math.max(0, (1 - sum / (CELL * CELL) - 0.15) * 1.35));
      if (dark < 0.08) continue;
      ctx.lineWidth = 0.6 + dark * CELL * 0.75;
      ctx.beginPath();
      ctx.moveTo(x, y + CELL);
      ctx.lineTo(x + CELL, y);
      if (dark > 0.55) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + CELL, y + CELL);
      }
      ctx.stroke();
    }
  }
  return out.toDataURL("image/png");
}

const chip = "rounded-full border px-4 py-2 text-sm transition-colors";
const chipOn = "border-ink bg-ink text-white";
const chipOff = "border-line hover:border-muted";

function Choice<T extends string>({ label, value, options, onChange, name }: { label: string; value: T; options: T[]; onChange: (v: T) => void; name: (v: T) => string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap justify-center gap-2 lg:justify-start">
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)} className={`${chip} ${value === o ? chipOn : chipOff}`}>
          {name(o)}
        </button>
      ))}
    </div>
  );
}

// "Try your picture": her photo as an engraving inside a round, square or heart pendant, on a
// necklace (one ring or two) or a keychain, in gold or silver. All in the browser; the photo is
// sent to us on WhatsApp when she orders. Drag to move, pinch or slide to zoom.
export function PhotoPendant({ whatsapp }: { whatsapp: string }) {
  const t = useTranslations("home.photo");
  const tMini = useTranslations("home.mini");
  const id = `pp${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const number = useWhatsappNumber(whatsapp);
  const fileRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);

  const [art, setArt] = useState<string | null>(null);
  const [shape, setShape] = useState<Shape>("round");
  const [metal, setMetal] = useState<Metal>("gold");
  const [piece, setPiece] = useState<Piece>("necklace");
  const [rings, setRings] = useState<1 | 2>(1);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const clamp = (x: number, y: number, z: number) => {
    const limit = (240 / 2) * z;
    return { x: Math.max(-limit, Math.min(limit, x)), y: Math.max(-limit, Math.min(limit, y)) };
  };

  const choose = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setArt(engrave(img));
      URL.revokeObjectURL(url);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = url;
  };

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!art) return;
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
    const units = W / svgRef.current.getBoundingClientRect().width;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      setZoom(Math.max(1, Math.min(MAX_ZOOM, (pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.distance)));
    } else if (pointers.current.size === 1) {
      setOffset((o) => clamp(o.x + (e.clientX - last.x) * units, o.y + (e.clientY - last.y) * units, zoom));
    }
  };
  const onUp = (e: PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
  };

  const d = outline[shape];
  const ringPoints: [number, number][] =
    piece === "keychain" ? [[120, TOP - 8]] : rings === 2 ? sideRings[shape].map(([x, y]) => [x, y + TOP]) : [[120, TOP + 2]];
  const edge = metalEdge[metal];
  const message = [
    t("message"),
    `${t("shapeLabel")}: ${t(shape)} · ${tMini(metal)} · ${t(piece)}${piece === "necklace" ? ` · ${t(rings === 1 ? "oneRing" : "twoRings")}` : ""}`,
    t("sendPhoto"),
  ].join("\n");

  return (
    <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
      <div className="mx-auto w-full max-w-xs lg:max-w-sm">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={t("previewLabel")}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className={`w-full select-none ${art ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
        >
          <defs>
            <MetalDefs id={id} tone={metal} />
            <clipPath id={`${id}-clip`}>
              <path d={d} />
            </clipPath>
          </defs>

          {/* chain: from the top corners to the ring(s), or a key ring for a keychain */}
          <g fill="none" stroke={edge} strokeWidth="2.2" strokeDasharray="3.2 1.6" strokeLinecap="round">
            {piece === "necklace" ? (
              ringPoints.map(([x, y], i) =>
                rings === 1 ? (
                  <g key={i}>
                    <path d={`M24 0 Q${x - 40} ${y * 0.6} ${x - 5} ${y - 6}`} />
                    <path d={`M216 0 Q${x + 40} ${y * 0.6} ${x + 5} ${y - 6}`} />
                  </g>
                ) : (
                  <path key={i} d={`M${x < 120 ? 24 : 216} 0 Q${(x < 120 ? 24 + x : 216 + x) / 2} ${y * 0.55} ${x} ${y - 6}`} />
                ),
              )
            ) : (
              <circle cx="120" cy="20" r="18" strokeDasharray="none" stroke={`url(#${id}-fill)`} strokeWidth="5" />
            )}
          </g>
          {ringPoints.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="8" fill="none" stroke={`url(#${id}-fill)`} strokeWidth="3.5" />
          ))}

          <g transform={`translate(0 ${TOP})`}>
            <g filter={`url(#${id}-metal)`}>
              <path d={d} fill={`url(#${id}-fill)`} />
            </g>
            <g clipPath={`url(#${id}-clip)`}>
              {art && (
                <image
                  href={art}
                  width="240"
                  height="240"
                  transform={`translate(${120 + offset.x} ${120 + offset.y}) scale(${zoom}) translate(-120 -120)`}
                />
              )}
            </g>
            <path d={d} fill="none" stroke={`url(#${id}-fill)`} strokeWidth="9" strokeLinejoin="round" />
            <path d={d} fill="none" stroke={edge} strokeOpacity="0.55" strokeWidth="1" />
            {!art && (
              <text x="120" y="124" textAnchor="middle" fontSize="13" className="fill-ink/60">
                {t("empty")}
              </text>
            )}
          </g>
        </svg>
      </div>

      <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-start">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => choose(e.target.files?.[0])} />
        <button type="button" onClick={() => fileRef.current?.click()} className={primaryButton}>
          <ImagePlus className="size-4" strokeWidth={1.5} aria-hidden />
          {art ? t("change") : t("choose")}
        </button>

        <Choice label={t("shapeLabel")} value={shape} options={["round", "square", "heart"]} onChange={setShape} name={(v) => t(v)} />
        <Choice label={tMini("metalLabel")} value={metal} options={["gold", "silver"]} onChange={setMetal} name={(v) => tMini(v)} />
        <Choice label={t("pieceLabel")} value={piece} options={["necklace", "keychain"]} onChange={setPiece} name={(v) => t(v)} />
        {piece === "necklace" && (
          <Choice label={t("ringsLabel")} value={String(rings) as "1" | "2"} options={["1", "2"]} onChange={(v) => setRings(v === "1" ? 1 : 2)} name={(v) => t(v === "1" ? "oneRing" : "twoRings")} />
        )}

        {art && (
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
                setOffset((o) => clamp(o.x, o.y, z));
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

        {number && (
          <a href={whatsappUrl(number, message)} target="_blank" rel="noopener noreferrer" className={`${primaryButton} bg-cedar hover:bg-cedar/90`}>
            <MessageCircle className="size-4.5" strokeWidth={1.5} aria-hidden />
            {t("cta")}
          </a>
        )}
      </div>
    </div>
  );
}
