// How the browser talks to the shop's few Worker routes (/api/quote, /api/order, /api/bag, /api/checkout-init,
// /api/forget). The shop's pages are static files and the Worker runs on the free Cloudflare plan (10 ms of CPU
// per request), so a request can come back 503 / "error 1102" while a customer is busy elsewhere. Every call
// here tries again a couple of times, a moment later; an order is safe to repeat because the same requestId
// (orders.request_id is unique) returns the first order instead of creating a second one.

export type PostResult<T> = { kind: "ok"; status: number; data: T } | { kind: "failed"; status: number };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends `body` as JSON (or asks, with method GET) and tries up to 1 + delays.length times. A try fails when the
 * network drops, the request takes longer than `timeoutMs`, the Worker answers 5xx (503 "exceeded resources"
 * comes as an HTML page), or `shouldRetry` says so about a good answer.
 */
export async function requestJson<T>(
  url: string,
  options: {
    body?: unknown;
    delays?: number[];
    timeoutMs?: number;
    shouldRetry?: (data: T) => boolean;
  } = {},
): Promise<PostResult<T>> {
  const { body, delays = [700, 1600], timeoutMs = 12000, shouldRetry } = options;
  let last: PostResult<T> = { kind: "failed", status: 0 };
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    if (attempt > 0) await wait(delays[attempt - 1] + Math.round(Math.random() * 250));
    try {
      const response = await fetch(url, {
        method: body === undefined ? "GET" : "POST",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.status >= 500) {
        last = { kind: "failed", status: response.status };
        continue;
      }
      if (!response.ok) return { kind: "failed", status: response.status };
      const data = (await response.json()) as T;
      if (shouldRetry?.(data) && attempt < delays.length) {
        last = { kind: "ok", status: response.status, data };
        continue;
      }
      return { kind: "ok", status: response.status, data };
    } catch {
      last = { kind: "failed", status: 0 };
    }
  }
  return last;
}
