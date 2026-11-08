// AEGIS fresh gate — shared validator on the fresh blueprint plus the four
// required negatives. Deterministic and offline: no network, no AI calls.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateBlueprint } from "../../tools/aegis/lib.mjs";
import { validateSceneSpec, sceneForTopic } from "../src/world.js";
import { validateSceneSpec as validateTypedSceneSpec } from "../src/scene-spec.js";
import { checkTopic } from "../src/safety-filter.js";

const root = new URL("..", import.meta.url).pathname;
const fresh = JSON.parse(readFileSync(`${root}blueprints/ludus-fresh.blueprint.json`, "utf8"));
const clone = (v) => JSON.parse(JSON.stringify(v));

test("aegis: fresh blueprint validates clean (shared validator)", () => {
  const report = validateBlueprint(fresh);
  assert.equal(report.valid, true, JSON.stringify(report.errors));
  assert.deepEqual(report.errors, []);
  const ids = fresh.components.map((c) => c.id);
  for (const need of ["thinking-engine", "subject-kernels", "world-composer", "theatre-stage", "adapter-bridge", "safety-filter"]) {
    assert.ok(ids.includes(need), `blueprint covers ${need}`);
  }
  for (const need of ["kernel-maths", "kernel-clouds", "kernel-animals", "kernel-engineering-castle", "kernel-business", "kernel-obscure"]) {
    assert.ok(ids.includes(need), `blueprint covers ${need}`);
  }
});

test("aegis negative: bad scene rejected, never rendered broken", () => {
  const bad = JSON.parse(readFileSync(`${root}fixtures/invalid-bad-scene.json`, "utf8"));
  const v = validateSceneSpec(bad);
  assert.equal(v.valid, false);
  assert.ok(v.errors.length >= 2, "structured errors returned");
  // A well-formed scene for contrast must still pass.
  assert.equal(validateSceneSpec(sceneForTopic("castles")).valid, true);
});

test("aegis negative: unsupported director action rejected", () => {
  const bad = JSON.parse(readFileSync(`${root}fixtures/invalid-unsupported-action.json`, "utf8"));
  const v = validateSceneSpec(bad);
  assert.equal(v.valid, false);
  assert.ok(v.errors.some((e) => e.rule === "unsupported-action"), JSON.stringify(v.errors));
  // Blueprint-level: a blocked operation is never approved either.
  const bp = clone(fresh);
  const stage = bp.components.find((c) => c.id === "theatre-stage");
  stage.operations = ["tieForKernel", "eval"];
  stage.contract.inputs = ["tieForKernel(kernelId:string)", "eval(code:string)"];
  const report = validateBlueprint(bp);
  assert.equal(report.valid, false);
  assert.ok(report.errors.some((e) => e.rule === "unapproved-operation"), JSON.stringify(report.errors));
});

test("aegis negative: contract mismatch rejected (no silent upgrade)", () => {
  const bad = JSON.parse(readFileSync(`${root}fixtures/invalid-contract-mismatch.blueprint.json`, "utf8"));
  const report = validateBlueprint(bad);
  assert.equal(report.valid, false);
  assert.ok(report.errors.some((e) => e.rule === "contract-version-mismatch"), JSON.stringify(report.errors));
});

test("aegis negative: unsafe topic rejected with safe alternative", () => {
  const bad = JSON.parse(readFileSync(`${root}fixtures/invalid-unsafe-topic.json`, "utf8"));
  const gate = checkTopic(bad.topic);
  assert.equal(gate.allowed, false);
  assert.ok(gate.safeAlternative, "honest alternative offered, topic never taught as asked");
  // The typed scene contract (src/scene-spec.js) is the scene-level safety gate.
  const v = validateTypedSceneSpec(bad.scene);
  assert.equal(v.valid, false);
  assert.ok(v.errors.some((e) => e.rule === "unsafe"), JSON.stringify(v.errors));
  assert.equal(checkTopic("clouds").allowed, true);
});
