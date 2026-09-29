"use client";

import { useId, useState, type KeyboardEvent } from "react";

type Tab = { key: string; label: string; text: string };

// Product Description / Size & Materials / Shipping Information
// (restart brief). ARIA tabs with arrow-key navigation.
export function ProductTabs({ tabs, label }: { tabs: Tab[]; label: string }) {
  const [active, setActive] = useState(0);
  const id = useId();

  const onKeyDown = (e: KeyboardEvent) => {
    const rtl = document.dir === "rtl";
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (active + step + tabs.length) % tabs.length;
    setActive(next);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="no-scrollbar flex gap-6 overflow-x-auto border-b border-line"
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.key}
            id={`${id}-tab-${i}`}
            role="tab"
            type="button"
            aria-selected={active === i}
            aria-controls={`${id}-panel-${i}`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            className={`-mb-px shrink-0 border-b-2 pb-3 text-sm whitespace-nowrap transition-colors ${
              active === i
                ? "border-gold font-medium text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.key}
          id={`${id}-panel-${i}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${i}`}
          hidden={active !== i}
          className="flex flex-col gap-3 pt-5 text-[15px] leading-relaxed text-foreground/85"
        >
          {tab.text.split("\n").map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ))}
    </div>
  );
}
