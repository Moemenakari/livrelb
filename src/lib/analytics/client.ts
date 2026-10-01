// Browser side of analytics (Meta Pixel + Google Analytics 4). Nothing here
// runs, and nothing is loaded, until the visitor accepts cookies in the
// banner. Events keep Meta's names (ViewContent, AddToCart, InitiateCheckout,
// Purchase) and are mapped to GA4's (view_item, add_to_cart, begin_checkout,
// purchase). Each event is also sent to our server (/api/meta-event), which
// forwards it to Meta's Conversions API with the same event id (no double
// counting).

export type Consent = "granted" | "denied";
export const CONSENT_KEY = "livre-consent";
export const CONSENT_COOKIE = "livre_consent";
export const CONSENT_EVENT = "livre-consent";

export type TrackEvent = "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase";
export type TrackData = {
  /** Product slug (ViewContent / AddToCart). */
  id?: string;
  name?: string;
  /** Price of the piece or total of the order, in USD. */
  value: number;
  quantity?: number;
  /** Same id for the pixel and the server: Meta counts the event once. */
  eventId?: string;
  /** Customer phone for better matching (hashed by our server before sending). */
  phone?: string;
};

type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[]; callMethod?: (...a: unknown[]) => void; push?: unknown; loaded?: boolean; version?: string };
declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function getConsent(): Consent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: Consent): void {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {}
  // The server reads this cookie before it forwards anything to Meta.
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

function addScript(src: string): void {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.append(s);
}

let loaded = false;

/** Loads the pixel and GA4 (once). Call only after consent. */
export function loadAnalytics(ids: { pixelId: string; ga4Id: string }): void {
  if (loaded) return;
  loaded = true;

  if (ids.pixelId) {
    const fbq: Fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue!.push(args);
    };
    window.fbq = fbq;
    window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    addScript("https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", ids.pixelId);
    fbq("track", "PageView");
  }

  if (ids.ga4Id) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      // gtag needs the arguments object itself, not an array.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ids.ga4Id)}`);
    window.gtag("js", new Date());
    window.gtag("config", ids.ga4Id);
  }
}

const gaName: Record<TrackEvent, string> = {
  ViewContent: "view_item",
  AddToCart: "add_to_cart",
  InitiateCheckout: "begin_checkout",
  Purchase: "purchase",
};

/** Sends one shopping event to the pixel, GA4 and our server (when allowed). */
export function track(event: TrackEvent, data: TrackData): void {
  if (getConsent() !== "granted") return;
  const eventId = data.eventId ?? `${event}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const quantity = data.quantity ?? 1;

  window.fbq?.(
    "track",
    event,
    {
      value: data.value,
      currency: "USD",
      content_type: "product",
      ...(data.id ? { content_ids: [data.id], content_name: data.name } : {}),
      num_items: quantity,
    },
    { eventID: eventId },
  );

  window.gtag?.("event", gaName[event], {
    currency: "USD",
    value: data.value,
    ...(event === "Purchase" ? { transaction_id: eventId } : {}),
    items: data.id ? [{ item_id: data.id, item_name: data.name, price: data.value / quantity, quantity }] : undefined,
  });

  void fetch("/api/meta-event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    keepalive: true,
    body: JSON.stringify({ event, eventId, value: data.value, id: data.id, quantity, phone: data.phone, url: location.href }),
  }).catch(() => {});
}
