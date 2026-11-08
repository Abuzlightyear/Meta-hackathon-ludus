import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PRIMITIVE_TYPES, buildWorld, sceneForTopic, genericTopicScene, validateSceneSpec, composeScene,
  createWorldState, applyInteraction, rebuildScene, applyCodedResponse, renderSceneToSVG, computeReadout, chartBarHeight,
  wrapLines, objectSVG, animalArtwork, topicTheme,
} from "../src/world.js";
import { KERNELS } from "../src/kernels/index.js";

const stateFor = (kernelId, opts) => {
  const scene = buildWorld(kernelId, opts);
  const r = createWorldState(scene);
  assert.equal(r.ok, true, JSON.stringify(r.error));
  return { scene, state: r.state };
};

test("W0 primitives cover the required typed vocabulary", () => {
  for (const t of ["shape", "label", "line", "diagram", "sequence", "timeline", "wall", "cloud", "animal", "chart"])
    assert.ok(PRIMITIVE_TYPES.includes(t), t);
});

test("W1 each kernel world validates and carries computed readout (no hardcoded pages)", () => {
  const expected = { maths: "maths-fractions", clouds: "clouds-sky", animals: "animals-classify", "engineering-castle": "engineering-castle-wall", business: "business-shop", cars: "cars-drivetrain", history: "history-timeline", physics: "physics-motion", coding: "coding-trace", obscure: "generic-inquiry" };
  for (const k of KERNELS) {
    const scene = buildWorld(k);
    assert.equal(scene.id, expected[k.id], k.id);
    assert.equal(validateSceneSpec(scene).valid, true, `${k.id}: ${JSON.stringify(validateSceneSpec(scene).errors)}`);
    assert.ok(scene.objects.length >= 4, k.id);
    assert.ok(scene.readout?.text?.length > 5, k.id);
    assert.equal(scene.kernelId, k.id);
    // same builder, different topic string -> same composer, no per-topic page
    assert.equal(sceneForTopic(k.id === "maths" ? "fractions" : k.id).id, scene.id);
  }
  assert.equal(buildWorld("maths", { params: { denominator: 4, selected: 3 } }).readout.display, "3/4");
  assert.equal(buildWorld("maths", { representation: "bar", params: { denominator: 4, selected: 3 } }).objects.find((o) => o.id === "frac-main").type, "fraction-bar");
  assert.equal(buildWorld("maths").objects.find((o) => o.id === "frac-main").type, "fraction-pizza");
});

test("W1b invalid scene is rejected by composeScene/validate, never rendered as a real scene", () => {
  const bad = composeScene({ id: "Bad ID!", topic: "x", title: "t", objects: [{ id: "o-1", type: "nope", x: 0, y: 0, appearance: { fill: "#fff" }, label: "x", actions: ["none"], interactive: false, purpose: "p" }] });
  assert.equal(bad.ok, false); assert.equal(bad.scene, null);
  assert.match(renderSceneToSVG(bad.scene), /Scene could not be built/);
  assert.equal(validateSceneSpec({ id: "ok-id", topic: "t", title: "t", objects: [{ id: "dup", type: "label", x: 0, y: 0, appearance: { fill: "#000" }, label: "a", actions: ["none"], interactive: false, purpose: "p" }, { id: "dup", type: "label", x: 1, y: 1, appearance: { fill: "#000" }, label: "b", actions: ["none"], interactive: false, purpose: "p" }] }).valid, false);
});

test("W2 maths: divide/select/slider change computed readout deterministically + purely", () => {
  const { state } = stateFor("maths", { params: { denominator: 4, selected: 1 } });
  assert.equal(state.readout.display, "1/4");
  const before = structuredClone(state);
  const divided = applyInteraction(state, { kind: "divide", objectId: "frac-main", denominator: 4 });
  assert.equal(divided.ok, true);
  const selected = applyInteraction(divided.state, { kind: "select", objectId: "frac-main", selected: 3 });
  assert.equal(selected.state.readout.display, "3/4"); assert.equal(selected.state.readout.decimal, 0.75);
  assert.equal(selected.state.scene.objects.find((o) => o.id === "frac-main").props.selected, 3);
  const again = applyInteraction(divided.state, { kind: "select", objectId: "frac-main", selected: 3 });
  assert.deepEqual(again.state.readout, selected.state.readout, "deterministic");
  assert.deepEqual(state, before, "input state never mutated");
  const slid = applyInteraction(state, { kind: "slider", objectId: "frac-main", prop: "selected", value: 2 });
  assert.equal(slid.state.readout.display, "2/4");
});

test("W2 clouds: humidity/temperature sliders recompute stage, type and density", () => {
  const { state } = stateFor("clouds", { params: { temperature: 24, humidity: 60 } });
  assert.equal(state.readout.stage, "cloud-formation");
  const wet = applyInteraction(state, { kind: "slider", objectId: "weather-controls", prop: "humidity", value: 90 });
  assert.equal(wet.state.readout.stage, "precipitation"); assert.match(wet.state.readout.cloudType, /nimbostratus/); assert.equal(wet.state.readout.density, 0.9);
  assert.equal(wet.state.scene.objects.find((o) => o.id === "cloud-1").props.density, 0.9);
  const dry = applyInteraction(wet.state, { kind: "slider", objectId: "weather-controls", prop: "humidity", value: 10 });
  assert.equal(dry.state.readout.cloudType, "clear sky");
  assert.equal(state.readout.humidity, 60, "original unchanged");
});

test("W2 animals: select/drag classify stage changes selected readout; compare stays computed", () => {
  const { state } = stateFor("animals");
  assert.equal(state.readout.selected.group, "carnivore"); // lion default
  const zebra = applyInteraction(state, { kind: "select", objectId: "animal-2" });
  assert.equal(zebra.state.readout.selected.species, "zebra"); assert.equal(zebra.state.readout.selected.group, "herbivore");
  assert.equal(zebra.state.readout.compare.sameGroup, false);
  const dragged = applyInteraction(state, { kind: "drag", objectId: "animal-2", x: 200, y: 150 });
  assert.equal(dragged.ok, true); assert.equal(dragged.state.scene.objects.find((o) => o.id === "animal-2").x, 200);
  assert.equal(dragged.state.readout.selected.species, "zebra");
});

test("W2 animals species sync: the animal in the question is the animal in the scene", () => {
  const zebraScene = buildWorld("animals", { params: { focusSpecies: "zebra", speciesA: "zebra", selectedSpecies: "zebra" } });
  assert.deepEqual(zebraScene.objects.filter((o) => o.type === "animal").map((o) => o.props.species), ["zebra"], "a zebra question shows one zebra, not a default pair");
  const zebraSvg = renderSceneToSVG(zebraScene);
  assert.match(zebraSvg, /data-species="zebra"/);
  assert.doesNotMatch(zebraSvg, /data-species="(lion|frog|heron|fox)"/);
  const compareScene = buildWorld("animals", { params: { compareMode: true, speciesA: "frog", speciesB: "heron", selectedSpecies: "frog" } });
  assert.deepEqual(compareScene.objects.filter((o) => o.type === "animal").map((o) => o.props.species), ["frog", "heron"], "compare questions show both named animals in order");
  assert.equal(compareScene.params.habitat, "pond");
  const markers = { zebra: /#25211d/, lion: /#7a4517/, fox: /#fff4e6/, frog: /#63b957/, heron: /#e0a32e/ };
  const artwork = Object.fromEntries(Object.keys(markers).map((species) => [species, animalArtwork(species)]));
  for (const [species, marker] of Object.entries(markers)) assert.match(artwork[species], marker, `${species} has its own identifying features`);
  assert.equal(new Set(Object.values(artwork)).size, 5, "five species do not share one generic silhouette");
  for (const species of Object.keys(markers)) assert.match(objectSVG({ id: `animal-${species}`, type: "animal", x: 0, y: 0, label: species, appearance: { fill: "#b5762f" }, props: { species } }), new RegExp(`data-species="${species}"`));
});

test("W2 castle: thickness slider keeps front area, changes volume, flips FALLS->HOLDS", () => {
  const { state } = stateFor("engineering-castle", { params: { lengthUnits: 6, heightRows: 4, thickness: 1 } });
  assert.deepEqual([state.readout.faceArea, state.readout.volumeBlocks, state.readout.verdict], [24, 24, "FALLS"]);
  const thick = applyInteraction(state, { kind: "slider", objectId: "castle-wall", prop: "thickness", value: 3 });
  assert.deepEqual([thick.state.readout.faceArea, thick.state.readout.volumeBlocks, thick.state.readout.verdict], [24, 72, "HOLDS"]);
  assert.equal(thick.state.scene.objects.find((o) => o.id === "castle-wall").props.thickness, 3);
  const svg = renderSceneToSVG(thick.state);
  assert.match(svg, /data-thickness="3"/); assert.match(svg, /data-volume="72"/); assert.match(svg, /data-face-area="24"/);
});

test("W2 business: budget sliders recompute revenue/costs/profit/break-even and chart bars", () => {
  const { state } = stateFor("business");
  assert.deepEqual([state.readout.revenue, state.readout.totalCosts, state.readout.profit, state.readout.breakEvenUnits], [500, 450, 50, 75]);
  const raised = applyInteraction(state, { kind: "slider", objectId: "shop-controls", prop: "price", value: 6 });
  // units still 100: revenue 600, costs 450, profit 150 (slider path is kernel compute, not chart paint)
  assert.deepEqual([raised.state.readout.revenue, raised.state.readout.profit], [600, 150]);
  const chart = raised.state.scene.objects.find((o) => o.id === "shop-chart");
  assert.deepEqual(chart.props.values.map((v) => v.value), [600, 450, 150]);
  // exact bar geometry: tallest bar uses full computed height
  assert.equal(chartBarHeight(600, 600, 160), 120);
  assert.equal(chartBarHeight(300, 600, 160), 60);
  const svg = renderSceneToSVG(raised.state); assert.match(svg, /data-value="600"/); assert.match(svg, /data-bar-height="120"/);
});

test("W3 misconception rebuild: different representation, same computed truth; non-misconception does not rebuild", () => {
  for (const kernelId of ["maths", "clouds", "animals", "engineering-castle", "business", "obscure"]) {
    const { state } = stateFor(kernelId === "obscure" ? "obscure" : kernelId, kernelId === "obscure" ? { topic: "axolotls" } : {});
    const rebuilt = rebuildScene(state, { misconception: "test misconception" });
    assert.equal(rebuilt.ok, true, kernelId);
    assert.notEqual(rebuilt.state.representation, state.representation, kernelId);
    assert.notDeepEqual(rebuilt.state.scene.objects.map((o) => o.type), state.scene.objects.map((o) => o.type), `${kernelId} object types/representation must differ`);
    assert.equal(validateSceneSpec(rebuilt.state.scene).valid, true, kernelId);
    if (kernelId !== "obscure" && kernelId !== "animals") assert.equal(rebuilt.state.readout.text, state.readout.text, `${kernelId} truth preserved across representation`);
  }
  const { state } = stateFor("maths", { params: { denominator: 4, selected: 3 } });
  const pizza = state.scene.objects.find((o) => o.id === "frac-main").type;
  const bar = rebuildScene(state, { misconception: "bigger denominator means bigger" }).state.scene.objects.find((o) => o.id === "frac-main").type;
  assert.deepEqual([pizza, bar], ["fraction-pizza", "fraction-bar"]);
  assert.equal(applyCodedResponse(state, { code: "sound" }).rebuilt, false);
  assert.equal(applyCodedResponse(state, { code: "misconception", evidence: "bigger denominator" }).rebuilt, true);
});

test("W4 SVG: exact fraction geometry (pizza slices + bar segments) and readout text", () => {
  const { scene } = stateFor("maths", { params: { denominator: 4, selected: 3 } });
  const svg = renderSceneToSVG(scene);
  assert.match(svg, /data-scene="maths-fractions"/);
  assert.equal((svg.match(/<path d="M 0 0 L/g) || []).length, 4, "one exact slice path per equal part");
  assert.match(svg, /A 90 90 0 0 1/); assert.match(svg, />3\/4</); assert.match(svg, /3 out of 4 equal parts = 3\/4 \(0\.75\)/);
  const bar = buildWorld("maths", { representation: "bar", params: { denominator: 4, selected: 1 } });
  const barSvg = renderSceneToSVG(bar);
  assert.match(barSvg, /width="80\.0"/, "bar segment = 320/4 exactly");
  assert.equal(computeReadout("maths", { denominator: 8, selected: 2 }).display, "2/8");
});

test("W4b graphics: themed backdrop + gradients, exact geometry preserved", () => {
  const { scene } = stateFor("maths", { params: { denominator: 4, selected: 3 } });
  const svg = renderSceneToSVG(scene);
  assert.match(svg, /id="ludus-sky"/, "per-subject gradient sky");
  assert.match(svg, /id="ludus-pizza-sel"/, "shaded selected slices");
  assert.match(svg, /filter="url\(#ludus-soft\)"/, "soft shadows on objects");
  assert.doesNotMatch(svg, /fill="#f4f1e6"/, "flat parchment background is gone");
  assert.equal((svg.match(/<path d="M 0 0 L/g) || []).length, 4, "slice geometry untouched by the paint");
  const clouds = renderSceneToSVG(stateFor("clouds").state);
  assert.match(clouds, /id="ludus-cloud"/, "clouds get their own shaded rendering");
});

test("W4c text fit: diagram text wraps inside its box; labels sit clear of objects", () => {
  const lines = wrapLines("What is it? Parts & words", 16);
  assert.ok(lines.length >= 2, "long diagram text wraps to multiple lines");
  assert.ok(lines.every((l) => l.length <= 20), "no wrapped line can spill far past its box");
  const scene = genericTopicScene("how axolotls regrow limbs");
  const svg = renderSceneToSVG(scene);
  assert.match(svg, /<tspan/, "wrapped tspans are rendered");
  const maths = renderSceneToSVG(stateFor("maths", { params: { denominator: 4, selected: 3 } }).scene);
  assert.match(maths, /class="obj-label" y="118"/, "pizza caption sits below the plate, not under the hub");
});

test("W5b themed generated environments: open topics get a world that looks like their subject", () => {
  assert.equal(topicTheme("the moons of Jupiter"), "space");
  assert.equal(topicTheme("how volcanoes erupt"), "volcano");
  assert.equal(topicTheme("chemistry of acids"), "chemistry");
  assert.equal(topicTheme("ancient egypt"), "ancient");
  assert.equal(topicTheme("how the heart pumps blood"), "body");
  const space = genericTopicScene("the moons of Jupiter");
  assert.equal(space.theme, "space");
  const svg = renderSceneToSVG(space);
  assert.match(svg, /data-theme="space"/, "scene carries its generated theme");
  assert.match(svg, /rotate\(-14/, "ringed planet is drawn in the generated sky");
  const volcano = renderSceneToSVG(genericTopicScene("how volcanoes erupt"));
  assert.match(volcano, /data-theme="volcano"/); assert.match(volcano, /#ff7a3c/, "lava cone is drawn");
  const hist = buildWorld("history");
  assert.match(renderSceneToSVG(hist), /476/, "history wall shows real dated events");
  const phys = buildWorld("physics", { params: { distanceM: 100, timeS: 20 } });
  assert.equal(phys.readout.speed, 5);
  const code = buildWorld("coding", { params: { start: 2, step: 3, count: 4 } });
  assert.equal(code.readout.final, 14);
});

test("W5 generic obscure: honest inquiry scene, simulationSupported:false, select still works", () => {
  const scene = genericTopicScene("how axolotls regrow limbs");
  assert.equal(scene.id, "generic-inquiry"); assert.equal(scene.simulationSupported, false);
  assert.equal(scene.kernelId, "obscure");
  assert.ok(scene.supportedParts.some((s) => /diagram/i.test(s))); assert.ok(scene.unsupportedParts.some((s) => /bespoke/i.test(s)));
  assert.deepEqual(scene.objects.find((o) => o.id === "generic-seq").props.steps, ["Observe", "Predict", "Test", "Explain"]);
  assert.equal(validateSceneSpec(scene).valid, true);
  const { state } = createWorldState(scene);
  const picked = applyInteraction(state, { kind: "select", objectId: "generic-what" });
  assert.equal(picked.ok, true); assert.equal(picked.state.selectedId, "generic-what"); assert.equal(picked.state.readout.simulationSupported, false);
  const svg = renderSceneToSVG(scene); assert.match(svg, /Diagram, not a bespoke simulation/);
  assert.equal(sceneForTopic("quantum tunnelling in bananas").simulationSupported, false, "unknown topics stay honest via generic composer");
});
