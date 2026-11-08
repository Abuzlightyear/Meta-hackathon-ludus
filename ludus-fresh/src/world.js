// world composer (P4) — ONE composer for every kernel world. No hardcoded pages:
// typed primitives -> validated SceneSpec -> pure interactions -> SVG string.
// Truth is always computed by src/kernels/* (gold-backed where proven); the
// wall is a rendering of that computation, never its source. Zero deps.
import { kernelById, kernelForTopic } from "./kernels/index.js";
import { computeFraction } from "./kernels/maths.js";
import { computeClouds } from "./kernels/clouds.js";
import { classifyAnimal, compareAnimals } from "./kernels/animals.js";
import { evaluateDesign } from "./kernels/engineering-castle.js";
import { computeBusiness } from "./kernels/business.js";
import { computeCar } from "./kernels/cars.js";
import { computeHistory } from "./kernels/history.js";
import { computePhysics } from "./kernels/physics.js";
import { computeTrace } from "./kernels/coding.js";
import { inquiryPlan, INQUIRY_STEPS } from "./kernels/obscure.js";

export const PRIMITIVE_TYPES = [
  "shape", "label", "line", "diagram", "sequence", "timeline",
  "wall", "cloud", "animal", "chart", "fraction-pizza", "fraction-bar",
];
export const OBJECT_TYPES = PRIMITIVE_TYPES;
export const OBJECT_ACTIONS = ["select", "click", "drag", "slider", "divide", "classify", "observe", "place", "measure", "test-design", "none"];
export const SCENE_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const clampNum = (v, lo, hi, fb) => { const n = Number(v); return Number.isFinite(n) ? clamp(n, lo, hi) : fb; };
const clampInt = (v, lo, hi, fb) => Math.round(clampNum(v, lo, hi, fb));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// ---------- typed primitive factories (deterministic ids, no randomness) ----------
function base(id, type, x, y, fill, label, purpose, extra = {}) {
  return { id: id || `${type}-1`, type, x, y, scale: 1, rotation: 0, appearance: { fill, stroke: "#3a2e1e", label }, label, actions: ["none"], interactive: false, purpose, props: {}, ...extra };
}
export function createShape({ id, x = 0, y = 0, fill = "#8c6a2f", label = "Shape", purpose = "Show a geometric form", shape = "rect", w = 60, h = 40 } = {}) {
  const o = base(id, "shape", x, y, fill, label, purpose); o.props = { shape, w, h }; return o;
}
export function createLabel({ id, x = 0, y = 0, text = "Label", label, purpose = "Name a part of the scene" } = {}) {
  const o = base(id, "label", x, y, "#1c2b33", label || text, purpose);
  o.appearance = { fill: "#1c2b33", stroke: "none", label: label || text }; o.props = { text }; return o;
}
export function createLine({ id, x = 0, y = 0, x2 = 100, y2 = 0, label = "Line", purpose = "Connect or measure between two points" } = {}) {
  const o = base(id, "line", x, y, "#5a4632", label, purpose); o.props = { x2, y2 }; return o;
}
export function createDiagram({ id, x = 0, y = 0, text = "Idea", label, purpose } = {}) {
  const o = base(id, "diagram", x, y, "#dce5ea", label || text, purpose || "Hold one idea in a diagram");
  o.props = { text }; o.interactive = true; o.actions = ["select"]; return o;
}
export const createDiagramNode = createDiagram;
export function createSequence({ id, x = 80, y = 120, steps = [], label = "Sequence", purpose = "Show steps in order (a process)" } = {}) {
  const o = base(id, "sequence", x, y, "#8c6a2f", label, purpose); o.props = { steps: [...steps] }; o.interactive = true; o.actions = ["observe", "select"]; return o;
}
export function createTimeline({ id, x = 80, y = 380, events = [], label = "Timeline", purpose = "Order events in time" } = {}) {
  const o = base(id, "timeline", x, y, "#1c2b33", label, purpose); o.props = { events: [...events] }; o.interactive = true; o.actions = ["select"]; return o;
}
export function createWall({ id, x = 400, y = 300, rows = 3, thickness = 1, lengthUnits = 6, heightRows, label, purpose } = {}) {
  const o = base(id, "wall", x, y, "#a85f3a", label || `Wall ${lengthUnits} wide x ${heightRows ?? rows} high, ${thickness} thick`, purpose || "A structure the learner designs and tests: front area vs volume with depth");
  o.props = { rows: heightRows ?? rows, lengthUnits, heightRows: heightRows ?? rows, thickness }; o.interactive = true; o.actions = ["slider", "select", "test-design"]; return o;
}
export function createCloud({ id, x = 400, y = 90, density = 0.5, label = "Cloud", purpose = "Show condensed water vapour as a cloud" } = {}) {
  const o = base(id, "cloud", x, y, "#e8edf0", label, purpose); o.props = { density: clampNum(density, 0.1, 1, 0.5) }; o.interactive = true; o.actions = ["observe", "select"]; return o;
}
export function createAnimal({ id, x = 300, y = 300, species = "fox", habitat = "savanna", label, purpose } = {}) {
  const o = base(id, "animal", x, y, "#b5762f", label || species, purpose || `Show a ${species} and its features in the ${habitat}`);
  o.props = { species, habitat }; o.interactive = true; o.actions = ["select", "classify", "drag", "observe"]; return o;
}
export function createChart({ id, x = 400, y = 210, values = [], maxValue, width = 300, height = 160, label = "Chart", purpose = "Compare computed amounts as bars (height is computed, not drawn by eye)" } = {}) {
  const vals = values.map((v) => ({ label: String(v.label), value: Number(v.value) || 0, color: v.color || "#2e6b7a" }));
  const o = base(id, "chart", x, y, "#dce5ea", label, purpose);
  o.props = { values: vals, maxValue: maxValue ?? Math.max(1, ...vals.map((v) => Math.abs(v.value))), width, height }; o.interactive = true; o.actions = ["select"]; return o;
}
export function createFractionPizza({ id, x = 200, y = 200, denominator = 4, selected = 1, label, purpose } = {}) {
  const d = clampInt(denominator, 1, 24, 4);
  const o = base(id, "fraction-pizza", x, y, "#c05a2e", label || `Pizza in ${d} equal parts`, purpose || "Show equal parts of a whole and select a fraction");
  o.props = { denominator: d, selected: clampInt(selected, 0, d, 0), radius: 90 }; o.interactive = true; o.actions = ["select", "divide", "slider"]; return o;
}
export function createFractionBar({ id, x = 100, y = 300, denominator = 4, selected = 1, label, purpose } = {}) {
  const d = clampInt(denominator, 1, 24, 4);
  const o = base(id, "fraction-bar", x, y, "#2e6b7a", label || `Bar in ${d} equal parts`, purpose || "Compare fractions on a bar model (alternative representation)");
  o.props = { denominator: d, selected: clampInt(selected, 0, d, 0), w: 320, h: 44 }; o.interactive = true; o.actions = ["select", "divide", "slider"]; return o;
}
export const FACTORIES = { shape: createShape, label: createLabel, line: createLine, diagram: createDiagram, sequence: createSequence, timeline: createTimeline, wall: createWall, cloud: createCloud, animal: createAnimal, chart: createChart, "fraction-pizza": createFractionPizza, "fraction-bar": createFractionBar };
export function createPrimitive(type, options = {}) {
  const f = FACTORIES[type]; if (!f) return { ok: false, error: { code: "UNKNOWN_TYPE", message: `Unknown primitive "${String(type)}" (allowed: ${PRIMITIVE_TYPES.join(", ")}).` } };
  const object = f(options); const errors = validateObjectSpec(object, 0, new Set());
  return errors.length ? { ok: false, error: { code: "INVALID_OBJECT", errors } } : { ok: true, object };
}
export const createObject = createPrimitive;
export function createObjects(specs) {
  if (!Array.isArray(specs)) return { ok: false, error: { code: "INVALID_SPECS", message: "Object specs must be an array." } };
  const objects = []; const seen = new Set();
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i] || {};
    const r = s.appearance ? { ok: true, object: s } : createPrimitive(s.type, s);
    if (!r.ok) return { ok: false, error: { ...r.error, index: i } };
    if (seen.has(r.object.id)) return { ok: false, error: { code: "DUPLICATE_ID", index: i, message: `Duplicate object id "${r.object.id}".` } };
    seen.add(r.object.id); objects.push(r.object);
  }
  return { ok: true, objects };
}

// ---------- validation (structured errors, never throws on bad input) ----------
export function validateObjectSpec(o, index = 0, seenIds = new Set()) {
  const errors = []; const at = `$.objects[${index}]`; const err = (p, r, m) => errors.push({ path: p, rule: r, message: m });
  if (!isObj(o)) { err(at, "schema", "Object spec must be an object."); return errors; }
  if (typeof o.id !== "string" || !SCENE_ID_RE.test(o.id)) err(`${at}.id`, "schema", 'Object "id" is required (kebab-case).');
  else if (seenIds.has(o.id)) err(`${at}.id`, "duplicate-id", `Duplicate object id "${o.id}".`); else seenIds.add(o.id);
  if (!PRIMITIVE_TYPES.includes(o.type)) err(`${at}.type`, "unknown-type", `Unknown primitive "${String(o.type)}" (allowed: ${PRIMITIVE_TYPES.join(", ")}).`);
  if (!Number.isFinite(o.x) || o.x < -200 || o.x > 1200) err(`${at}.x`, "out-of-bounds", 'Object "x" must be finite in [-200, 1200].');
  if (!Number.isFinite(o.y) || o.y < -200 || o.y > 900) err(`${at}.y`, "out-of-bounds", 'Object "y" must be finite in [-200, 900].');
  if (!isObj(o.appearance) || !o.appearance.fill) err(`${at}.appearance`, "schema", 'Object "appearance.fill" is required.');
  if (typeof o.label !== "string" || !o.label.trim()) err(`${at}.label`, "schema", 'Object "label" is required.');
  if (!Array.isArray(o.actions) || !o.actions.every((a) => OBJECT_ACTIONS.includes(a))) err(`${at}.actions`, "unsupported-action", `Object "actions" must be from: ${OBJECT_ACTIONS.join(", ")}.`);
  if (typeof o.interactive !== "boolean") err(`${at}.interactive`, "schema", 'Object "interactive" must be boolean.');
  if (typeof o.purpose !== "string" || !o.purpose.trim()) err(`${at}.purpose`, "schema", 'Object "purpose" is required.');
  const p = o.props || {};
  if ((o.type === "fraction-pizza" || o.type === "fraction-bar")) {
    if (!Number.isInteger(p.denominator) || p.denominator < 1 || p.denominator > 24) err(`${at}.props.denominator`, "schema", "Fraction denominator must be an integer in [1, 24].");
    if (!Number.isInteger(p.selected) || p.selected < 0 || (Number.isInteger(p.denominator) && p.selected > p.denominator)) err(`${at}.props.selected`, "schema", "Fraction selected must be an integer in [0, denominator].");
  }
  if (o.type === "cloud" && p.density !== undefined && (!Number.isFinite(p.density) || p.density < 0.1 || p.density > 1)) err(`${at}.props.density`, "schema", "Cloud density must be in [0.1, 1].");
  if (o.type === "wall" && p.thickness !== undefined && (!Number.isInteger(p.thickness) || p.thickness < 1 || p.thickness > 6)) err(`${at}.props.thickness`, "schema", "Wall thickness must be an integer in [1, 6].");
  if (o.type === "chart" && (!Array.isArray(p.values) || !p.values.every((v) => v && typeof v.label === "string" && Number.isFinite(v.value)))) err(`${at}.props.values`, "schema", "Chart values must be [{label, finite value}].");
  if (o.type === "sequence" && (!Array.isArray(p.steps) || !p.steps.length || !p.steps.every((s) => typeof s === "string" && s))) err(`${at}.props.steps`, "schema", "Sequence needs non-empty step strings.");
  if (o.type === "timeline" && (!Array.isArray(p.events) || !p.events.every((s) => typeof s === "string"))) err(`${at}.props.events`, "schema", "Timeline events must be strings.");
  if (o.type === "animal" && (typeof p.species !== "string" || !p.species)) err(`${at}.props.species`, "schema", "Animal needs a species.");
  return errors;
}
export function validateSceneSpec(scene) {
  const errors = []; const err = (p, r, m) => errors.push({ path: p, rule: r, message: m });
  if (!isObj(scene)) { err("$", "schema", "Scene must be an object."); return { valid: false, errors }; }
  if (typeof scene.id !== "string" || !SCENE_ID_RE.test(scene.id)) err("$.id", "schema", 'Scene "id" is required (kebab-case).');
  if (typeof scene.topic !== "string" || !scene.topic.trim()) err("$.topic", "schema", 'Scene "topic" is required.');
  if (typeof scene.title !== "string" || !scene.title.trim()) err("$.title", "schema", 'Scene "title" is required.');
  if (!Array.isArray(scene.objects)) err("$.objects", "schema", 'Scene "objects" must be an array.');
  else { const seen = new Set(); scene.objects.forEach((o, i) => errors.push(...validateObjectSpec(o, i, seen))); }
  if (scene.viewport !== undefined && (!isObj(scene.viewport) || !(scene.viewport.w > 0) || !(scene.viewport.h > 0))) err("$.viewport", "schema", 'Viewport "w"/"h" must be positive.');
  if (scene.interactions !== undefined && !Array.isArray(scene.interactions)) err("$.interactions", "schema", 'Scene "interactions" must be an array.');
  return { valid: errors.length === 0, errors };
}
export const validateScene = validateSceneSpec;
export function createSceneSpec({ id, topic, title, objects = [], professor, viewport, interactions = [], ...rest } = {}) {
  return { id, topic, title, objects: objects.map((o) => ({ scale: 1, rotation: 0, ...o })), professor: professor ?? { x: 80, y: 300, gesture: "present" }, viewport: viewport ?? { w: 800, h: 450, zoom: 1 }, interactions, ...rest };
}
export function composeScene(spec = {}) {
  let objects = spec.objects || [];
  if (objects.some((o) => o && !o.appearance)) { const built = createObjects(objects); if (!built.ok) return { ok: false, error: built.error, scene: null }; objects = built.objects; }
  const scene = createSceneSpec({ ...spec, objects });
  const check = validateSceneSpec(scene);
  return check.valid ? { ok: true, scene } : { ok: false, error: { code: "INVALID_SCENE", errors: check.errors }, scene: null };
}

// ---------- computed readouts (single source: kernel compute) ----------
export function normalizeParams(kernelId, params = {}) {
  switch (kernelId) {
    case "maths": { const d = clampInt(params.denominator, 1, 24, 4); return { denominator: d, selected: clampInt(params.selected, 0, d, 1), model: params.model || params.representation || "pizza" }; }
    case "clouds": return { temperature: clampNum(params.temperature, -30, 50, 24), humidity: clampNum(params.humidity, 0, 100, 60) };
    case "animals": { const focusSpecies = params.focusSpecies ? String(params.focusSpecies) : ""; const speciesA = String(params.speciesA || focusSpecies || "lion"); const speciesB = String(params.speciesB || "zebra"); const compareMode = params.compareMode === true || params.compare === true || Array.isArray(params.compare); const speciesHabitat = { zebra: "savanna", lion: "savanna", frog: "pond", heron: "pond", fox: "woodland" }; return { speciesA, speciesB, selectedSpecies: String(params.selectedSpecies || focusSpecies || speciesA), habitat: String(params.habitat || speciesHabitat[focusSpecies || speciesA] || "savanna"), focusSpecies, compareMode }; }
    case "engineering-castle": return { lengthUnits: clampInt(params.lengthUnits, 1, 12, 6), heightRows: clampInt(params.heightRows ?? params.rows, 1, 8, 4), thickness: clampInt(params.thickness, 1, 6, 1) };
    case "business": return { price: clampNum(params.price, 0, 100000, 5), units: clampInt(params.units, 0, 1000000, 100), unitCost: clampNum(params.unitCost, 0, 100000, 3), fixedCosts: clampNum(params.fixedCosts, 0, 10000000, 150) };
    case "cars": return { speedMph: clampNum(params.speedMph, 0, 120, 30), gearRatio: clampNum(params.gearRatio, 1, 5, 3), engineRpm: clampNum(params.engineRpm, 500, 6000, 3000) };
    case "history": return { events: Array.isArray(params.events) && params.events.length ? params.events.map(String).slice(0, 8) : ["Roman Empire falls", "printing press invented", "first powered flight", "Moon landing", "Berlin Wall falls"] };
    case "physics": return { distanceM: clampNum(params.distanceM, 0, 10000, 100), timeS: clampNum(params.timeS, 0.1, 3600, 20), massKg: clampNum(params.massKg, 0, 1000, 2), speedMps: clampNum(params.speedMps, 0, 200, 5) };
    case "coding": return { start: clampNum(params.start, -1000, 1000, 2), step: clampNum(params.step, -100, 100, 3), count: clampInt(params.count, 0, 8, 4) };
    case "obscure": return { topic: String(params.topic || "your topic").slice(0, 80) };
    default: return { ...params };
  }
}
export function computeReadout(kernelId, params = {}) {
  const p = normalizeParams(kernelId, params);
  if (kernelId === "maths") { const f = computeFraction(p.denominator, p.selected); return { kernelId, ...f, display: f.display, text: `${f.numerator} out of ${f.denominator} equal parts = ${f.display} (${f.decimal})`, equivalentsText: f.equivalents.map((e) => `${e.numerator}/${e.denominator}`).join(" = ") }; }
  if (kernelId === "clouds") { const c = computeClouds(p); const forming = c.stage === "cloud-formation" || c.stage === "precipitation"; return { kernelId, ...c, text: forming ? `Now: ${c.stage} - ${c.cloudType} (${c.temperature}C, ${c.humidity}%)` : `Now: ${c.stage} (${c.temperature}C, ${c.humidity}%) - no cloud forms in air this dry` }; }
  if (kernelId === "animals") { const sel = classifyAnimal(p.selectedSpecies); const cmp = compareAnimals(p.speciesA, p.speciesB); const focused = Boolean(p.focusSpecies) && !p.compareMode; return { kernelId, selected: { species: p.selectedSpecies, ...sel }, compare: cmp, text: focused ? `${p.selectedSpecies}: ${sel.group} (eats ${sel.diet}; shelters ${sel.shelter}).` : `${p.selectedSpecies}: ${sel.group} (eats ${sel.diet}; shelters ${sel.shelter}). ${cmp.summary}` }; }
  if (kernelId === "engineering-castle") { const r = evaluateDesign(p); return { kernelId, ...r, text: `${r.verdict}: front area ${r.faceArea} (6x4 style LxH), total blocks ${r.volumeBlocks} (area x thickness ${r.thickness})`.replace("6x4 style ", `${r.lengthUnits}x${r.heightRows} `), verdict: r.verdict }; }
  if (kernelId === "business") { const b = computeBusiness(p); return { kernelId, ...b, text: `Revenue ${b.revenue}, total costs ${b.totalCosts}, profit ${b.profit}, break-even ${b.breakEvenUnits === Infinity ? "never (margin <= 0)" : `${b.breakEvenUnits} units`}` }; }
  if (kernelId === "cars") { const c = computeCar(p); return { kernelId, ...c, text: `At ${c.speedMph} mph the car needs about ${c.brakingDistanceM} m to stop; wheels turn at ${c.wheelRpm} rpm (engine ${c.engineRpm} / gear ${c.gearRatio}).` }; }
  if (kernelId === "history") { const h = computeHistory(p); return { kernelId, ...h, text: `Timeline: ${h.text}.` }; }
  if (kernelId === "physics") { const ph = computePhysics(p); return { kernelId, ...ph, text: ph.text }; }
  if (kernelId === "coding") { const tr = computeTrace(p); return { kernelId, ...tr, text: tr.text }; }
  const plan = inquiryPlan(p.topic); return { kernelId: "obscure", ...plan, text: `Diagram, not a bespoke simulation: ${plan.topic} - observe, predict, test, explain. Untested claims stay labelled.` };
}
export const readoutFor = computeReadout;

// ---------- per-kernel world builders (parameterised, no hardcoded pages) ----------
const REPRESENTATIONS = {
  maths: ["pizza", "bar"], clouds: ["sky-controls", "sky-sequence"],
  animals: ["classify-stage", "classify-sort"], "engineering-castle": ["wall-front", "wall-depth"],
  business: ["shop-chart", "shop-breakdown"], cars: ["car-drivetrain", "car-braking"],
  history: ["history-timeline", "history-causes"], physics: ["physics-motion", "physics-energy"], coding: ["coding-trace", "coding-flow"],
  obscure: ["inquiry-diagram", "inquiry-worked-example"],
};
export function representationsFor(kernelId) { return [...(REPRESENTATIONS[kernelId] || ["inquiry-diagram"])]; }
export function alternativeRepresentation(kernelId, current) {
  const list = REPRESENTATIONS[kernelId] || ["inquiry-diagram", "inquiry-worked-example"];
  return list.find((r) => r !== current) || list[0];
}
function finishScene(spec) {
  const r = composeScene(spec);
  if (!r.ok) throw new Error(`Invalid world scene ${spec.id}: ${JSON.stringify(r.error)}`);
  return r.scene;
}
export function buildWorld(kernelInput, options = {}) {
  const kernel = typeof kernelInput === "string" ? (kernelById(kernelInput).id === kernelInput ? kernelById(kernelInput) : kernelForTopic(kernelInput)) : kernelInput;
  const kernelId = kernel?.id || "obscure";
  const topic = String(options.topic || kernel?.title || kernelId);
  const representation = options.representation || options.model || REPRESENTATIONS[kernelId]?.[0];
  const params = normalizeParams(kernelId, { ...(options.params || options), topic, representation });
  if (kernelId === "maths") params.model = representation;
  const readout = computeReadout(kernelId, params);
  let objects = []; let id = "generic-inquiry"; let title = topic; let interactions = [];
  if (kernelId === "maths") {
    id = "maths-fractions"; title = "Fractions - equal parts of a whole";
    const manip = representation === "bar"
      ? createFractionBar({ id: "frac-main", x: 400, y: 185, denominator: params.denominator, selected: params.selected })
      : createFractionPizza({ id: "frac-main", x: 400, y: 195, denominator: params.denominator, selected: params.selected });
    objects = [manip,
      createLine({ id: "frac-line", x: 180, y: 348, x2: 440, y2: 0, label: "Number line 0 to 1", purpose: "Place the fraction on a line" }),
      createLabel({ id: "frac-read", x: 400, y: 66, text: readout.text, purpose: "Read the selected fraction aloud (live, computed)" }),
      createLabel({ id: "frac-equiv", x: 400, y: 92, text: `Equivalent: ${readout.equivalentsText} - same amount, different name`, purpose: "Show equivalent fractions" })];
    if (representation === "bar") objects.push(createDiagram({ id: "frac-compare", x: 640, y: 300, text: `Compare: ${readout.display} on a bar`, purpose: "Alternative representation: same amount on a bar model" }));
    interactions = [{ kind: "slider", objectId: "frac-main", prop: "selected", prompt: "Select parts of the whole." }, { kind: "divide", objectId: "frac-main", prompt: `Divide into ${params.denominator} equal parts.` }, { kind: "select", objectId: "frac-main", prompt: "Select a slice." }];
  } else if (kernelId === "clouds") {
    id = "clouds-sky"; title = "Clouds - the water cycle in the sky";
    const controls = createDiagram({ id: "weather-controls", x: 640, y: 300, text: `Weather: ${params.temperature}C, ${params.humidity}% moist`, purpose: "Student controls for temperature and moisture that change cloud formation" });
    controls.props = { ...controls.props, temperature: params.temperature, humidity: params.humidity }; controls.actions = ["slider", "select"];
    const cloudObjs = readout.density >= 0.25 ? [createCloud({ id: "cloud-1", x: 330, y: 96, density: readout.density }), createCloud({ id: "cloud-2", x: 520, y: 76, density: Math.max(0.1, readout.density - 0.2) })] : [];
    objects = [createShape({ id: "sky-sun", x: 90, y: 74, shape: "circle", w: 54, h: 54, fill: "#e3a723", label: "Sun", purpose: "Provide heat that drives evaporation" }),
      ...cloudObjs,
      createShape({ id: "sea-1", x: 400, y: 386, shape: "rect", w: 760, h: 70, fill: "#3f7d96", label: "Sea", purpose: "Water source for evaporation" }),
      createLabel({ id: "cloud-read", x: 400, y: 160, text: readout.text, purpose: "Name the current cycle stage and cloud type from the conditions" }),
      createLabel({ id: "cloud-why", x: 400, y: 186, text: readout.description, purpose: "Explain why this formation appears" }), controls];
    if (representation === "sky-sequence") objects.push(createSequence({ id: "cycle-seq", x: 190, y: 288, steps: ["Evaporate", "Condense", "Form cloud", "Rain"], purpose: "Isolate one stage at a time after a misconception" }), createDiagram({ id: "stage-focus", x: 400, y: 300, text: `Focus stage: ${readout.stage}`, purpose: "Isolated stage view after a misconception: one stage at a time" }), createTimeline({ id: "cycle-timeline", x: 400, y: 415, events: ["Evaporate", "Condense", "Cloud", "Rain"], purpose: "Order the isolated stages in time" }));
    else objects.push(createSequence({ id: "cycle-seq", x: 190, y: 288, steps: ["Evaporate", "Condense", "Form cloud", "Rain"], purpose: "Show the water cycle as an ordered process" }));
    interactions = [{ kind: "slider", objectId: "weather-controls", prop: "humidity", prompt: "Change humidity: dry air clears clouds, moist air grows them." }, { kind: "slider", objectId: "weather-controls", prop: "temperature", prompt: "Change temperature." }];
  } else if (kernelId === "animals") {
    id = "animals-classify"; title = "Animals - habitats, features, relationships";
    const focusedAnimal = Boolean(params.focusSpecies) && !params.compareMode;
    const shownAnimals = focusedAnimal
      ? [createAnimal({ id: "animal-1", x: 400, y: 300, species: params.focusSpecies, habitat: params.habitat })]
      : [createAnimal({ id: "animal-1", x: 285, y: 305, species: params.speciesA, habitat: params.habitat }), createAnimal({ id: "animal-2", x: 500, y: 315, species: params.speciesB, habitat: params.habitat })];
    objects = [createShape({ id: "habitat-1", x: 400, y: 225, shape: "rect", w: 760, h: 330, fill: "#ddd3a8", label: `${params.habitat} habitat`, purpose: "Provide the setting where animals live" }),
      ...shownAnimals,
      createLabel({ id: "animal-task", x: 400, y: 60, text: focusedAnimal ? `Classify the ${params.focusSpecies}: what does it eat, and where does it shelter?` : "Classify: what does each animal eat, and where does it shelter?", purpose: "Set the classify-and-compare task" }),
      createLabel({ id: "animal-read", x: 400, y: 86, text: readout.text, purpose: "Computed classification for the selected animal" })];
    if (representation === "classify-sort") objects.push(createDiagram({ id: "sort-carnivore", x: 180, y: 140, text: "Carnivore: eats other animals", purpose: "Sorting bin by diet" }), createDiagram({ id: "sort-herbivore", x: 400, y: 140, text: "Herbivore: eats plants", purpose: "Sorting bin by diet" }), createDiagram({ id: "sort-omnivore", x: 620, y: 140, text: "Omnivore: eats both", purpose: "Sorting bin by diet" }));
    interactions = focusedAnimal
      ? [{ kind: "select", objectId: "animal-1", prompt: `Select the ${params.focusSpecies} to classify it.` }, { kind: "drag", objectId: "animal-1", prompt: "Drag the animal to its diet group." }]
      : [{ kind: "select", objectId: "animal-1", prompt: "Select an animal to classify it." }, { kind: "drag", objectId: "animal-1", prompt: "Drag an animal to its diet group." }, { kind: "select", objectId: "animal-2", prompt: "Compare the second animal." }];
  } else if (kernelId === "engineering-castle") {
    id = "engineering-castle-wall"; title = "Castles - build a wall with real depth";
    const wall = createWall({ id: "castle-wall", x: 370, y: 310, lengthUnits: params.lengthUnits, heightRows: params.heightRows, thickness: params.thickness });
    const controls = createDiagram({ id: "castle-controls", x: 640, y: 300, text: `Thickness: ${params.thickness} block(s)`, purpose: "Student slider control for wall thickness" });
    controls.props = { ...controls.props, thickness: params.thickness, lengthUnits: params.lengthUnits, heightRows: params.heightRows }; controls.actions = ["slider", "select"];
    objects = [wall, createShape({ id: "castle-depth", x: 640, y: 210, shape: "rect", w: Math.max(30, params.thickness * 30), h: 36, fill: "#c98f5a", label: `Depth: ${params.thickness} block(s) thick`, purpose: "Top view: thickness turns area into volume" }),
      createLabel({ id: "castle-task", x: 400, y: 58, text: "Make the wall hold: change its thickness, then test front area vs total blocks.", purpose: "Set the area-vs-volume task" }),
      createLabel({ id: "castle-read", x: 400, y: 84, text: readout.text, purpose: "Computed design test" }), controls];
    if (representation === "wall-depth") objects.push(createSequence({ id: "castle-seq", x: 70, y: 405, steps: ["Draw front", "Add depth", "Count all blocks", "Test if it holds"], purpose: "Order the design-and-test method after a misconception" }));
    interactions = [{ kind: "slider", objectId: "castle-wall", prop: "thickness", prompt: "Change thickness. What changes: front area, total blocks, or both?" }, { kind: "slider", objectId: "castle-controls", prop: "thickness", prompt: "Thickness slider." }];
  } else if (kernelId === "business") {
    id = "business-shop"; title = "Business - budget, price, cost, profit";
    const chart = createChart({ id: "shop-chart", x: 400, y: 205, label: "Shop chart: revenue, costs, profit", purpose: "Bars are computed from price, units and costs", values: [{ label: "Revenue", value: readout.revenue, color: "#2e6b7a" }, { label: "Total costs", value: readout.totalCosts, color: "#b5762f" }, { label: "Profit", value: readout.profit, color: readout.profit < 0 ? "#b42318" : "#4e7d3a" }] });
    const controls = createDiagram({ id: "shop-controls", x: 640, y: 330, text: `Price ${params.price}, units ${params.units}`, purpose: "Budget sliders for price, units, unit cost and fixed costs" });
    controls.props = { ...controls.props, ...params }; controls.actions = ["slider", "select"];
    objects = [chart, controls, createLabel({ id: "shop-read", x: 400, y: 66, text: readout.text, purpose: "Computed shop readout" }), createLabel({ id: "shop-budget", x: 400, y: 92, text: `Break-even: ${readout.breakEvenUnits === Infinity ? "never (margin <= 0)" : `${readout.breakEvenUnits} units`} | margin per unit ${readout.marginPerUnit}`, purpose: "Break-even from computed margin" })];
    if (representation === "shop-breakdown") objects.push(createDiagram({ id: "break-revenue", x: 180, y: 130, text: `Revenue = price x units = ${readout.revenue}`, purpose: "Breakdown step after a misconception" }), createDiagram({ id: "break-costs", x: 400, y: 130, text: `Costs = unitCost x units + fixed = ${readout.totalCosts}`, purpose: "Breakdown step: costs are not optional" }), createDiagram({ id: "break-profit", x: 620, y: 130, text: `Profit = revenue - costs = ${readout.profit}`, purpose: "Breakdown step: revenue is not profit" }));
    interactions = [{ kind: "slider", objectId: "shop-controls", prop: "price", prompt: "Move the price slider: profit recomputes." }, { kind: "slider", objectId: "shop-controls", prop: "units", prompt: "Move the units slider." }, { kind: "slider", objectId: "shop-controls", prop: "fixedCosts", prompt: "Move the fixed-costs slider." }];
  } else if (kernelId === "cars") {
    id = "cars-drivetrain"; title = "Cars - engine, gears, braking";
    const chart = createChart({ id: "car-chart", x: 400, y: 205, label: "Stopping distance grows with speed squared", purpose: "Bars compare stopping distance at 20 and 40 mph", values: [{ label: "20 mph", value: readout.brakingAt20, color: "#4e7d3a" }, { label: "40 mph", value: readout.brakingAt40, color: "#b42318" }] });
    const controls = createDiagram({ id: "car-controls", x: 640, y: 330, text: `Speed ${params.speedMph} mph, gear ${params.gearRatio}:1`, purpose: "Sliders for speed and gear ratio" });
    controls.props = { ...controls.props, ...params }; controls.actions = ["slider", "select"];
    objects = [chart, controls,
      createSequence({ id: "car-cycle", x: 190, y: 320, steps: ["Intake", "Compression", "Power", "Exhaust"], purpose: "The four-stroke cycle in order" }),
      createLabel({ id: "car-read", x: 400, y: 66, text: readout.text, purpose: "Computed drivetrain and braking readout" })];
    interactions = [{ kind: "slider", objectId: "car-controls", prop: "speedMph", prompt: "Change speed: stopping distance recomputes with the square law." }, { kind: "slider", objectId: "car-controls", prop: "gearRatio", prompt: "Change gear ratio: wheel rpm recomputes." }];
  } else if (kernelId === "history") {
    id = "history-timeline"; title = "History - timelines, centuries and turning points";
    const tl = createTimeline({ id: "hist-timeline", x: 400, y: 300, events: readout.ordered.map((e) => `${e.year} · ${e.name} (${e.century} c.)`) });
    objects = [tl,
      createDiagram({ id: "hist-how", x: 180, y: 150, text: "Read years like numbers on a line: smaller year, earlier event", purpose: "How to read the timeline" }),
      createLabel({ id: "hist-task", x: 400, y: 60, text: "Put the past in order: earlier is left, later is right.", purpose: "Set the chronology task" }),
      createLabel({ id: "hist-read", x: 400, y: 86, text: readout.text, purpose: "Computed timeline readout" })];
    if (representation === "history-causes") objects.push(createDiagram({ id: "hist-cause", x: 400, y: 150, text: "Cause → turning point → effect: nothing causes what already happened", purpose: "Cause-and-effect frame after a misconception" }));
    interactions = [{ kind: "select", objectId: "hist-timeline", prompt: "Select the timeline: which event sits furthest left?" }];
  } else if (kernelId === "physics") {
    id = "physics-motion"; title = "Physics - motion, forces and energy";
    const chart = createChart({ id: "phys-chart", x: 400, y: 205, label: "Motion and energy, computed live", purpose: "Bars compute speed, weight and kinetic energy from the sliders", values: [{ label: "Speed m/s", value: readout.speed, color: "#2e6b7a" }, { label: "Weight N", value: readout.weightN, color: "#b5762f" }, { label: "Energy J", value: readout.kineticEnergy, color: "#4e7d3a" }] });
    const controls = createDiagram({ id: "phys-controls", x: 640, y: 330, text: `${params.distanceM} m in ${params.timeS} s`, purpose: "Sliders for distance, time and mass" });
    controls.props = { ...controls.props, ...params }; controls.actions = ["slider", "select"];
    objects = [chart, controls,
      createSequence({ id: "phys-method", x: 190, y: 320, steps: ["Measure distance", "Time it", "Divide distance by time"], purpose: "The speed method in order" }),
      createLabel({ id: "phys-read", x: 400, y: 66, text: readout.text, purpose: "Computed physics readout" })];
    if (representation === "physics-energy") objects.push(createDiagram({ id: "phys-energy-note", x: 180, y: 130, text: "Energy follows speed squared: double speed, four times energy", purpose: "Energy square law after a misconception" }));
    interactions = [{ kind: "slider", objectId: "phys-controls", prop: "distanceM", prompt: "Change distance: speed recomputes." }, { kind: "slider", objectId: "phys-controls", prop: "timeS", prompt: "Change time: speed recomputes." }, { kind: "slider", objectId: "phys-controls", prop: "massKg", prompt: "Change mass: weight and energy recompute." }];
  } else if (kernelId === "coding") {
    id = "coding-trace"; title = "Coding - variables, loops and tracing";
    const steps = readout.values.map((v, i) => (i === 0 ? `x = ${v}` : `pass ${i}: x = ${v}`));
    objects = [createDiagram({ id: "code-source", x: 400, y: 120, text: `x = ${params.start}; repeat ${params.count}: x = x + ${params.step}`, purpose: "The code being traced" }),
      createDiagram({ id: "code-rules", x: 640, y: 200, text: "Trace one pass at a time: update x, write it down, repeat", purpose: "The tracing method" }),
      createSequence({ id: "code-trace", x: 70, y: 300, steps, purpose: "Trace: the value of x after every pass" }),
      createLabel({ id: "code-read", x: 400, y: 66, text: readout.text, purpose: "Computed trace readout" })];
    if (representation === "coding-flow") objects.push(createDiagram({ id: "code-flow", x: 400, y: 190, text: "Start → loop body → check count → repeat or stop", purpose: "Loop flow after a misconception" }));
    interactions = [{ kind: "select", objectId: "code-trace", prompt: "Select the trace: what is x after pass 1?" }];
  } else {
    id = "generic-inquiry"; title = `${params.topic} - composed world (diagram, not a bespoke simulation)`;
    objects = [createLabel({ id: "generic-title", x: 400, y: 52, text: params.topic, purpose: "Name the topic the learner chose" }),
      createDiagram({ id: "generic-what", x: 180, y: 140, text: "What is it? Parts & words", purpose: "Start from parts and vocabulary" }),
      createDiagram({ id: "generic-how", x: 400, y: 140, text: "How does it change?", purpose: "Look for cause and effect" }),
      createDiagram({ id: "generic-see", x: 620, y: 140, text: "What can we observe?", purpose: "Separate observation from guessing" }),
      createSequence({ id: "generic-seq", x: 190, y: 300, steps: [...INQUIRY_STEPS], purpose: "Give every new topic the same honest inquiry method" }),
      createTimeline({ id: "generic-timeline", x: 460, y: 400, events: ["Before", "Change", "Result", "Check again"], purpose: "Order change over time for any topic" }),
      createLabel({ id: "generic-honest", x: 400, y: 86, text: "Diagram, not a bespoke simulation - untested claims stay labelled.", purpose: "Label the honest limit of this composition" })];
    if (representation === "inquiry-worked-example") objects.push(createLabel({ id: "generic-worked", x: 400, y: 250, text: readout.workedExample, purpose: "Worked inquiry method after a misconception" }));
    interactions = [{ kind: "select", objectId: "generic-what", prompt: `Work the diagram for ${params.topic}: name the parts, then explain it back.` }];
  }
  const scene = finishScene({ id, topic, title, objects, professor: { x: 110, y: 350, gesture: "demonstrate" }, interactions, kernelId, representation, params, readout, simulationSupported: kernelId !== "obscure" });
  if (kernelId === "obscure") { scene.supportedParts = readout.supportedParts; scene.unsupportedParts = readout.unsupportedParts; scene.workedExample = readout.workedExample; scene.requiresLookupLabelling = true; scene.theme = topicTheme(params.topic); }
  else { scene.supportedParts = ["Computed kernel readout rendered on the wall", "Manipulate -> consequence through pure applyInteraction"]; scene.unsupportedParts = []; }
  return scene;
}
export const worldForKernel = buildWorld;
export const sceneForKernel = buildWorld;
export const createWorld = buildWorld;
export const buildWorldForKernel = buildWorld;
export function topicTheme(topic) {
  const t = String(topic || "").toLowerCase();
  if (/space|planet|mars|moon|star|astronaut|rocket|galaxy|solar|orbit|telescope/.test(t)) return "space";
  if (/ocean|sea\b|fish|whale|shark|coral|underwater|river|lake|water/.test(t)) return "ocean";
  if (/volcano|lava|erupt|earthquake|geology|rock|mountain/.test(t)) return "volcano";
  if (/chem|element|reaction|acid|atom|molecule|lab\b|experiment/.test(t)) return "chemistry";
  if (/cod|program|computer|robot|data|internet|app\b|game dev/.test(t)) return "code";
  if (/egypt|ancient|roman|greek|pyramid|pharaoh|viking|medieval|empire|king|queen/.test(t)) return "ancient";
  if (/plant|garden|tree|flower|forest|leaf|grow/.test(t)) return "garden";
  if (/body|brain|heart|health|muscle|bone|blood|doctor/.test(t)) return "body";
  return "academy";
}
export function themeBackdrop(themeName, w = 800, h = 450) {
  const stars = (n, seed) => Array.from({ length: n }, (_, i) => `<circle cx="${(i * 173 + seed * 97) % w}" cy="${(i * 89 + seed * 41) % Math.round(h * 0.6)}" r="${1 + (i % 3) * 0.7}" fill="#ffffff" opacity="${0.35 + (i % 4) * 0.15}"/>`).join("");
  switch (themeName) {
    case "space": return `${stars(46, 3)}<circle cx="${w * 0.78}" cy="${h * 0.3}" r="52" fill="#c8a882" opacity="0.9"/><ellipse cx="${w * 0.78}" cy="${h * 0.3}" rx="86" ry="18" fill="none" stroke="#e8d8b8" stroke-width="5" opacity="0.65" transform="rotate(-14 ${w * 0.78} ${h * 0.3})"/><circle cx="${w * 0.78 - 16}" cy="${h * 0.3 - 12}" r="9" fill="#a8886a" opacity="0.8"/><circle cx="${w * 0.12}" cy="${h * 0.16}" r="20" fill="#e8e4da" opacity="0.9"/>`;
    case "ocean": return `${[0, 1, 2].map((i) => `<path d="M 0 ${h * (0.72 + i * 0.08)} Q ${w * 0.25} ${h * (0.68 + i * 0.08)} ${w * 0.5} ${h * (0.72 + i * 0.08)} T ${w} ${h * (0.72 + i * 0.08)} V ${h} H 0 Z" fill="#9fe4ff" opacity="${0.1 + i * 0.07}"/>`).join("")}${stars(14, 7).replaceAll('fill="#ffffff"', 'fill="#cfeeff"')}<circle cx="${w * 0.82}" cy="${h * 0.2}" r="26" fill="#ffe9a8" opacity="0.85"/>`;
    case "volcano": return `<polygon points="${w * 0.62},${h * 0.82} ${w * 0.8},${h * 0.3} ${w * 0.98},${h * 0.82}" fill="#3a2018"/><polygon points="${w * 0.755},${h * 0.42} ${w * 0.8},${h * 0.3} ${w * 0.845},${h * 0.42}" fill="#ff7a3c"/><path d="M ${w * 0.8} ${h * 0.34} q 6 ${h * 0.16} -4 ${h * 0.3} q -6 ${h * 0.1} 2 ${h * 0.16}" fill="none" stroke="#ff9a5c" stroke-width="6" stroke-linecap="round" opacity="0.9"/><circle cx="${w * 0.14}" cy="${h * 0.18}" r="22" fill="#ffd9a8" opacity="0.8"/>`;
    case "chemistry": return `${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${w * (0.68 + (i % 3) * 0.07)}" cy="${h * (0.52 - i * 0.055)}" r="${5 + (i % 3) * 3}" fill="#a2ffc8" opacity="${0.25 + (i % 3) * 0.18}"/>`).join("")}<path d="M ${w * 0.72} ${h * 0.78} h ${w * 0.12} l ${-w * 0.03} ${-h * 0.22} h ${-w * 0.06} Z" fill="#a2ffc8" opacity="0.22" stroke="#a2ffc8"/><rect x="${w * 0.1}" y="${h * 0.14}" width="54" height="38" rx="6" fill="#a2ffc8" opacity="0.16"/><text x="${w * 0.1 + 27}" y="${h * 0.14 + 26}" text-anchor="middle" font-size="17" fill="#a2ffc8" opacity="0.8">H₂O</text>`;
    case "code": return `<rect x="${w * 0.64}" y="${h * 0.12}" width="${w * 0.28}" height="${h * 0.34}" rx="10" fill="#0d1512" stroke="#7fe0b2" stroke-opacity="0.5"/><circle cx="${w * 0.67}" cy="${h * 0.17}" r="4" fill="#ff8a7a"/><circle cx="${w * 0.695}" cy="${h * 0.17}" r="4" fill="#ffe9a8"/><circle cx="${w * 0.72}" cy="${h * 0.17}" r="4" fill="#7fe0b2"/><text x="${w * 0.67}" y="${h * 0.26}" font-family="monospace" font-size="15" fill="#7fe0b2" opacity="0.9">&lt;/&gt; learn()</text><text x="${w * 0.67}" y="${h * 0.33}" font-family="monospace" font-size="13" fill="#b8ffd9" opacity="0.65">repeat: try → check</text>${stars(18, 11).replaceAll('fill="#ffffff"', 'fill="#7fe0b2"')}`;
    case "ancient": return `${[0.16, 0.3, 0.44].map((fx) => `<rect x="${w * fx}" y="${h * 0.34}" width="16" height="${h * 0.42}" fill="#e8c98a" opacity="0.28"/><rect x="${w * fx - 5}" y="${h * 0.31}" width="26" height="9" fill="#e8c98a" opacity="0.4"/>`).join("")}<polygon points="${w * 0.13},${h * 0.31} ${w * 0.49},${h * 0.31} ${w * 0.31},${h * 0.2}" fill="#e8c98a" opacity="0.35"/><polygon points="${w * 0.74},${h * 0.82} ${w * 0.86},${h * 0.44} ${w * 0.98},${h * 0.82}" fill="#e8c98a" opacity="0.3"/>`;
    case "garden": return `${[0.12, 0.24, 0.84].map((fx, i) => `<rect x="${w * fx}" y="${h * 0.52}" width="8" height="${h * 0.3}" fill="#7a5c38"/><circle cx="${w * fx + 4}" cy="${h * 0.46}" r="${26 + i * 6}" fill="#8fd47a" opacity="0.4"/>`).join("")}<circle cx="${w * 0.88}" cy="${h * 0.14}" r="24" fill="#fff3a8" opacity="0.85"/>`;
    case "body": return `<path d="M ${w * 0.8} ${h * 0.34} c -22 -26 -58 2 -30 30 l 30 26 l 30 -26 c 28 -28 -8 -56 -30 -30" fill="#ffb2c8" opacity="0.5"/><circle cx="${w * 0.13}" cy="${h * 0.16}" r="18" fill="#ffd2e0" opacity="0.6"/>`;
    default: return `<circle cx="${w * 0.85}" cy="${h * 0.15}" r="24" fill="#f2c14e" opacity="0.55"/>`;
  }
}
export function genericInquiryScene(topic, options = {}) { return buildWorld("obscure", { ...options, topic: String(topic || options.topic || "your topic"), params: { topic: String(topic || options.topic || "your topic") } }); }
export const genericTopicScene = genericInquiryScene;
export function sceneForTopic(topic, options = {}) {
  const kernel = kernelForTopic(topic);
  if (kernel.id === "obscure") return genericInquiryScene(topic, options);
  return buildWorld(kernel, { ...options, topic: String(topic) });
}
export const worldForTopic = sceneForTopic;

// ---------- world state + pure interactions ----------
const PROP_RANGES = { temperature: [-30, 50], humidity: [0, 100], thickness: [1, 6], lengthUnits: [1, 12], heightRows: [1, 8], rows: [1, 8], denominator: [1, 24], selected: [0, 24], density: [0.1, 1], price: [0, 100000], units: [0, 1000000], unitCost: [0, 100000], fixedCosts: [0, 10000000], distanceM: [0, 10000], timeS: [0.1, 3600], massKg: [0, 1000], speedMps: [0, 200], speedMph: [0, 120], gearRatio: [1, 5], engineRpm: [500, 6000] };
const INT_PROPS = new Set(["thickness", "lengthUnits", "heightRows", "rows", "denominator", "selected", "units"]);
function syncDerived(state) {
  const { kernelId, params } = state; const readout = computeReadout(kernelId, params); state.readout = readout; state.scene.readout = readout; state.scene.params = structuredClone(params);
  const byId = (id) => state.scene.objects.find((o) => o.id === id); const setText = (id, text) => { const o = byId(id); if (o) { o.props = { ...o.props, text }; o.label = o.type === "label" ? text : o.label; } };
  if (kernelId === "maths") { const m = byId("frac-main"); if (m) m.props = { ...m.props, denominator: params.denominator, selected: params.selected }; setText("frac-read", readout.text); setText("frac-equiv", `Equivalent: ${readout.equivalentsText} - same amount, different name`); }
  if (kernelId === "clouds") { const c = byId("weather-controls"); if (c) { c.props = { ...c.props, temperature: params.temperature, humidity: params.humidity, text: `Weather: ${params.temperature}C, ${params.humidity}% moist` }; } for (const id of ["cloud-1", "cloud-2"]) { const o = byId(id); if (o) o.props = { ...o.props, density: id === "cloud-1" ? readout.density : Math.max(0.1, readout.density - 0.2), cloudType: readout.cloudType }; } setText("cloud-read", readout.text); setText("cloud-why", readout.description); }
  if (kernelId === "animals") setText("animal-read", readout.text);
  if (kernelId === "history") setText("hist-read", readout.text);
  if (kernelId === "physics") { const ctl = byId("phys-controls"); if (ctl) { ctl.props = { ...ctl.props, ...params, text: `${params.distanceM} m in ${params.timeS} s` }; } const ch = byId("phys-chart"); if (ch) ch.props = { ...ch.props, values: [{ label: "Speed m/s", value: readout.speed, color: "#2e6b7a" }, { label: "Weight N", value: readout.weightN, color: "#b5762f" }, { label: "Energy J", value: readout.kineticEnergy, color: "#4e7d3a" }], maxValue: Math.max(1, readout.speed, readout.weightN, readout.kineticEnergy) }; setText("phys-read", readout.text); }
  if (kernelId === "coding") setText("code-read", readout.text);
  if (kernelId === "engineering-castle") { const w = byId("castle-wall"); if (w) w.props = { ...w.props, thickness: params.thickness, lengthUnits: params.lengthUnits, heightRows: params.heightRows, rows: params.heightRows }; const ctl = byId("castle-controls"); if (ctl) ctl.props = { ...ctl.props, thickness: params.thickness, text: `Thickness: ${params.thickness} block(s)` }; const d = byId("castle-depth"); if (d) { d.props = { ...d.props, w: Math.max(30, params.thickness * 30) }; d.label = `Depth: ${params.thickness} block(s) thick`; } setText("castle-read", readout.text); }
  if (kernelId === "business") { const ctl = byId("shop-controls"); if (ctl) ctl.props = { ...ctl.props, ...params, text: `Price ${params.price}, units ${params.units}` }; const ch = byId("shop-chart"); if (ch) ch.props = { ...ch.props, values: [{ label: "Revenue", value: readout.revenue, color: "#2e6b7a" }, { label: "Total costs", value: readout.totalCosts, color: "#b5762f" }, { label: "Profit", value: readout.profit, color: readout.profit < 0 ? "#b42318" : "#4e7d3a" }], maxValue: Math.max(1, Math.abs(readout.revenue), Math.abs(readout.totalCosts), Math.abs(readout.profit)) }; setText("shop-read", readout.text); setText("shop-budget", `Break-even: ${readout.breakEvenUnits === Infinity ? "never (margin <= 0)" : `${readout.breakEvenUnits} units`} | margin per unit ${readout.marginPerUnit}`); }
  return state;
}
export function createWorldState(scene, { reducedMotion = false } = {}) {
  const check = validateSceneSpec(scene); if (!check.valid) return { ok: false, error: { code: "INVALID_SCENE", errors: check.errors } };
  const kernelId = scene.kernelId || kernelForTopic(scene.topic).id;
  const params = normalizeParams(kernelId, scene.params || {});
  const state = { scene: structuredClone(scene), kernelId, topic: scene.topic, representation: scene.representation || REPRESENTATIONS[kernelId]?.[0], params, readout: null, selectedId: null, highlightedId: null, hiddenIds: [], reducedMotion: Boolean(reducedMotion), rebuilt: false, rebuildHistory: [], log: [], simulationSupported: scene.simulationSupported !== false };
  syncDerived(state); state.readout = state.scene.readout;
  return { ok: true, state };
}
export const createState = createWorldState;
function asState(input) {
  if (input?.scene && input?.kernelId) return structuredClone(input);
  if (input?.objects) { const r = createWorldState(input); return r.ok ? r.state : null; }
  return null;
}
export function applyInteraction(stateInput, event) {
  const fail = (code, message) => ({ ok: false, error: { code, message } });
  const base = asState(stateInput); const evKind = event?.kind || event?.type || event?.action;
  if (!base || !event || typeof evKind !== "string") return fail("INVALID_EVENT", "applyInteraction needs a world state and an event with a kind.");
  const next = base; // already a fresh clone via asState
  const kind = evKind === "setProp" ? "slider" : evKind;
  let target = event.objectId ? next.scene.objects.find((o) => o.id === event.objectId) : null;
  if (event.objectId && !target) return fail("BAD_REF", `No object "${event.objectId}" in scene.`);
  if (!target) { // deterministic fallback: first object that can serve this kind
    if (kind === "divide") target = next.scene.objects.find((o) => o.props && "denominator" in o.props) || null;
    else if (kind === "slider" || kind === "set-prop") target = next.scene.objects.find((o) => o.props && event.prop in o.props) || next.scene.objects.find((o) => o.actions?.includes("slider")) || null;
    else if (kind === "drag") target = next.scene.objects.find((o) => o.actions?.includes("drag")) || null;
    else target = next.scene.objects.find((o) => o.interactive) || null;
    if (target) event = { ...event, objectId: target.id };
  }
  if (kind === "select" || kind === "click" || kind === "classify") {
    if (!target) return fail("BAD_REF", "select requires objectId.");
    if (!target.interactive) return fail("NOT_INTERACTIVE", `"${target.id}" is not interactive.`);
    next.selectedId = target.id; next.highlightedId = target.id;
    if (target.props && "denominator" in target.props && "selected" in target.props) {
      const n = clampInt(target.props.denominator, 1, 24, 4);
      const explicit = event.selected ?? event.value ?? event.index;
      const sliceIdx = event.sliceIndex ?? event.slice;
      next.params = normalizeParams(next.kernelId, { ...next.params, denominator: n, selected: Number.isFinite(Number(sliceIdx)) ? clampInt(Number(sliceIdx) + 1, 0, n, 0) : Number.isFinite(Number(explicit)) && explicit !== undefined ? clampInt(explicit, 0, n, 0) : (target.props.selected + 1) % (n + 1) });
    }
    if (target.type === "animal") next.params = normalizeParams(next.kernelId, { ...next.params, selectedSpecies: target.props.species });
    if (target.type === "diagram" && target.props?.species) next.params = normalizeParams(next.kernelId, { ...next.params, selectedSpecies: target.props.species });
  } else if (kind === "drag") {
    if (!target) return fail("BAD_REF", "drag requires objectId.");
    if (!target.actions?.includes("drag") && target.type !== "animal") return fail("UNSUPPORTED_ACTION", `"${target.id}" cannot be dragged.`);
    if (!Number.isFinite(event.x) || !Number.isFinite(event.y)) return fail("INVALID_EVENT", "drag requires finite x/y.");
    target.x = clamp(Math.round(event.x), -200, 1200); target.y = clamp(Math.round(event.y), -200, 900); next.selectedId = target.id; next.highlightedId = target.id;
    if (target.type === "animal") next.params = normalizeParams(next.kernelId, { ...next.params, selectedSpecies: target.props.species });
  } else if (kind === "slider" || kind === "set-prop") {
    if (!target) return fail("BAD_REF", "slider requires objectId.");
    const prop = event.prop; if (typeof prop !== "string" || !prop) return fail("INVALID_EVENT", "slider requires prop.");
    if (!Number.isFinite(Number(event.value))) return fail("INVALID_EVENT", "slider requires finite value.");
    const [lo, hi] = Number.isFinite(event.min) && Number.isFinite(event.max) ? [event.min, event.max] : (PROP_RANGES[prop] || [0, 100]);
    const value = INT_PROPS.has(prop) ? clampInt(event.value, lo, hi, lo) : clampNum(event.value, lo, hi, lo);
    target.props = { ...(target.props || {}), [prop]: value };
    const patch = { [prop]: value }; if (prop === "rows") patch.heightRows = value;
    next.params = normalizeParams(next.kernelId, { ...next.params, ...patch });
    next.selectedId = target.id; next.highlightedId = target.id;
  } else if (kind === "divide") {
    if (!target?.props || !("denominator" in target.props)) return fail("UNSUPPORTED_ACTION", "divide needs a fraction object.");
    const d = clampInt(event.denominator ?? event.value ?? target.props.denominator, 1, 24, 4);
    next.params = normalizeParams(next.kernelId, { ...next.params, denominator: d, selected: clampInt(next.params.selected ?? target.props.selected, 0, d, 0) });
    next.selectedId = target.id;
  } else if (kind === "reveal" || kind === "hide" || kind === "highlight") {
    if (kind === "hide" && target && !next.hiddenIds.includes(target.id)) next.hiddenIds.push(target.id);
    if (kind === "reveal" && target) next.hiddenIds = next.hiddenIds.filter((id) => id !== target.id);
    if (kind === "highlight") next.highlightedId = target?.id ?? null;
  } else return fail("UNSUPPORTED_ACTION", `Unknown interaction "${kind}".`);
  syncDerived(next);
  const check = validateSceneSpec(next.scene); if (!check.valid) return { ok: false, error: { code: "INVALID_SCENE", errors: check.errors } };
  next.log = [...(stateInput.log || []), { kind, objectId: event.objectId ?? null, ...(event.prop ? { prop: event.prop, value: event.value } : {}) }];
  next.scene = next.scene; return { ok: true, state: next, readout: next.readout };
}

// ---------- misconception rebuild (different representation, same truth) ----------
export function rebuildScene(stateInput, opts = {}) {
  const base = asState(stateInput); if (!base) return { ok: false, error: { code: "INVALID_STATE", message: "rebuild needs a world state or scene." } };
  if (typeof opts === "string") opts = { misconception: opts };
  const misconception = String(opts.misconception || opts.coded?.misconception || opts.coded?.evidence || opts.reason || opts.code || "misconception");
  const alt = alternativeRepresentation(base.kernelId, base.representation);
  const strategy = base.kernelId === "maths" ? (alt === "bar" ? "switch-pizza-to-bar" : "switch-bar-to-pizza") : base.kernelId === "clouds" ? "isolate-one-stage" : base.kernelId === "animals" ? "sort-by-one-feature" : base.kernelId === "engineering-castle" ? "show-hidden-depth" : base.kernelId === "business" ? "break-revenue-costs-profit-apart" : "worked-inquiry-example";
  const scene = buildWorld(base.kernelId, { topic: base.topic, representation: alt, params: base.params });
  const created = createWorldState(scene); if (!created.ok) return created;
  const next = created.state; next.rebuilt = true; next.rebuiltFrom = base.representation; next.rebuildReason = misconception; next.strategy = strategy;
  next.rebuildHistory = [...(base.rebuildHistory || []), { from: base.representation, to: alt, strategy, misconception }];
  next.log = [...(base.log || []), { kind: "rebuild", objectId: null, strategy }]; next.selectedId = base.selectedId;
  return { ok: true, state: next, scene: next.scene, readout: next.readout, strategy, representation: alt, rebuilt: true };
}
export const rebuildForMisconception = rebuildScene;
export const rebuildOnMisconception = rebuildScene;
export const adaptAfterStruggle = rebuildScene;
export const struggleRebuild = (input) => { const state = input?.state || input?.scene || input; const r = rebuildScene(state, input || {}); return r.ok ? { ...r, decision: "rebuild", scene: r.scene, newInteraction: { kind: "manipulate", prompt: "Try it in this new view - same amount, different representation." } } : r; };
export function applyCodedResponse(stateInput, coded) {
  const code = typeof coded === "string" ? coded : coded?.code;
  if (code !== "misconception") { const s = asState(stateInput); return s ? { ok: true, state: s, rebuilt: false, readout: s.readout } : { ok: false, error: { code: "INVALID_STATE" } }; }
  const r = rebuildScene(stateInput, { misconception: coded?.evidence || "misconception", coded });
  return r.ok ? { ...r, rebuilt: true } : r;
}
export const handleMisconception = applyCodedResponse;
export const onMisconception = applyCodedResponse;

// ---------- SVG rendering (exact geometry for maths, computed chart/wall) ----------
export function slicePath(cx, cy, r, a0, a1) {
  const p = (a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]; const [x0, y0] = p(a0); const [x1, y1] = p(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0; return `M ${cx} ${cy} L ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`;
}
export const fractionSlicePath = slicePath;
// Wrap long scene text into tspans that fit their boxes instead of spilling.
export function wrapLines(text, maxChars = 18) {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  const lines = []; let cur = "";
  for (const w of words) { if (cur && (cur + " " + w).length > maxChars) { lines.push(cur); cur = w; } else cur = cur ? cur + " " + w : w; }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}
export function wrappedText(text, { maxChars = 18, lineH = 13, font = 11.5, cls = "obj-label", weight = "" } = {}) {
  const lines = wrapLines(text, maxChars);
  const y0 = -((lines.length - 1) * lineH) / 2;
  return `<text class="${cls}" text-anchor="middle" font-size="${font}"${weight ? ` font-weight="${weight}"` : ""}>${lines.map((l, i) => `<tspan x="0" y="${(y0 + i * lineH).toFixed(1)}">${esc(l)}</tspan>`).join("")}</text>`;
}
export function chartBarHeight(value, maxValue, height = 160) { const max = Math.max(1, Math.abs(maxValue || 0)); return Math.round((Math.abs(Number(value) || 0) / max) * (height - 40) * 10) / 10; }
export const ANIMAL_SPECIES = ["zebra", "lion", "fox", "frog", "heron"];
export function animalArtwork(species) {
  const sp = String(species || "animal").toLowerCase();
  const shadow = `<ellipse cy="36" rx="52" ry="7" fill="#000000" opacity="0.22"/>`;
  if (sp === "zebra") return `${shadow}<path d="M -46 -2 q -14 14 -8 30" fill="none" stroke="#2b2118" stroke-width="4" stroke-linecap="round"/><g fill="#f3ead2" stroke="#4a4034" stroke-width="1.5"><rect x="-36" y="12" width="6" height="24" rx="2"/><rect x="-18" y="14" width="6" height="24" rx="2"/><rect x="18" y="14" width="6" height="24" rx="2"/><rect x="36" y="12" width="6" height="24" rx="2"/><ellipse rx="47" ry="23"/><polygon points="32,-10 54,-34 68,-27 48,5"/><ellipse cx="62" cy="-28" rx="16" ry="10" transform="rotate(-24 62 -28)"/></g><path d="M -31 -19 q 5 19 0 38 M -13 -22 q 5 22 0 44 M 6 -22 q 5 22 0 44 M 24 -18 q 4 17 1 34" fill="none" stroke="#25211d" stroke-width="6"/><path d="M 42 -17 l 8 9 M 50 -27 l 7 8" stroke="#25211d" stroke-width="4"/><polygon points="37,-16 52,-40 59,-38 46,-9" fill="#25211d"/><path d="M 50 -38 l 4 -10 l 7 8 z" fill="#f3ead2" stroke="#4a4034"/><ellipse cx="72" cy="-23" rx="8" ry="6" fill="#d8c9ae"/><circle cx="65" cy="-30" r="2.5" fill="#1c2b33"/>`;
  if (sp === "lion") return `${shadow}<path d="M -46 -2 q -19 3 -17 -18" fill="none" stroke="#8a5a22" stroke-width="5" stroke-linecap="round"/><circle cx="-64" cy="-22" r="6" fill="#5f3411"/><g fill="#d99a3d" stroke="#6b4218" stroke-width="1.5"><rect x="-36" y="12" width="7" height="24" rx="2"/><rect x="-17" y="14" width="7" height="24" rx="2"/><rect x="15" y="14" width="7" height="24" rx="2"/><rect x="33" y="12" width="7" height="24" rx="2"/><ellipse rx="47" ry="23"/></g><circle cx="48" cy="-17" r="26" fill="#7a4517" stroke="#5f3411" stroke-width="2"/><circle cx="38" cy="-30" r="5" fill="#b5762f" stroke="#5f3411"/><circle cx="60" cy="-30" r="5" fill="#b5762f" stroke="#5f3411"/><circle cx="50" cy="-17" r="16" fill="#e8b566" stroke="#8a5a22"/><ellipse cx="57" cy="-11" rx="8" ry="5" fill="#f2d3a0"/><circle cx="45" cy="-20" r="2.4" fill="#1c2b33"/><path d="M 55 -11 l 4 3 l -5 2" fill="none" stroke="#5f3411" stroke-width="1.5"/>`;
  if (sp === "fox") return `${shadow}<path d="M -40 4 q -34 20 -50 -6 q 24 -20 50 -8 z" fill="#d96f26" stroke="#7a3418" stroke-width="1.5"/><path d="M -90 -2 q 8 13 22 12 q -15 -3 -22 -12" fill="#fff4e6"/><g fill="#7a3d1c"><rect x="-32" y="13" width="6" height="23" rx="2"/><rect x="-14" y="15" width="6" height="23" rx="2"/><rect x="17" y="15" width="6" height="23" rx="2"/><rect x="34" y="13" width="6" height="23" rx="2"/></g><ellipse rx="44" ry="21" fill="#e07f2e" stroke="#7a3418" stroke-width="1.5"/><ellipse cx="27" cy="5" rx="16" ry="12" fill="#fff1dd"/><polygon points="34,-9 57,-23 75,-14 55,3 37,4" fill="#e07f2e" stroke="#7a3418" stroke-width="1.5"/><polygon points="57,-23 83,-15 57,-7" fill="#f4a259" stroke="#7a3418"/><path d="M 37 -13 L 39 -32 L 52 -19 Z" fill="#c95f1e" stroke="#7a3418"/><path d="M 51 -19 L 59 -34 L 66 -17 Z" fill="#c95f1e" stroke="#7a3418"/><circle cx="80" cy="-15" r="3" fill="#201612"/><circle cx="55" cy="-15" r="2.5" fill="#1c2b33"/>`;
  if (sp === "frog") return `${shadow}<ellipse cx="-31" cy="19" rx="20" ry="10" transform="rotate(-18 -31 19)" fill="#4e9b47" stroke="#245c28"/><ellipse cx="31" cy="19" rx="20" ry="10" transform="rotate(18 31 19)" fill="#4e9b47" stroke="#245c28"/><path d="M -12 17 v 15 M 12 17 v 15" stroke="#3e8a3d" stroke-width="6" stroke-linecap="round"/><ellipse cy="3" rx="42" ry="24" fill="#63b957" stroke="#245c28" stroke-width="1.5"/><ellipse cy="10" rx="25" ry="13" fill="#d9efbd" opacity="0.9"/><circle cx="-16" cy="-19" r="9" fill="#63b957" stroke="#245c28"/><circle cx="16" cy="-19" r="9" fill="#63b957" stroke="#245c28"/><circle cx="-16" cy="-19" r="5" fill="#eef8dd"/><circle cx="16" cy="-19" r="5" fill="#eef8dd"/><circle cx="-16" cy="-19" r="2.6" fill="#14240f"/><circle cx="16" cy="-19" r="2.6" fill="#14240f"/><path d="M -18 1 q 18 12 36 0" fill="none" stroke="#245c28" stroke-width="3" stroke-linecap="round"/>`;
  if (sp === "heron") return `${shadow}<path d="M -5 16 v 31 M 11 16 v 31 M -12 47 h 13 M 4 47 h 13" stroke="#44515c" stroke-width="3" stroke-linecap="round"/><ellipse rx="42" ry="18" fill="#b9cbd4" stroke="#425563" stroke-width="1.5"/><ellipse cx="-5" cy="0" rx="25" ry="11" fill="#8fa9b8" stroke="#425563"/><path d="M 29 -5 q 23 -9 15 -27 q -3 -12 9 -18" fill="none" stroke="#b9cbd4" stroke-width="10" stroke-linecap="round"/><path d="M 47 -51 q -8 -8 -15 -6" fill="none" stroke="#425563" stroke-width="3" stroke-linecap="round"/><ellipse cx="56" cy="-49" rx="11" ry="7" transform="rotate(-14 56 -49)" fill="#c7d7df" stroke="#425563"/><polygon points="65,-51 94,-45 65,-42" fill="#e0a32e" stroke="#8a5f10"/><circle cx="58" cy="-50" r="2.2" fill="#1c2b33"/>`;
  return `${shadow}<g fill="${"#b5762f"}" stroke="#5f3d16"><rect x="-30" y="10" width="6" height="22"/><rect x="22" y="10" width="6" height="22"/><ellipse rx="38" ry="19"/><circle cx="29" cy="-11" r="12"/></g><circle cx="32" cy="-12" r="2.2" fill="#1c2b33"/>`;
}
export function objectSVG(o, { highlight = false, hidden = false } = {}) {
  if (hidden) return "";
  const t = `translate(${o.x} ${o.y}) rotate(${o.rotation || 0}) scale(${o.scale || 1})`; const hl = highlight ? ' stroke="#b3542e" stroke-width="3.5"' : "";
  const fill = esc(o.appearance?.fill || "#888"); const p = o.props || {};
  switch (o.type) {
    case "fraction-pizza": { const n = clampInt(p.denominator, 1, 24, 4); const sel = clampInt(p.selected, 0, n, 0); const r = p.radius || 90; let s = `<g transform="${t}" data-obj="${esc(o.id)}" filter="url(#ludus-soft)"><circle r="${r + 12}" fill="#2e2015"/><circle r="${r + 12}" fill="none" stroke="#c9a45c" stroke-width="2" stroke-opacity="0.7"/>`; for (let i = 0; i < n; i++) { const a0 = (i / n) * Math.PI * 2 - Math.PI / 2; const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2; s += `<path d="${slicePath(0, 0, r, a0, a1)}" fill="${i < sel ? "url(#ludus-pizza-sel)" : "url(#ludus-pizza)"}" stroke="#7a3418" stroke-width="2" data-slice="${i}"${i < sel ? ' data-selected="1"' : ""}/>`; } return `${s}<circle r="11" fill="#8a3a1a" stroke="#f2b25c" stroke-width="1.5"/><text y="4" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">${sel}/${n}</text><text class="obj-label" y="${r + 28}" text-anchor="middle">${esc(o.label)}</text></g>`; }
    case "fraction-bar": { const n = clampInt(p.denominator, 1, 24, 4); const sel = clampInt(p.selected, 0, n, 0); const w = p.w || 320; const h = p.h || 44; const seg = w / n; let s = `<g transform="${t}" data-obj="${esc(o.id)}" filter="url(#ludus-soft)"><rect x="${-w / 2 - 6}" y="${-h / 2 - 6}" width="${w + 12}" height="${h + 12}" rx="10" fill="#141a1e"/>`; for (let i = 0; i < n; i++) s += `<rect x="${(-w / 2 + i * seg).toFixed(1)}" y="${-h / 2}" width="${seg.toFixed(1)}" height="${h}" rx="3" fill="${i < sel ? "url(#ludus-bar-sel)" : "#46525c"}" stroke="#0d1114"/>`; return `${s}<text y="${h / 2 + 22}" text-anchor="middle" font-weight="700" fill="#f0ead9">${sel}/${n}</text><text class="obj-label" y="${-h / 2 - 16}" text-anchor="middle">${esc(o.label)}</text></g>`; }
    case "cloud": { const d = clampNum(p.density, 0.1, 1, 0.5); const op = (0.45 + d * 0.55).toFixed(2); const rain = d >= 0.7 ? `<g stroke="#7fb2d9" stroke-width="2.5" stroke-linecap="round" opacity="0.8"><line x1="-30" y1="30" x2="-36" y2="46"/><line x1="0" y1="34" x2="-6" y2="52"/><line x1="30" y1="30" x2="24" y2="46"/></g>` : ""; return `<g transform="${t}" data-obj="${esc(o.id)}" opacity="${op}" filter="url(#ludus-soft)"><ellipse rx="${46 + d * 26}" ry="24" fill="url(#ludus-cloud)" stroke="#9db4c2"/><ellipse cx="-28" cy="6" rx="30" ry="17" fill="url(#ludus-cloud)"/><ellipse cx="28" cy="6" rx="32" ry="18" fill="url(#ludus-cloud)"/><ellipse cx="-12" cy="-10" rx="18" ry="8" fill="#ffffff" opacity="0.65"/>${rain}<text class="obj-label" y="-46" text-anchor="middle">${esc(o.label)}</text></g>`; }
    case "animal": { const rawSpecies = String(p.species || "animal").toLowerCase(); const sp = esc(rawSpecies); const showLabel = String(o.label || "").toLowerCase() !== rawSpecies; return `<g transform="${t}" data-obj="${esc(o.id)}" data-species="${sp}" class="animal-art animal-${sp}">${animalArtwork(rawSpecies)}<text y="58" text-anchor="middle" font-weight="700" fill="#ffffff" fill-opacity="0.95">${sp}</text>${showLabel ? `<text class="obj-label" y="-62" text-anchor="middle">${esc(o.label)}</text>` : ""}</g>`; }
    case "wall": { const rows = clampInt(p.heightRows ?? p.rows, 1, 8, 3); const thick = clampInt(p.thickness, 1, 6, 1); const len = clampInt(p.lengthUnits, 1, 12, 6); const dx = thick * 10; const unit = 280 / len; let bricks = ""; for (let r2 = 0; r2 < rows; r2++) for (let c = 0; c < len; c++) bricks += `<rect x="${(-140 + c * unit + (r2 % 2) * (unit / 2) % unit).toFixed(1)}" y="${-r2 * 30}" width="${(unit - 4).toFixed(1)}" height="26" fill="${fill}" stroke="#3d2010" stroke-width="1.5" rx="3" fill-opacity="${(r2 + c) % 2 ? "0.88" : "1"}"/>`; const depth = `<path d="M 105 0 L ${105 + dx} ${-dx} L ${105 + dx} ${-rows * 30 - dx + 30} L 105 ${-rows * 30 + 30} Z" fill="#a05a2c" opacity="0.8" stroke="#3d2010" data-thickness="${thick}"/>`; const cap = `<rect x="-178" y="${-rows * 30 - 8}" width="286" height="9" rx="3" fill="#5a4632" stroke="#2e2015"/>`; return `<g transform="${t}" data-obj="${esc(o.id)}" data-thickness="${thick}" data-face-area="${len * rows}" data-volume="${len * rows * thick}" filter="url(#ludus-soft)"><ellipse cy="8" rx="190" ry="9" fill="#000000" opacity="0.25"/>${depth}${bricks}${cap}<text class="obj-label" y="30" text-anchor="middle">${esc(o.label)}</text></g>`; }
    case "chart": { const vals = p.values || []; const w = p.width || 300; const h = p.height || 160; const max = p.maxValue || Math.max(1, ...vals.map((v) => Math.abs(v.value))); const slot = vals.length ? w / vals.length : w; const baseline = 50; let s = `<g transform="${t}" data-obj="${esc(o.id)}"><rect x="${-w / 2 - 14}" y="${baseline - h + 26}" width="${w + 28}" height="${h}" rx="10" fill="#10151a" fill-opacity="0.72"/><line x1="${-w / 2}" y1="${baseline - 60}" x2="${w / 2}" y2="${baseline - 60}" stroke="#ffffff" stroke-opacity="0.14"/><line x1="${-w / 2}" y1="${baseline - 110}" x2="${w / 2}" y2="${baseline - 110}" stroke="#ffffff" stroke-opacity="0.14"/><line x1="${-w / 2}" y1="${baseline}" x2="${w / 2}" y2="${baseline}" stroke="#f0ead9" stroke-width="2"/>`; vals.forEach((v, i) => { const bh = chartBarHeight(v.value, max, h); const bw = slot * 0.6; const x = -w / 2 + i * slot + (slot - bw) / 2; const y = v.value >= 0 ? baseline - bh : baseline; s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${esc(v.color || "#2e6b7a")}" stroke="#0d1114" data-label="${esc(v.label)}" data-value="${v.value}" data-bar-height="${bh}"/><text x="${(x + bw / 2).toFixed(1)}" y="${baseline + 18}" text-anchor="middle" font-size="11" fill="#f0ead9">${esc(v.label)} ${v.value}</text>`; }); return `${s}<text class="obj-label" y="${baseline + 40}" text-anchor="middle">${esc(o.label)}</text></g>`; }
    case "diagram": { const lines = wrapLines(p.text || o.label, 16); const bw = Math.min(200, Math.max(124, Math.max(...lines.map((l) => l.length)) * 7.4 + 22)); const bh = lines.length * 13 + 22; return `<g transform="${t}" data-obj="${esc(o.id)}"><rect x="${(-bw / 2).toFixed(1)}" y="${(-bh / 2).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="10" fill="${fill}" stroke="#7d97a5"/>${wrappedText(p.text || o.label, { maxChars: 16, font: 11.5 })}</g>`; }
    case "sequence": { const steps = p.steps || []; const midX = steps.length ? ((steps.length - 1) * 120) / 2 : 0; return `<g transform="${t}" data-obj="${esc(o.id)}">${steps.map((s2, i) => `<g transform="translate(${i * 120} 0)"><rect x="-52" y="-20" width="104" height="40" rx="8" fill="${fill}" opacity="${0.35 + i * 0.2}"/><text text-anchor="middle" dy="4" font-size="11.5">${esc(s2)}</text>${i < steps.length - 1 ? '<text x="60" dy="4">→</text>' : ""}</g>`).join("")}<text class="obj-label" x="${midX}" y="-34" text-anchor="middle">${esc(o.label)}</text></g>`; }
    case "timeline": return `<g transform="${t}" data-obj="${esc(o.id)}"><line x1="-260" y1="0" x2="260" y2="0" stroke="#1c2b33" stroke-width="2.5"/>${(p.events || []).map((e, i, a) => `<g transform="translate(${-260 + (a.length > 1 ? i * (520 / (a.length - 1)) : 0)} 0)"><circle r="6" fill="#b3542e"/><text y="-14" text-anchor="middle" font-size="11.5">${esc(e)}</text></g>`).join("")}<text class="obj-label" y="26" text-anchor="middle">${esc(o.label)}</text></g>`;
    case "line": return `<g transform="${t}" data-obj="${esc(o.id)}"><line x1="0" y1="0" x2="${p.x2 || 100}" y2="${p.y2 || 0}" stroke="${fill}" stroke-width="2.5"/><text class="obj-label" x="${(p.x2 || 100) / 2}" y="20" text-anchor="middle">${esc(o.label)}</text></g>`;
    case "label": return `<g transform="${t}" data-obj="${esc(o.id)}">${wrappedText(p.text || o.label, { maxChars: 58, lineH: 15, font: 12.5, weight: "600" })}</g>`;
    case "shape": default: { const w = p.w || 60; const h = p.h || 40; const cap = `<text class="obj-label" y="${h / 2 + 18}" text-anchor="middle">${esc(o.label)}</text>`; if (p.shape === "circle") return `<g transform="${t}" data-obj="${esc(o.id)}"><circle r="${Math.min(w, h) / 2}" fill="${fill}"${hl}/>${cap}</g>`; if (p.shape === "triangle") return `<g transform="${t}" data-obj="${esc(o.id)}"><path d="M 0 ${-h / 2} L ${w / 2} ${h / 2} L ${-w / 2} ${h / 2} Z" fill="${fill}"${hl}/>${cap}</g>`; return `<g transform="${t}" data-obj="${esc(o.id)}"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="${fill}" rx="5"${hl}/>${cap}</g>`; }
  }
}
const SCENE_THEMES = {
  maths: { sky: ["#3a2a1a", "#211710"], ground: "#171008", glow: "#e8a04c", grid: "#ffffff" },
  clouds: { sky: ["#6f9fbc", "#d9e9f1"], ground: "#8aa5b5", glow: "#fff3c4", grid: "#ffffff" },
  animals: { sky: ["#d9a95c", "#f2ddac"], ground: "#7a6a35", glow: "#fff0b8", grid: "#ffffff" },
  "engineering-castle": { sky: ["#4a4148", "#241f26"], ground: "#17141a", glow: "#e8b04c", grid: "#ffffff" },
  business: { sky: ["#5c4030", "#2a1c12"], ground: "#1c120a", glow: "#f2c14e", grid: "#ffffff" },
  history: { sky: ["#6b543a", "#3a2c1c"], ground: "#241a10", glow: "#e8c98a", grid: "#ffffff" },
  physics: { sky: ["#274b5c", "#12242e"], ground: "#0d181e", glow: "#8fd4e8", grid: "#ffffff" },
  coding: { sky: ["#1d2b26", "#0d1512"], ground: "#0a0f0d", glow: "#7fe0b2", grid: "#ffffff" },
  obscure: { sky: ["#31424e", "#18222a"], ground: "#10181e", glow: "#9fc6d8", grid: "#ffffff" },
  space: { sky: ["#0b1030", "#05070f"], ground: "#0a0d18", glow: "#a8c8ff", grid: "#ffffff" },
  ocean: { sky: ["#1c5a72", "#0d2f42"], ground: "#08222f", glow: "#9fe4ff", grid: "#ffffff" },
  volcano: { sky: ["#5c2e20", "#2a130c"], ground: "#1c0d08", glow: "#ff9a5c", grid: "#ffffff" },
  chemistry: { sky: ["#2c4a3e", "#14231d"], ground: "#0e1812", glow: "#a2ffc8", grid: "#ffffff" },
  code: { sky: ["#1d2b26", "#0d1512"], ground: "#0a0f0d", glow: "#7fe0b2", grid: "#ffffff" },
  ancient: { sky: ["#6b543a", "#3a2c1c"], ground: "#241a10", glow: "#e8c98a", grid: "#ffffff" },
  garden: { sky: ["#3f6b35", "#1e3318"], ground: "#14240f", glow: "#d2f2a8", grid: "#ffffff" },
  body: { sky: ["#5c3548", "#2a1822"], ground: "#1c1016", glow: "#ffb2c8", grid: "#ffffff" },
};
export function renderSceneToSVG(sceneOrState, opts = {}) {
  const scene = sceneOrState?.scene && sceneOrState?.kernelId ? sceneOrState.scene : sceneOrState;
  const highlightId = opts.highlightId ?? (sceneOrState?.highlightedId || null); const hiddenIds = opts.hiddenIds ?? (sceneOrState?.hiddenIds || []);
  const check = validateSceneSpec(scene); const w = scene?.viewport?.w || 800; const h = scene?.viewport?.h || 450; const zoom = scene?.viewport?.zoom || 1;
  if (!check.valid) return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Invalid scene"><rect width="100%" height="100%" fill="#2a1712"/><text x="24" y="44" font-weight="700" fill="#f0b9a8">Scene could not be built</text><text x="24" y="70" fill="#e8a04c">${esc(check.errors[0]?.message || "Invalid scene spec")}</text></svg>`;
  const hidden = new Set(hiddenIds); const body = scene.objects.map((o) => objectSVG(o, { highlight: o.id === highlightId, hidden: hidden.has(o.id) })).join("");
  const theme = SCENE_THEMES[scene.theme] || SCENE_THEMES[scene.kernelId] || SCENE_THEMES.obscure;
  const defs = `<defs>
    <linearGradient id="ludus-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${theme.sky[0]}"/><stop offset="1" stop-color="${theme.sky[1]}"/></linearGradient>
    <radialGradient id="ludus-glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${theme.glow}" stop-opacity="0.55"/><stop offset="1" stop-color="${theme.glow}" stop-opacity="0"/></radialGradient>
    <linearGradient id="ludus-pizza-sel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2b25c"/><stop offset="1" stop-color="#d97f2e"/></linearGradient>
    <linearGradient id="ludus-pizza" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7e3b0"/><stop offset="1" stop-color="#ecd194"/></linearGradient>
    <linearGradient id="ludus-cloud" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c7d7e2"/></linearGradient>
    <linearGradient id="ludus-bar-sel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4aa3b8"/><stop offset="1" stop-color="#2e6b7a"/></linearGradient>
    <filter id="ludus-soft" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000000" flood-opacity="0.35"/></filter>
  </defs>`;
  const backdrop = `<rect width="100%" height="100%" fill="url(#ludus-sky)"/><circle cx="${w * 0.82}" cy="${h * 0.16}" r="${h * 0.42}" fill="url(#ludus-glow)"/>${scene.theme ? themeBackdrop(scene.theme, w, h) : ""}<rect y="${h * 0.8}" width="100%" height="${h * 0.2}" fill="${theme.ground}" opacity="0.85"/><line x1="0" y1="${h * 0.8}" x2="${w}" y2="${h * 0.8}" stroke="${theme.glow}" stroke-opacity="0.35" stroke-width="1.5"/><text x="20" y="30" font-size="15" font-weight="700" fill="#ffffff" fill-opacity="0.92">${esc(scene.title || "")}</text>`;
  const prof = scene.professor && !opts.hideProfessor ? `<g transform="translate(${scene.professor.x} ${scene.professor.y})" data-professor="1"><ellipse cy="18" rx="26" ry="6" fill="#000000" opacity="0.25"/><circle cy="-52" r="16" fill="#e8c39a" stroke="#3a2e1e"/><rect x="-18" y="-36" width="36" height="52" rx="6" fill="#3a2e1e"/><rect x="-3" y="-36" width="6" height="52" fill="#c9a45c"/><text y="34" text-anchor="middle" font-size="11" fill="#ffffff" fill-opacity="0.85">Professor D</text></g>` : "";
  const readoutText = scene.readout?.text ? `<text x="400" y="438" text-anchor="middle" font-size="12" fill="#ffffff" fill-opacity="0.9" data-readout="1">${esc(scene.readout.text)}</text>` : "";
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(scene.title)}" class="world-svg" data-scene="${esc(scene.id)}" data-kernel="${esc(scene.kernelId || "")}" data-theme="${esc(scene.theme || "")}" data-representation="${esc(scene.representation || "")}">${defs}${backdrop}<g transform="translate(${w / 2} ${h / 2}) scale(${zoom}) translate(${-w / 2} ${-h / 2})">${body}${prof}</g>${readoutText}</svg>`;
}
export const renderSVG = renderSceneToSVG;
export const renderToSVG = renderSceneToSVG;
export const renderWorld = renderSceneToSVG;
export default { composeScene, buildWorld, sceneForTopic, genericTopicScene, createWorldState, applyInteraction, rebuildScene, applyCodedResponse, renderSceneToSVG, validateSceneSpec, computeReadout, PRIMITIVE_TYPES };




