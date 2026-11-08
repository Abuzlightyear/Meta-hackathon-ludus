// GOLD COPY of server/load-env.mjs @ sha256:6052a228bc3977a4 — do not edit without re-syncing provenance. See public/assets provenance + docs/PLAN.md §2.2.
// Minimal server-side .env loader (no dependencies, never logs values).
// Existing environment variables (e.g. Codespace secrets) always win.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

export function parseEnv(text) {
  const out = {};
  for (const line of String(text).split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) out[k] = v;
  }
  return out;
}

export function loadEnvFile(path) {
  let text = "";
  try { text = readFileSync(path, "utf8"); } catch { return 0; }
  let n = 0;
  for (const [k, v] of Object.entries(parseEnv(text))) {
    if (process.env[k] === undefined) { process.env[k] = v; n++; }
  }
  return n;
}

export function loadEnv() {
  const root = fileURLToPath(new URL("..", import.meta.url));
  return loadEnvFile(join(root, ".env"));
}
