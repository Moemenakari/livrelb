// From inside an in-app browser (Instagram, Facebook, TikTok...), the address that hands the current
// page to the phone's real browser: Safari on iPhone, Chrome on Android. No react, so it can be tested alone.
export function browserHandoffUrl(page: { href: string; host: string; pathname: string; search: string; hash: string }, userAgent: string): string {
  if (/Android/i.test(userAgent)) {
    return `intent://${page.host}${page.pathname}${page.search}#Intent;scheme=https;package=com.android.chrome;end`;
  }
  return page.href.replace(/^https?:/, "x-safari-https:");
}
