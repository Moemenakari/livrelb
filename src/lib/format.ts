// Lebanese shops show dollar prices as "$39" in both languages, with Western
// digits ("ar" Intl formatting gives "39 US$"), so format by hand.
export function formatPrice(amount: number): string {
  return `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

/** Always two decimals ("$5.00"): savings, points value and order summaries. */
export function formatMoney(amount: number): string {
  return `$${(Math.round(amount * 100) / 100).toFixed(2)}`;
}
