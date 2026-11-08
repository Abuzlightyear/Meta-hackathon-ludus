// world/render-svg — SVG (exact geometry) + Canvas fallback + keyboard/reduced-motion helpers.
import { renderSceneToSVG, objectSVG } from "../world-renderer.js";
import { validateSceneSpec } from "../scene-spec.js";

export { objectSVG };
export function renderSVG(scene, opts = {}) { return renderSceneToSVG(scene, opts); }

export function prefersReducedMotion(matchMediaFn) {
  try { return Boolean(matchMediaFn?.("(prefers-reduced-motion: reduce)")?.matches); } catch { return false; }
}

// Keyboard focus: ordered interactive ids + deterministic next/prev (wraps).
export function focusableObjects(scene) { return (scene?.objects || []).filter((o) => o.interactive); }
export function nextFocusId(scene, currentId, dir = 1) {
  const ids = focusableObjects(scene).map((o) => o.id);
  if (!ids.length) return null;
  const i = ids.indexOf(currentId);
  if (i < 0) return dir < 0 ? ids.at(-1) : ids[0];
  return ids[(i + dir + ids.length) % ids.length];
}

// Canvas: deterministic 2D fallback. Fraction slices use exact arc geometry (same math as SVG).
export function drawSceneToCanvas(ctx, scene, { highlightId = null, hiddenIds = [] } = {}) {
  if (!ctx || typeof ctx.fillRect !== "function") return { ok: false, error: { code: "NO_CONTEXT" } };
  const check = validateSceneSpec(scene);
  const w = scene?.viewport?.w || 800, h = scene?.viewport?.h || 450;
  ctx.fillStyle = "#f4f1e6"; ctx.fillRect(0, 0, w, h);
  if (!check.valid) { ctx.fillStyle = "#b42318"; ctx.fillText("Scene could not be built", 24, 44); return { ok: false, error: { code: "INVALID_SCENE", errors: check.errors } }; }
  const hidden = new Set(hiddenIds);
  for (const o of scene.objects) {
    if (hidden.has(o.id)) continue;
    ctx.save(); ctx.translate(o.x, o.y); ctx.scale(o.scale || 1, o.scale || 1);
    ctx.fillStyle = o.appearance?.fill || "#888"; ctx.strokeStyle = o.id === highlightId ? "#b3542e" : "#3a2e1e";
    if (o.type === "fraction-pizza" || o.type === "fraction-bar") {
      const n = Math.max(1, Math.min(24, o.props?.denominator || 4)), sel = Math.max(0, Math.min(n, o.props?.selected || 0));
      if (o.type === "fraction-pizza") { const r = o.props?.radius || 90; for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, (i / n) * Math.PI * 2 - Math.PI / 2, ((i + 1) / n) * Math.PI * 2 - Math.PI / 2); ctx.closePath(); ctx.fillStyle = i < sel ? "#e8a04c" : "#f3d9a4"; ctx.fill(); ctx.stroke(); } }
      else { const bw = o.props?.w || 320, bh = o.props?.h || 44; for (let i = 0; i < n; i++) { ctx.fillStyle = i < sel ? "#2e6b7a" : "#dce9ec"; ctx.fillRect(-bw / 2 + (i * bw) / n, -bh / 2, bw / n, bh); ctx.strokeRect(-bw / 2 + (i * bw) / n, -bh / 2, bw / n, bh); } }
      ctx.fillStyle = "#1c2b33"; ctx.fillText(`${sel}/${n}`, -10, 4);
    } else if (o.type === "label") { ctx.fillStyle = "#1c2b33"; ctx.fillText(o.props?.text || o.label, -20, 0); }
    else { ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }
  return { ok: true, drawn: scene.objects.length };
}
