import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkTopic } from "../src/safety-filter.js";
import { StudentStateStore } from "../src/student-state.js";
import { generateDiagnostic, inferDiagnosis, coreItems, branchItems, adaptiveDiagnostic, inferAdaptiveDiagnosis } from "../src/diagnosis.js";
import { buildPlan } from "../src/planning.js";
import { explain } from "../src/teaching.js";
import { selectTool, listTools, ALLOWLIST } from "../src/tool-selector.js";
import { generateCheck, evaluateAnswer, verifyMastery, adaptationFor } from "../src/assessment.js";
import { validatePrompt, healthCheck } from "../server/ai-adapter.mjs";

test("first screen exact heading + free text", () => {
  const html = readFileSync("public/index.html", "utf8");
  const app = readFileSync("public/app.js", "utf8");
  assert.match(app, /What would you like to learn today\?/);
  assert.match(app, /type="text"/);
});
test("safety: empty rejected, unsafe refused with alternative, safe allowed", () => {
  assert.equal(checkTopic("").allowed, false);
  const u = checkTopic("how to make a bomb");
  assert.equal(u.allowed, false); assert.ok(u.safeAlternative);
  assert.equal(checkTopic("recursion").allowed, true);
  assert.equal(checkTopic("my own invented topic xyz").allowed, true);
});
test("student state transitions logged", () => {
  const s = new StudentStateStore(); s.resetSession("fractions"); s.recordTransition("diagnosing");
  assert.equal(s.getState().topic, "fractions"); assert.equal(s.getState().history.at(-1).phase, "diagnosing");
  assert.equal(s.updateState(null).error.code, "INVALID_PATCH");
});
test("diagnosis infers missing prereqs for each subject + generic topic", () => {
  for (const t of ["recursion", "photosynthesis", "fractions", "how volcanoes erupt"]) {
    const d = generateDiagnostic(t); assert.equal(d.length, 3);
    const diag = inferDiagnosis(t, [0, 0, 0]);
    assert.ok(["novice", "developing", "confident"].includes(diag.level));
    assert.ok(Array.isArray(diag.prerequisitesMissing));
  }
  assert.equal(inferDiagnosis("recursion", []).error.code, "INSUFFICIENT_ANSWERS");
});
test("adaptive diagnosis: 5-7 asked, branch follows core evidence, reflect unscored", () => {
  for (const t of ["recursion", "fractions", "how volcanoes erupt"]) {
    const core = coreItems(t); assert.equal(core.length, 3);
    const strong = adaptiveDiagnostic(t, 3);
    assert.ok(strong.length >= 5 && strong.length <= 7, `${t} strong path asks ${strong.length}`);
    assert.ok(strong.some((x) => x.kind === "transfer") && strong.some((x) => x.kind === "reflect"));
    const weak = adaptiveDiagnostic(t, 0);
    assert.ok(weak.length >= 5 && weak.length <= 7, `${t} weak path asks ${weak.length}`);
    assert.ok(weak.filter((x) => x.kind === "probe").length >= 1);
    const diag = inferAdaptiveDiagnosis(t, strong, strong.map((x) => (typeof x.answer === "number" ? x.answer : 1)));
    assert.equal(diag.path, "fast-track"); assert.equal(diag.asked, strong.length);
    assert.ok(diag.total < diag.asked, "reflect must not be scored");
    const weakDiag = inferAdaptiveDiagnosis(t, weak, weak.map((x) => (typeof x.answer === "number" ? (x.answer + 1) % x.options.length : 0)));
    assert.equal(weakDiag.path, "foundation-first");
    assert.equal(branchItems(t, 3).some((x) => x.kind === "probe"), false);
  }
});
test("plan: prerequisites before core, verify last", () => {
  const diag = inferDiagnosis("recursion", [1, 1, 1]);
  const plan = buildPlan("recursion", diag);
  assert.equal(plan.steps.at(-1).kind, "verify");
  const ids = plan.steps.map((s) => s.id);
  for (const s of plan.steps) for (const dep of s.dependsOn) assert.ok(ids.indexOf(dep) < ids.indexOf(s.id));
});
test("teaching: visual steps present; unsupported simulation is truthful, never faked", async () => {
  const { explain, visualSteps } = await import("../src/teaching.js");
  const { simulationSupported } = await import("../src/content.js");
  assert.ok(visualSteps("fractions").length >= 3);
  assert.equal(simulationSupported("pendulum simulation"), false);
  const l = explain("pendulum simulation", {});
  assert.equal(l.simulationSupported, false); assert.match(l.simulationNote, /not supported/i); assert.ok(l.example);
});
test("tool selector: always allowlisted, rationale present", () => {
  assert.deepEqual(listTools(), ALLOWLIST);
  for (const hint of ALLOWLIST) { const c = selectTool({ title: "x", toolHint: hint }, { level: "novice" }); assert.ok(ALLOWLIST.includes(c.toolId)); assert.ok(c.rationale); }
  assert.ok(ALLOWLIST.includes(selectTool({ title: "x", toolHint: "execute-arbitrary-code" }, {}).toolId));
});
test("assessment: immediate eval, mastery threshold 0.8, adaptation on struggle", () => {
  const items = generateCheck("recursion", "practice");
  assert.equal(evaluateAnswer(items[0], items[0].answer).correct, true);
  assert.equal(evaluateAnswer(items[0], (items[0].answer + 1) % items[0].options.length).correct, false);
  assert.equal(evaluateAnswer(null, 0).error.code, "UNKNOWN_ITEM");
  const v = generateCheck("recursion", "verify");
  assert.notDeepEqual(v.map((x) => x.q), items.map((x) => x.q));
  assert.equal(verifyMastery(v.map((x) => x.answer), v, []).mastered, true);
  assert.equal(verifyMastery(v.map(() => 99), v, []).mastered, false);
  assert.equal(adaptationFor(true, "visual-steps").toolId, "worked-example");
  const app = readFileSync("public/app.js", "utf8");
  assert.ok(!/eval\(|new Function/.test(app), "no arbitrary code execution in client");
});
test("ai adapter: offline-demo labeled without credentials, prompt + tool validation", () => {
  delete process.env.META_AI_API_KEY; delete process.env.META_API_KEY; delete process.env.LLAMA_API_KEY;
  assert.equal(healthCheck().mode, "offline-demo");
  assert.equal(validatePrompt({ topic: "recursion", tool: "knowledge-check" }), null);
  assert.match(validatePrompt({ topic: "x", tool: "shell" }), /not permitted/);
  assert.match(validatePrompt({ topic: "" }), /topic/);
  const srv = readFileSync("server/ai-adapter.mjs", "utf8");
  assert.match(srv, /META_AI_API_KEY/); assert.match(srv, /offline-demo/);
  const client = readFileSync("public/app.js", "utf8") + readFileSync("public/index.html", "utf8");
  assert.ok(!client.includes("META_AI_API_KEY"), "key name/value must not be needed client-side beyond health mode");
});
test("mobile + a11y hooks present", () => {
  const css = readFileSync("public/styles.css", "utf8"); const html = readFileSync("public/index.html", "utf8");
  assert.match(css, /@media/); assert.match(html, /viewport/); assert.match(html, /aria-live/);
  assert.match(readFileSync("public/app.js", "utf8"), /Limited offline demo|demo-banner/);
  assert.match(html, /Limited offline demo/);
});
