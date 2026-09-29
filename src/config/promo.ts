// Current promotion (brief §8.1 hero + restart brief promo bar). Temporary
// home: in the admin phase this moves to the promotions table so the owner
// can change codes and end times without a deploy. SAMPLE values [CONFIRM].
export const promo = {
  /** Code in the promo bar and hero sub-line. */
  code: "STORY15",
  percent: 15,
  /** Hero headline: discount on a customer's first order. */
  firstOrderPercent: 25,
  /** Countdown end (Beirut time). */
  endsAt: "2026-10-31T23:59:59+03:00",
};

// Delivery rules shown in the UI (site_settings later).
export const shipping = {
  freeOver: 50,
  giftBoxPrice: 5,
};
