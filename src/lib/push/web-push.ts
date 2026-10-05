import "server-only";
import { siteConfig } from "@/config/site";

// Web Push to the staff's phones (RFC 8030 / 8291 / 8292), with WebCrypto
// only, so it runs on Cloudflare Workers without a Node library.
// Keys: VAPID_PUBLIC_KEY (raw P-256 point) and VAPID_PRIVATE_KEY (the "d"
// value), both base64url. Make a pair with `node scripts/vapid-keys.mjs`.

export type PushTarget = { endpoint: string; p256dh: string; auth: string };
export type PushMessage = { title: string; body: string; url: string; tag?: string };

const text = new TextEncoder();

const toB64u = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function fromB64u(value: string): Uint8Array<ArrayBuffer> {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

// The push services browsers use. A subscription for any other address is
// refused: the server would otherwise POST to whatever a logged-in staff
// member typed in.
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /(^|\.)push\.services\.mozilla\.com$/,
  /(^|\.)push\.apple\.com$/,
  /(^|\.)notify\.windows\.com$/,
];

/** Is this address one of the browsers' push services (https, no port, no login in the URL)? */
export function isPushServiceUrl(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && !url.port && !url.username && !url.password && PUSH_HOSTS.some((h) => h.test(url.hostname));
  } catch {
    return false;
  }
}

/** The public key the browser subscribes with, or null when push isn't set up. */
export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY ? process.env.VAPID_PUBLIC_KEY : null;
}

async function vapidAuthorization(endpoint: string): Promise<string> {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? "";
  const point = fromB64u(publicKey);
  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", d: process.env.VAPID_PRIVATE_KEY, x: toB64u(point.slice(1, 33)), y: toB64u(point.slice(33, 65)), ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const header = toB64u(text.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = toB64u(
    text.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: siteConfig.url })),
  );
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, text.encode(`${header}.${claims}`)));
  return `vapid t=${header}.${claims}.${toB64u(signature)}, k=${publicKey}`;
}

async function hkdf(salt: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: Uint8Array<ArrayBuffer>, length: number) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8));
}

/** aes128gcm body for one subscription (RFC 8291), a single record. */
async function encrypt(target: PushTarget, payload: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  const local = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  return encryptWith(target, payload, local, crypto.getRandomValues(new Uint8Array(16)));
}

/** encrypt() with a given sender key and salt (exported for the RFC 8291 test vector). */
export async function encryptWith(
  target: PushTarget,
  payload: Uint8Array,
  local: CryptoKeyPair,
  salt: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
  const uaPublic = fromB64u(target.p256dh);
  const authSecret = fromB64u(target.auth);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256));

  const ikm = await hkdf(authSecret, shared, concat(text.encode("WebPush: info\u0000"), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, text.encode("Content-Encoding: aes128gcm\u0000"), 16);
  const nonce = await hkdf(salt, ikm, text.encode("Content-Encoding: nonce\u0000"), 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // 0x02 = padding delimiter of the last (only) record.
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, concat(payload, new Uint8Array([2]))));

  const header = new Uint8Array(16 + 4 + 1 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  header.set(asPublic, 21);
  return concat(header, sealed);
}

/** Sends one notification. "gone" = the phone unsubscribed: delete it. */
export async function sendPush(target: PushTarget, message: PushMessage): Promise<"ok" | "gone" | "error"> {
  if (!isPushServiceUrl(target.endpoint)) return "error";
  try {
    const body = await encrypt(target, text.encode(JSON.stringify(message)));
    const res = await fetch(target.endpoint, {
      method: "POST",
      headers: {
        Authorization: await vapidAuthorization(target.endpoint),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        Urgency: "high",
      },
      body,
      redirect: "manual",
    });
    if (res.status === 404 || res.status === 410) return "gone";
    return res.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}
