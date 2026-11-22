#!/usr/bin/env node
/**
 * Codemod (Stage 3): replace hard-coded status colours with the semantic
 * tokens in globals.css, so they follow the light/dark theme automatically.
 *
 *   families:   emerald, green        -> success
 *               amber, yellow, orange -> warning
 *               red, rose             -> destructive
 *   (blue/sky/indigo and purple/violet/teal/cyan/pink are NOT touched.)
 *
 *   bg-X-100            -> bg-<sem>-muted
 *   bg-X-50             -> bg-<sem>-muted/50      (keeps the lighter tint)
 *   border-X-200/300    -> border-<sem>-border
 *   border-X-100        -> border-<sem>-border/50
 *   text-X-400/500      -> text-<sem>
 *   text-X-600..900     -> text-<sem>-strong
 *
 * Left alone on purpose: solid backgrounds (bg-X-500/600/700, usually buttons
 * with text-white), classes behind a dark: prefix, arbitrary opacities, and
 * anything under components/ui, components/sidebar or _deprecated. Files that
 * contain a solid dark status panel (e.g. bg-emerald-900) are skipped and listed
 * at the end of the run: their text colours are tuned for a dark surface in both
 * themes, so theme-aware tokens would lose contrast in light mode.
 *
 * Run from the repo root:
 *   node migrate-status-colors.mjs --dry                      # preview everything
 *   node migrate-status-colors.mjs --dry --only dashboard/hr  # preview one module
 *   node migrate-status-colors.mjs --only dashboard/hr        # apply to one module
 *   node migrate-status-colors.mjs                            # apply to everything
 *
 * Delete this file when you are done.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FRONTEND = path.join(ROOT, "frontend");
const DRY = process.argv.includes("--dry");
const onlyIdx = process.argv.indexOf("--only");
const ONLY = onlyIdx > -1 ? (process.argv[onlyIdx + 1] ?? "").replaceAll("\\", "/") : null;

if (!fs.existsSync(FRONTEND)) {
  console.error("Run this from the repo root (the folder that contains frontend/).");
  process.exit(1);
}
if (onlyIdx > -1 && !ONLY) {
  console.error("--only needs a path fragment, for example: --only dashboard/hr");
  process.exit(1);
}

const SCAN_DIRS = [path.join(FRONTEND, "app"), path.join(FRONTEND, "components")];
const EXTRA_FILES = [path.join(FRONTEND, "lib", "statusColors.ts")];
const SKIP_PARTS = [
  "/components/ui/",
  "/components/sidebar/",
  "/AdminSidebar.tsx",
  "/_deprecated/",
  "/node_modules/",
  "/.next/",
];

const SEMANTIC = {
  emerald: "success",
  green: "success",
  amber: "warning",
  yellow: "warning",
  orange: "warning",
  red: "destructive",
  rose: "destructive",
};

// A colour utility; optional /NN opacity. `/[0.3]` style opacities are skipped.
const TOKEN =
  /(?<![\w-])(bg|text|border)-(emerald|green|amber|yellow|orange|red|rose)-(\d{2,3})(?:\/(\d{1,3}))?(?![\w\/-])/g;

// A solid dark status-colour panel such as bg-emerald-900. Plain (unprefixed,
// no opacity) only, so dark: tints and translucent overlays don't count.
const DARK_SURFACE =
  /(?<![\w:-])bg-(?:emerald|green|red|rose|amber|yellow|orange)-(?:800|900|950)(?![\w\/-])/;
const darkSurfaceFiles = [];

const half = (opacity) => Math.max(1, Math.round(Number(opacity) / 2));
const withOpacity = (name, opacity) => (opacity ? `${name}/${opacity}` : name);

function convert(kind, family, shadeText, opacity) {
  const sem = SEMANTIC[family];
  const shade = Number(shadeText);

  if (kind === "bg") {
    if (shade === 100) return withOpacity(`bg-${sem}-muted`, opacity);
    if (shade === 50) return `bg-${sem}-muted/${opacity ? half(opacity) : 50}`;
    return null;
  }
  if (kind === "border") {
    if (shade === 100) return `border-${sem}-border/${opacity ? half(opacity) : 50}`;
    if (shade === 200 || shade === 300) return withOpacity(`border-${sem}-border`, opacity);
    return null;
  }
  // text
  if (shade === 400 || shade === 500) return withOpacity(`text-${sem}`, opacity);
  if (shade >= 600 && shade <= 900) return withOpacity(`text-${sem}-strong`, opacity);
  return null;
}

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) yield full;
  }
}

const files = [...SCAN_DIRS.flatMap((d) => [...walk(d)]), ...EXTRA_FILES.filter((f) => fs.existsSync(f))];

const rules = new Map(); // "bg-emerald-100 -> bg-success-muted" -> count
const leftovers = new Map(); // tokens deliberately not converted -> count
let filesChanged = 0;
let tokensChanged = 0;

for (const file of files) {
  const posix = file.replaceAll("\\", "/");
  if (SKIP_PARTS.some((p) => posix.includes(p))) continue;
  if (ONLY && !posix.includes(ONLY)) continue;

  const src = fs.readFileSync(file, "utf8");
  if (DARK_SURFACE.test(src)) {
    darkSurfaceFiles.push(path.relative(ROOT, file));
    continue;
  }
  let changedHere = 0;

  const out = src.replace(TOKEN, (match, kind, family, shade, opacity, offset, whole) => {
    // Leave anything inside a dark: variant chain exactly as written.
    const lastBreak = Math.max(whole.lastIndexOf(" ", offset - 1), whole.lastIndexOf("\n", offset - 1), whole.lastIndexOf("\t", offset - 1), whole.lastIndexOf('"', offset - 1), whole.lastIndexOf("'", offset - 1), whole.lastIndexOf("`", offset - 1));
    const prefix = whole.slice(lastBreak + 1, offset);
    const replacement = prefix.includes("dark:") ? null : convert(kind, family, shade, opacity);

    if (!replacement) {
      leftovers.set(match, (leftovers.get(match) ?? 0) + 1);
      return match;
    }
    changedHere++;
    const key = `${match} -> ${replacement}`;
    rules.set(key, (rules.get(key) ?? 0) + 1);
    return replacement;
  });

  if (changedHere === 0) continue;
  filesChanged++;
  tokensChanged += changedHere;
  console.log(`${DRY ? "[dry] " : ""}${path.relative(ROOT, file)}  (${changedHere})`);
  if (!DRY) fs.writeFileSync(file, out, "utf8");
}

const top = (map, n) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

console.log(`\n${DRY ? "Would change" : "Changed"} ${tokensChanged} class(es) in ${filesChanged} file(s).${ONLY ? `  (only: ${ONLY})` : ""}`);

console.log("\n=== Most common rewrites ===");
for (const [rule, count] of top(rules, 25)) console.log(`${String(count).padStart(5)}  ${rule}`);

console.log("\n=== Left as-is (solid backgrounds, dark: variants, other shades) ===");
for (const [token, count] of top(leftovers, 15)) console.log(`${String(count).padStart(5)}  ${token}`);

if (darkSurfaceFiles.length) {
  console.log("\n=== Skipped: contain a solid dark status panel (review by hand) ===");
  for (const f of darkSurfaceFiles) console.log("  " + f);
}

if (!DRY) {
  console.log("\nNext: review with  git diff --stat  and look at the affected screens in light AND dark mode.");
}
