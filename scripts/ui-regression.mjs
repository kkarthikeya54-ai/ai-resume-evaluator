#!/usr/bin/env node
/**
 * HireTire — UI regression gate (static, CI-safe).
 *
 * Complements public/ui-sweep.js (the in-browser contrast sweep). This script
 * catches the *source-level* bug classes that shipped before:
 *
 *   1. Dark-era light text tokens (text-red-300, text-shortlist-300, …)
 *      which are invisible on the light blue/white theme.
 *   2. White text that stays white on hover (hover:text-white) outside of
 *      approved solid-background components.
 *
 * Exit code 1 on any failure, so it can gate commits/CI.
 *
 * Usage: node scripts/ui-regression.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const violations = [];

/* ---------- collect .jsx/.js under src/ ---------- */
const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(jsx|js)$/.test(entry) && !/\.test\./.test(entry)) files.push(p);
  }
};
walk(SRC);

/* ---------- audit 1: dark-era light text tokens ---------- */
// Any `text-*-300`/`text-*-200` utility is light-palette text; on this app's
// light theme it must not appear on tinted/white surfaces. We ban the token
// class outright in src/ — dark surfaces in this app are gone post-retheme.
const LIGHT_TEXT = /\btext-(?:red|emerald|amber|yellow|orange|teal|sky|blue|indigo|violet|fuchsia|lime|green|rose|pink|cyan|shortlist|primary)-(?:[12]00|300)\b/;
for (const f of files) {
  const lines = readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    const m = line.match(LIGHT_TEXT);
    if (m) violations.push(`LIGHT-TOKEN  ${f.replace(ROOT + sep, "")}:${i + 1}  "${m[0]}"`);
  });
}

/* ---------- audit 2: unscoped hover:text-white ---------- */
// White-on-hover is only safe when the element also gains a solid dark
// background on hover (btn-primary style). We whitelist those known-safe
// class prefixes; everything else is a regression of the original bug.
const SAFE_HOVER_WHITE = /(btn-primary|btn-destructive|from-primary-|bg-primary-6|bg-red-6|bg-red-7|to-primary-)/;
for (const f of files) {
  const lines = readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (!line.includes("hover:text-white")) return;
    if (SAFE_HOVER_WHITE.test(line)) return;
    violations.push(`HOVER-WHITE  ${f.replace(ROOT + sep, "")}:${i + 1}`);
  });
}

/* ---------- report ---------- */
if (violations.length) {
  console.error(`\n✗ UI regression gate FAILED — ${violations.length} violation(s):\n`);
  for (const v of violations) console.error("  " + v);
  console.error(
    "\nFix: on the light blue/white theme, use -700/-800 tokens for text on\n" +
      "tinted surfaces (text-red-700, text-shortlist-700, …). Never pair light\n" +
      "(-200/-300) text with light backgrounds. See docs/testing/ui-regression.md"
  );
  process.exit(1);
} else {
  console.log(
    `✓ UI regression gate passed — ${files.length} files audited\n` +
      `  (1: dark-era light text tokens; 2: unscoped hover:text-white)\n` +
      `  Live contrast sweep: open any route in the dev preview and run\n` +
      `  the snippet from public/ui-sweep.js in the console (0 failures = pass).`
  );
}
