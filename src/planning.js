// lesson-planner@1.0.0 — buildPlan / revisePlan (prerequisites before dependents, topological)
import { contentFor } from "./content.js";
export function buildPlan(topic, diagnosis) {
  const c = contentFor(topic); const steps = [];
  (diagnosis.prerequisitesMissing || []).forEach((p, i) => steps.push({ id: `prereq-${i}`, title: `Foundation: ${p}`, objective: `Shore up the missing prerequisite — ${p}.`, dependsOn: i ? [`prereq-${i - 1}`] : [], toolHint: "worked-example", kind: "prereq" }));
  c.steps.forEach((s, i) => steps.push({ id: `core-${i}`, title: s.title, objective: s.body, dependsOn: i === 0 ? (steps.length ? [steps[steps.length - 1].id] : []) : [`core-${i - 1}`], toolHint: i % 2 ? "knowledge-check" : "visual-steps", kind: "core" }));
  steps.push({ id: "practice", title: "Guided practice", objective: "Try it yourself with immediate feedback.", dependsOn: [`core-${c.steps.length - 1}`], toolHint: "knowledge-check", kind: "practice" });
  steps.push({ id: "verify", title: "New challenge — verify understanding", objective: "A fresh problem, different from practice.", dependsOn: ["practice"], toolHint: "knowledge-check", kind: "verify" });
  return { topic, steps };
}
export function revisePlan(plan, diagnosis) { return buildPlan(plan.topic, diagnosis); }
