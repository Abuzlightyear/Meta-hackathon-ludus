import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateSceneSpec, OBJECT_TYPES } from "../src/scene-spec.js";
import { createFractionPizza, createCloud, createAnimal, createBlock } from "../src/world-objects.js";
import { renderSceneToSVG, objectSVG } from "../src/world-renderer.js";
import { validateCommand, applyCommand, DIRECTOR_COMMANDS, rebuildOnStruggle } from "../src/scene-director.js";
import { createProfessor, moveProfessor, setProfessorGesture, professorSVG, gestureForEvent } from "../src/professor.js";
import { academyScene, fractionsScene, fractionEquivalence, cloudsScene, waterCycleStage, animalsScene, classifyAnimal, engineeringScene, testDesign, sceneForTopic } from "../src/simulations.js";
import { registerAsset, listAssets, clearAssetCache } from "../src/asset-manager.js";
import { StudentStateStore } from "../src/student-state.js";
import { syncInteraction, recordWorldAdaptation } from "../src/world-state.js";

test("scene spec: academy + all demo scenes validate; objects carry purpose/interactivity", () => {
  for (const s of [academyScene(), fractionsScene({}), cloudsScene({}), animalsScene({}), engineeringScene({})]) {
    const v = validateSceneSpec(s);
    assert.equal(v.valid, true, `${s.id}: ${JSON.stringify(v.errors)}`);
    for (const o of s.objects) { assert.ok(o.purpose, o.id); assert.equal(typeof o.interactive, "boolean"); assert.ok(Array.isArray(o.actions)); }
  }
  assert.ok(OBJECT_TYPES.includes("fraction-pizza"));
});

test("scene spec negatives: malformed, duplicate id, unknown type/action, missing purpose, unsafe label", () => {
  assert.equal(validateSceneSpec(null).valid, false);
  assert.equal(validateSceneSpec({ id: "x" }).valid, false);
  const dup = fractionsScene({}); dup.objects.push({ ...dup.objects[0] });
  assert.ok(validateSceneSpec(dup).errors.some((e) => e.rule === "duplicate-id"));
  const bad = fractionsScene({}); bad.objects[0] = { ...bad.objects[0], type: "hologram" };
  assert.ok(validateSceneSpec(bad).errors.some((e) => e.rule === "unknown-type"));
  const badAct = fractionsScene({}); badAct.objects[0] = { ...badAct.objects[0], actions: ["execute-arbitrary-code"] };
  assert.ok(validateSceneSpec(badAct).errors.some((e) => e.rule === "unsupported-action"));
  const noPurpose = fractionsScene({}); noPurpose.objects[0] = { ...noPurpose.objects[0], purpose: "" };
  assert.equal(validateSceneSpec(noPurpose).valid, false);
  const unsafe = fractionsScene({}); unsafe.objects[0] = { ...unsafe.objects[0], label: "how to make a bomb" };
  assert.ok(validateSceneSpec(unsafe).errors.some((e) => e.rule === "unsafe"));
  const oob = fractionsScene({}); oob.objects[0] = { ...oob.objects[0], x: 99999 };
  assert.ok(validateSceneSpec(oob).errors.some((e) => e.rule === "out-of-bounds"));
});

test("world objects: factories produce typed specs with educational purpose", () => {
  const p = createFractionPizza({ denominator: 4, selected: 1 });
  assert.equal(p.type, "fraction-pizza"); assert.equal(p.props.denominator, 4); assert.ok(p.actions.includes("divide"));
  assert.equal(createCloud({}).type, "cloud");
  assert.equal(createAnimal({ species: "lion" }).props.species, "lion");
  assert.ok(createBlock({}).actions.includes("place"));
});

test("renderer: valid scene renders SVG with professor; invalid scene renders honest error, never a fake scene", () => {
  const svg = renderSceneToSVG(fractionsScene({ denominator: 4, selected: 3 }));
  assert.match(svg, /<svg/); assert.match(svg, /3\/4/); assert.match(svg, /Professor D/);
  const bad = renderSceneToSVG({ id: "bad" });
  assert.match(bad, /could not be built/i);
  assert.match(objectSVG(createFractionPizza({ denominator: 2, selected: 1 })), /1\/2/);
});

test("fractions truth is computed: equivalence + selection, never from an image", () => {
  const eq = fractionEquivalence(2);
  assert.deepEqual(eq.map((e) => `${e.numerator}/${e.denominator}`), ["1/2", "2/4", "3/6"]);
  assert.ok(eq.every((e) => Math.abs(e.value - 0.5) < 1e-9));
  const s = fractionsScene({ denominator: 8, selected: 2 });
  assert.equal(s.objects.find((o) => o.id === "frac-main").props.selected, 2);
});

test("clouds: manipulable conditions drive the computed cycle stage", () => {
  assert.equal(waterCycleStage({ temperature: 24, humidity: 30 }), "evaporation");
  assert.equal(waterCycleStage({ temperature: 10, humidity: 50 }), "cloud-formation");
  assert.equal(waterCycleStage({ temperature: 18, humidity: 80 }), "precipitation");
  assert.equal(validateSceneSpec(cloudsScene({ temperature: 24, humidity: 90 })).valid, true);
});

test("animals classify + engineering test-design are computed rules", () => {
  assert.equal(classifyAnimal("zebra").group, "herbivore");
  assert.equal(classifyAnimal("lion").group, "carnivore");
  assert.equal(testDesign({ wallRows: 4, beamOffset: 0 }).holds, true);
  assert.equal(testDesign({ wallRows: 1, beamOffset: 0 }).holds, false);
  assert.equal(sceneForTopic("fractions").id, "fractions-pizza");
  assert.equal(sceneForTopic("quantum basket weaving"), null); // generic topics compose primitives; no hardcoded page
});

test("director: allowlist only — valid commands apply purely; arbitrary code / bad refs rejected", () => {
  const scene = fractionsScene({});
  assert.ok(DIRECTOR_COMMANDS.includes("rebuild-on-struggle"));
  for (const bad of [{ type: "eval", code: "alert(1)" }, { type: "executeArbitraryCode" }, { type: "shell", command: "rm -rf /" }, null, {}]) {
    assert.equal(validateCommand(bad, scene).valid, false, JSON.stringify(bad));
  }
  assert.ok(validateCommand({ type: "highlight-object", objectId: "missing-obj" }, scene).errors.some((e) => e.rule === "bad-ref"));
  assert.ok(validateCommand({ type: "professor-gesture", gesture: "backflip" }, scene).errors.some((e) => e.rule === "unsupported-action"));
  const before = JSON.stringify(scene);
  const out = applyCommand(scene, { type: "place-object", objectId: "frac-main", x: 420, y: 200 });
  assert.equal(out.applied, "place-object");
  assert.equal(out.scene.objects.find((o) => o.id === "frac-main").x, 420);
  assert.equal(JSON.stringify(scene), before, "applyCommand must not mutate the input scene");
  const app = readFileSync("public/app.js", "utf8") + readFileSync("src/scene-director.js", "utf8");
  assert.ok(!/eval\(|new Function/.test(app), "director never executes arbitrary code");
});

test("professor: Scholar-Commander state machine, gestures tied to lesson events, reduced-motion safe", () => {
  const p = createProfessor({ x: 100, y: 300 });
  assert.equal(moveProfessor(p, { x: 40 }).facing, -1);
  assert.equal(setProfessorGesture(p, "point").gesture, "point");
  assert.equal(setProfessorGesture(p, "backflip").error.code, "UNSUPPORTED_GESTURE");
  assert.equal(gestureForEvent("struggle"), "encourage");
  assert.equal(gestureForEvent("welcome"), "present");
  assert.match(professorSVG({ ...p, gesture: "point" }), /Professor D, point/);
  const css = readFileSync("public/styles.css", "utf8");
  assert.match(css, /prefers-reduced-motion/);
});

test("adaptation: rebuild-on-struggle uses the observed misconception, never a learning-style label", () => {
  const cmds = rebuildOnStruggle({ misconception: "Thinking a bigger denominator means a bigger fraction", topic: "fractions" });
  assert.ok(cmds.length >= 1);
  assert.ok(!JSON.stringify(cmds).match(/visual learner|auditory learner|learning style/i));
  assert.equal(validateCommand({ type: "rebuild-on-struggle" }, fractionsScene({})).valid, false); // misconception required
});

test("asset manager: provenance enforced, placeholder never claimed generated, images never for maths truth", () => {
  clearAssetCache();
  assert.equal(registerAsset({ id: "a1", source: "random-web-image", provenance: { origin: "x" }, license: "?" }).ok, false);
  assert.ok(registerAsset({ id: "a2", source: "procedural-svg", provenance: { origin: "test" }, license: "project-owned", generated: false, placeholder: true }).ok);
  const falseClaim = registerAsset({ id: "a3", source: "meta-ai-generated", provenance: { origin: "test" }, license: "project-owned", generated: true, placeholder: true });
  assert.equal(falseClaim.ok, false);
  assert.ok(falseClaim.errors.some((e) => e.rule === "false-claim"));
  assert.equal(registerAsset({ id: "a4", source: "meta-ai-generated", provenance: { origin: "test" }, license: "project-owned", generated: true, useForMathTruth: true }).ok, false);
  assert.ok(listAssets().length >= 1);
});

test("world state sync: interactions + adaptations recorded in the shared student state", () => {
  const store = new StudentStateStore(); store.resetSession("fractions");
  assert.equal(syncInteraction(store, { objectId: "frac-main", correct: false, misconception: "Bigger denominator = bigger fraction" }).synced, true);
  assert.ok(store.getState().misconceptions.includes("Bigger denominator = bigger fraction"));
  recordWorldAdaptation(store, { strategy: "rebuild-on-struggle", reason: "Switched pizza to bar model." });
  assert.equal(store.getState().adaptations.at(-1).source, "world");
  assert.equal(syncInteraction(null, {}).error.code, "INVALID_STORE");
});

test("living classroom + taste: Scholar-Commander palette, no purple gradient, first screen preserved", () => {
  const css = readFileSync("public/styles.css", "utf8");
  assert.ok(!/#4f46e5|#7c3aed/i.test(css), "purple/indigo/violet accent must be gone");
  assert.ok(!/linear-gradient\(135deg,var\(--brand\),var\(--brand2\)\)/.test(css), "purple-blue gradient must be gone");
  const html = readFileSync("public/index.html", "utf8");
  assert.match(html, /academy-host/); assert.match(html, /world-host/);
  assert.match(readFileSync("public/app.js", "utf8"), /What would you like to learn today\?/);
  assert.match(readFileSync("public/world.js", "utf8"), /mountAcademy|mountTopicWorld/);
});

import { createObject, createObjects, OBJECT_CATEGORIES } from "../src/world/objects.js";
import { composeScene, createWorldState, applyInteraction } from "../src/world/engine.js";
import { renderSVG, drawSceneToCanvas, nextFocusId, focusableObjects, prefersReducedMotion } from "../src/world/render-svg.js";

test("world/: typed factory dispatch covers all categories; unknown type rejected", () => {
  for (const [cat, types] of Object.entries(OBJECT_CATEGORIES)) for (const ty of types) {
    const r = createObject(ty, { id: `t-${ty}` }); assert.equal(r.ok, true, `${cat}:${ty}`); assert.ok(r.object.purpose && Array.isArray(r.object.actions));
  }
  assert.equal(createObject("hologram", {}).ok, false);
  assert.equal(createObjects([{ type: "shape" }, { type: "hologram" }]).ok, false);
});

test("world/: composer builds scene from spec array without hardcoded page; rejects invalid", () => {
  const r = composeScene({ id: "volcano-demo", topic: "volcanoes", title: "Volcanoes", objects: [{ type: "shape", id: "cone", x: 400, y: 200, shape: "triangle" }, { type: "timeline", id: "tl", x: 80, y: 380, events: ["Erupt"] }] });
  assert.equal(r.ok, true); assert.equal(r.scene.objects.length, 2);
  assert.equal(composeScene({ id: "bad", topic: "x", title: "x", objects: [{ type: "nope" }] }).ok, false);
});

test("world/: interactions mutate deterministically and purely (select/drag/slider)", () => {
  const s = composeScene({ id: "f", topic: "fractions", title: "F", objects: [{ type: "fraction-pizza", id: "p", x: 200, y: 200, denominator: 4, selected: 1 }, { type: "block", id: "b", x: 100, y: 100 }] }).scene;
  const w = createWorldState(s).state; const before = JSON.stringify(w);
  const sel = applyInteraction(w, { kind: "select", objectId: "p" }); assert.equal(sel.state.scene.objects[0].props.selected, 2);
  const drag = applyInteraction(w, { kind: "drag", objectId: "b", x: 99999, y: 50 }); assert.equal(drag.state.scene.objects[1].x, 1200);
  const slider = applyInteraction(w, { kind: "slider", objectId: "p", prop: "denominator", value: 8, min: 1, max: 24 }); assert.equal(slider.state.scene.objects[0].props.denominator, 8);
  assert.equal(applyInteraction(w, { kind: "eval", objectId: "p" }).ok, false);
  assert.equal(applyInteraction(w, { kind: "select", objectId: "missing" }).error.code, "BAD_REF");
  assert.equal(JSON.stringify(w), before, "input state never mutated");
});

import { DIRECTOR_COMMANDS as WORLD_DIRECTOR_COMMANDS, validateDirectorCommand, applyDirectorCommand, applyDirectorCommands, commandsFromDiagnosis, observeInteraction } from "../src/world/director.js";
import { PROFESSOR_STATES, EVENT_TO_STATE, professorStateForEvent, transitionProfessor, professorSVGForState } from "../src/world/professor.js";
import { inferDiagnosis } from "../src/diagnosis.js";
import { buildPlan } from "../src/planning.js";

test("world/director: 13 camelCase allowlisted verbs apply purely; every verb covered", () => {
  const scene = fractionsScene({ denominator: 4, selected: 1 });
  assert.deepEqual(WORLD_DIRECTOR_COMMANDS, ["create", "move", "resize", "show", "hide", "highlight", "professorMove", "point", "zoom", "animate", "askManipulate", "observe", "rebuild"]);
  const before = JSON.stringify(scene);
  const seq = [
    { type: "create", object: { type: "label", id: "dir-note", x: 400, y: 120, text: "Director note" } },
    { type: "move", objectId: "frac-main", x: 420, y: 200 }, { type: "resize", objectId: "frac-main", scale: 1.2 },
    { type: "hide", objectId: "frac-line" }, { type: "show", objectId: "frac-line" }, { type: "highlight", objectId: "frac-main" },
    { type: "professorMove", x: 200, y: 350 }, { type: "point", objectId: "frac-main" }, { type: "zoom", zoom: 1.5 },
    { type: "animate", event: "divide-pizza", objectId: "frac-main" }, { type: "askManipulate", objectId: "frac-main", prompt: "Select 2 of 4 equal parts." },
    { type: "observe", prompt: "What changed?" }, { type: "rebuild", misconception: "Bigger denominator means bigger fraction" },
  ];
  const r = applyDirectorCommands(scene, seq);
  assert.equal(r.ok, true, JSON.stringify(r.error)); assert.deepEqual(r.applied, seq.map((c) => c.type));
  assert.equal(r.scene.objects.find((o) => o.id === "frac-main").x, 420);
  assert.equal(r.scene.viewState.highlightedId, "frac-main"); assert.equal(r.scene.professor.gesture, "encourage");
  assert.equal(JSON.stringify(scene), before, "director reducer never mutates input");
});

test("world/director negatives: malformed/unsupported/bad-ref/unsafe/duplicate rejected, never eval", () => {
  const scene = fractionsScene({});
  for (const bad of [null, "move", 42, {}, { type: "eval", code: "alert(1)" }, { type: "executeArbitraryCode" }, { type: "shell", command: "rm -rf /" }, { type: "move", objectId: "frac-main", code: "x" }]) assert.equal(validateDirectorCommand(bad, scene).valid, false, JSON.stringify(bad));
  assert.ok(validateDirectorCommand({ type: "highlight", objectId: "missing" }, scene).errors.some((e) => e.rule === "bad-ref"));
  assert.ok(validateDirectorCommand({ type: "rebuild" }, scene).errors.some((e) => e.rule === "schema"));
  assert.ok(validateDirectorCommand({ type: "rebuild", misconception: "I am a visual learner" }, scene).errors.some((e) => e.rule === "unsafe"));
  assert.ok(validateDirectorCommand({ type: "create", object: { type: "fraction-pizza", id: "frac-main" } }, scene).errors.some((e) => e.rule === "duplicate-id"));
  assert.equal(applyDirectorCommand(scene, { type: "zoom", zoom: 99 }).ok, false);
  const src = readFileSync("src/world/director.js", "utf8") + readFileSync("public/app.js", "utf8");
  assert.ok(!/eval\(|new Function/.test(src), "director never executes arbitrary code");
});

test("world/director: diagnosis+plan map to validated actions; observe -> rebuild/continue decision", () => {
  const topic = "fractions"; const scene = fractionsScene({});
  const diagnosis = inferDiagnosis(topic, [0, 0, 0]); const plan = buildPlan(topic, diagnosis);
  const cmds = commandsFromDiagnosis({ scene, diagnosis, plan, toolId: "visual-steps" });
  assert.ok(cmds.length >= 3); for (const c of cmds) assert.equal(validateDirectorCommand(c, scene).valid, true, JSON.stringify(c));
  assert.equal(applyDirectorCommands(scene, cmds).ok, true);
  const struggle = observeInteraction({ scene, correct: false, misconception: "Bigger denominator means bigger fraction", topic });
  assert.equal(struggle.decision, "rebuild"); assert.ok(struggle.commands.some((c) => c.type === "rebuild"));
  assert.ok(!JSON.stringify(struggle).match(/visual learner|learning style/i));
  assert.equal(observeInteraction({ scene, correct: true, topic }).decision, "continue");
});

test("world/professor: 8 states driven by lesson events, consistent SVG, reduced-motion CSS", () => {
  assert.deepEqual(PROFESSOR_STATES, ["walk", "turn", "point", "present", "think", "listen", "encourage", "demonstrate"]);
  assert.equal(professorStateForEvent("welcome"), "present"); assert.equal(professorStateForEvent("struggle"), "encourage");
  assert.equal(professorStateForEvent("verify"), "think"); assert.equal(professorStateForEvent("diagnose"), "listen");
  assert.equal(EVENT_TO_STATE.demonstrate, "demonstrate");
  const p = transitionProfessor({ x: 80, y: 300, gesture: "present", facing: 1 }, "point");
  assert.equal(p.gesture, "point"); assert.match(professorSVGForState(p), /prof-point/); assert.match(professorSVGForState(p), /Professor D, point/);
  assert.ok(!/class=/.test(professorSVGForState(p, { reducedMotion: true })), "reduced-motion renders a static pose");
  const css = readFileSync("public/styles.css", "utf8");
  for (const s of PROFESSOR_STATES) assert.match(css, new RegExp(`\\.prof-${s}`), s);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(readFileSync("public/app.js", "utf8"), /commandsFromDiagnosis|observeInteraction/);
  assert.match(readFileSync("public/index.html", "utf8"), /Limited offline demo/);
});

import { fractionsScene as demoFractions, cloudsScene as demoClouds, animalsScene as demoAnimals, engineeringScene as demoEng, volcanoScene, volcanoInfo, VOLCANO_STEPS, fractionState, fractionFromScene, cloudTypeFor, cloudsSceneAfterChange, compareAnimals, castleScene, castleState, testCastleDesign, castleSceneAfterChange, genericTopicScene } from "../src/simulations.js";
import { struggleRebuild } from "../src/world/director.js";
import { adaptAfterWrongAnswer, checkMastery } from "../src/world/adaptive.js";
import { generateCheck, evaluateAnswer, verifyMastery } from "../src/assessment.js";
import { imageGenerationHealth, healthCheck } from "../server/ai-adapter.mjs";
import { explain } from "../src/teaching.js";

test("demo fractions THROUGH engine: divide/select, live fraction+equivalence, professor, adapt, assessment", () => {
  const scene = demoFractions({ denominator: 4, selected: 1 }); // relevance
  assert.equal(scene.topic, "fractions"); assert.equal(scene.id, "fractions-pizza");
  assert.ok(scene.objects.some((o) => o.type === "fraction-pizza" && o.id === "frac-main")); // objects appear
  assert.ok(scene.objects.some((o) => o.id === "frac-equiv")); assert.match(renderSVG(scene), /1\/4/); assert.match(renderSVG(scene), /Professor D/);
  assert.equal(scene.professor.gesture, "point"); // Professor action
  assert.equal(professorStateForEvent("teach"), "present");
  const w = createWorldState(scene).state; const before = JSON.stringify(w);
  const div = applyInteraction(w, { kind: "divide", objectId: "frac-main", denominator: 8 });
  assert.equal(div.ok, true); assert.equal(div.state.scene.objects.find((o) => o.id === "frac-main").props.denominator, 8); // student divides
  const sel = applyInteraction(div.state, { kind: "select", objectId: "frac-main" });
  assert.equal(fractionFromScene(sel.state.scene).numerator, 2); // student selects -> live state accurate
  assert.equal(JSON.stringify(w), before, "engine interaction never mutates input");
  const st = fractionState(4, 2); assert.equal(st.display, "2/4"); assert.equal(st.simplified.denominator, 2); assert.ok(st.equivalents.every((e) => Math.abs(e.value - 0.5) < 1e-9)); // accurate info
  const practice = generateCheck("fractions", "practice"); const verify = generateCheck("fractions", "verify");
  assert.notDeepEqual(verify.map((x) => x.q), practice.map((x) => x.q)); // assessment: new challenge distinct
  assert.equal(evaluateAnswer(practice[0], practice[0].answer).correct, true);
  const adapt = adaptAfterWrongAnswer({ scene, topic: "fractions", misconception: "Thinking a bigger denominator means a bigger fraction" }); // adapt after wrong answer
  assert.equal(adapt.decision, "rebuild"); assert.equal(adapt.strategy, "switch-pizza-to-bar");
  assert.ok(adapt.scene.objects.some((o) => o.id === "frac-alt" && o.type === "fraction-bar")); assert.ok(adapt.scene.viewState.hiddenIds.includes("frac-main"));
  assert.ok(adapt.newInteraction.prompt.includes("new view")); assert.ok(!JSON.stringify(adapt).match(/visual learner|learning style/i));
  assert.equal(checkMastery("fractions", verify.map((x) => x.answer), []).mastered, true);
  assert.equal(checkMastery("fractions", verify.map(() => 99), []).mastered, false); // mastery withheld <0.8
});

test("demo clouds THROUGH engine: animated sky, cloud types, temp/moisture change formation, adapt, assessment", () => {
  const scene = demoClouds({ temperature: 24, humidity: 60 });
  assert.equal(scene.topic, "clouds"); assert.ok(scene.objects.filter((o) => o.type === "cloud").length >= 2); // objects appear
  assert.ok(scene.objects.some((o) => o.id === "weather-controls")); assert.ok(scene.objects.some((o) => o.type === "sun" && o.id === "sun-1"));
  assert.match(renderSVG(scene), /Professor D/); assert.equal(scene.professor.gesture, "demonstrate"); // Professor action
  assert.match(readFileSync("public/styles.css", "utf8"), /cloud-drift/); // animated sky (CSS, reduced-motion disabled)
  assert.equal(cloudTypeFor({ temperature: 24, humidity: 10 }).cloudType, "clear sky"); // accurate info
  assert.match(cloudTypeFor({ temperature: 24, humidity: 90 }).cloudType, /nimbostratus/);
  assert.equal(cloudTypeFor({ temperature: 24, humidity: 90 }).stage, "precipitation");
  const w = createWorldState(scene).state;
  const slid = applyInteraction(w, { kind: "slider", objectId: "weather-controls", prop: "humidity", value: 90, min: 0, max: 100 });
  assert.equal(slid.ok, true); // student changes scene via engine
  const wet = cloudsSceneAfterChange(scene, { humidity: 90 }); assert.equal(wet.weather.stage, "precipitation"); assert.ok(wet.objects.find((o) => o.id === "cloud-1").props.density > scene.objects.find((o) => o.id === "cloud-1").props.density);
  const dry = cloudsSceneAfterChange(scene, { humidity: 5, temperature: 28 }); assert.equal(dry.weather.cloudType, "clear sky");
  const adapt = struggleRebuild({ scene, misconception: "Thinking clouds are made of smoke", topic: "clouds" }); // adapt after wrong answer
  assert.equal(adapt.decision, "rebuild"); assert.equal(adapt.strategy, "isolate-one-stage"); assert.ok(adapt.commands.some((c) => c.type === "animate"));
  const practice = generateCheck("clouds", "practice"); assert.ok(practice.length >= 1); assert.equal(verifyMastery(generateCheck("clouds", "verify").map((x) => x.answer), generateCheck("clouds", "verify"), []).mastered, true); // assessment
});

test("demo animals classify/compare + engineering place-and-test THROUGH engine", () => {
  const scene = demoAnimals({ habitatKind: "savanna" });
  assert.equal(scene.topic, "animals"); assert.ok(scene.objects.filter((o) => o.type === "animal").length === 2); // relevance + objects
  assert.equal(scene.professor.gesture, "point"); // Professor action
  const w = createWorldState(scene).state;
  const picked = applyInteraction(w, { kind: "select", objectId: "animal-1" }); assert.equal(picked.ok, true); assert.equal(picked.state.selectedId, "animal-1"); // student changes scene
  const cmp = compareAnimals("lion", "zebra"); assert.equal(cmp.sameGroup, false); assert.match(cmp.summary, /carnivore/); assert.equal(classifyAnimal("zebra").group, "herbivore"); // accurate info
  const eng = demoEng({ rows: 3 }); const ew = createWorldState(eng).state;
  const placed = applyInteraction(ew, { kind: "drag", objectId: "block-loose", x: 400, y: 300 }); assert.equal(placed.ok, true); assert.equal(placed.state.scene.objects.find((o) => o.id === "block-loose").x, 400); // place
  assert.equal(testDesign({ wallRows: 3, beamOffset: 0 }).holds, true); assert.equal(testDesign({ wallRows: 1, beamOffset: 0 }).holds, false); // test design
  const adapt = adaptAfterWrongAnswer({ scene, topic: "animals", misconception: "Thinking all savanna animals eat plants" }); assert.equal(adapt.decision, "rebuild"); assert.ok(adapt.verifyChallenge.length >= 1); // adapt + new challenge
});

test("demo volcano (unfamiliar) composed from primitives, unsupported honestly labelled", () => {
  const scene = volcanoScene();
  assert.equal(scene.id, "volcano-eruption"); assert.match(scene.title, /not a physics simulation/); // relevance + honesty
  for (const id of ["volcano-cone", "magma-chamber", "eruption-seq", "ash-cloud"]) assert.ok(scene.objects.some((o) => o.id === id), id); // objects from primitives
  assert.equal(validateSceneSpec(scene).valid, true); assert.match(renderSVG(scene), /Professor D/); assert.equal(scene.professor.gesture, "demonstrate"); // Professor action
  assert.equal(scene.simulationSupported, false); assert.ok(scene.unsupportedParts.length >= 1); assert.ok(scene.workedExample.length > 20); // unsupported flagged + fallback
  assert.equal(volcanoInfo().fallback, "worked-example"); assert.equal(explain("how volcanoes erupt", {}).simulationSupported, false); assert.ok(VOLCANO_STEPS.length >= 4); // accurate order info
  const w = createWorldState(scene).state; const sel = applyInteraction(w, { kind: "select", objectId: "volcano-cone" }); assert.equal(sel.ok, false); // cone is presentational; sequence is the interactive path
  const seq = applyInteraction(w, { kind: "select", objectId: "eruption-seq" }); assert.equal(seq.ok, true); // student changes scene
  const adapt = adaptAfterWrongAnswer({ scene, topic: "how volcanoes erupt", misconception: "Thinking lava comes from the centre of the Earth" }); assert.equal(adapt.decision, "rebuild"); assert.notDeepEqual(adapt.verifyChallenge.map((x) => x.q), generateCheck("how volcanoes erupt", "practice").map((x) => x.q)); // adapt + assessment
});

test("demo castle THROUGH composer: thickness changes volume not face area, design test, adapt", () => {
  const scene = castleScene({ lengthUnits: 6, heightRows: 4, thickness: 1 });
  assert.equal(scene.id, "castle-wall"); assert.equal(validateSceneSpec(scene).valid, true);
  assert.equal(sceneForTopic("how castles defended themselves").id, "castle-wall");
  assert.deepEqual(castleState({ lengthUnits: 6, heightRows: 4, thickness: 1 }), { lengthUnits: 6, heightRows: 4, thickness: 1, faceArea: 24, volumeBlocks: 24 });
  assert.equal(testCastleDesign({ lengthUnits: 6, heightRows: 4, thickness: 1 }).holds, false);
  const thicker = castleSceneAfterChange(scene, { thickness: 3 });
  assert.equal(thicker.castle.faceArea, 24, "front area must not change with depth");
  assert.equal(thicker.castle.volumeBlocks, 72, "volume must scale with thickness");
  assert.equal(testCastleDesign(thicker.castle).holds, true);
  assert.match(renderSVG(thicker), /Professor D/);
  const adapt = adaptAfterWrongAnswer({ scene: thicker, topic: "castles", misconception: "Thinking wall strength is only length × height" });
  assert.equal(adapt.decision, "rebuild"); assert.ok(adapt.verifyChallenge.length >= 1);
});

test("obscure topic composes an honest diagram world (no bespoke sim, no lookup claim)", () => {
  const scene = genericTopicScene("how axolotls regrow limbs");
  assert.equal(scene.id, "generic-topic"); assert.equal(validateSceneSpec(scene).valid, true);
  assert.match(scene.title, /axolotls/); assert.match(scene.title, /not a bespoke simulation/);
  assert.equal(scene.simulationSupported, false);
  assert.ok(scene.unsupportedParts.some((u) => /bespoke|lookup/i.test(u)));
  assert.equal(sceneForTopic("how axolotls regrow limbs"), null, "composer fallback, never a hardcoded page");
  assert.match(readFileSync("public/world.js", "utf8"), /genericTopicScene/, "browser must mount the composed world for new topics");
});

test("classroom transition + asset strategy: academy welcome, adapter primary labelled, image check no paid call", () => {
  const academy = academyScene(); assert.match(academy.title, /LUDUS Academy/); assert.equal(academy.professor.gesture, "present"); // welcome scene
  assert.match(readFileSync("public/world.js", "utf8"), /cloudsSceneAfterChange/); assert.match(readFileSync("public/world.js", "utf8"), /Equivalent/); // topic controls live in public/*
  assert.match(readFileSync("public/app.js", "utf8"), /What would you like to learn today\?/); // first screen preserved
  delete process.env.META_IMAGE_API_KEY; delete process.env.META_IMAGE_KEY;
  const img = imageGenerationHealth(); assert.equal(img.available, false); assert.equal(img.paidCallMade, false); assert.equal(img.fallback, "procedural-svg"); // procedural first, no paid call
  assert.match(img.reason, /provenance fields only/);
  delete process.env.META_AI_API_KEY; delete process.env.META_API_KEY; delete process.env.LLAMA_API_KEY;
  assert.equal(healthCheck().mode, "offline-demo"); assert.equal(healthCheck().label, "Limited offline demo"); // adapter primary, labelled offline
});

test("world/: render-svg exact fractions, canvas fallback, keyboard focus + reduced-motion", () => {
  const s = fractionsScene({ denominator: 4, selected: 3 });
  assert.match(renderSVG(s), /3\/4/);
  const calls = []; const ctx = { fillRect(){}, fillText(t){ calls.push(t); }, save(){}, restore(){}, translate(){}, scale(){}, beginPath(){}, moveTo(){}, arc(){}, closePath(){}, fill(){}, stroke(){}, fillRect2(){}, strokeRect(){} };
  assert.equal(drawSceneToCanvas(ctx, s).ok, true); assert.ok(calls.includes("3/4"));
  assert.equal(focusableObjects(s).length > 0, true);
  assert.ok(nextFocusId(s, focusableObjects(s)[0].id, 1));
  assert.equal(prefersReducedMotion(() => ({ matches: true })), true);
  assert.equal(prefersReducedMotion(null), false);
});

import { validateBlueprint } from "../tools/aegis/lib.mjs";

test("aegis negatives: world fixtures rejected by their targeted validators", () => {
  const scene = fractionsScene({});
  const malformed = JSON.parse(readFileSync("fixtures/invalid-world-malformed-scene.json", "utf8"));
  assert.equal(validateSceneSpec(malformed).valid, false);
  const unsafeScene = JSON.parse(readFileSync("fixtures/invalid-world-unsafe.json", "utf8"));
  assert.ok(validateSceneSpec(unsafeScene).errors.some((e) => e.rule === "unsafe"), "unsafe label must be rejected");
  const badRef = JSON.parse(readFileSync("fixtures/invalid-world-bad-ref.json", "utf8"));
  assert.ok(validateCommand(badRef.command, scene).errors.some((e) => e.rule === "bad-ref"), "bad ref must be rejected");
  const unsupported = JSON.parse(readFileSync("fixtures/invalid-world-unsupported-action.json", "utf8"));
  assert.ok(validateCommand(unsupported.command, scene).errors.some((e) => e.rule === "unsupported-action"), "unsupported action must be rejected (legacy director)");
  assert.ok(validateDirectorCommand(unsupported.command, scene).errors.some((e) => e.rule === "unsupported-action"), "unsupported action must be rejected (world director)");
  assert.ok(validateDirectorCommand({ type: "move", objectId: "frac-main", x: 1, code: "alert(1)" }, scene).errors.some((e) => e.rule === "unsafe"), "unsafe code field must be rejected");
});

test("aegis negatives: blueprint fixtures rejected for invalid deps and unsafe operation", () => {
  const deps = JSON.parse(readFileSync("fixtures/invalid-world-invalid-deps.json", "utf8"));
  const depsReport = validateBlueprint(deps);
  assert.equal(depsReport.valid, false);
  assert.ok(depsReport.errors.some((e) => e.rule === "unknown-dependency"), "invalid deps must be rejected");
  const unsafeOp = JSON.parse(readFileSync("fixtures/invalid-world-unsafe-op.json", "utf8"));
  const unsafeReport = validateBlueprint(unsafeOp);
  assert.equal(unsafeReport.valid, false);
  assert.ok(unsafeReport.errors.some((e) => e.rule === "unapproved-operation"), "unsafe operation must be rejected");
});

test("cut-out math: backdrop pixels fade, subject pixels stay solid", async () => {
  const { sampleBackground, alphaForDistance, applyCutout } = await import("../src/world/cutout.js");
  assert.equal(alphaForDistance(10, 52, 36), 0);
  assert.equal(alphaForDistance(200, 52, 36), 255);
  assert.ok(alphaForDistance(70, 52, 36) > 0 && alphaForDistance(70, 52, 36) < 255, "edge must feather, not stair-step");
  const w = 4, h = 4;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { data.set([222, 208, 182, 255], i * 4); } // warm stone everywhere
  data.set([40, 42, 52, 255], (1 * w + 1) * 4); // dark vest pixel in the middle
  const bg = sampleBackground(data, w, h, 1);
  assert.ok(Math.abs(bg.r - 222) <= 12 && Math.abs(bg.b - 182) <= 12, "corner sample must find the stone");
  const out = applyCutout(data, bg, {});
  assert.ok(out.ratio > 0.8, "most of a backdrop-only frame is background");
  assert.equal(data[(1 * w + 1) * 4 + 3], 255, "subject pixel must stay fully solid");
});

test("voice helpers: British choice order, sentence split never loses words", async () => {
  const { chooseBritishVoice, splitSentences } = await import("../src/world/voice.js");
  const voices = [{ name: "Microsoft Zira", lang: "en-US" }, { name: "Google UK English Female", lang: "en-GB" }, { name: "Daniel", lang: "en-GB" }];
  assert.equal(chooseBritishVoice(voices).name, "Daniel", "named British male professor voice wins");
  assert.equal(chooseBritishVoice([{ name: "Google UK English Female", lang: "en-GB" }]).lang, "en-GB");
  assert.equal(chooseBritishVoice([]), null);
  const text = "Come along. We learn by doing! What do you predict?";
  assert.deepEqual(splitSentences(text), ["Come along.", "We learn by doing!", "What do you predict?"]);
  const long = `${"word ".repeat(90)}done.`;
  const chunks = splitSentences(long, 120);
  assert.ok(chunks.length > 2 && chunks.every((c) => c.length <= 125), "long lines must chunk for the speech queue");
  assert.equal(chunks.join(" ").replace(/\s+/g, " ").trim(), long.replace(/\s+/g, " ").trim(), "chunking must never drop words");
  const doc = readFileSync("public/doctore.js", "utf8");
  assert.match(doc, /chooseBritishVoice/, "stage must use the tested voice choice");
  assert.match(doc, /keepAlive/, "long speech must be kept alive against browser pause stalls");
});

test("stage wiring: public worlds hide the SVG figure (raster Doctore teaches) and lessons fetch live AI", () => {
  const scene = fractionsScene({ denominator: 4, selected: 1 });
  assert.doesNotMatch(renderSceneToSVG(scene, { hideProfessor: true }), /Professor D,/, "public stage must not draw the stick figure");
  assert.match(renderSceneToSVG(scene), /Professor D,/, "default renderer keeps the tested figure for headless proofs");
  const app = readFileSync("public/app.js", "utf8");
  assert.match(app, /\/api\/ai\/complete/, "teaching must call the live adapter, not only local templates");
  assert.match(app, /Professor D — live lesson/, "live text must be labelled as live teaching");
  const html = readFileSync("public/index.html", "utf8");
  for (const id of ["btn-mic", "btn-type", "btn-mute", "chat-form", "chat-log", "speech-bubble"]) assert.ok(html.includes(`id="${id}"`), `stage must expose #${id}`);
  const doc = readFileSync("public/doctore.js", "utf8");
  assert.match(doc, /speechSynthesis\.speak/, "Doctore must actually speak replies");
  assert.match(doc, /You are muted/, "self-mute must block the mic so stray speech is never sent");
  assert.match(doc, /speechQueue/, "speech must queue sentences one-by-one, never stack or drop to one line");
  assert.match(doc, /latestLine/, "stage bubble must show only the latest line, never the full transcript");
  assert.match(doc, /PRESENT_TIES/, "present pose must swap to per-subject tie artwork");
  for (const f of ["doctore-tie-bronze.jpg", "doctore-tie-teal.jpg", "doctore-tie-crimson.jpg"]) assert.ok(readFileSync(`public/assets/${f}`).length > 10000, `${f} must be real artwork`);
  assert.match(doc, /cutoutURL/, "stage must cut the Doctore out of his photo backdrop at runtime");
});
