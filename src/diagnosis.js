// diagnosis-engine@1.0.0 — generateDiagnostic / inferDiagnosis
import { contentFor } from "./content.js";
export function generateDiagnostic(topic) {
  const c = contentFor(topic);
  return c.diagnostic.map((d, i) => ({ id: `d${i}`, ...d }));
}
export function coreItems(topic) {
  return contentFor(topic).diagnostic.map((d, i) => ({ id: `core${i}`, kind: "core", scored: true, ...d }));
}
export function branchItems(topic, coreCorrect) {
  const c = contentFor(topic);
  const reflect = { id: "reflect", kind: "reflect", scored: false, q: "Thinking about those answers — how sure were you, honestly?", options: ["Sure of most", "Partly guessing", "I misread at least one question"], answer: null, prereq: "self-report" };
  const transferSrc = (c.verify && c.verify[0]) || (c.practice && c.practice[1]) || c.practice[0];
  const transfer = transferSrc ? { id: "transfer", kind: "transfer", scored: true, prereq: "transfer to a fresh problem", ...transferSrc } : null;
  const probeSrc = c.practice && c.practice[0];
  const probe = probeSrc ? { id: "probe", kind: "probe", scored: true, prereq: probeSrc.prereq || "applying the idea with support", ...probeSrc } : null;
  const probe2Src = c.practice && c.practice[1];
  const probe2 = probe2Src && probe2Src !== transferSrc ? { id: "probe2", kind: "probe", scored: true, prereq: probe2Src.prereq || "applying the idea with support", ...probe2Src } : null;
  if (coreCorrect >= 3) return [transfer, reflect].filter(Boolean);
  if (coreCorrect <= 1) return [probe, probe2, reflect].filter(Boolean);
  return [probe, transfer, reflect].filter(Boolean);
}
export function adaptiveDiagnostic(topic, coreCorrect) {
  return [...coreItems(topic), ...branchItems(topic, coreCorrect)];
}
export function inferAdaptiveDiagnosis(topic, items, answers) {
  if (!Array.isArray(items) || !Array.isArray(answers) || answers.length === 0) return { error: { code: "INSUFFICIENT_ANSWERS", message: "Answer at least one diagnostic question." } };
  const c = contentFor(topic);
  let correct = 0; let scoredTotal = 0; const known = []; const missing = [];
  items.forEach((it, i) => {
    if (!it || it.scored === false || typeof it.answer !== "number") return;
    scoredTotal++;
    if (answers[i] === it.answer) { correct++; known.push(it.prereq); } else missing.push(it.prereq);
  });
  if (scoredTotal === 0) return { error: { code: "INSUFFICIENT_ANSWERS", message: "Answer at least one scored diagnostic question." } };
  const ratio = correct / scoredTotal;
  const level = ratio >= 0.99 ? "confident" : ratio >= 0.5 ? "developing" : "novice";
  const reflectIdx = items.findIndex((it) => it.kind === "reflect");
  const reflection = reflectIdx >= 0 ? items[reflectIdx].options[answers[reflectIdx]] || null : null;
  const coreCorrect = items.filter((it, i) => it.kind === "core" && answers[i] === it.answer).length;
  const path = coreCorrect >= 3 ? "fast-track" : coreCorrect <= 1 ? "foundation-first" : "standard";
  return { level, prerequisitesKnown: known, prerequisitesMissing: missing, misconceptions: missing.length ? [...c.misconceptions].slice(0, missing.length) : [], confidence: Math.round((0.5 + ratio / 2) * 100) / 100, correct, total: scoredTotal, asked: items.length, path, reflection };
}
export function inferDiagnosis(topic, answers) {
  if (!Array.isArray(answers) || answers.length === 0) return { error: { code: "INSUFFICIENT_ANSWERS", message: "Answer at least one diagnostic question." } };
  const c = contentFor(topic); const diag = c.diagnostic;
  let correct = 0; const known = [], missing = [];
  answers.forEach((a, i) => { if (a === diag[i]?.answer) { correct++; known.push(diag[i].prereq); } else if (diag[i]) missing.push(diag[i].prereq); });
  const ratio = correct / diag.length;
  const level = ratio >= 0.99 ? "confident" : ratio >= 0.5 ? "developing" : "novice";
  const misconceptions = missing.length ? [...c.misconceptions].slice(0, missing.length) : [];
  return { level, prerequisitesKnown: known, prerequisitesMissing: missing, misconceptions, confidence: Math.round((0.5 + ratio / 2) * 100) / 100, correct, total: diag.length };
}
