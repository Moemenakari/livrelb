"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";

type Photo = { src: string; alt: string };

const MAX = 4;

// Full-screen product photos: swipe / arrows between photos, pinch or
// double-tap to zoom on phones, wheel or click to zoom on desktop, drag
// to move around a zoomed photo.
export function PhotoLightbox({ photos, start, onClose }: { photos: Photo[]; start: number; onClose: () => void }) {
  const t = useTranslations("product");
  const tCommon = useTranslations("common");
  const [index, setIndex] = useState(start);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [touching, setTouching] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; scale: number; x: number; y: number; px: number; py: number } | null>(null);
  const lastTap = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    return () => d?.close();
  }, []);

  const go = (i: number) => {
    setIndex((i + photos.length) % photos.length);
    setView({ scale: 1, x: 0, y: 0 });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const rtl = document.dir === "rtl";
      if (e.key === "ArrowRight") go(index + (rtl ? -1 : 1));
      if (e.key === "ArrowLeft") go(index + (rtl ? 1 : -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const clamp = (v: { scale: number; x: number; y: number }) => {
    const scale = Math.min(MAX, Math.max(1, v.scale));
    const limit = (scale - 1) * 0.5 * Math.min(window.innerWidth, window.innerHeight);
    return scale === 1 ? { scale, x: 0, y: 0 } : { scale, x: Math.max(-limit, Math.min(limit, v.x)), y: Math.max(-limit, Math.min(limit, v.y)) };
  };

  const down = (e: ReactPointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setTouching(true);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const dist = pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    gesture.current = { dist, scale: view.scale, x: view.x, y: view.y, px: e.clientX, py: e.clientY };
  };

  const move = (e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const g = gesture.current;
    if (pts.length === 2 && g.dist > 0) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      setView(clamp({ scale: g.scale * (dist / g.dist), x: g.x, y: g.y }));
    } else if (pts.length === 1 && view.scale > 1) {
      setView(clamp({ scale: view.scale, x: g.x + e.clientX - g.px, y: g.y + e.clientY - g.py }));
    }
  };

  const up = (e: ReactPointerEvent) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) {
      const [p] = [...pointers.current.values()];
      gesture.current = { dist: 0, scale: view.scale, x: view.x, y: view.y, px: p.x, py: p.y };
      return;
    }
    gesture.current = null;
    setTouching(false);
    if (!g) return;
    const dx = e.clientX - g.px;
    const moved = Math.abs(dx) > 8 || Math.abs(e.clientY - g.py) > 8;
    // Swipe between photos when not zoomed.
    if (view.scale === 1 && Math.abs(dx) > 60) {
      const rtl = document.dir === "rtl";
      go(index + ((dx < 0) !== rtl ? 1 : -1));
      return;
    }
    // Double tap (phones) or click (desktop) toggles the zoom.
    const now = Date.now();
    if (!moved && (e.pointerType === "mouse" || now - lastTap.current < 300)) {
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      setView(view.scale > 1 ? { scale: 1, x: 0, y: 0 } : clamp({ scale: 2.5, x: -cx * 1.5, y: -cy * 1.5 }));
      lastTap.current = 0;
    } else lastTap.current = now;
  };

  const photo = photos[index];
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-label={t("gallery")}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-ink/95 p-0 text-white backdrop:bg-ink/80"
    >
      <div
        className="relative flex size-full touch-none items-center justify-center overflow-hidden select-none"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onWheel={(e) => setView(clamp({ ...view, scale: view.scale * (e.deltaY < 0 ? 1.15 : 0.87) }))}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.src}
          alt={photo.alt}
          draggable={false}
          className={`max-h-full max-w-full object-contain ${touching ? "" : "transition-transform duration-200"}`}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, cursor: view.scale > 1 ? "zoom-out" : "zoom-in" }}
        />
      </div>

      <button
        type="button"
        onClick={() => dialog.current?.close()}
        aria-label={tCommon("close")}
        className="absolute end-4 top-4 flex size-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
      >
        <X className="size-6" strokeWidth={1.5} />
      </button>
      {photos.length > 1 && (
        <>
          <button type="button" onClick={() => go(index - 1)} aria-label={tCommon("previous")} className="absolute start-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
            <ChevronLeft className="size-6 rtl:-scale-x-100" strokeWidth={1.5} />
          </button>
          <button type="button" onClick={() => go(index + 1)} aria-label={tCommon("next")} className="absolute end-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
            <ChevronRight className="size-6 rtl:-scale-x-100" strokeWidth={1.5} />
          </button>
          <p className="absolute inset-x-0 bottom-5 text-center text-sm text-white/70">
            {index + 1} / {photos.length}
          </p>
        </>
      )}
    </dialog>
  );
}
