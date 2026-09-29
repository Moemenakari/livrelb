// Fails when messages/en.json and messages/ar.json don't have the same keys,
// so no page ships with a missing Arabic (or English) string.
import { readFileSync } from "node:fs";

const locales = ["en", "ar"];

function load(locale) {
  const file = new URL(`../messages/${locale}.json`, import.meta.url);
  return JSON.parse(readFileSync(file, "utf8"));
}

function flatten(obj, prefix = "") {
  return Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === "object"
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

const keys = Object.fromEntries(
  locales.map((locale) => [locale, new Set(flatten(load(locale)))]),
);

let failed = false;
for (const locale of locales) {
  for (const other of locales) {
    if (other === locale) continue;
    const missing = [...keys[other]].filter((key) => !keys[locale].has(key));
    if (missing.length) {
      failed = true;
      console.error(`messages/${locale}.json is missing:\n  ${missing.join("\n  ")}`);
    }
  }
}

if (failed) process.exit(1);
console.log(`Messages OK: ${keys.en.size} keys in ${locales.join(", ")}.`);
