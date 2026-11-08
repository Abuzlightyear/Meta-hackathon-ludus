import { test } from "node:test";
import assert from "node:assert/strict";
import { AdaptiveDiagnosticSession, REFLECT_ITEM } from "../src/thinking.js";
import { mathsKernel, businessKernel } from "../src/kernels/index.js";

const R = (kernel, items, mode) => items.map((it) => {
  if (it.kind === "reflect") return { answer: 1, confidence: 0.5, strategy: "Partly guessing" };
  const good = mode === "all" || (mode === "first" && it === items[0]);
  return { answer: good ? it.answer : "__wrong__", confidence: good ? 0.9 : 0.4, strategy: good ? "I divided into equal parts and counted" : "I don't know this yet" };
});

test("adaptive fast-track: 3/3 core -> transfer branch, total 5-10, reflect unscored", () => {
  const s = new AdaptiveDiagnosticSession(mathsKernel);
  const core = s.submitCore(R(mathsKernel, s.currentItems(), "all"));
  assert.equal(core.coreCorrect, 3); assert.equal(core.path, "fast-track");
  assert.ok(s.currentItems().some((i) => i.kind === "transfer"));
  assert.ok(s.currentItems().some((i) => i.kind === "reflect" && i.scored === false));
  const res = s.submitBranch(R(mathsKernel, s.currentItems(), "all"));
  assert.ok(res.asked >= 5 && res.asked <= 10, `asked=${res.asked}`);
  assert.equal(res.total, res.asked - 1, "reflect excluded from scored total");
  assert.equal(res.correct, res.total); assert.equal(res.level, "confident");
  assert.equal(res.reflection, REFLECT_ITEM.options[1]);
});

test("adaptive foundation-first: <=1 core -> practice probes, level novice/developing", () => {
  const s = new AdaptiveDiagnosticSession(mathsKernel);
  const core = s.submitCore(R(mathsKernel, s.currentItems(), "none"));
  assert.equal(core.coreCorrect, 0); assert.equal(core.path, "foundation-first");
  assert.ok(s.currentItems().filter((i) => i.kind === "practice").length >= 1);
  const res = s.submitBranch(R(mathsKernel, s.currentItems(), "none"));
  assert.ok(res.asked >= 5 && res.asked <= 10);
  assert.equal(res.total, res.asked - 1);
  assert.ok(res.prerequisitesMissing.length >= 1);
});

test("adaptive standard: 2/3 core -> mixed probe+transfer", () => {
  const items = mathsKernel.diagnostic.slice(0, 3);
  const coreResp = items.map((it, i) => ({ answer: i < 2 ? it.answer : "__wrong__", confidence: 0.8, strategy: "counted equal parts" }));
  const s = new AdaptiveDiagnosticSession(mathsKernel);
  const core = s.submitCore(coreResp);
  assert.equal(core.coreCorrect, 2); assert.equal(core.path, "standard");
  assert.ok(s.currentItems().some((i) => i.kind === "practice") && s.currentItems().some((i) => i.kind === "transfer"));
  const res = s.submitBranch(R(mathsKernel, s.currentItems(), "all"));
  assert.equal(res.path, "standard");
});

test("adaptive is deterministic and works on a second kernel (business)", () => {
  const once = () => { const s = new AdaptiveDiagnosticSession(businessKernel); s.submitCore(businessKernel.diagnostic.map((it) => ({ answer: it.answer, confidence: 0.9, strategy: "multiplied" }))); return s.submitBranch(s.currentItems().map((it) => it.kind === "reflect" ? { answer: 0 } : { answer: it.answer, confidence: 0.9, strategy: "multiplied" })); };
  assert.deepEqual(once(), once());
  assert.equal(once().kernelId, "business");
});

test("adaptive guards: empty core returns INSUFFICIENT_ANSWERS, wrong phase throws", () => {
  const s = new AdaptiveDiagnosticSession(mathsKernel);
  assert.equal(s.submitCore([]).error.code, "INSUFFICIENT_ANSWERS");
  assert.throws(() => s.submitBranch([]), /core/i);
  assert.throws(() => new AdaptiveDiagnosticSession({ id: "x" }), /checker/);
});
