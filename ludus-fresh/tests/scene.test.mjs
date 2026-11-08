import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { kernelForTopic } from "../src/kernels/index.js";
import { buildWorld, createWorldState, applyInteraction, renderSceneToSVG, validateSceneSpec } from "../src/world.js";

const root = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(root + p, "utf8");

test("conversation-first shell: one screen, character area, persistent input, environment focus", () => {
  const html = read("public/index.html");
  assert.ok(html.includes('class="layout"') && html.includes('class="wall-panel"'), "learning environment stays the main focus");
  assert.ok(html.includes('class="character-panel"') && html.includes("character-fig"), "dedicated character area, not a tiny avatar");
  assert.ok(html.includes('class="composer"'), "one persistent conversation bar");
  assert.equal((html.match(/id="type-input"/g) || []).length, 1, "exactly one text input for everything");
  assert.ok(!html.includes('id="topic-form"'), "no separate topic form");
  assert.ok(!html.includes("scene-stage") && !html.includes("scene-prof"), "broken scene stacking stays removed");
  assert.ok(html.includes('id="btn-captions"'), "optional captions toggle");
  const css = read("public/styles.css");
  assert.match(css, /\.doctore-img\{[^}]*position:relative/, "character moves inside its own stage, in flow");
  assert.match(css, /\.character-stage\{[^}]*overflow:hidden/, "movement is contained in the character window");
  assert.ok(!css.includes(".walking") && !css.includes("prof-bob"), "no fake movement animation");
  assert.match(css, /\.composer\{[^}]*position:sticky/, "conversation input persists at the bottom");
  const js = read("public/stage.js");
  assert.ok(js.includes("syncWorldToItem"), "questions still rebuild the scene around their own case");
  assert.ok(js.includes("submitTopicRequest"), "topics arrive through the persistent input");
  assert.ok(!js.includes("classList.add(\"walking\")"), "no fake walking is applied");
  assert.ok(!js.includes('classList.add("cutout")'), "portrait is never dissolved into the wall by cut-out");
});

test("judge finding: mastery is never claimed on unscored topics", () => {
  const js = read("public/stage.js");
  assert.ok(js.includes("unscoredOnly"), "summary distinguishes unscored inquiry from scored transfer");
  assert.ok(js.includes("Not awarded — mastery is never claimed without verified scoring"), "student-facing honesty line present");
  const obscure = kernelForTopic("how axolotls regrow limbs");
  assert.ok(obscure.transfer.every((i) => i.scored === false), "obscure transfer stays unscored, so mastery must stay withheld");
});

test("geometry scene (working scene #1): castle wall model answers its own diagnostic questions", () => {
  const kernel = kernelForTopic("geometry");
  assert.equal(kernel.id, "engineering-castle", "geometry routes to the architectural wall model");
  for (const item of kernel.diagnostic.slice(0, 3)) {
    const scene = buildWorld(kernel, { topic: "geometry", params: { ...item.params.design } });
    assert.equal(validateSceneSpec(scene).valid, true, item.id);
    const { state } = createWorldState(scene);
    const field = item.expectFrom === "faceArea" ? state.readout.faceArea : item.expectFrom === "volumeBlocks" ? state.readout.volumeBlocks : state.readout.verdict;
    assert.equal(kernel.checker(item, String(field)).correct, true, `${item.id}: the model itself yields the expected answer (${field})`);
    assert.ok(scene.objects.some((o) => o.type === "wall"), `${item.id}: scene contains the manipulable wall`);
  }
});

test("geometry scene: manipulating the model teaches (thickness flips verdict, area stays)", () => {
  const kernel = kernelForTopic("geometry");
  const { state } = createWorldState(buildWorld(kernel, { topic: "geometry", params: { lengthUnits: 6, heightRows: 4, thickness: 1 } }));
  assert.equal(state.readout.verdict, "FALLS");
  const thick = applyInteraction(state, { kind: "slider", objectId: "castle-wall", prop: "thickness", value: 3 });
  assert.equal(thick.ok, true);
  assert.equal(thick.state.readout.verdict, "HOLDS", "same wall, thicker: verdict flips");
  assert.equal(thick.state.readout.faceArea, state.readout.faceArea, "front area unchanged by depth");
  assert.ok(thick.state.readout.volumeBlocks > state.readout.volumeBlocks, "total blocks grew with depth");
});

test("scene text alternatives: every visual has a text equivalent", () => {
  const kernel = kernelForTopic("geometry");
  const scene = buildWorld(kernel, { topic: "geometry" });
  const svg = renderSceneToSVG(scene);
  assert.match(svg, /role="img"/, "scene is announced as an image with a label");
  assert.match(svg, new RegExp(`aria-label="${scene.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`), "scene title is the accessible name");
  assert.ok((svg.match(/class="obj-label"/g) || []).length >= 3, "objects carry visible text labels");
  assert.match(svg, /data-readout="1"/, "computed readout is present as text, not only shapes");
  assert.ok(scene.objects.every((o) => o.label && o.purpose), "every scene object declares label + purpose for text rendering");
});

test("reusable scenes: same components serve other subjects (no geometry hardcoding)", () => {
  for (const [topic, kernelId] of [["fractions", "maths"], ["clouds", "clouds"], ["animals", "animals"], ["business", "business"], ["how axolotls regrow limbs", "obscure"]]) {
    const kernel = kernelForTopic(topic);
    assert.equal(kernel.id, kernelId, topic);
    const scene = buildWorld(kernel, { topic });
    assert.equal(validateSceneSpec(scene).valid, true, topic);
    assert.ok(scene.objects.length >= 3, `${topic}: composed from reusable primitives`);
  }
});
