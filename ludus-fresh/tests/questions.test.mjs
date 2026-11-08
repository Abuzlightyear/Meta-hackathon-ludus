import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { KERNELS } from "../src/kernels/index.js";
import { AdaptiveDiagnosticSession, branchPlan } from "../src/thinking.js";

const allItems = (k) => [...k.diagnostic, ...k.practice, ...k.transfer];

test("questions: every item is a real, planned question (purpose + teaching feedback)", () => {
  for (const k of KERNELS) {
    for (const item of allItems(k)) {
      const q = String(item.q || "");
      assert.ok(q.includes("?"), `${item.id} must actually ask a question: ${q}`);
      assert.ok(q.length >= 60, `${item.id} question must carry context, not a fragment: ${q}`);
      assert.ok(typeof item.purpose === "string" && item.purpose.length >= 20, `${item.id} must state why it is asked`);
      assert.ok(typeof item.feedback === "string" && item.feedback.length >= 40, `${item.id} feedback must teach, not just grade`);
      assert.ok(!/\bAnswer: (parts or have)\b/.test(q), `${item.id} must not leak template scaffolding`);
    }
    const ids = allItems(k).map((i) => i.id);
    assert.equal(new Set(ids).size, ids.length, `${k.id} item ids unique across diagnostic/practice/transfer`);
  }
});

test("questions: diagnostic is a planned ladder with dedicated probes (no repeats later)", () => {
  for (const k of KERNELS) {
    const core = k.diagnostic.slice(0, 3);
    assert.ok(core.every((i) => i.kind === "diagnostic"), `${k.id} core diagnostic first`);
    const probes = k.diagnostic.slice(3);
    assert.ok(probes.some((i) => i.kind === "practice"), `${k.id} needs a foundation probe`);
    assert.ok(probes.some((i) => i.kind === "transfer"), `${k.id} needs a stretch probe`);
    const laterIds = new Set([...k.practice, ...k.transfer].map((i) => i.id));
    for (const path of [3, 2, 0]) {
      const plan = branchPlan(k, path);
      for (const item of plan.items) {
        if (item.kind === "reflect") continue;
        assert.ok(!laterIds.has(item.id), `${k.id} branch item ${item.id} must never repeat in practice/transfer`);
        assert.ok(k.diagnostic.includes(item), `${k.id} branch item ${item.id} must come from the diagnostic bank`);
      }
    }
    // Full-flow simulation: no question is ever asked twice.
    const s = new AdaptiveDiagnosticSession(k);
    const asked = [...s.currentItems()];
    s.submitCore(s.currentItems().map((it) => ({ answer: it.answer, confidence: 0.5, strategy: "worked it out step by step" })));
    asked.push(...s.currentItems());
    const flowIds = [...asked, ...k.practice, ...k.transfer].map((i) => i.id);
    assert.equal(new Set(flowIds).size, flowIds.length, `${k.id} full flow repeats a question`);
  }
});

test("questions: every scored item has a real expected answer (right passes, wrong fails)", () => {
  for (const k of KERNELS) {
    for (const item of allItems(k)) {
      if (item.scored === false) continue;
      assert.equal(k.checker(item, item.answer).correct, true, `${item.id} stored answer must pass its own checker`);
      assert.equal(k.checker(item, "__definitely_wrong__").correct, false, `${item.id} must reject a wrong answer`);
      if (item.misconceptionAnswer !== undefined) {
        assert.equal(k.checker(item, item.misconceptionAnswer).correct, false, `${item.id} misconception trap must fail`);
      }
    }
  }
});

test("questions: maths meaning question accepts natural phrasing, rejects the numerator idea", () => {
  const maths = KERNELS.find((k) => k.id === "maths");
  const item = maths.diagnostic[0];
  assert.equal(maths.checker(item, "parts").correct, true);
  assert.equal(maths.checker(item, "the number of equal parts in the whole").correct, true);
  assert.equal(maths.checker(item, "friends").correct, false);
});

test("blockers fixed: HOLD/FALL wording, cloud whole answers, wall length drawn honestly", async () => {
  const castle = KERNELS.find((k) => k.id === "engineering-castle");
  const verdictItem = castle.diagnostic[1];
  assert.equal(castle.checker(verdictItem, "FALL").correct, true, "the word the question prints must pass");
  assert.equal(castle.checker(verdictItem, "HOLD").correct, false, "wrong verdict still fails");
  const clouds = KERNELS.find((k) => k.id === "clouds");
  const stageItem = clouds.diagnostic[2];
  assert.equal(clouds.checker(stageItem, "cloud formation").correct, true, "natural spacing passes");
  assert.equal(clouds.checker(stageItem, "cloud").correct, false, "fragment must not pass");
  assert.equal(clouds.checker(stageItem, "formation").correct, false, "fragment must not pass");
  const { buildWorld, renderSceneToSVG } = await import("../src/world.js");
  const bricks = (len) => { const svg = renderSceneToSVG(buildWorld(castle, { topic: "geometry", params: { lengthUnits: len, heightRows: 2, thickness: 1 } })); const wall = svg.split('data-obj="castle-wall"')[1].split("</g>")[0]; return (wall.match(/fill-opacity=/g) || []).length; };
  assert.equal(bricks(2), 4, "2 long x 2 high draws 4 bricks");
  assert.equal(bricks(6), 12, "6 long x 2 high draws 12 bricks");
});

test("blockers fixed: composer never fabricates an option; blank answers are guarded", () => {
  const js = readFileSync(new URL("../public/stage.js", import.meta.url), "utf8");
  assert.ok(!js.includes("|| opts[0]"), "no first-option fallback remains");
  assert.ok(js.includes("answerMissing(item)"), "blank-answer guard wired");
  assert.ok((js.match(/answerMissing\(item\)\) \{ promptForAnswer\(\)/g) || []).length >= 3, "guard covers diagnose, practice and verify");
});

test("smart marking: natural phrasing passes, thinking codes stay honest", async () => {
  const business = KERNELS.find((k) => k.id === "business");
  assert.equal(business.checker(business.diagnostic[1], "£50").correct, true, "currency symbol accepted");
  assert.equal(business.checker(business.diagnostic[1], "50.").correct, true, "trailing punctuation accepted");
  assert.equal(business.checker(business.practice[1], "Option B").correct, true, "'Option B' accepted");
  const animals = KERNELS.find((k) => k.id === "animals");
  assert.equal(animals.checker(animals.diagnostic[0], "Herbivore.").correct, true);
  assert.equal(animals.checker(animals.diagnostic[0], "a herbivore").correct, true);
  assert.equal(animals.checker(animals.practice[1], "yesterday was different").correct, false, "'yesterday' is not a yes");
  const castle = KERNELS.find((k) => k.id === "engineering-castle");
  assert.equal(castle.checker(castle.diagnostic[0], "24 blocks").correct, true, "units accepted");
  const { codeResponse, normalizeConfidence } = await import("../src/thinking.js");
  const volItem = castle.diagnostic[2];
  assert.equal(codeResponse({ correct: false, answer: 24, expected: 72, confidence: 0.5, strategy: "I worked out the area, 6 by 4, and gave that", item: volItem }).code, "misconception", "area answered for volume is a misconception, not a slip");
  assert.equal(codeResponse({ correct: true, answer: 72, expected: 72, confidence: 0.9, strategy: "", item: volItem }).code, "slip", "correct with no method is a fragile slip, not sound");
  assert.equal(normalizeConfidence("very unsure"), 0.2);
  const { buildWorld } = await import("../src/world.js");
  const clear = buildWorld(KERNELS.find((k) => k.id === "clouds"), { topic: "clouds", params: { temperature: 24, humidity: 10 } });
  assert.equal(clear.objects.filter((o) => o.type === "cloud").length, 0, "no clouds drawn under a clear sky");
  const { createWorldState, applyInteraction } = await import("../src/world.js");
  const maths = KERNELS.find((k) => k.id === "maths");
  const st = createWorldState(buildWorld(maths, { topic: "fractions", params: { denominator: 4, selected: 0 } })).state;
  const clicked = applyInteraction(st, { kind: "select", objectId: "frac-main", sliceIndex: 2 });
  assert.equal(clicked.state.readout.selected, 3, "clicking slice 3 selects exactly 3 parts");
});

test("questions: obscure items are about the learner's actual topic, never fake facts", () => {
  const obscure = KERNELS.find((k) => k.id === "obscure");
  for (const item of allItems(obscure)) {
    assert.ok(String(item.q).includes("{topic}"), `${item.id} must be filled with the learner's topic`);
    assert.equal(obscure.checker(item, "an unrelated claim with no inquiry move").scored, false, `${item.id} stays unscored for facts`);
  }
});
