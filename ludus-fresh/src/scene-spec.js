// GOLD COPY of src/scene-spec.js @ sha256:177c0d5084ea2cbc — do not edit without re-syncing provenance. See public/assets provenance + docs/PLAN.md §2.2.
// scene-spec@1.0.0 — typed scene contracts + validation.
// A scene is data: { id, topic, title, objects[], professor, viewport, interactions[] }.
// Every object carries position/scale/appearance/label/actions/interactive/purpose.
// Validation returns structured {path, rule, message} errors (AEGIS shape); it never throws on bad input.
import { checkContent } from "./safety-filter.js";

export const OBJECT_TYPES = [
  "shape", "label", "line", "instrument",
  "fraction-pizza", "fraction-bar", "number-line",
  "cloud", "sun", "sea", "plant", "animal", "habitat", "tree",
  "column", "arch", "desk", "map", "block", "beam", "wall",
  "timeline", "sequence", "diagram-node",
  "imported-asset", "group",
];
export const OBJECT_ACTIONS = [
  "select", "select-slice", "divide", "drag", "place", "classify",
  "observe", "measure", "test-design", "reveal", "none",
];
export const PROFESSOR_GESTURES = ["idle", "walk", "turn", "point", "present", "think", "listen", "encourage", "demonstrate"];
export const SCENE_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isObj(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
function isNum(v) { return typeof v === "number" && Number.isFinite(v); }

export function validateObjectSpec(o, index, seenIds) {
  const errors = [];
  const base = `$.objects[${index}]`;
  const err = (path, rule, message) => errors.push({ path, rule, message });
  if (!isObj(o)) { err(base, "schema", "Object spec must be an object."); return errors; }
  if (typeof o.id !== "string" || !SCENE_ID_RE.test(o.id)) err(`${base}.id`, "schema", 'Object "id" is required (kebab-case).');
  else if (seenIds.has(o.id)) err(`${base}.id`, "duplicate-id", `Duplicate object id "${o.id}".`);
  else seenIds.add(o.id);
  if (!OBJECT_TYPES.includes(o.type)) err(`${base}.type`, "unknown-type", `Unknown object type "${String(o.type)}" (allowed: ${OBJECT_TYPES.join(", ")}).`);
  if (!isNum(o.x) || o.x < -200 || o.x > 1200) err(`${base}.x`, "out-of-bounds", 'Object "x" must be a finite number in [-200, 1200].');
  if (!isNum(o.y) || o.y < -200 || o.y > 900) err(`${base}.y`, "out-of-bounds", 'Object "y" must be a finite number in [-200, 900].');
  if (o.scale !== undefined && (!isNum(o.scale) || o.scale <= 0 || o.scale > 10)) err(`${base}.scale`, "schema", 'Object "scale" must be a finite number in (0, 10].');
  if (o.rotation !== undefined && !isNum(o.rotation)) err(`${base}.rotation`, "schema", 'Object "rotation" must be a finite number.');
  if (!isObj(o.appearance) || typeof o.appearance.fill !== "string" || !o.appearance.fill) err(`${base}.appearance`, "schema", 'Object "appearance" with a non-empty "fill" is required.');
  if (typeof o.label !== "string" || !o.label.trim()) err(`${base}.label`, "schema", 'Object "label" is required.');
  else {
    const safe = checkContent(o.label);
    if (!safe.allowed) err(`${base}.label`, "unsafe", `Object label is not safe: ${safe.reason || "blocked"}.`);
  }
  if (!Array.isArray(o.actions) || !o.actions.every((a) => OBJECT_ACTIONS.includes(a))) err(`${base}.actions`, "unsupported-action", `Object "actions" must be an array from: ${OBJECT_ACTIONS.join(", ")}.`);
  if (typeof o.interactive !== "boolean") err(`${base}.interactive`, "schema", 'Object "interactive" must be a boolean.');
  if (typeof o.purpose !== "string" || !o.purpose.trim()) err(`${base}.purpose`, "schema", 'Object "purpose" (educational purpose) is required.');
  return errors;
}

export function validateSceneSpec(scene) {
  const errors = [];
  const err = (path, rule, message) => errors.push({ path, rule, message });
  if (!isObj(scene)) { err("$", "schema", "Scene must be an object."); return { valid: false, errors }; }
  if (typeof scene.id !== "string" || !SCENE_ID_RE.test(scene.id)) err("$.id", "schema", 'Scene "id" is required (kebab-case).');
  if (typeof scene.topic !== "string" || !scene.topic.trim()) err("$.topic", "schema", 'Scene "topic" is required.');
  else if (!checkContent(scene.topic).allowed) err("$.topic", "unsafe", "Scene topic is not safe.");
  if (typeof scene.title !== "string" || !scene.title.trim()) err("$.title", "schema", 'Scene "title" is required.');
  if (!Array.isArray(scene.objects)) err("$.objects", "schema", 'Scene "objects" must be an array.');
  else {
    const seen = new Set();
    scene.objects.forEach((o, i) => errors.push(...validateObjectSpec(o, i, seen)));
  }
  if (scene.professor !== undefined) {
    if (!isObj(scene.professor)) err("$.professor", "schema", 'Scene "professor" must be an object.');
    else {
      if (!isNum(scene.professor.x) || !isNum(scene.professor.y)) err("$.professor", "schema", 'Professor "x"/"y" must be finite numbers.');
      if (scene.professor.gesture !== undefined && !PROFESSOR_GESTURES.includes(scene.professor.gesture)) err("$.professor.gesture", "unsupported-action", `Unknown professor gesture "${String(scene.professor.gesture)}".`);
    }
  }
  if (scene.viewport !== undefined) {
    if (!isObj(scene.viewport) || !isNum(scene.viewport.w) || scene.viewport.w <= 0 || !isNum(scene.viewport.h) || scene.viewport.h <= 0) err("$.viewport", "schema", 'Viewport "w"/"h" must be positive finite numbers.');
    if (isObj(scene.viewport) && scene.viewport.zoom !== undefined && (!isNum(scene.viewport.zoom) || scene.viewport.zoom <= 0 || scene.viewport.zoom > 8)) err("$.viewport.zoom", "schema", 'Viewport "zoom" must be in (0, 8].');
  }
  if (scene.interactions !== undefined && !Array.isArray(scene.interactions)) err("$.interactions", "schema", 'Scene "interactions" must be an array.');
  return { valid: errors.length === 0, errors };
}

export function createSceneSpec({ id, topic, title, objects = [], professor, viewport, interactions = [] }) {
  return {
    id, topic, title,
    objects: objects.map((o) => ({ scale: 1, rotation: 0, ...o })),
    professor: professor ?? { x: 80, y: 300, gesture: "present" },
    viewport: viewport ?? { w: 800, h: 450, zoom: 1 },
    interactions,
  };
}
