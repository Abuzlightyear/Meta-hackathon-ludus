// GOLD COPY of server/search.mjs @ sha256:a377f0e229fff186 — do not edit without re-syncing provenance. See public/assets provenance + docs/PLAN.md §2.2.
// Server-side source lookup (LUDUS guardrailed retrieval).
// Best-judgment v1: Wikipedia (MediaWiki API) only — free, citable, structured.
// Hard guardrails: fixed host (no arbitrary URLs, no SSRF), safe-topic gate,
// short timeout, tiny result set, plain-text extracts only, in-memory cache.
// Failure always returns { available:false } — callers must label model
// knowledge as model knowledge, never dress it as a lookup.
import { checkTopic } from "../src/safety-filter.js";

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const cache = new Map(); // topic.toLowerCase() -> { at, result }
const TTL_MS = 10 * 60 * 1000;

export function wikiSearchURL(topic) {
  const q = new URLSearchParams({
    action: "query", format: "json", formatversion: "2",
    generator: "search", gsrsearch: String(topic).slice(0, 120), gsrnamespace: "0", gsrlimit: "3",
    prop: "extracts|info", exintro: "1", explaintext: "1", inprop: "url",
  });
  return `${WIKI_API}?${q.toString()}`;
}
export function parseWikiResponse(json) {
  const pages = json?.query?.pages;
  if (!Array.isArray(pages)) return [];
  return pages
    .filter((p) => p && typeof p.title === "string" && typeof p.extract === "string" && p.extract.trim().length > 40 && typeof p.canonicalurl === "string" && p.canonicalurl.startsWith("https://en.wikipedia.org/"))
    .slice(0, 3)
    .map((p) => ({ title: p.title, url: p.canonicalurl, text: p.extract.replace(/\s+/g, " ").trim().slice(0, 1200) }));
}
export async function searchTopic(topic, { fetchImpl = fetch, timeoutMs = 8000, now = Date.now() } = {}) {
  const gate = checkTopic(topic);
  if (!gate.allowed) return { available: false, reason: gate.reason || "Topic refused by safety filter.", sources: [] };
  const key = String(topic).toLowerCase();
  const hit = cache.get(key);
  if (hit && now - hit.at < TTL_MS) return hit.result;
  const c = new AbortController(); const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const r = await fetchImpl(wikiSearchURL(topic), { headers: { accept: "application/json" }, signal: c.signal });
    if (!r.ok) return { available: false, reason: `Lookup failed (HTTP ${r.status}).`, sources: [] };
    const sources = parseWikiResponse(await r.json().catch(() => null));
    if (!sources.length) return { available: false, reason: "No trusted source found for this topic.", sources: [] };
    const result = { available: true, sources, context: sources.map((s) => `SOURCE ${s.title} (${s.url}): ${s.text}`).join("\n") };
    cache.set(key, { at: now, result });
    return result;
  } catch (e) {
    return { available: false, reason: e?.name === "AbortError" ? "Lookup timed out." : "Lookup unavailable.", sources: [] };
  } finally { clearTimeout(t); }
}
