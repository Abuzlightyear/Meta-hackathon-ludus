// GOLD COPY of src/world-objects.js @ sha256:59e19ed7ccfb81da — do not edit without re-syncing provenance. See public/assets provenance + docs/PLAN.md §2.2.
// world-objects@1.0.0 — reusable typed object factories (procedural-first).
// Each factory returns a full object spec: position/scale/appearance/label/actions/interactive/purpose.
// No per-lesson pages: new topics compose these primitives via the Scene Director.
let _n = 0;
const uid = (p) => `${p}-${++_n}`;

function base(id, type, x, y, fill, label, purpose, extra = {}) {
  return {
    id: id || uid(type), type, x, y, scale: 1, rotation: 0,
    appearance: { fill, stroke: "#3a2e1e", label },
    label, actions: ["none"], interactive: false, purpose, props: {},
    ...extra,
  };
}

export function createShape({ id, x = 0, y = 0, fill = "#8c6a2f", label = "Shape", purpose = "Show a geometric form", shape = "rect", w = 60, h = 40 } = {}) {
  const o = base(id, "shape", x, y, fill, label, purpose);
  o.props = { shape, w, h };
  return o;
}
export function createLabel({ id, x = 0, y = 0, text = "Label", purpose = "Name a part of the scene" } = {}) {
  const o = base(id, "label", x, y, "#1c2b33", text, purpose);
  o.appearance = { fill: "#1c2b33", stroke: "none", label: text };
  o.props = { text };
  return o;
}
export function createLine({ id, x = 0, y = 0, x2 = 100, y2 = 0, label = "Line", purpose = "Connect or measure between two points" } = {}) {
  const o = base(id, "line", x, y, "#5a4632", label, purpose);
  o.props = { x2, y2 };
  return o;
}
export function createInstrument({ id, x = 0, y = 0, kind = "ruler", label = "Ruler", purpose = "Measure a quantity in the scene" } = {}) {
  const o = base(id, "instrument", x, y, "#d9c9a3", label, purpose);
  o.props = { kind };
  o.interactive = true; o.actions = ["measure"];
  return o;
}

// --- Math manipulatives ---
export function createFractionPizza({ id, x = 200, y = 200, denominator = 4, selected = 1, label, purpose } = {}) {
  const o = base(id, "fraction-pizza", x, y, "#c05a2e", label || `Pizza in ${denominator} equal parts`,
    purpose || "Show equal parts of a whole and select a fraction");
  o.props = { denominator, selected, radius: 90 };
  o.interactive = true; o.actions = ["select-slice", "divide"];
  return o;
}
export function createFractionBar({ id, x = 100, y = 300, denominator = 4, selected = 1, label, purpose } = {}) {
  const o = base(id, "fraction-bar", x, y, "#2e6b7a", label || `Bar in ${denominator} equal parts`,
    purpose || "Compare fractions on a bar model (alternative perspective)");
  o.props = { denominator, selected, w: 320, h: 44 };
  o.interactive = true; o.actions = ["select-slice", "divide"];
  return o;
}
export function createNumberLine({ id, x = 80, y = 340, min = 0, max = 1, label = "Number line 0 to 1", purpose = "Place fractions on a number line" } = {}) {
  const o = base(id, "number-line", x, y, "#1c2b33", label, purpose);
  o.props = { min, max };
  o.interactive = true; o.actions = ["place"];
  return o;
}

// --- Science objects & processes ---
export function createCloud({ id, x = 400, y = 90, density = 0.5, label = "Cloud", purpose = "Show condensed water vapour as a cloud" } = {}) {
  const o = base(id, "cloud", x, y, "#e8edf0", label, purpose);
  o.props = { density };
  o.interactive = true; o.actions = ["observe"];
  return o;
}
export function createSun({ id, x = 90, y = 70, label = "Sun", purpose = "Provide heat that drives evaporation" } = {}) {
  return base(id, "sun", x, y, "#e3a723", label, purpose);
}
export function createSea({ id, x = 400, y = 360, label = "Sea", purpose = "Water source for evaporation" } = {}) {
  const o = base(id, "sea", x, y, "#3f7d96", label, purpose);
  o.props = { w: 760, h: 70 };
  return o;
}
export function createPlant({ id, x = 120, y = 320, label = "Plant", purpose = "Show a living plant in its habitat" } = {}) {
  const o = base(id, "plant", x, y, "#4e7d3a", label, purpose);
  o.interactive = true; o.actions = ["observe"];
  return o;
}
export function createAnimal({ id, x = 300, y = 300, species = "fox", habitat = "forest", label, purpose } = {}) {
  const o = base(id, "animal", x, y, "#b5762f", label || species, purpose || `Show a ${species} and its features in the ${habitat}`);
  o.props = { species, habitat, features: [] };
  o.interactive = true; o.actions = ["observe", "classify"];
  return o;
}
export function createHabitat({ id, x = 400, y = 220, kind = "savanna", label, purpose } = {}) {
  const o = base(id, "habitat", x, y, "#ddd3a8", label || `${kind} habitat`, purpose || `Provide the ${kind} setting where animals live`);
  o.props = { kind, w: 760, h: 380 };
  return o;
}
export function createTree({ id, x = 640, y = 250, label = "Tree", purpose = "Provide shelter and food in the habitat" } = {}) {
  const o = base(id, "tree", x, y, "#5d7d3c", label, purpose);
  o.interactive = true; o.actions = ["observe"];
  return o;
}

// --- Architecture / engineering (LUDUS Academy + structures) ---
export function createColumn({ id, x = 60, y = 200, label = "Column", purpose = "Support the academy roof (Roman architecture)" } = {}) {
  const o = base(id, "column", x, y, "#e6e0d0", label, purpose);
  o.props = { h: 260, w: 34 };
  return o;
}
export function createArch({ id, x = 400, y = 110, label = "Arch", purpose = "Span an opening and carry load to the columns" } = {}) {
  const o = base(id, "arch", x, y, "#d8cfb8", label, purpose);
  o.props = { w: 300, h: 90 };
  return o;
}
export function createDesk({ id, x = 240, y = 340, label = "Desk", purpose = "Learner workspace in the Living Classroom" } = {}) {
  const o = base(id, "desk", x, y, "#8a5a33", label, purpose);
  o.props = { w: 110, h: 40 };
  return o;
}
export function createMap({ id, x = 560, y = 130, label = "World map", purpose = "Show that any topic can be explored from the academy" } = {}) {
  const o = base(id, "map", x, y, "#c9b489", label, purpose);
  o.props = { w: 150, h: 95 };
  return o;
}
export function createBlock({ id, x = 200, y = 340, w = 70, h = 30, label = "Block", purpose = "Place to build a wall or structure" } = {}) {
  const o = base(id, "block", x, y, "#b3542e", label, purpose);
  o.props = { w, h, placed: false };
  o.interactive = true; o.actions = ["place", "drag"];
  return o;
}
export function createBeam({ id, x = 400, y = 200, w = 260, label = "Beam", purpose = "Span between supports; the design is tested under load" } = {}) {
  const o = base(id, "beam", x, y, "#8a5a33", label, purpose);
  o.props = { w, h: 18 };
  o.interactive = true; o.actions = ["place", "test-design"];
  return o;
}
export function createWall({ id, x = 400, y = 300, rows = 3, label = "Wall", purpose = "A structure the learner designs and tests" } = {}) {
  const o = base(id, "wall", x, y, "#a85f3a", label, purpose);
  o.props = { rows };
  o.interactive = true; o.actions = ["place", "test-design"];
  return o;
}

// --- Diagrams / timelines / sequences ---
export function createTimeline({ id, x = 80, y = 380, events = [], label = "Timeline", purpose = "Order events in time" } = {}) {
  const o = base(id, "timeline", x, y, "#1c2b33", label, purpose);
  o.props = { events };
  o.interactive = true; o.actions = ["place"];
  return o;
}
export function createSequence({ id, x = 80, y = 120, steps = [], label = "Sequence", purpose = "Show steps in order (a process)" } = {}) {
  const o = base(id, "sequence", x, y, "#8c6a2f", label, purpose);
  o.props = { steps };
  o.interactive = true; o.actions = ["observe"];
  return o;
}
export function createDiagramNode({ id, x = 200, y = 150, text = "Idea", label, purpose } = {}) {
  const o = base(id, "diagram-node", x, y, "#dce5ea", label || text, purpose || "Hold one idea in a diagram");
  o.props = { text };
  o.interactive = true; o.actions = ["select"];
  return o;
}

// --- Imported / AI assets (authorised only; provenance enforced by asset-manager) ---
export function createImportedAsset({ id, x = 0, y = 0, assetId, label = "Imported image", purpose = "Illustrate the scene (never the source of maths truth)" } = {}) {
  const o = base(id, "imported-asset", x, y, "#cccccc", label, purpose);
  o.props = { assetId: assetId || null };
  return o;
}

export function createGroup({ id, label = "Group", children = [], x = 0, y = 0, purpose = "Combine objects into a reusable combo" } = {}) {
  const o = base(id, "group", x, y, "#ffffff", label, purpose);
  o.props = { children };
  return o;
}
