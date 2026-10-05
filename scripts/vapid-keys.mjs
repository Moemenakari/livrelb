// Makes a VAPID key pair for phone notifications (Web Push).
//   node scripts/vapid-keys.mjs
// Put both lines in .env.local, and on Cloudflare:
//   npx wrangler secret put VAPID_PUBLIC_KEY --name shop
//   npx wrangler secret put VAPID_PRIVATE_KEY --name shop
const b64u = (bytes) => Buffer.from(bytes).toString("base64url");
const { publicKey, privateKey } = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
const raw = new Uint8Array(await crypto.subtle.exportKey("raw", publicKey));
const jwk = await crypto.subtle.exportKey("jwk", privateKey);
console.log(`VAPID_PUBLIC_KEY=${b64u(raw)}`);
console.log(`VAPID_PRIVATE_KEY=${jwk.d}`);
