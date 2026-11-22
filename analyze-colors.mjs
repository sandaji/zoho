#!/usr/bin/env node
/**
 * Read-only analysis (changes nothing): which hard-coded status-colour class
 * combinations do the frontend screens use? Groups classes that appear in the
 * same string, in any order, so "bg-green-100 text-green-800" and
 * "text-green-800 bg-green-100" count as the same combination.
 *
 * Run from the repo root:   node analyze-colors.mjs
 * Delete this file afterwards.
 */

import fs from "node:fs";
import path from "node:path";

const FRONTEND = path.join(process.cwd(), "frontend");
const DIRS = ["app", "components", "lib"].map((d) => path.join(FRONTEND, d));

if (!fs.existsSync(FRONTEND)) {
  console.error("Run this from the repo root (the folder that contains frontend/).");
  process.exit(1);
}

const FAMILIES =
  "green|emerald|red|rose|amber|yellow|orange|blue|sky|indigo|purple|violet|teal|cyan";
const TOKEN = new RegExp(`^(bg|text|border)-(${FAMILIES})-(\\d{2,3})$`);
const STRING_LITERAL = /(["'`])([^"'`\n]{3,600}?)\1/g;
const ORDER = { bg: 0, text: 1, border: 2 };

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) yield full;
  }
}

const combos = new Map(); // "bg-x-100 text-x-800" -> { count, example }
const tokens = new Map(); // "bg-x-100" -> count
let stringsWithColour = 0;

for (const dir of DIRS) {
  for (const file of walk(dir)) {
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(STRING_LITERAL)) {
      const parts = m[2].split(/\s+/).filter(Boolean);
      // Plain classes only (no hover:/dark:/md: prefixes), so combinations are comparable.
      const hits = parts
        .map((p) => p.match(TOKEN))
        .filter(Boolean)
        .map((x) => ({ text: x[0], kind: x[1], shade: Number(x[3]) }));
      if (!hits.length) continue;
      stringsWithColour++;

      for (const h of hits) tokens.set(h.text, (tokens.get(h.text) ?? 0) + 1);

      // A "status" string has a pale background (50-200).
      if (!hits.some((h) => h.kind === "bg" && h.shade <= 200)) continue;
      const key = hits
        .sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || a.text.localeCompare(b.text))
        .map((h) => h.text)
        .join(" ");
      const entry = combos.get(key) ?? { count: 0, example: path.relative(process.cwd(), file) };
      entry.count++;
      combos.set(key, entry);
    }
  }
}

const top = (map, n, valueOf = (v) => v) =>
  [...map.entries()].sort((a, b) => valueOf(b[1]) - valueOf(a[1])).slice(0, n);

console.log(`Strings containing a colour class: ${stringsWithColour}\n`);

console.log("=== Most common pale-background combinations (any order) ===");
for (const [key, v] of top(combos, 45, (v) => v.count)) {
  console.log(`${String(v.count).padStart(5)}  ${key}`);
}

console.log("\n=== Most common single colour classes ===");
for (const [key, count] of top(tokens, 40)) {
  console.log(`${String(count).padStart(5)}  ${key}`);
}
