import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkTopic } from "../src/safety-filter.js";
import { StudentStateStore } from "../src/student-state.js";
import { generateDiagnostic, inferDiagnosis } from "../src/diagnosis.js";
import { buildPlan } from "../src/planning.js";
import { explain, visualSteps } from "../src/teaching.js";
import { selectTool, ALLOWLIST } from "../src/tool-selector.js";
import { generateCheck, evaluateAnswer, verifyMastery, adaptationFor } from "../src/assessment.js";

// Headless replay of the exact public/app.js pipeline (same modules, same order):
// intake -> diagnosing -> planning -> teaching(+tool) -> practicing -> adapting -> verifying -> summary.
function runFlow(topic, { diagnosticAnswers, practiceWrongAt = 0 } = {}) {
  const store = new StudentStateStore();
  store.resetSession(topic);
  const phases = [];
  const go = (p) => { store.recordTransition(p); phases.push(p); };

  go("diagnosing");
  const diagItems = generateDiagnostic(topic);
  const diagnosis = inferDiagnosis(topic, diagnosticAnswers ?? diagItems.map((d) => d.answer));
  assert.ok(!diagnosis.error, `diagnosis failed for ${topic}`);
  store.updateState({ level: diagnosis.level, prerequisitesKnown: diagnosis.prerequisitesKnown, prerequisitesMissing: diagnosis.prerequisitesMissing, misconceptions: diagnosis.misconceptions });

  go("planning");
  const plan = buildPlan(topic, diagnosis);
  const tool = selectTool(plan.steps.find((s) => s.kind === "core") || plan.steps[0], store.getState());

  go("teaching");
  const lesson = explain(topic, store.getState());
  const steps = visualSteps(topic);

  go("practicing");
  const practice = generateCheck(topic, "practice");
  const practiceAnswers = practice.map((it, i) => (i === practiceWrongAt ? (it.answer + 1) % it.options.length : it.answer));
  const evals = practice.map((it, i) => evaluateAnswer(it, practiceAnswers[i]));
  const practiceScore = practice.filter((it, i) => practiceAnswers[i] === it.answer).length / practice.length;
  store.updateState({ practiceScore });

  const struggled = evals.some((e) => !e.correct);
  let adaptation = null;
  if (struggled || practiceScore < 0.8) {
    go("adapting");
    adaptation = adaptationFor(true, tool.toolId);
    store.getState().adaptations.push({ ...adaptation, at: new Date().toISOString(), practiceScore });
    go("teaching"); // re-teach with the adapted tool, as app.js renderTeaching(true) does
  }

  go("verifying");
  const verify = generateCheck(topic, "verify");
  const verifyAnswers = verify.map((it) => it.answer);
  const mastery = verifyMastery(verifyAnswers, verify, []);
  store.updateState({ verifyScore: mastery.score });

  go("summary");
  return { store, phases, diagItems, diagnosis, plan, tool, lesson, steps, practice, evals, practiceScore, adaptation, verify, mastery, state: store.getState() };
}

const SUBJECTS = [
  { topic: "recursion", kind: "programming" },
  { topic: "photosynthesis", kind: "science" },
  { topic: "fractions", kind: "mathematics (distinct third subject)" },
  { topic: "how volcanoes erupt", kind: "unfamiliar generic safe topic" },
];

for (const { topic, kind } of SUBJECTS) {
  test(`E2E logic [${kind}]: "${topic}" intake->diagnose->plan->teach->tool->practice->adapt->verify->summary`, () => {
    assert.equal(checkTopic(topic).allowed, true);
    const r = runFlow(topic);
    // Diagnose: 3 questions, level + prereq split inferred.
    assert.equal(r.diagItems.length, 3);
    assert.ok(["novice", "developing", "confident"].includes(r.diagnosis.level));
    // Plan: prerequisites before dependents (topological), verify step last.
    const ids = r.plan.steps.map((s) => s.id);
    for (const s of r.plan.steps) for (const dep of s.dependsOn) assert.ok(ids.indexOf(dep) < ids.indexOf(s.id), `${topic}: ${dep} must precede ${s.id}`);
    assert.equal(r.plan.steps.at(-1).kind, "verify");
    // Teach + tool: principles, >=3 visual steps, worked example, allowlisted tool with rationale.
    assert.ok(r.lesson.markdown.length >= 3);
    assert.ok(r.steps.length >= 3);
    assert.ok(r.lesson.example);
    assert.ok(ALLOWLIST.includes(r.tool.toolId));
    assert.ok(r.tool.rationale);
    // Practice: immediate per-answer evaluation; the deliberate wrong answer is flagged.
    assert.equal(r.evals.length, r.practice.length);
    assert.equal(r.evals.filter((e) => !e.correct).length, 1);
    // Adapt: struggle changes tool/strategy and is recorded in student state.
    assert.ok(r.adaptation, `${topic}: expected an adaptation after a wrong practice answer`);
    assert.equal(r.adaptation.strategy, "change-tool-and-simplify");
    assert.notEqual(r.adaptation.toolId, undefined);
    assert.equal(r.state.adaptations.length, 1);
    assert.equal(r.state.adaptations[0].strategy, "change-tool-and-simplify");
    // Verify: items distinct from practice; all-correct clears the >=0.8 mastery bar.
    assert.notDeepEqual(r.verify.map((x) => x.q), r.practice.map((x) => x.q));
    assert.equal(r.mastery.mastered, true);
    assert.ok(r.mastery.score >= 0.8);
    // Summary state + full phase trail in order.
    assert.deepEqual(r.phases, ["diagnosing", "planning", "teaching", "practicing", "adapting", "teaching", "verifying", "summary"]);
    assert.equal(r.state.topic, topic);
    assert.equal(r.state.practiceScore, (r.practice.length - 1) / r.practice.length);
    assert.equal(r.state.verifyScore, 1);
  });
}

test("E2E logic: novice diagnosis (all diagnostic answers wrong) still plans foundations first", () => {
  const items = generateDiagnostic("recursion");
  const wrong = items.map((d) => (d.answer + 1) % d.options.length);
  const r = runFlow("recursion", { diagnosticAnswers: wrong, practiceWrongAt: -1 });
  assert.equal(r.diagnosis.level, "novice");
  assert.ok(r.diagnosis.prerequisitesMissing.length >= 1);
  assert.ok(r.plan.steps[0].kind === "prereq" || r.diagnosis.prerequisitesMissing.length === 0);
});

test("E2E logic: mastery withheld below 0.8 or with a remaining misconception; wrong verify answers fail honestly", () => {
  const verify = generateCheck("photosynthesis", "verify");
  assert.equal(verifyMastery(verify.map((x) => x.answer), verify, []).mastered, true);
  assert.equal(verifyMastery(verify.map(() => 99), verify, []).mastered, false);
  assert.equal(verifyMastery(verify.map((x) => x.answer), verify, ["Thinking plants get their food from the soil"]).mastered, false);
});

test("app shell wires the full judge flow in spec order", () => {
  const app = readFileSync("public/app.js", "utf8");
  assert.match(app, /PHASES = \["intake","diagnosing","planning","teaching","practicing","adapting","verifying","summary"\]/);
  for (const fn of ["renderIntake", "renderDiagnostic", "renderTeaching", "renderPractice", "renderVerify", "renderSummary"]) assert.match(app, new RegExp(fn));
  assert.match(app, /adaptations\.push/);
});
