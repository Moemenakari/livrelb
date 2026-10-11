// In-app browsers (Instagram, Facebook, TikTok...): Google refuses to run in them, and their storage is not
// the phone's real browser's. These helpers detect them and build the address that hands the current page
// (with the bag, see bag-transfer.ts) to Safari on iPhone or Chrome on Android. No react, so it can be tested alone.
const EMBEDDED = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Messenger|TikTok|musical_ly|Bytedance|Snapchat|LinkedInApp|Line\/|MicroMessenger|Twitter|; wv\)|(iPhone|iPod|iPad)(?!.*Safari)/i;

/** Browser only. */
export const isEmbeddedBrowser = () => EMBEDDED.test(navigator.userAgent);

export function browserHandoffUrl(page: { href: string }, userAgent: string, bag?: string): string {
  const url = new URL(page.href);
  if (bag) url.searchParams.set("bag", bag);
  if (/Android/i.test(userAgent)) {
    return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.android.chrome;end`;
  }
  return url.href.replace(/^https?:/, "x-safari-https:");
}
