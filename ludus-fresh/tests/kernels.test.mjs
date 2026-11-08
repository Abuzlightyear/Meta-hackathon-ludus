import { test } from "node:test";
import assert from "node:assert/strict";
import { mathsKernel, cloudsKernel, animalsKernel, castleKernel, businessKernel, obscureKernel, kernelForTopic, KERNELS } from "../src/kernels/index.js";
import { computeFraction } from "../src/kernels/maths.js";
import { computeClouds } from "../src/kernels/clouds.js";
import { evaluateDesign } from "../src/kernels/engineering-castle.js";
import { computeBusiness, evaluateDecisions, withinBudget } from "../src/kernels/business.js";
import { inquiryPlan, INQUIRY_STEPS } from "../src/kernels/obscure.js";

test("every kernel exposes the full contract shape", () => {
  for (const k of KERNELS) {
    for (const f of ["concepts", "prerequisites", "misconceptions", "diagnostic", "practice", "transfer"]) assert.ok(Array.isArray(k[f]) && k[f].length >= 2, `${k.id}.${f}`);
    assert.equal(typeof k.checker, "function", k.id);
    assert.ok(k.diagnostic.length >= 3 && k.practice.length >= 2 && k.transfer.length >= 2, k.id);
  }
  assert.equal(kernelForTopic("fractions").id, "maths");
  assert.equal(kernelForTopic("how axolotls regrow limbs").id, "obscure");
  assert.equal(kernelForTopic("history").id, "history");
  assert.equal(kernelForTopic("physics").id, "physics");
  assert.equal(kernelForTopic("coding").id, "coding");
  assert.equal(kernelForTopic("chemistry").id, "obscure", "chemistry uses the honest generated-lesson path until a kernel exists");
});

test("K1 maths: fraction/area/volume computed exactly (gold fractionState)", () => {
  const st = computeFraction(4, 3);
  assert.equal(st.display, "3/4"); assert.equal(st.decimal, 0.75);
  assert.deepEqual(st.simplified, { numerator: 3, denominator: 4 });
  assert.deepEqual(st.equivalents.map((e) => `${e.numerator}/${e.denominator}`), ["3/4", "6/8", "9/12"]);
  assert.equal(computeFraction(8, 2).simplified.numerator, 1);
  assert.equal(mathsKernel.compute.area(6, 4).area, 24);
  assert.deepEqual(mathsKernel.compute.volume(6, 4, 3), { length: 6, width: 4, depth: 3, faceArea: 24, volume: 72 });
  const item = mathsKernel.diagnostic[1];
  assert.equal(mathsKernel.checker(item, "1/2").correct, true);
  assert.equal(mathsKernel.checker(item, 0.5).correct, true);
  assert.equal(mathsKernel.checker(item, "1/4").correct, false);
  assert.equal(mathsKernel.checker(mathsKernel.transfer[1], 72).correct, true);
  assert.equal(mathsKernel.checker(mathsKernel.transfer[1], 24).correct, false, "area must not pass as volume");
});

test("K2 clouds: temp/humidity -> stage/type computed (gold cloudTypeFor)", () => {
  assert.equal(computeClouds({ temperature: 24, humidity: 90 }).stage, "precipitation");
  assert.match(computeClouds({ temperature: 24, humidity: 90 }).cloudType, /nimbostratus/);
  assert.equal(computeClouds({ temperature: 24, humidity: 10 }).cloudType, "clear sky");
  assert.equal(computeClouds({ temperature: 10, humidity: 50 }).stage, "cloud-formation");
  assert.equal(computeClouds({ temperature: 24, humidity: 60 }).density, 0.6);
  assert.equal(cloudsKernel.checker(cloudsKernel.diagnostic[0], "precipitation").correct, true);
  assert.equal(cloudsKernel.checker(cloudsKernel.diagnostic[0], "evaporation").correct, false);
  // K6 clamp: out-of-range never NaN
  const clamped = computeClouds({ temperature: 999, humidity: 200 });
  assert.ok(Number.isFinite(clamped.density) && clamped.density <= 1 && clamped.temperature !== undefined);
});

test("K3 animals: feature classify/compare computed (gold table)", () => {
  assert.equal(animalsKernel.compute.classify("zebra").group, "herbivore");
  assert.equal(animalsKernel.compute.classify("lion").group, "carnivore");
  const cmp = animalsKernel.compute.compare("lion", "zebra");
  assert.equal(cmp.sameGroup, false); assert.match(cmp.summary, /carnivore/);
  assert.equal(animalsKernel.compute.compare("frog", "heron").sameGroup, true);
  assert.equal(animalsKernel.checker(animalsKernel.diagnostic[0], "herbivore").correct, true);
  assert.equal(animalsKernel.checker(animalsKernel.diagnostic[1], "herbivore").correct, false);
  assert.equal(animalsKernel.checker(animalsKernel.transfer[0], "carnivore").correct, true);
});

test("K4 castle: thickness changes volume not face area; holds flips (gold)", () => {
  const thin = evaluateDesign({ lengthUnits: 6, heightRows: 4, thickness: 1 });
  assert.equal(thin.faceArea, 24); assert.equal(thin.volumeBlocks, 24); assert.equal(thin.verdict, "FALLS");
  const thick = evaluateDesign({ lengthUnits: 6, heightRows: 4, thickness: 3 });
  assert.equal(thick.faceArea, 24, "front area fixed"); assert.equal(thick.volumeBlocks, 72); assert.equal(thick.verdict, "HOLDS");
  assert.match(thick.areaVsVolume, /volume, not front area/);
  assert.equal(castleKernel.checker(castleKernel.diagnostic[2], 72).correct, true);
  assert.equal(castleKernel.checker(castleKernel.diagnostic[2], 24).correct, false);
  assert.equal(castleKernel.checker(castleKernel.transfer[0], "FALLS").correct, true, "short wall falls despite thickness");
});

test("K5 business: budget/price/units/cost/profit/break-even computed, loss honest, trade-offs", () => {
  const r = computeBusiness({ price: 5, units: 100, unitCost: 3, fixedCosts: 150 });
  assert.deepEqual([r.revenue, r.totalCosts, r.profit, r.breakEvenUnits], [500, 450, 50, 75]);
  const loss = computeBusiness({ price: 4, units: 50, unitCost: 4, fixedCosts: 100 });
  assert.equal(loss.profit, -100); assert.equal(loss.isLoss, true);
  assert.equal(computeBusiness({ price: 3, units: 10, unitCost: 3, fixedCosts: 50 }).breakEvenUnits, Infinity, "zero margin never breaks even");
  assert.equal(withinBudget({ budget: 400, price: 5, units: 100, unitCost: 3, fixedCosts: 150 }).withinBudget, false);
  const dec = evaluateDecisions({ unitCost: 3, fixedCosts: 150 }, [{ id: "A", price: 5, units: 100 }, { id: "B", price: 6, units: 80 }]);
  assert.equal(dec.bestByProfit.id, "B"); assert.equal(dec.bestByProfit.profit, 90);
  assert.ok(dec.options.every((o) => o.tradeoffs.length >= 3));
  assert.equal(businessKernel.checker(businessKernel.diagnostic[1], 50).correct, true);
  assert.equal(businessKernel.checker(businessKernel.diagnostic[1], 500).correct, false, "revenue is not profit");
  assert.equal(businessKernel.checker(businessKernel.practice[1], "B").correct, true);
});

test("K8 school kernels: history/physics/coding answers are computed, not opinion", async () => {
  const { historyKernel, physicsKernel, codingKernel } = await import("../src/kernels/index.js");
  const { computeHistory, centuryOf } = await import("../src/kernels/history.js");
  const { computePhysics } = await import("../src/kernels/physics.js");
  const { computeTrace } = await import("../src/kernels/coding.js");
  assert.equal(centuryOf(1969), 20); assert.equal(centuryOf(1215), 13);
  assert.deepEqual(computeHistory({}).ordered.map((e) => e.year), [476, 1215, 1440, 1903, 1914, 1945, 1969, 1989]);
  assert.equal(historyKernel.checker(historyKernel.diagnostic[0], "printing press invented").correct, true);
  assert.equal(historyKernel.checker(historyKernel.diagnostic[1], "19th").correct, false, "century trap must fail");
  assert.equal(historyKernel.checker(historyKernel.diagnostic[5], "no").correct, true, "effects cannot precede causes");
  assert.deepEqual([computePhysics({ distanceM: 100, timeS: 20 }).speed, computePhysics({ massKg: 2, speedMps: 3 }).kineticEnergy, computePhysics({ massKg: 4 }).weightN], [5, 9, 40]);
  assert.equal(physicsKernel.checker(physicsKernel.diagnostic[0], "5").correct, true);
  assert.equal(physicsKernel.checker(physicsKernel.diagnostic[4], 18).correct, false, "doubling speed quadruples energy");
  assert.equal(computeTrace({ start: 2, step: 3, count: 4 }).final, 14);
  assert.equal(codingKernel.checker(codingKernel.diagnostic[1], 14).correct, true);
  assert.equal(codingKernel.checker(codingKernel.diagnostic[1], 5).correct, false, "a loop is not one pass");
});

test("obscure fallback: inquiry steps, no fake facts, checker unscored", () => {
  const plan = inquiryPlan("how axolotls regrow limbs");
  assert.equal(plan.simulationSupported, false);
  assert.deepEqual(plan.steps, INQUIRY_STEPS);
  assert.ok(plan.unsupportedParts.some((u) => /bespoke/i.test(u)));
  assert.equal(obscureKernel.checker(obscureKernel.diagnostic[0], "I observe the axolotl has external gills").correct, true);
  const chk = obscureKernel.checker(obscureKernel.diagnostic[0], "axolotls definitely regrow hearts in 2 days");
  assert.equal(chk.scored, false); assert.equal(chk.factual, false, "must never claim to verify facts");
});
