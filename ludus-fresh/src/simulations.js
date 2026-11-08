// GOLD COPY of src/simulations.js @ sha256:87df5e34c3295bc2 — do not edit without re-syncing provenance. See public/assets provenance + docs/PLAN.md §2.2.
// world-simulations@1.0.0 — demo simulations composed from primitives (not limits).
// Each builder returns a validated SceneSpec. Truth is computed (fractions, cycle
// stages, classification), never read off an image. New topics reuse the same objects.
import { composeScene } from "./world/engine.js";
function createSceneSpec(spec){ const r=composeScene(spec); if(!r.ok) throw new Error("Invalid scene: "+JSON.stringify(r.error)); return r.scene; }
import {
  createFractionPizza, createFractionBar, createNumberLine, createCloud, createSun, createSea,
  createAnimal, createHabitat, createTree, createPlant, createBlock, createBeam, createWall,
  createColumn, createArch, createDesk, createMap, createSequence, createLabel,
  createShape, createDiagramNode, createTimeline,
} from "./world-objects.js";

export const WATER_CYCLE_STAGES = ["evaporation", "condensation", "cloud-formation", "precipitation"];

export function academyScene() {
  return createSceneSpec({
    id: "academy-intro", topic: "welcome", title: "LUDUS Academy — Living Classroom",
    objects: [
      createColumn({ id: "col-left", x: 70, y: 360 }),
      createColumn({ id: "col-right", x: 730, y: 360 }),
      createArch({ id: "arch-top", x: 400, y: 92 }),
      createMap({ id: "world-map", x: 570, y: 150 }),
      createDesk({ id: "desk-1", x: 250, y: 356 }),
      createDesk({ id: "desk-2", x: 360, y: 356 }),
      createLabel({ id: "academy-title", x: 400, y: 52, text: "LUDUS ACADEMY", purpose: "Name the Living Classroom" }),
      createLabel({ id: "academy-sub", x: 400, y: 402, text: "Choose any topic — the room becomes its world.", purpose: "Invite the learner to begin" }),
    ],
    professor: { x: 150, y: 356, gesture: "present" },
    interactions: [{ kind: "welcome", prompt: "What would you like to learn today?" }],
  });
}

// Computed fraction truth (never read off an image): live state + equivalence.
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
export function fractionState(denominator, selected) {
  const d = Math.max(1, Math.min(24, Math.round(Number(denominator) || 4)));
  const s = Math.max(0, Math.min(d, Math.round(Number(selected) || 0)));
  const g = gcd(s, d);
  const simplified = { numerator: s / g, denominator: d / g };
  const equivalents = [1, 2, 3].map((k) => ({ numerator: s * k, denominator: d * k, value: d ? (s * k) / (d * k) : 0 }));
  return { numerator: s, denominator: d, selected: s, value: s / d, decimal: Math.round((s / d) * 1000) / 1000, simplified, equivalents, display: `${s}/${d}` };
}
export function fractionFromScene(scene) {
  const o = (scene?.objects || []).find((x) => x.props && "denominator" in x.props);
  return o ? fractionState(o.props.denominator, o.props.selected) : null;
}
export function fractionsScene({ denominator = 4, selected = 1, model = "pizza" } = {}) {
  const st = fractionState(denominator, selected);
  const manipulative = model === "bar"
    ? createFractionBar({ id: "frac-main", x: 400, y: 185, denominator: st.denominator, selected: st.numerator })
    : createFractionPizza({ id: "frac-main", x: 400, y: 195, denominator: st.denominator, selected: st.numerator });
  const equivText = st.equivalents.map((e) => `${e.numerator}/${e.denominator}`).join(" = ");
  const scene = createSceneSpec({
    id: "fractions-pizza", topic: "fractions", title: "Fractions — equal parts of a whole",
    objects: [
      manipulative,
      createNumberLine({ id: "frac-line", x: 400, y: 348 }),
      createLabel({ id: "frac-read", x: 400, y: 66, text: `${st.numerator} out of ${st.denominator} equal parts = ${st.display} (${st.decimal})`, purpose: "Read the selected fraction aloud (live, computed)" }),
      createLabel({ id: "frac-equiv", x: 400, y: 92, text: `Equivalent: ${equivText} — same amount, different name`, purpose: "Show equivalent fractions name the same amount" }),
    ],
    professor: { x: 110, y: 350, gesture: "point" },
    interactions: [
      { kind: "manipulate", objectId: "frac-main", prompt: `Divide into ${st.denominator} equal parts, then select ${st.numerator}.` },
      { kind: "observe", prompt: "Which is bigger, 1/2 or 1/4? Fewer, bigger slices win." },
    ],
  });
  scene.fraction = st; // computed state carried with the scene (accurate, not drawn)
  return scene;
}
// Equivalence is computed, not drawn: same amount, different denominator.
export function fractionEquivalence(denominator) {
  return [1, 2, 3].map((k) => ({ numerator: k, denominator: denominator * k, value: k / (denominator * k) }));
}

// Cloud formation is computed from manipulable conditions (temperature + moisture).
export function cloudTypeFor({ temperature = 24, humidity = 60 } = {}) {
  const t = Number(temperature), h = Number(humidity);
  const stage = waterCycleStage({ temperature: t, humidity: h });
  let cloudType, description;
  if (h < 25) { cloudType = "clear sky"; description = "Too dry for clouds: water evaporates but little condenses."; }
  else if (h < 45) { cloudType = "cumulus (small, puffy)"; description = "Some vapour condenses into small, fair-weather cumulus."; }
  else if (h < 75) { cloudType = t <= 2 ? "stratus (low, flat, grey)" : "cumulus growing into stratocumulus"; description = "Moist air condenses into a growing cloud layer."; }
  else { cloudType = "nimbostratus (dark rain cloud)"; description = "Saturated air: droplets join, get heavy and fall as precipitation."; }
  return { stage, cloudType, description, temperature: t, humidity: h, density: Math.max(0.1, Math.min(1, h / 100)) };
}
export function cloudsScene({ temperature = 24, humidity = 60 } = {}) {
  const info = cloudTypeFor({ temperature, humidity });
  const density = info.density;
  const c1 = createCloud({ id: "cloud-1", x: 330, y: 96, density });
  c1.props = { ...c1.props, cloudType: info.cloudType };
  const c2 = createCloud({ id: "cloud-2", x: 520, y: 76, density: Math.max(0.1, density - 0.2) });
  c2.props = { ...c2.props, cloudType: info.cloudType };
  const controls = createDiagramNode({ id: "weather-controls", x: 640, y: 300, text: `Weather: ${temperature}°C, ${humidity}% moist`, purpose: "Student controls for temperature and moisture that change cloud formation" });
  controls.props = { ...controls.props, temperature, humidity };
  controls.interactive = true;
  const scene = createSceneSpec({
    id: "clouds-water-cycle", topic: "clouds", title: "Clouds — the water cycle in the sky",
    objects: [
      createSun({ id: "sun-1", x: 90, y: 74 }),
      c1, c2,
      createSea({ id: "sea-1", x: 400, y: 386 }),
      createSequence({ id: "cycle-seq", x: 90, y: 288, steps: ["Evaporate", "Condense", "Form cloud", "Rain"], purpose: "Show the water cycle as an ordered process" }),
      createLabel({ id: "cloud-cond", x: 400, y: 160, text: `Now: ${info.stage} — ${info.cloudType} (${temperature}°C, ${humidity}%)`, purpose: "Name the current cycle stage and cloud type from the conditions" }),
      createLabel({ id: "cloud-why", x: 400, y: 186, text: info.description, purpose: "Explain why this formation appears (evaporation and condensation)" }),
      controls,
    ],
    professor: { x: 120, y: 338, gesture: "demonstrate" },
    interactions: [
      { kind: "manipulate", objectId: "weather-controls", prompt: "Change temperature and moisture: warm + moist grows clouds; dry air clears them." },
      { kind: "observe", prompt: "Where did the cloud's water come from? Trace it back to the sea (evaporation, then condensation)." },
    ],
  });
  scene.weather = info; // computed conditions carried with the scene
  return scene;
}
// Recompute a clouds scene after the student changes temperature/moisture (through the composer).
export function cloudsSceneAfterChange(scene, { temperature, humidity } = {}) {
  const cur = scene?.weather || {};
  return cloudsScene({ temperature: temperature ?? cur.temperature ?? 24, humidity: humidity ?? cur.humidity ?? 60 });
}
export function waterCycleStage({ temperature, humidity }) {
  if (humidity >= 75) return "precipitation";
  if (humidity >= 45) return "cloud-formation";
  return temperature >= 20 ? "evaporation" : "condensation";
}

export function animalsScene({ habitatKind = "savanna" } = {}) {
  return createSceneSpec({
    id: "animals-habitats", topic: "animals", title: "Animals — habitats, features, relationships",
    objects: [
      createHabitat({ id: "habitat-1", kind: habitatKind, x: 400, y: 225 }),
      createTree({ id: "tree-1", x: 620, y: 250 }),
      createPlant({ id: "plant-1", x: 170, y: 330 }),
      createAnimal({ id: "animal-1", x: 300, y: 305, species: habitatKind === "pond" ? "frog" : "lion", habitat: habitatKind }),
      createAnimal({ id: "animal-2", x: 480, y: 320, species: habitatKind === "pond" ? "heron" : "zebra", habitat: habitatKind }),
      createLabel({ id: "animal-task", x: 400, y: 60, text: "Classify: what does each animal eat, and where does it shelter?", purpose: "Set the classify-and-compare task" }),
    ],
    professor: { x: 105, y: 350, gesture: "point" },
    interactions: [
      { kind: "manipulate", prompt: "Sort the animals by what they eat (plants / other animals / both)." },
      { kind: "observe", prompt: "Which feature helps each animal in this habitat?" },
    ],
  });
}
export function classifyAnimal(species) {
  const table = {
    lion: { diet: "other animals", shelter: "shade of trees", group: "carnivore" },
    zebra: { diet: "plants", shelter: "open grassland (herd)", group: "herbivore" },
    frog: { diet: "insects", shelter: "pond plants", group: "carnivore" },
    heron: { diet: "fish", shelter: "pond reeds", group: "carnivore" },
    fox: { diet: "other animals", shelter: "den", group: "carnivore" },
  };
  return table[species] || { diet: "varies", shelter: "varies", group: "omnivore" };
}
// Side-by-side compare for the classify/compare interaction (computed, not drawn).
export function compareAnimals(speciesA, speciesB) {
  const a = classifyAnimal(speciesA), b = classifyAnimal(speciesB);
  const sameGroup = a.group === b.group;
  return { a: { species: speciesA, ...a }, b: { species: speciesB, ...b }, sameGroup, sameDiet: a.diet === b.diet, summary: sameGroup ? `${speciesA} and ${speciesB} are both ${a.group}s, but shelter differs (${a.shelter} vs ${b.shelter}).` : `${speciesA} is a ${a.group} (${a.diet}); ${speciesB} is a ${b.group} (${b.diet}). Different diets, different roles in the habitat.` };
}

export function engineeringScene({ rows = 3 } = {}) {
  return createSceneSpec({
    id: "engineering-wall", topic: "engineering", title: "Engineering — design, place, test",
    objects: [
      createWall({ id: "wall-1", x: 400, y: 316, rows }),
      createBeam({ id: "beam-1", x: 400, y: 205 }),
      createBlock({ id: "block-loose", x: 130, y: 330, label: "Loose block — place me", purpose: "A block the learner places into the design" }),
      createLabel({ id: "eng-task", x: 400, y: 62, text: "Build a wall that holds the beam. Then test it.", purpose: "Set the design-and-test task" }),
    ],
    professor: { x: 105, y: 350, gesture: "demonstrate" },
    interactions: [
      { kind: "manipulate", prompt: "Place the loose block so the wall is stable, then test the design." },
      { kind: "observe", prompt: "Where would this wall fail first? Why?" },
    ],
  });
}
// --- Castle: area (front face) vs volume (with depth) — computed, never painted ---
export function castleState({ lengthUnits = 6, heightRows = 4, thickness = 1 } = {}) {
  const L = Math.max(1, Math.min(12, Math.round(Number(lengthUnits) || 6)));
  const H = Math.max(1, Math.min(8, Math.round(Number(heightRows) || 4)));
  const T = Math.max(1, Math.min(6, Math.round(Number(thickness) || 1)));
  return { lengthUnits: L, heightRows: H, thickness: T, faceArea: L * H, volumeBlocks: L * H * T };
}
export function testCastleDesign(input = {}) {
  const s = castleState(input);
  const holds = s.thickness >= 2 && s.heightRows >= 3;
  return {
    holds, ...s,
    reason: holds
      ? `It holds: front face ${s.lengthUnits}×${s.heightRows} = ${s.faceArea} blocks, and depth ${s.thickness} gives ${s.volumeBlocks} blocks in total. Depth is what a front drawing hides.`
      : `It falls: only ${s.thickness} block(s) deep. A wall drawn as length × height (${s.faceArea}) still needs depth — add thickness (≥2) and height (≥3).`,
  };
}
export function castleScene({ lengthUnits = 6, heightRows = 4, thickness = 1 } = {}) {
  const s = castleState({ lengthUnits, heightRows, thickness });
  const scene = createSceneSpec({
    id: "castle-wall", topic: "how castles defended themselves", title: "Castles — build a wall with real depth",
    objects: [
      createWall({ id: "castle-front", x: 370, y: 310, rows: s.heightRows, label: `Front wall ${s.lengthUnits} wide × ${s.heightRows} high`, purpose: "Front view: area = length × height" }),
      createBlock({ id: "castle-depth", x: 640, y: 300, label: `Depth: ${s.thickness} block(s) thick`, purpose: "Top/side view: thickness turns area into volume" }),
      createLabel({ id: "castle-task", x: 400, y: 58, text: "Make the wall hold: change its thickness, then test front area vs total blocks.", purpose: "Set the area-vs-volume task" }),
      createLabel({ id: "castle-views", x: 400, y: 96, text: "FRONT shows length × height. Only depth reveals volume.", purpose: "Name the hidden-depth misconception" }),
      createSequence({ id: "castle-seq", x: 70, y: 405, steps: ["Draw front", "Add depth", "Count all blocks", "Test if it holds"], purpose: "Order the design-and-test method" }),
    ],
    professor: { x: 105, y: 350, gesture: "demonstrate" },
    interactions: [
      { kind: "manipulate", prompt: "Change the wall thickness. What changes: the front area, the total blocks, or both?" },
      { kind: "observe", prompt: "Why can two walls with the same front face need very different numbers of blocks?" },
    ],
  });
  scene.castle = s;
  return scene;
}
export function castleSceneAfterChange(scene, patch = {}) {
  return castleScene({ ...(scene?.castle || {}), ...patch });
}

// --- Any safe topic: composed diagram world with honest limits (no fake simulation) ---
export function genericTopicScene(topic) {
  const name = String(topic || "your topic").trim().slice(0, 80) || "your topic";
  const scene = createSceneSpec({
    id: "generic-topic", topic: name, title: `${name} — composed world (diagram, not a bespoke simulation)`,
    objects: [
      createLabel({ id: "generic-title", x: 400, y: 52, text: name, purpose: "Name the topic the learner chose" }),
      createDiagramNode({ id: "generic-what", x: 180, y: 140, text: "What is it? Parts & words", purpose: "Start from parts and vocabulary" }),
      createDiagramNode({ id: "generic-how", x: 400, y: 140, text: "How does it change?", purpose: "Look for cause and effect" }),
      createDiagramNode({ id: "generic-see", x: 620, y: 140, text: "What can we observe?", purpose: "Separate observation from guessing" }),
      createSequence({ id: "generic-seq", x: 70, y: 300, steps: ["Observe", "Predict", "Test on the wall", "Explain in your words"], purpose: "Give every new topic the same honest inquiry method" }),
      createTimeline({ id: "generic-timeline", x: 400, y: 400, events: ["Before", "Change", "Result", "Check again"], purpose: "Order change over time for any topic" }),
    ],
    professor: { x: 110, y: 350, gesture: "demonstrate" },
    interactions: [
      { kind: "manipulate", prompt: `Work the diagram for ${name}: fill each box from the live lesson, then explain it back.` },
      { kind: "observe", prompt: "What do we know, what are we guessing, and how could we check?" },
    ],
  });
  scene.simulationSupported = false;
  scene.supportedParts = ["Labelled diagram composed from verified primitives", "Observe → predict → test → explain sequence", "Live lesson text and chat with Professor D"];
  scene.unsupportedParts = ["A bespoke interactive simulation for this exact topic — not built yet", "Live web lookup or verified facts search — not connected; live answers use model knowledge"];
  scene.workedExample = "Worked method: name the parts, predict a change, test what you can on the wall, then explain the result in your own words. Professor D must label anything untested as untested.";
  return scene;
}

// A design holds when the wall is at least 3 rows and the beam is centred over it.
export function testDesign({ wallRows, beamOffset }) {
  const holds = wallRows >= 3 && Math.abs(beamOffset) <= 40;
  return { holds, reason: holds ? "The wall is tall and centred enough to carry the beam." : "The design fails: add rows or centre the beam over the wall." };
}

// --- Unfamiliar safe topic composed from primitives (no hardcoded page) ---
// Volcanoes: diagram composition is supported; eruption physics is honestly flagged.
export const VOLCANO_STEPS = ["Magma collects underground", "Pressure builds", "Rock cracks — magma rises", "Eruption: lava, ash and gas escape", "Lava cools into new rock"];
export const VOLCANO_WORKED_EXAMPLE = "Worked example: think of a shaken fizzy-drink bottle. Pressure (gas) builds while the cap holds; when the cap cracks, the contents rush out — like magma escaping when rock cracks. The bottle is only an analogy: real eruptions also depend on magma thickness and gas content, which this diagram does not simulate.";
export function volcanoInfo() {
  return {
    simulationSupported: false,
    supportedParts: ["Volcano parts (cone, crater, magma chamber) as a labelled diagram", "Eruption order as a sequence/timeline", "Classify-and-observe prompts over the diagram"],
    unsupportedParts: ["Real magma pressure, temperature and eruption force — not simulated", "Predicting when a real volcano will erupt — not supported"],
    workedExample: VOLCANO_WORKED_EXAMPLE,
    fallback: "worked-example",
  };
}
export function volcanoScene() {
  const magma = createShape({ id: "magma-chamber", x: 400, y: 360, shape: "circle", w: 90, h: 54, fill: "#c43d1a", label: "Magma chamber", purpose: "Show molten rock stored underground before an eruption" });
  const scene = createSceneSpec({
    id: "volcano-eruption", topic: "how volcanoes erupt", title: "How volcanoes erupt — diagram (not a physics simulation)",
    objects: [
      createShape({ id: "volcano-cone", x: 400, y: 250, shape: "triangle", w: 340, h: 210, fill: "#7a5540", label: "Volcano cone", purpose: "Show the mountain built from cooled lava and ash" }),
      magma,
      createLabel({ id: "volcano-title", x: 400, y: 52, text: "Diagram only — eruption physics is not simulated (worked example below)", purpose: "Label the honest limit of this composition" }),
      createLabel({ id: "crater-label", x: 400, y: 130, text: "Crater — opening at the top", purpose: "Name the opening where lava and ash escape" }),
      createDiagramNode({ id: "ash-cloud", x: 620, y: 110, text: "Ash + gas cloud", purpose: "Show ash and gas thrown into the air during eruption" }),
      createSequence({ id: "eruption-seq", x: 70, y: 400, steps: ["Magma rises", "Pressure builds", "Eruption", "Lava cools"], purpose: "Show eruption as an ordered process" }),
      createTimeline({ id: "eruption-timeline", x: 400, y: 425, events: ["Dormant", "Unrest", "Eruption", "Cooling"], purpose: "Order volcano activity in time" }),
    ],
    professor: { x: 110, y: 350, gesture: "demonstrate" },
    interactions: [
      { kind: "manipulate", objectId: "volcano-cone", prompt: "Point to the crater, cone and magma chamber. Which part stores molten rock?" },
      { kind: "observe", prompt: "Put the eruption in order: what must happen before lava can escape?" },
    ],
  });
  const info = volcanoInfo();
  scene.simulationSupported = info.simulationSupported;
  scene.supportedParts = info.supportedParts;
  scene.unsupportedParts = info.unsupportedParts;
  scene.workedExample = info.workedExample;
  return scene;
}

export function sceneForTopic(topic) {
  const t = String(topic || "").toLowerCase();
  if (/fraction/.test(t)) return fractionsScene({});
  if (/cloud|water cycle|evapor|condens/.test(t)) return cloudsScene({});
  if (/animal|habitat|ecolog|species/.test(t)) return animalsScene({});
  if (/castle|fortress|medieval/.test(t)) return castleScene({});
  if (/engineer|bridge|wall|structure|build/.test(t)) return engineeringScene({});
  if (/volcano|erupt/.test(t)) return volcanoScene({});
  return null; // generic topics compose primitives via the Director; no hardcoded page
}
