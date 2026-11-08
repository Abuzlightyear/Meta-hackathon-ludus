// world-renderer@1.0.0 — procedural SVG rendering of a validated SceneSpec.
// Pure string rendering (testable in Node, mountable in the browser). SVG-first,
// transform-only animation; the DOM mirror in public/world.js provides keyboard access.
import { professorSVG } from "./professor.js";
import { validateSceneSpec } from "./scene-spec.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function slicePath(cx, cy, r, a0, a1) {
  const p = (a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0); const [x1, y1] = p(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`;
}

export function objectSVG(o, { highlight = false, hidden = false } = {}) {
  if (hidden) return "";
  const t = `translate(${o.x} ${o.y}) rotate(${o.rotation || 0}) scale(${o.scale || 1})`;
  const hl = highlight ? ' stroke="#b3542e" stroke-width="3.5"' : "";
  const fill = esc(o.appearance?.fill || "#888");
  const label = `<text class="obj-label" y="0" text-anchor="middle">${esc(o.label)}</text>`;
  switch (o.type) {
    case "fraction-pizza": {
      const n = Math.max(1, Math.min(24, o.props?.denominator || 4));
      const sel = Math.max(0, Math.min(n, o.props?.selected || 0));
      const r = o.props?.radius || 90;
      let s = `<g transform="${t}" data-obj="${esc(o.id)}">`;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
        const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
        s += `<path d="${slicePath(0, 0, r, a0, a1)}" fill="${i < sel ? "#e8a04c" : "#f3d9a4"}" stroke="#7a3418" stroke-width="2"${i < sel ? ' data-selected="1"' : ""}/>`;
      }
      s += `<circle r="10" fill="#b3542e"/><text y="4" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">${sel}/${n}</text>${label}</g>`;
      return s;
    }
    case "fraction-bar": {
      const n = Math.max(1, Math.min(24, o.props?.denominator || 4));
      const sel = Math.max(0, Math.min(n, o.props?.selected || 0));
      const w = o.props?.w || 320; const h = o.props?.h || 44; const seg = w / n;
      let s = `<g transform="${t}" data-obj="${esc(o.id)}">`;
      for (let i = 0; i < n; i++) s += `<rect x="${(-w / 2 + i * seg).toFixed(1)}" y="${-h / 2}" width="${seg.toFixed(1)}" height="${h}" fill="${i < sel ? "#2e6b7a" : "#dce9ec"}" stroke="#1c2b33"/>`;
      s += `<text y="${h / 2 + 18}" text-anchor="middle" font-weight="700">${sel}/${n}</text>${label}</g>`;
      return s;
    }
    case "number-line": {
      const ticks = [0, 0.25, 0.5, 0.75, 1];
      return `<g transform="${t}" data-obj="${esc(o.id)}"><line x1="-220" y1="0" x2="220" y2="0" stroke="#1c2b33" stroke-width="2.5"/>${ticks.map((v) => `<g transform="translate(${-220 + v * 440} 0)"><line y1="-7" y2="7" stroke="#1c2b33" stroke-width="2"/><text y="24" text-anchor="middle">${v}</text></g>`).join("")}${label}</g>`;
    }
    case "cloud": {
      const d = Math.max(0.1, Math.min(1, o.props?.density ?? 0.5));
      const op = (0.45 + d * 0.55).toFixed(2);
      return `<g transform="${t}" data-obj="${esc(o.id)}" opacity="${op}"><ellipse rx="${46 + d * 26}" ry="24" fill="${fill}" stroke="#b9c6cd"/><ellipse cx="-28" cy="6" rx="30" ry="17" fill="${fill}"/><ellipse cx="28" cy="6" rx="32" ry="18" fill="${fill}"/>${label}</g>`;
    }
    case "sun":
      return `<g transform="${t}" data-obj="${esc(o.id)}">${Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return `<line x1="${(30 * Math.cos(a)).toFixed(1)}" y1="${(30 * Math.sin(a)).toFixed(1)}" x2="${(44 * Math.cos(a)).toFixed(1)}" y2="${(44 * Math.sin(a)).toFixed(1)}" stroke="#c98f16" stroke-width="3.5" stroke-linecap="round"/>`; }).join("")}<circle r="27" fill="${fill}" stroke="#c98f16" stroke-width="2.5"/>${label}</g>`;
    case "sea":
      return `<g transform="${t}" data-obj="${esc(o.id)}"><rect x="${-(o.props?.w || 760) / 2}" y="-30" width="${o.props?.w || 760}" height="${o.props?.h || 70}" fill="${fill}"/><path d="M -360 -14 q 20 -8 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0" stroke="#dceef3" fill="none" stroke-width="2.5"/>${label}</g>`;
    case "animal": {
      const sp = esc(o.props?.species || "animal");
      return `<g transform="${t}" data-obj="${esc(o.id)}"><ellipse rx="34" ry="20" fill="${fill}" stroke="#5f3d16"/><circle cx="26" cy="-12" r="13" fill="${fill}" stroke="#5f3d16"/><path d="M 18 -22 l 4 -9 5 8 M 30 -22 l 5 -8 4 9" fill="${fill}" stroke="#5f3d16"/><circle cx="30" cy="-13" r="2" fill="#1c2b33"/><path d="M -32 -4 q -14 -8 -10 -20" stroke="#5f3d16" fill="none" stroke-width="4"/><text y="38" text-anchor="middle" font-weight="700">${sp}</text>${label}</g>`;
    }
    case "plant":
      return `<g transform="${t}" data-obj="${esc(o.id)}"><path d="M 0 16 L 0 -18" stroke="#4e7d3a" stroke-width="4"/><path d="M 0 -8 q -18 -12 -24 2 q 14 8 24 -2 M 0 -14 q 18 -12 24 2 q -14 8 -24 -2" fill="${fill}"/>${label}</g>`;
    case "tree":
      return `<g transform="${t}" data-obj="${esc(o.id)}"><rect x="-6" y="-6" width="12" height="42" fill="#7a4b26"/><circle cy="-30" r="34" fill="${fill}" stroke="#3f5d28"/><circle cx="-24" cy="-16" r="20" fill="${fill}"/>${label}</g>`;
    case "habitat":
      return `<g transform="${t}" data-obj="${esc(o.id)}"><rect x="${-(o.props?.w || 760) / 2}" y="${-(o.props?.h || 380) / 2}" width="${o.props?.w || 760}" height="${o.props?.h || 380}" fill="${fill}" opacity="0.5" rx="18"/>${label}</g>`;
    case "column":
      return `<g transform="${t}" data-obj="${esc(o.id)}"><rect x="-19" y="${-(o.props?.h || 260)}" width="38" height="12" fill="#cfc5ab"/><rect x="-15" y="${-(o.props?.h || 260) + 12}" width="30" height="${(o.props?.h || 260) - 24}" fill="${fill}" stroke="#b3a888"/>${[0.25, 0.5, 0.75].map((f) => `<line x1="${-15 + 30 * f}" y1="${-(o.props?.h || 260) + 16}" x2="${-15 + 30 * f}" y2="-14" stroke="#c4b998"/>`).join("")}<rect x="-19" y="-12" width="38" height="12" fill="#cfc5ab"/>${label}</g>`;
    case "arch":
      return `<g transform="${t}" data-obj="${esc(o.id)}"><path d="M ${-(o.props?.w || 300) / 2} 30 L ${-(o.props?.w || 300) / 2} -10 A ${(o.props?.w || 300) / 2} ${(o.props?.h || 90)} 0 0 1 ${(o.props?.w || 300) / 2} -10 L ${(o.props?.w || 300) / 2} 30 L ${((o.props?.w || 300) / 2) - 22} 30 L ${((o.props?.w || 300) / 2) - 22} -6 A ${((o.props?.w || 300) / 2) - 22} ${(o.props?.h || 90) - 16} 0 0 0 ${-(((o.props?.w || 300) / 2) - 22)} -6 L ${-((o.props?.w || 300) / 2 - 22)} 30 Z" fill="${fill}" stroke="#a99c7c"/>${label}</g>`;
    case "desk":
      return `<g transform="${t}" data-obj="${esc(o.id)}"><rect x="${-(o.props?.w || 110) / 2}" y="-16" width="${o.props?.w || 110}" height="12" fill="${fill}" stroke="#5f3a1c"/><rect x="${-(o.props?.w || 110) / 2 + 6}" y="-4" width="9" height="24" fill="#6d4525"/><rect x="${(o.props?.w || 110) / 2 - 15}" y="-4" width="9" height="24" fill="#6d4525"/>${label}</g>`;
    case "map":
      return `<g transform="${t}" data-obj="${esc(o.id)}"><rect x="${-(o.props?.w || 150) / 2}" y="${-(o.props?.h || 95) / 2}" width="${o.props?.w || 150}" height="${o.props?.h || 95}" fill="${fill}" stroke="#7a6234" rx="6"/><path d="M -52 -18 q 22 -20 44 -6 q 24 -12 40 8 q 18 16 -4 28 q -30 12 -52 -4 q -26 -10 -24 -26 Z" fill="#8aa0b4" opacity="0.8"/>${label}</g>`;
    case "block":
      return `<g transform="${t}" data-obj="${esc(o.id)}"><rect x="${-(o.props?.w || 70) / 2}" y="${-(o.props?.h || 30) / 2}" width="${o.props?.w || 70}" height="${o.props?.h || 30}" fill="${fill}" stroke="#6e3016" rx="3"${hl}/> ${label}</g>`;
    case "beam":
      return `<g transform="${t}" data-obj="${esc(o.id)}"><rect x="${-(o.props?.w || 260) / 2}" y="-9" width="${o.props?.w || 260}" height="18" fill="${fill}" stroke="#5f3a1c" rx="3"/>${label}</g>`;
    case "wall": {
      const rows = Math.max(1, Math.min(8, o.props?.rows || 3));
      let bricks = "";
      for (let r2 = 0; r2 < rows; r2++) for (let c = 0; c < 4; c++) bricks += `<rect x="${-140 + c * 70 + (r2 % 2) * 35 - 35}" y="${-r2 * 30}" width="66" height="26" fill="${fill}" stroke="#6e3016" rx="3"/>`;
      return `<g transform="${t}" data-obj="${esc(o.id)}">${bricks}${label}</g>`;
    }
    case "timeline":
      return `<g transform="${t}" data-obj="${esc(o.id)}"><line x1="-260" y1="0" x2="260" y2="0" stroke="#1c2b33" stroke-width="2.5"/>${(o.props?.events || []).map((e, i) => `<g transform="translate(${-260 + i * 130} 0)"><circle r="6" fill="#b3542e"/><text y="-14" text-anchor="middle">${esc(e)}</text></g>`).join("")}${label}</g>`;
    case "sequence":
      return `<g transform="${t}" data-obj="${esc(o.id)}">${(o.props?.steps || []).map((s, i) => `<g transform="translate(${i * 120} 0)"><rect x="-52" y="-20" width="104" height="40" rx="8" fill="${fill}" opacity="${0.35 + i * 0.2}"/><text text-anchor="middle" dy="4">${esc(s)}</text>${i < (o.props?.steps || []).length - 1 ? '<text x="60" dy="4">→</text>' : ""}</g>`).join("")}${label}</g>`;
    case "diagram-node":
      return `<g transform="${t}" data-obj="${esc(o.id)}"><rect x="-62" y="-24" width="124" height="48" rx="10" fill="${fill}" stroke="#7d97a5"/><text text-anchor="middle" dy="4">${esc(o.props?.text || o.label)}</text></g>`;
    case "instrument":
      return `<g transform="${t}" data-obj="${esc(o.id)}"><rect x="-70" y="-10" width="140" height="20" fill="${fill}" stroke="#7a6234" rx="3"/>${Array.from({ length: 9 }, (_, i) => `<line x1="${-56 + i * 14}" y1="-10" x2="${-56 + i * 14}" y2="-2" stroke="#5a4632"/>`).join("")}${label}</g>`;
    case "line":
      return `<g transform="${t}" data-obj="${esc(o.id)}"><line x1="0" y1="0" x2="${o.props?.x2 || 100}" y2="${o.props?.y2 || 0}" stroke="${fill}" stroke-width="2.5"/>${label}</g>`;
    case "label":
      return `<g transform="${t}" data-obj="${esc(o.id)}"><text text-anchor="middle" font-weight="600">${esc(o.props?.text || o.label)}</text></g>`;
    case "imported-asset":
      return `<g transform="${t}" data-obj="${esc(o.id)}"><rect x="-50" y="-34" width="100" height="68" fill="#e4e4e4" stroke="#999" stroke-dasharray="5 4" rx="6"/><text text-anchor="middle" dy="4" font-size="11">image: ${esc(o.props?.assetId || "none")}</text></g>`;
    case "group":
      return `<g transform="${t}" data-obj="${esc(o.id)}">${label}</g>`;
    case "shape":
    default: {
      const w = o.props?.w || 60; const h = o.props?.h || 40;
      if (o.props?.shape === "circle") return `<g transform="${t}" data-obj="${esc(o.id)}"><circle r="${Math.min(w, h) / 2}" fill="${fill}"${hl}/>${label}</g>`;
      if (o.props?.shape === "triangle") return `<g transform="${t}" data-obj="${esc(o.id)}"><path d="M 0 ${-h / 2} L ${w / 2} ${h / 2} L ${-w / 2} ${h / 2} Z" fill="${fill}"${hl}/>${label}</g>`;
      return `<g transform="${t}" data-obj="${esc(o.id)}"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="${fill}" rx="5"${hl}/>${label}</g>`;
    }
  }
}

// Renders a full scene to a standalone SVG string. Invalid scenes render an honest error, never a fake scene.
export function renderSceneToSVG(scene, { highlightId = null, hiddenIds = [], reducedMotion = false, hideProfessor = false } = {}) {
  const check = validateSceneSpec(scene);
  const w = scene?.viewport?.w || 800; const h = scene?.viewport?.h || 450;
  const zoom = scene?.viewport?.zoom || 1;
  if (!check.valid) {
    return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Invalid scene"><rect width="100%" height="100%" fill="#fdf0ec"/><text x="24" y="44" font-weight="700" fill="#b42318">Scene could not be built</text><text x="24" y="70" fill="#7a2d20">${esc(check.errors[0]?.message || "Invalid scene spec")}</text></svg>`;
  }
  const hidden = new Set(hiddenIds);
  const body = scene.objects.map((o) => objectSVG(o, { highlight: o.id === highlightId, hidden: hidden.has(o.id) })).join("");
  const prof = !hideProfessor && scene.professor ? professorSVG(scene.professor, { reducedMotion }) : "";
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(scene.title)}" class="world-svg"><rect width="100%" height="100%" fill="#f4f1e6"/><g transform="translate(${w / 2} ${h / 2}) scale(${zoom}) translate(${-w / 2} ${-h / 2})">${body}${prof}</g></svg>`;
}
