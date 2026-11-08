// assessment-engine@1.0.0 — generateCheck / evaluateAnswer / verifyMastery (threshold >= 0.8)
import { contentFor } from "./content.js";
export function generateCheck(topic, kind = "practice") {
  const c = contentFor(topic); const items = kind === "verify" ? c.verify : c.practice;
  return items.map((it, i) => ({ id: `${kind}-${i}`, ...it }));
}
export function evaluateAnswer(item, answerIndex) {
  if (!item) return { error: { code: "UNKNOWN_ITEM", message: "Unknown assessment item." } };
  const correct = answerIndex === item.answer;
  return { correct, feedback: item.feedback, misconceptionDetected: correct ? null : "The underlying rule needs another look — see the adapted explanation.", masteryDelta: correct ? 0.5 : -0.1 };
}
export function verifyMastery(answers, items, remainingMisconceptions = []) {
  const correct = items.filter((it, i) => answers[i] === it.answer).length;
  const score = items.length ? correct / items.length : 0;
  return { mastered: score >= 0.8 && remainingMisconceptions.length === 0, score, correct, total: items.length, remainingMisconceptions };
}
export function adaptationFor(struggled, currentTool) {
  if (!struggled) return { strategy: "raise-difficulty", toolId: "knowledge-check", reason: "Correct answers — raising difficulty with a fresh challenge." };
  const next = currentTool === "visual-steps" ? "worked-example" : "visual-steps";
  return { strategy: "change-tool-and-simplify", toolId: next, reason: `A wrong answer or hint request signals struggle, so Professor D switches tool to ${next}, re-teaches the prerequisite in simpler words, and slows the pacing.` };
}
