import { test } from "node:test";
import assert from "node:assert/strict";
import { codeResponse, normalizeConfidence, createTeachingRecord, recordExperience, markMastered, evidenceFor, summariseThinking, THINKING_CODES } from "../src/thinking.js";
import { mathsKernel } from "../src/kernels/index.js";

const item = mathsKernel.diagnostic[1]; // 1/2 vs 1/4, misconception trap 1/4

test("T-thinking: sound — correct with method and confidence", () => {
  const c = codeResponse({ correct: true, answer: "1/2", expected: "1/2", confidence: "sure", strategy: "I compared sizes of numbers: fewer equal parts are bigger, divided the whole", item });
  assert.equal(c.code, "sound"); assert.ok(c.evidence.length > 10);
});

test("T-thinking: slip — right method, wrong execution; and fragile correct guess", () => {
  const slip = codeResponse({ correct: false, answer: "1/3", expected: "1/2", confidence: 0.7, strategy: "I divided into equal parts and compared sizes", item });
  assert.equal(slip.code, "slip"); assert.match(slip.evidence, /Method.*sound|execution slip/);
  const fragile = codeResponse({ correct: true, answer: "1/2", expected: "1/2", confidence: 0.1, strategy: "I guessed", item });
  assert.equal(fragile.code, "slip"); assert.match(fragile.evidence, /fragile|variant/);
});

test("T-thinking: misread — strategy/trap shows a different question", () => {
  const c = codeResponse({ correct: false, answer: "4", expected: "1/2", confidence: 0.8, strategy: "I misread the question and counted the slices instead", item });
  assert.equal(c.code, "misread");
  const trap = codeResponse({ correct: false, answer: "1/4", expected: "1/2", confidence: 0.8, strategy: "bigger denominator", item: { ...item, misreadValue: "1/4" } });
  assert.equal(trap.code, "misread");
});

test("T-thinking: prereq-gap — missing prerequisite stated, or no strategy on wrong answer", () => {
  const c = codeResponse({ correct: false, answer: "1/4", expected: "1/2", confidence: 0.2, strategy: "I don't know what denominator means, never learned it", item });
  assert.equal(c.code, "prereq-gap"); assert.match(c.evidence, /prerequisite/);
  const blank = codeResponse({ correct: false, answer: "9", expected: "1/2", confidence: 0.5, strategy: "", item });
  assert.equal(blank.code, "prereq-gap");
});

test("T-thinking: misconception — systematic wrong model", () => {
  const c = codeResponse({ correct: false, answer: "1/4", expected: "1/2", confidence: 0.9, strategy: "A bigger denominator means a bigger fraction so 1/4 wins", item });
  assert.equal(c.code, "misconception"); assert.match(c.evidence, /wrong model|misconception/i);
  assert.ok(THINKING_CODES.includes(c.code));
});

test("confidence normalisation is deterministic across forms", () => {
  assert.equal(normalizeConfidence(80), 0.8); assert.equal(normalizeConfidence("sure"), 0.9);
  assert.equal(normalizeConfidence("guessed"), 0.2); assert.equal(normalizeConfidence(undefined), 0.5);
});

test("teaching-experience record: immutable updates, per-skill evidence, mastery only via markMastered", () => {
  const r0 = createTeachingRecord();
  const coded = codeResponse({ correct: false, answer: "1/4", expected: "1/2", confidence: 0.9, strategy: "bigger denominator means bigger", item });
  const r1 = recordExperience(r0, { skill: "fraction-comparison", coded, adaptation: "switch-pizza-to-bar" });
  assert.equal(r0.entries.length, 0, "original record untouched");
  assert.equal(r1.skills["fraction-comparison"].byCode.misconception, 1);
  assert.deepEqual(r1.skills["fraction-comparison"].adaptations, ["switch-pizza-to-bar"]);
  assert.equal(evidenceFor(r1, "fraction-comparison").length, 1);
  assert.equal(r1.skills["fraction-comparison"].mastered, false, "practice evidence never masters");
  const r2 = markMastered(r1, "fraction-comparison", "Transfer 1/2 vs 1/3 correct unaided.");
  assert.equal(r2.skills["fraction-comparison"].mastered, true);
  assert.equal(summariseThinking(r2)[0].mastered, true);
});
