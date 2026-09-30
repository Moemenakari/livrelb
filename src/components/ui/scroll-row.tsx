"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  /** Classes of the scrolling element (e.g. `swipeRow` + `lg:grid-cols-4`). */
  className: string;
  as?: "ul" | "div";
  /** Gives the parent access to the scrolling element. */
  innerRef?: { current: HTMLElement | null };
  /** The row turns into a grid from lg up: hide the arrows there. */
  gridFromLg?: boolean;
  children: ReactNode;
  [aria: `aria-${string}`]: string | undefined;
  role?: string;
};

const arrow =
  "absolute top-1/2 z-[2] flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-background/95 text-foreground shadow-md transition-opacity hover:text-gold-dark";

/**
 * A horizontal swipe row with previous / next arrows, so the items past the
 * edge are found on a phone and with a mouse. Arrows follow the page
 * direction (Arabic scrolls the other way) and hide when there is nothing
 * left to scroll to.
 */
export function ScrollRow({ className, as = "div", gridFromLg = false, innerRef, children, ...rest }: Props) {
  const t = useTranslations("common");
  const ref = useRef<HTMLElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // scrollLeft is 0 at the start and negative going on in RTL: use the
    // absolute value so "start" and "end" work in both directions.
    const pos = Math.abs(el.scrollLeft);
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(pos > 4);
    setCanNext(max - pos > 4);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (innerRef) innerRef.current = el;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [update, innerRef]);

  const go = (toward: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    const step = Math.max(160, el.clientWidth * 0.8);
    el.scrollBy({ left: toward * (rtl ? -1 : 1) * step, behavior: "smooth" });
  };

  const Tag = as as "div";
  const hide = gridFromLg ? "lg:hidden" : "";
  return (
    <div className="relative">
      <Tag ref={ref as React.RefObject<HTMLDivElement>} onScroll={update} className={className} {...rest}>
        {children}
      </Tag>
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label={t("previous")}
        tabIndex={canPrev ? 0 : -1}
        className={`${arrow} start-1 ${hide} ${canPrev ? "" : "pointer-events-none opacity-0"}`}
      >
        <ChevronLeft className="size-5 rtl:-scale-x-100" strokeWidth={1.5} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label={t("next")}
        tabIndex={canNext ? 0 : -1}
        className={`${arrow} end-1 ${hide} ${canNext ? "" : "pointer-events-none opacity-0"}`}
      >
        <ChevronRight className="size-5 rtl:-scale-x-100" strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  );
}
