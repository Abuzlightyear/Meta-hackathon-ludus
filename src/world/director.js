// world/director — AI Scene Director (camelCase verbs, validated commands only).
// The AI (or deterministic offline director) may only emit the 13 allowlisted
// verbs below. Every instruction is schema-validated; arbitrary JS, shell,
// eval, unknown verbs, bad refs and unsafe prompts are rejected with structured
// {path, rule, message} errors and never executed. applyDirectorCommand is a
// pure reducer: structuredClone in, new scene out, input never mutated.
import { validateSceneSpec, validateObjectSpec, PROFESSOR_GESTURES } from "../scene-spec.js";
import { checkContent } from "../safety-filter.js";
import { createObject } from "./objects.js";

export const DIRECTOR_COMMANDS = ["create", "move", "resize", "show", "hide", "highlight", "professorMove", "point", "zoom", "animate", "askManipulate", "observe", "rebuild"];
export const ANIMATION_EVENTS = ["evaporate", "condense", "rain", "grow", "divide-pizza", "test-load", "none"];
const UNSAFE_KEYS = ["code", "script", "command", "shell", "eval", "exec", "html", "url"];
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

export function validateDirectorCommand(cmd, scene) {
  const errors = [];
  const err = (path, rule, message) => errors.push({ path, rule, message });
  if (!cmd || typeof cmd !== "object" || Array.isArray(cmd)) { err("$", "schema", "Command must be an object."); return { valid: false, errors }; }
  for (const k of UNSAFE_KEYS) if (k in cmd) err(`$.${k}`, "unsafe", `Field "${k}" is not allowed — the Director never executes code, shell or markup.`);
  if (!DIRECTOR_COMMANDS.includes(cmd.type)) {
    err("$.type", "unsupported-action", `Unsupported director command "${String(cmd.type)}" (allowed: ${DIRECTOR_COMMANDS.join(", ")}). Arbitrary code is never executed.`);
    return { valid: false, errors };
  }
  const ids = new Set((scene?.objects || []).map((o) => o.id));
  const needTarget = ["move", "resize", "show", "hide", "highlight", "askManipulate"];
  if (needTarget.includes(cmd.type) && (typeof cmd.objectId !== "string" || !ids.has(cmd.objectId))) err("$.objectId", "bad-ref", `Command "${cmd.type}" references unknown object "${String(cmd.objectId)}".`);
  if ((cmd.type === "point" || cmd.type === "animate" || cmd.type === "observe") && cmd.objectId !== undefined && !ids.has(cmd.objectId)) err("$.objectId", "bad-ref", `Command "${cmd.type}" references unknown object "${String(cmd.objectId)}".`);
  if (cmd.type === "move") {
    if (cmd.x !== undefined && !isNum(cmd.x)) err("$.x", "schema", 'move "x" must be a finite number.');
    if (cmd.y !== undefined && !isNum(cmd.y)) err("$.y", "schema", 'move "y" must be a finite number.');
    if (cmd.x === undefined && cmd.y === undefined) err("$", "schema", 'move needs "x" and/or "y".');
  }
  if (cmd.type === "resize" && (!isNum(cmd.scale) || cmd.scale <= 0 || cmd.scale > 10)) err("$.scale", "schema", 'resize "scale" must be in (0, 10].');
  if (cmd.type === "create") {
    if (!cmd.object || typeof cmd.object !== "object") err("$.object", "schema", 'create needs an "object" spec.');
    else if (cmd.object.id && ids.has(cmd.object.id)) err("$.object.id", "duplicate-id", `Object "${cmd.object.id}" already exists in the scene.`);
    else if (!cmd.object.appearance) { const r = createObject(cmd.object.type, cmd.object); if (!r.ok) err("$.object", r.error.code === "UNKNOWN_TYPE" ? "unsupported-action" : "schema", r.error.message || "Invalid object spec."); }
    else errors.push(...validateObjectSpec(cmd.object, (scene?.objects || []).length, new Set(ids)));
  }
  if (cmd.type === "professorMove" && (!isNum(cmd.x) || !isNum(cmd.y))) err("$", "schema", 'professorMove needs finite "x" and "y".');
  if (cmd.type === "point" && cmd.gesture !== undefined && !PROFESSOR_GESTURES.includes(cmd.gesture)) err("$.gesture", "unsupported-action", `Unknown professor gesture "${String(cmd.gesture)}".`);
  if (cmd.type === "zoom" && (!isNum(cmd.zoom) || cmd.zoom <= 0 || cmd.zoom > 8)) err("$.zoom", "schema", 'zoom "zoom" must be in (0, 8].');
  if (cmd.type === "animate" && !ANIMATION_EVENTS.includes(cmd.event)) err("$.event", "unsupported-action", `Unknown animation event "${String(cmd.event)}" (allowed: ${ANIMATION_EVENTS.join(", ")}).`);
  if ((cmd.type === "askManipulate" || cmd.type === "observe" || cmd.type === "rebuild") && typeof cmd.prompt === "string" && cmd.prompt && !checkContent(cmd.prompt).allowed) err("$.prompt", "unsafe", "Prompt text is not safe.");
  if (cmd.type === "rebuild") {
    if (typeof cmd.misconception !== "string" || !cmd.misconception.trim()) err("$.misconception", "schema", 'rebuild needs the observed "misconception" (from the learner\'s actual answers, never a learning-style label).');
    else if (/visual learner|auditory learner|kinaesthetic learner|learning style/i.test(cmd.misconception)) err("$.misconception", "unsafe", "Adaptation must name an observed misconception, not a learning-style label.");
    if (cmd.strategy !== undefined && typeof cmd.strategy !== "string") err("$.strategy", "schema", 'rebuild "strategy" must be a string.');
  }
  return { valid: errors.length === 0, errors };
}

export function applyDirectorCommand(scene, cmd) {
  const check = validateDirectorCommand(cmd, scene);
  if (!check.valid) return { ok: false, error: { code: "INVALID_COMMAND", message: check.errors[0].message, errors: check.errors } };
  const next = structuredClone(scene);
  next.viewState = { hiddenIds: [], highlightedId: null, ...(next.viewState || {}) };
  const obj = (id) => next.objects.find((o) => o.id === id);
  switch (cmd.type) {
    case "create": {
      const spec = cmd.object.appearance ? cmd.object : createObject(cmd.object.type, cmd.object).object;
      next.objects.push(structuredClone(spec)); break;
    }
    case "move": { const o = obj(cmd.objectId); if (cmd.x !== undefined) o.x = cmd.x; if (cmd.y !== undefined) o.y = cmd.y; break; }
    case "resize": obj(cmd.objectId).scale = cmd.scale; break;
    case "show": next.viewState.hiddenIds = next.viewState.hiddenIds.filter((id) => id !== cmd.objectId); break;
    case "hide": if (!next.viewState.hiddenIds.includes(cmd.objectId)) next.viewState.hiddenIds.push(cmd.objectId); break;
    case "highlight": next.viewState.highlightedId = cmd.objectId; break;
    case "professorMove": next.professor = { ...next.professor, x: cmd.x, y: cmd.y, gesture: "walk" }; break;
    case "point": next.professor = { ...next.professor, gesture: "point" }; if (cmd.objectId) next.viewState.highlightedId = cmd.objectId; break;
    case "zoom": next.viewport = { ...next.viewport, zoom: cmd.zoom }; break;
    case "animate": case "askManipulate": case "observe": break; // event prompts; scene data unchanged
    case "rebuild": next.professor = { ...next.professor, gesture: "encourage" }; break;
  }
  const recheck = validateSceneSpec(next);
  if (!recheck.valid) return { ok: false, error: { code: "INVALID_SCENE", message: recheck.errors[0].message, errors: recheck.errors } };
  return { ok: true, scene: next, applied: cmd.type };
}

// Apply a batch in order; stops at the first invalid command (never partially silent).
export function applyDirectorCommands(scene, commands) {
  let current = scene; const applied = [];
  for (const cmd of commands || []) {
    const r = applyDirectorCommand(current, cmd);
    if (!r.ok) return { ok: false, error: r.error, applied, scene: current };
    current = r.scene; applied.push(r.applied);
  }
  return { ok: true, scene: current, applied };
}

function firstTarget(scene) {
  return (scene?.objects || []).find((o) => o.interactive) || (scene?.objects || [])[0] || null;
}

// Map diagnosis + plan (src/diagnosis.js, src/planning.js, src/tool-selector.js output) to scene actions.
export function commandsFromDiagnosis({ scene, diagnosis, plan, toolId } = {}) {
  const target = firstTarget(scene);
  const cmds = [{ type: "professorMove", x: scene?.professor?.x ?? 110, y: scene?.professor?.y ?? 350 }];
  const missing = diagnosis?.prerequisitesMissing || [];
  if (missing.length) cmds.push({ type: "observe", prompt: `First, let's shore up: ${missing[0]}.` });
  else if (diagnosis) cmds.push({ type: "observe", prompt: "Your foundations look solid — let's go deeper." });
  if (target) {
    cmds.push({ type: "point", objectId: target.id }, { type: "highlight", objectId: target.id });
    const firstStep = (plan?.steps || []).find((s) => s.kind === "core") || (plan?.steps || [])[0];
    if (firstStep) cmds.push({ type: "askManipulate", objectId: target.id, prompt: String(firstStep.objective || firstStep.title).slice(0, 160) });
  }
  if (toolId === "visual-steps") cmds.push({ type: "animate", event: "none" });
  // Only return commands that validate against this scene.
  return cmds.filter((c) => validateDirectorCommand(c, scene).valid);
}

// Perspective-switching rebuild: wrong answer -> rebuild/simplify/switch view -> new interaction.
// Commands are kept only if they apply sequentially (create before highlight of the new object).
function gcd2(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
export function struggleRebuild({ scene, misconception, topic } = {}) {
  const m = misconception || "The last step needs another look — the underlying rule is not secure yet.";
  const frac = (scene?.objects || []).find((o) => o.id === "frac-main" && o.props && "denominator" in o.props);
  let strategy = "simplify-and-retry";
  let planned = [{ type: "rebuild", misconception: m, strategy }];
  let newPrompt = "Try it again with the highlighted object — one step at a time.";
  if (frac && /fraction|denominator/i.test(`${topic} ${m}`)) {
    strategy = "switch-pizza-to-bar";
    const d = frac.props.denominator, s = frac.props.selected || 0;
    const g = gcd2(s, d);
    const sd = g > 1 ? d / g : d, ss = g > 1 ? s / g : s;
    newPrompt = `Same amount, new view: the bar shows ${ss}/${sd}. Select it, then compare with the pizza amount.`;
    planned = [
      { type: "rebuild", misconception: m, strategy },
      { type: "hide", objectId: "frac-main" },
      { type: "create", object: { type: "fraction-bar", id: "frac-alt", x: 400, y: 185, denominator: sd, selected: ss } },
      { type: "highlight", objectId: "frac-alt" },
      { type: "askManipulate", objectId: "frac-alt", prompt: newPrompt },
    ];
  } else if (/cloud|water|evapor|condens/i.test(`${topic} ${m}`)) {
    strategy = "isolate-one-stage";
    newPrompt = "Watch just this stage: sun heats the sea (evaporation), then vapour cools and condenses. What changed?";
    const target = firstTarget(scene);
    planned = [{ type: "rebuild", misconception: m, strategy }, { type: "animate", event: "evaporate" }, { type: "animate", event: "condense" }];
    if (target) planned.push({ type: "highlight", objectId: target.id });
    planned.push({ type: "observe", prompt: newPrompt });
  } else {
    const target = firstTarget(scene);
    if (target) { planned.push({ type: "highlight", objectId: target.id }, { type: "askManipulate", objectId: target.id, prompt: newPrompt }); }
    else planned.push({ type: "observe", prompt: newPrompt });
  }
  let cur = scene; const commands = [];
  for (const c of planned) { const r = applyDirectorCommand(cur, c); if (r.ok) { commands.push(c); cur = r.scene; } }
  return { decision: "rebuild", strategy, reason: `Observed struggle (${m}); director rebuilds with strategy ${strategy} and a new interaction.`, commands, scene: cur, newInteraction: { kind: "manipulate", prompt: newPrompt } };
}

// Observe a learner interaction -> adaptation decision (misconception-driven, never style labels).
export function observeInteraction({ scene, correct, misconception, topic } = {}) {
  const target = firstTarget(scene);
  if (correct === false || misconception) return struggleRebuild({ scene, misconception, topic });
  const commands = target ? [{ type: "point", objectId: target.id }, { type: "observe", prompt: "Good — observe what changed, then try the next challenge." }] : [{ type: "observe", prompt: "Good — let's continue." }];
  return { decision: "continue", reason: "Correct response observed; continue with the planned challenge.", commands: commands.filter((c) => validateDirectorCommand(c, scene).valid) };
}
