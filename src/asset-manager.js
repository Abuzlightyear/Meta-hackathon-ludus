// asset-manager@1.0.0 — authorised images only, cache + provenance, honest labels.
// Procedural SVG is the foundation. Raster/AI images are optional skins:
//  - every asset must declare provenance + license + whether it is generated;
//  - placeholders are labelled "placeholder" and are NEVER claimed as generated;
//  - images are refused as a source of mathematical truth.
const cache = new Map();
export const AUTHORIZED_SOURCES = ["procedural-svg", "authorised-upload", "meta-ai-generated", "open-license"];

export function registerAsset(asset) {
  const errors = [];
  if (!asset || typeof asset !== "object") return { ok: false, errors: [{ path: "$", rule: "schema", message: "Asset must be an object." }] };
  if (typeof asset.id !== "string" || !asset.id) errors.push({ path: "$.id", rule: "schema", message: 'Asset "id" is required.' });
  if (!AUTHORIZED_SOURCES.includes(asset.source)) errors.push({ path: "$.source", rule: "unauthorised-source", message: `Asset source "${String(asset.source)}" is not authorised (allowed: ${AUTHORIZED_SOURCES.join(", ")}).` });
  if (!asset.provenance || typeof asset.provenance.origin !== "string" || !asset.provenance.origin) errors.push({ path: "$.provenance", rule: "missing-provenance", message: 'Asset "provenance.origin" is required.' });
  if (typeof asset.license !== "string" || !asset.license) errors.push({ path: "$.license", rule: "schema", message: 'Asset "license" is required.' });
  if (asset.placeholder === true && asset.generated === true) errors.push({ path: "$.generated", rule: "false-claim", message: "A placeholder must never be claimed as generated." });
  if (asset.useForMathTruth === true && asset.source !== "procedural-svg") errors.push({ path: "$.useForMathTruth", rule: "math-truth", message: "Raster/generated images must never be used for mathematical truth; compute it instead." });
  if (errors.length) return { ok: false, errors };
  const entry = {
    id: asset.id, source: asset.source, provenance: asset.provenance, license: asset.license,
    generated: asset.generated === true, placeholder: asset.placeholder === true,
    useForMathTruth: asset.useForMathTruth === true, cached: true, url: asset.url || null,
  };
  cache.set(entry.id, entry);
  return { ok: true, asset: entry };
}
export function getAsset(id) { return cache.get(id) || null; }
export function listAssets() { return [...cache.values()]; }
export function clearAssetCache() { cache.clear(); }
// Seed: the only built-in "assets" are procedural (generated:false, honestly labelled).
registerAsset({ id: "professor-d-svg", source: "procedural-svg", provenance: { origin: "src/professor.js (hand-drawn SVG paths)" }, license: "project-owned", generated: false });
registerAsset({ id: "academy-room-svg", source: "procedural-svg", provenance: { origin: "src/simulations.js academyScene() + src/world-renderer.js" }, license: "project-owned", generated: false });
