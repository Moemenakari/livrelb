// Builds public/og-default.png (1200 x 630): the picture shown when a page of
// livrelb.com is shared (WhatsApp, Instagram, Facebook). Logo text + the coin.
//   node scripts/build-og.mjs
import sharp from "sharp";

const W = 1200;
const H = 630;
const coin = await sharp(new URL("../public/coin/coin.webp", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))
  .resize(380, 380, { fit: "contain" })
  .toBuffer();

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#faf7f2"/><stop offset="1" stop-color="#efe6d8"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="none" stroke="#b08d57" stroke-width="2" rx="4"/>
  <text x="90" y="285" font-family="Georgia, 'Times New Roman', serif" font-size="150" letter-spacing="26" fill="#2b2622">LIVRE</text>
  <text x="94" y="350" font-family="Georgia, 'Times New Roman', serif" font-size="32" fill="#8a6a3b">Personalized jewelry, made in Lebanon</text>
  <text x="94" y="415" font-family="Arial, sans-serif" font-size="26" fill="#7a7068">Name necklaces  ·  The 1975 Lira  ·  Gold &amp; silver</text>
  <text x="94" y="540" font-family="Arial, sans-serif" font-size="28" letter-spacing="3" fill="#b08d57">LIVRELB.COM</text>
</svg>`;

await sharp(Buffer.from(svg))
  .composite([{ input: coin, left: W - 380 - 70, top: Math.round((H - 380) / 2) }])
  .png()
  .toFile(new URL("../public/og-default.png", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
console.log("Wrote public/og-default.png");
