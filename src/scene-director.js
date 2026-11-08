// scene-director@1.0.0 — AI Scene Director. Validated commands ONLY.
// The AI (or the deterministic offline director) may only emit commands from the
// fixed allowlist below. Every instruction is schema-validated; arbitrary JS,
// shell, eval, or unknown verbs are rejected and never executed.
import { validateSceneSpec, PROFESSOR_GESTURES } from "./scene-spec.js";
import { checkContent } from "./safety-filter.js";

export const DIRECTOR_COMMANDS = [
  "create-object", "place-object", "reveal-object", "hide-object", "highlight-object",
  "professor-move", "professor-gesture", "zoom-viewport", "animate-event",
  "ask-manipulate", "observe", "rebuild-on-struggle",
];
export const ANIMATION_EVENTS = ["evaporate", "condense", "rain", "grow", "divide-pizza", "test-load", "none"];

function isNum(v) { return typeof v === "number" && Number.isFinite(v); }

export function validateCommand(cmd, scene) {
  const errors = [];
  const err = (path, rule, message) => errors.push({ path, rule, message });
  if (!cmd || typeof cmd !== "object") { err("$", "schema", "Command must be an object."); return { valid: false, errors }; }
  if (!DIRECTOR_COMMANDS.includes(cmd.type)) {
    err("$.type", "unsupported-action", `Unsupported director command "${String(cmd.type)}" (allowed: ${DIRECTOR_COMMANDS.join(", ")}). Arbitrary code is never executed.`);
    return { valid: false, errors };
  }
  const ids = new Set((scene?.objects || []).map((o) => o.id));
  const needTarget = ["place-object", "reveal-object", "hide-object", "highlight-object"];
  if (needTarget.includes(cmd.type)) {
    if (typeof cmd.objectId !== "string" || !ids.has(cmd.objectId)) err("$.objectId", "bad-ref", `Command "${cmd.type}" references unknown object "${String(cmd.objectId)}".`);
  }
  if (cmd.type === "place-object") {
    if (cmd.x !== undefined && !isNum(cmd.x)) err("$.x", "schema", 'place-object "x" must be a finite number.');
    if (cmd.y !== undefined && !isNum(cmd.y)) err("$.y", "schema", 'place-object "y" must be a finite number.');
    if (cmd.scale !== undefined && (!isNum(cmd.scale) || cmd.scale <= 0 || cmd.scale > 10)) err("$.scale", "schema", 'place-object "scale" must be in (0, 10].');
  }
  if (cmd.type === "create-object") {
    if (!cmd.object || typeof cmd.object !== "object") err("$.object", "schema", 'create-object needs an "object" spec.');
    else if (ids.has(cmd.object.id)) err("$.object.id", "duplicate-id", `Object "${cmd.object.id}" already exists in the scene.`);
  }
  if (cmd.type === "professor-move") {
    if (!isNum(cmd.x) || !isNum(cmd.y)) err("$", "schema", 'professor-move needs finite "x" and "y".');
  }
  if (cmd.type === "professor-gesture" && !PROFESSOR_GESTURES.includes(cmd.gesture)) {
    err("$.gesture", "unsupported-action", `Unknown professor gesture "${String(cmd.gesture)}".`);
  }
  if (cmd.type === "zoom-viewport" && (!isNum(cmd.zoom) || cmd.zoom <= 0 || cmd.zoom > 8)) {
    err("$.zoom", "schema", 'zoom-viewport "zoom" must be in (0, 8].');
  }
  if (cmd.type === "animate-event" && !ANIMATION_EVENTS.includes(cmd.event)) {
    err("$.event", "unsupported-action", `Unknown animation event "${String(cmd.event)}" (allowed: ${ANIMATION_EVENTS.join(", ")}).`);
  }
  if ((cmd.type === "ask-manipulate" || cmd.type === "observe") && typeof cmd.prompt === "string" && cmd.prompt) {
    if (!checkContent(cmd.prompt).allowed) err("$.prompt", "unsafe", "Prompt text is not safe.");
  }
  if (cmd.type === "rebuild-on-struggle") {
    if (typeof cmd.misconception !== "string" || !cmd.misconception) err("$.misconception", "schema", 'rebuild-on-struggle needs the observed "misconception" (from the learner\'s actual answers, never a learning-style label).');
    if (cmd.strategy !== undefined && typeof cmd.strategy !== "string") err("$.strategy", "schema", 'rebuild-on-struggle "strategy" must be a string.');
  }
  return { valid: errors.length === 0, errors };
}

// Pure reducer: returns { scene, applied } or { error }. Never mutates the input scene.
export function applyCommand(scene, cmd) {
  const check = validateCommand(cmd, scene);
  if (!check.valid) return { error: { code: "INVALID_COMMAND", message: check.errors[0].message, errors: check.errors } };
  const next = structuredClone(scene);
  switch (cmd.type) {
    case "create-object": next.objects.push(cmd.object); break;
    case "place-object": {
      const o = next.objects.find((x) => x.id === cmd.objectId);
      if (cmd.x !== undefined) o.x = cmd.x;
      if (cmd.y !== undefined) o.y = cmd.y;
      if (cmd.scale !== undefined) o.scale = cmd.scale;
      break;
    }
    case "reveal-object": case "hide-object": case "highlight-object": break; // view state only, handled by renderer flags
    case "professor-move": next.professor = { ...next.professor, x: cmd.x, y: cmd.y, gesture: "walk" }; break;
    case "professor-gesture": next.professor = { ...next.professor, gesture: cmd.gesture }; break;
    case "zoom-viewport": next.viewport = { ...next.viewport, zoom: cmd.zoom }; break;
    case "animate-event": case "ask-manipulate": case "observe": break; // event prompts; scene unchanged
    case "rebuild-on-struggle": next.professor = { ...next.professor, gesture: "encourage" }; break;
  }
  const recheck = validateSceneSpec(next);
  if (!recheck.valid) return { error: { code: "INVALID_SCENE", message: recheck.errors[0].message, errors: recheck.errors } };
  return { scene: next, applied: cmd.type };
}

// Deterministic offline directors (labelled offline-demo; used when no live AI credentials).
// They emit the same validated commands a live model would — nothing is faked as "live AI".
export function welcomeCommands() {
  return [
    { type: "professor-gesture", gesture: "present" },
    { type: "professor-move", x: 170, y: 356 },
  ];
}
export function demonstrateFractionCommands(denominator, selected) {
  return [
    { type: "professor-gesture", gesture: "point" },
    { type: "highlight-object", objectId: "frac-main" },
    { type: "ask-manipulate", objectId: "frac-main", prompt: `Select ${selected} of ${denominator} equal parts.` },
  ];
}
export function rebuildOnStruggle({ misconception, topic } = {}) {
  // Perspective switch driven by the observed misconception — never a style label.
  if (/fraction|denominator|bigger.*smaller/i.test(`${topic} ${misconception}`)) {
    return [
      { type: "professor-gesture", gesture: "encourage" },
      { type: "observe", prompt: "Same amount, new view: watch the pizza become a bar. 1/2 is still 1/2." },
    ];
  }
  return [
    { type: "professor-gesture", gesture: "encourage" },
    { type: "observe", prompt: `Let's rebuild from the part that tripped you up: ${misconception}. New example, slower pace.` },
  ];
}
