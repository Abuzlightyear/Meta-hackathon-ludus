// GOLD COPY of src/world/objects.js @ sha256:abada4959ca61b14 — do not edit without re-syncing provenance. See public/assets provenance + docs/PLAN.md §2.2.
// world/objects — typed object factory dispatch over src/world-objects.js.
// createObject(type, opts) is the single entry point; every result carries
// {id,type,x,y,scale,appearance,label,actions,interactive,purpose}.
import {
  createShape, createLabel, createLine, createInstrument,
  createFractionPizza, createFractionBar, createNumberLine,
  createCloud, createSun, createSea, createPlant, createAnimal, createHabitat, createTree,
  createColumn, createArch, createDesk, createMap, createBlock, createBeam, createWall,
  createTimeline, createSequence, createDiagramNode, createImportedAsset, createGroup,
} from "../world-objects.js";
import { OBJECT_TYPES, validateObjectSpec } from "../scene-spec.js";

export const FACTORIES = {
  shape: createShape, label: createLabel, line: createLine, instrument: createInstrument,
  "fraction-pizza": createFractionPizza, "fraction-bar": createFractionBar, "number-line": createNumberLine,
  cloud: createCloud, sun: createSun, sea: createSea, plant: createPlant, animal: createAnimal,
  habitat: createHabitat, tree: createTree,
  column: createColumn, arch: createArch, desk: createDesk, map: createMap,
  block: createBlock, beam: createBeam, wall: createWall,
  timeline: createTimeline, sequence: createSequence, "diagram-node": createDiagramNode,
  "imported-asset": createImportedAsset, group: createGroup,
};

export const OBJECT_CATEGORIES = {
  primitives: ["shape", "label", "line", "instrument"],
  math: ["fraction-pizza", "fraction-bar", "number-line"],
  science: ["cloud", "sun", "sea", "plant", "animal", "habitat", "tree"],
  architecture: ["column", "arch", "desk", "map", "block", "beam", "wall"],
  diagrams: ["timeline", "sequence", "diagram-node"],
  imported: ["imported-asset"],
  combos: ["group"],
};

export function createObject(type, options = {}) {
  const factory = FACTORIES[type];
  if (!factory) return { ok: false, error: { code: "UNKNOWN_TYPE", message: `Unknown object type "${String(type)}" (allowed: ${OBJECT_TYPES.join(", ")}).` } };
  const object = factory(options);
  const errors = validateObjectSpec(object, 0, new Set());
  if (errors.length) return { ok: false, error: { code: "INVALID_OBJECT", errors } };
  return { ok: true, object };
}

// Build many objects from a spec array [{type, ...opts}]; stops with structured errors, never partial.
export function createObjects(specs) {
  if (!Array.isArray(specs)) return { ok: false, error: { code: "INVALID_SPECS", message: "Object specs must be an array." } };
  const objects = []; const seen = new Set();
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i] || {};
    const r = createObject(s.type, s);
    if (!r.ok) return { ok: false, error: { ...r.error, index: i } };
    if (seen.has(r.object.id)) return { ok: false, error: { code: "DUPLICATE_ID", index: i, message: `Duplicate object id "${r.object.id}".` } };
    seen.add(r.object.id); objects.push(r.object);
  }
  return { ok: true, objects };
}
export { OBJECT_TYPES };
