/**
 * True for a request whose body is declared as JSON. A page on another site cannot send that content type
 * without a CORS preflight, and these routes answer none, so only this site's own scripts get through. The
 * routes that use it only read (prices, a restored bag); server actions, which write, have their own check.
 */
export function isJsonRequest(request: Request): boolean {
  return (request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json");
}
