// Shared class strings for elements that appear on many pages.

// Primary call to action: near-black pill (restart brief: black for primary
// buttons; gold is kept for prices and selected states).
export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full bg-ink px-7 py-3.5 text-sm font-medium tracking-wide text-white transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50 rtl:tracking-normal";

// Secondary call to action: outlined pill.
export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full border border-ink px-7 py-3.5 text-sm font-medium tracking-wide text-ink transition-colors hover:bg-ink hover:text-white rtl:tracking-normal";

// Small uppercase label above section titles.
export const eyebrow =
  "tracking-caps text-[11px] font-medium text-gold-dark uppercase";

// Page-width container.
export const container = "mx-auto w-full max-w-7xl px-4 lg:px-8";

// Horizontal swipe row on mobile that becomes a grid from lg up. Add the
// lg:grid-cols-* class and a width on the children for mobile.
export const swipeRow =
  "no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:gap-6 lg:overflow-visible lg:px-0";
