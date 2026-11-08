// world/engine — scene composer + deterministic interaction state machine.
// composeScene builds a SceneSpec from a spec array (no hardcoded pages).
// applyInteraction is pure: structuredClone in, new state out, input never mutated.
import { createSceneSpec, validateSceneSpec } from "../scene-spec.js";
import { createObjects } from "./objects.js";

export function composeScene({ id, topic, title, objects = [], professor, viewport, interactions = [] } = {}) {
  // objects may be full ObjectSpecs or factory specs {type, ...opts}
  const needsFactory = objects.some((o) => o && !o.appearance);
  let objs = objects;
  if (needsFactory) {
    const built = createObjects(objects);
    if (!built.ok) return { ok: false, error: built.error, scene: null };
    objs = built.objects;
  }
  const scene = createSceneSpec({ id, topic, title, objects: objs, professor, viewport, interactions });
  const check = validateSceneSpec(scene);
  if (!check.valid) return { ok: false, error: { code: "INVALID_SCENE", errors: check.errors }, scene: null };
  return { ok: true, scene };
}

export function createWorldState(scene, { reducedMotion = false } = {}) {
  const check = validateSceneSpec(scene);
  if (!check.valid) return { ok: false, error: { code: "INVALID_SCENE", errors: check.errors } };
  return { ok: true, state: { scene: structuredClone(scene), selectedId: null, hiddenIds: [], highlightedId: null, reducedMotion: Boolean(reducedMotion), log: [] } };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function find(state, id) { return state.scene.objects.find((o) => o.id === id); }

// events: {kind:"select"|"click",objectId} | {kind:"drag",objectId,x,y}
//       | {kind:"slider",objectId,prop,value,min,max} | {kind:"divide",objectId,denominator}
//       | {kind:"set-prop",objectId,prop,value} | {kind:"reveal"|"hide"|"highlight",objectId}
export function applyInteraction(state, event) {
  if (!state || !state.scene || !event || typeof event.kind !== "string") return { ok: false, error: { code: "INVALID_EVENT" } };
  const next = structuredClone(state);
  const fail = (code, message) => ({ ok: false, error: { code, message } });
  const target = event.objectId ? find(next, event.objectId) : null;
  if (event.objectId && !target) return fail("BAD_REF", `No object "${event.objectId}" in scene.`);
  switch (event.kind) {
    case "select": case "click": {
      if (!target) return fail("BAD_REF", "select requires objectId.");
      if (!target.interactive) return fail("NOT_INTERACTIVE", `"${target.id}" is not interactive.`);
      next.selectedId = target.id; next.highlightedId = target.id;
      // fraction manipulatives: clicking cycles selected slices deterministically
      if (target.props && "selected" in target.props && "denominator" in target.props) {
        const n = clamp(target.props.denominator, 1, 24);
        target.props.selected = (target.props.selected + 1) % (n + 1);
      }
      break;
    }
    case "drag": {
      if (!target) return fail("BAD_REF", "drag requires objectId.");
      if (!target.actions?.includes("drag") && !target.actions?.includes("place")) return fail("UNSUPPORTED_ACTION", `"${target.id}" cannot be dragged.`);
      if (!Number.isFinite(event.x) || !Number.isFinite(event.y)) return fail("INVALID_EVENT", "drag requires finite x/y.");
      target.x = clamp(Math.round(event.x), -200, 1200); target.y = clamp(Math.round(event.y), -200, 900);
      next.selectedId = target.id;
      break;
    }
    case "slider": case "set-prop": {
      if (!target) return fail("BAD_REF", "slider requires objectId.");
      if (typeof event.prop !== "string" || !event.prop) return fail("INVALID_EVENT", "slider requires prop.");
      if (!Number.isFinite(event.value)) return fail("INVALID_EVENT", "slider requires finite value.");
      const lo = Number.isFinite(event.min) ? event.min : 0, hi = Number.isFinite(event.max) ? event.max : 100;
      target.props = { ...(target.props || {}), [event.prop]: clamp(event.value, lo, hi) };
      // keep fraction invariant selected<=denominator
      if (event.prop === "denominator" && "selected" in target.props) target.props.selected = clamp(target.props.selected, 0, target.props.denominator);
      next.selectedId = target.id;
      break;
    }
    case "divide": {
      if (!target?.props || !("denominator" in target.props)) return fail("UNSUPPORTED_ACTION", "divide needs a fraction object.");
      const d = clamp(Math.round(event.denominator ?? target.props.denominator), 1, 24);
      target.props.denominator = d; target.props.selected = clamp(target.props.selected, 0, d);
      break;
    }
    case "reveal": if (target) next.hiddenIds = next.hiddenIds.filter((id) => id !== target.id); break;
    case "hide": if (target && !next.hiddenIds.includes(target.id)) next.hiddenIds.push(target.id); break;
    case "highlight": next.highlightedId = target?.id ?? null; break;
    default: return fail("UNSUPPORTED_ACTION", `Unknown interaction "${event.kind}".`);
  }
  const check = validateSceneSpec(next.scene);
  if (!check.valid) return { ok: false, error: { code: "INVALID_SCENE", errors: check.errors } };
  next.log = [...(state.log || []), { kind: event.kind, objectId: event.objectId ?? null }];
  return { ok: true, state: next };
}
