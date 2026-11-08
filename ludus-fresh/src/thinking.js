// thinking-engine (P2) — pure, deterministic. Elicits answer+confidence+strategy,
// codes how the learner showed they think, keeps per-skill teaching evidence.
// Never mind-reads: every code carries the observable evidence that produced it.
// Reuse: adaptive branching shape mirrors gold src/diagnosis.js (branchItems /
// inferAdaptiveDiagnosis in /workspaces/Meta-hackathon-ludus/src/diagnosis.js),
// re-implemented over kernel items so kernels stay self-contained pure modules.

export const THINKING_CODES = ["slip", "misread", "prereq-gap", "misconception", "sound"];

const MISREAD_RE = /misread|read (it|the question) wrong|thought (it|the question) asked|different question|answered what|looked at the wrong|wrong (row|column|unit)/i;
const GUESS_RE = /guess|not sure|no idea (but|so) i picked|random|just picked/i;
const NO_PREREQ_RE = /don'?t know|never (learned|seen|did)|what (is|does) .{1,30} mean|haven'?t covered|not taught/i;
const METHOD_HINTS = ["divided", "shared", "equal parts", "multiplied", "times", "added", "subtracted", "counted", "split", "groups of", "area", "volume", "profit", "cost", "humidity", "temperature", "condens", "evaporat", "eats", "diet", "thickness", "depth"];

export function normalizeConfidence(confidence) {
  if (typeof confidence === "number" && Number.isFinite(confidence)) {
    return confidence > 1 ? Math.max(0, Math.min(1, confidence / 100)) : Math.max(0, Math.min(1, confidence));
  }
  const s = String(confidence ?? "").trim().toLowerCase();
  if (!s) return 0.5;
  if (/unsure|not sure|guess/.test(s)) return 0.2;
  if (/^(sure|certain|high|confident|very sure)/.test(s) || s === "1") return 0.9;
  if (/^(partly|medium|somewhat|half)/.test(s)) return 0.5;
  if (/^(guess|low)/.test(s) || s === "0") return 0.2;
  const n = Number(s);
  return Number.isFinite(n) ? normalizeConfidence(n) : 0.5;
}

function strategySignals(strategy) {
  const s = String(strategy ?? "");
  const lower = s.toLowerCase();
  return {
    text: s,
    misread: MISREAD_RE.test(s),
    guessed: GUESS_RE.test(s),
    missingPrereq: NO_PREREQ_RE.test(s),
    hasMethod: METHOD_HINTS.some((h) => lower.includes(h)),
  };
}

// item (optional): { prereq, misconceptionKeywords?: string[], misreadValue?,
//   methodKeywords?: string[] } — known-wrong traps make coding exact, not vibes.
export const TEACHING_METHODS = {
  sound: { name: "Retrieval and stretch", move: "Recall it unaided, then a harder variant — no re-teaching needed." },
  slip: { name: "Worked example with faded steps", move: "Show one worked example, then hand over step by step, checking each line." },
  misread: { name: "Slow re-read (Socratic)", move: "Re-read the question together, word by word, and say what it actually asks before answering." },
  "prereq-gap": { name: "Prerequisite in miniature", move: "Teach the missing building block first, briefly and concretely, then return to the question." },
  misconception: { name: "Contrasting case (confront the model)", move: "Present a case the wrong model cannot explain, let it fail visibly, then rebuild the right model." },
};
export function teachingMethodFor(code) { return TEACHING_METHODS[code] || TEACHING_METHODS.slip; }

export function codeResponse({ correct, answer, expected, confidence, strategy, item } = {}) {
  const conf = normalizeConfidence(confidence);
  const sig = strategySignals(strategy);
  const strat = sig.text.trim();
  const misconceptionHit = (item?.misconceptionKeywords || []).some((k) => strat.toLowerCase().includes(String(k).toLowerCase()))
    || (item?.misconceptionAnswer !== undefined && answer !== undefined && String(answer) === String(item.misconceptionAnswer));
  const methodHit = sig.hasMethod || (item?.methodKeywords || []).some((k) => strat.toLowerCase().includes(String(k).toLowerCase()));
  const isMisreadTrap = item?.misreadValue !== undefined && answer !== undefined && String(answer) === String(item.misreadValue);

  if (sig.misread || isMisreadTrap) {
    return { code: "misread", correct: !!correct, confidence: conf, evidence: sig.misread ? `Strategy shows a different question was answered: "${strat}"` : `Answer ${JSON.stringify(answer)} matches the misread trap (expected ${JSON.stringify(expected)}).` };
  }
  const misconceptionInStrategy = (item?.misconceptionKeywords || []).some((k) => strat.toLowerCase().includes(String(k).toLowerCase()));
  if (!correct && misconceptionInStrategy) {
    return { code: "misconception", correct: false, confidence: conf, evidence: `Systematic wrong model in strategy/answer: "${strat || answer}"${item?.misconception ? ` — known misconception: ${item.misconception}` : ""}` };
  }
  if (!correct && sig.missingPrereq) {
    return { code: "prereq-gap", correct: false, confidence: conf, evidence: `Strategy reports the prerequisite is missing: "${strat}"${item?.prereq ? ` (prerequisite: ${item.prereq})` : ""}` };
  }
  if (!correct && /area/.test(strat.toLowerCase()) && (item?.params?.volume || /volume/.test(item?.skill || ""))) {
    return { code: "misconception", correct: false, confidence: conf, evidence: `Answered the front area when volume was asked: "${strat}" — area and volume are different measures.` };
  }
  if (!correct && misconceptionHit) {
    return { code: "misconception", correct: false, confidence: conf, evidence: `Systematic wrong model in strategy/answer: "${strat || answer}"${item?.misconception ? ` — known misconception: ${item.misconception}` : ""}` };
  }
  if (correct && (sig.guessed || conf < 0.35)) {
    return { code: "slip", correct: true, confidence: conf, evidence: `Correct answer but fragile: confidence ${conf} / strategy "${strat || "(none given)"}" — needs an unassisted variant before mastery.` };
  }
  if (!correct && methodHit) {
    return { code: "slip", correct: false, confidence: conf, evidence: `Method named in strategy is sound ("${strat}") but the result ${JSON.stringify(answer)} != expected ${JSON.stringify(expected)} — execution slip, not a wrong model.` };
  }
  if (correct && conf >= 0.35 && (methodHit || strat.length > 0)) {
    return { code: "sound", correct: true, confidence: conf, evidence: `Correct (${JSON.stringify(expected)}) with stated method: "${strat || "answer given with adequate confidence"}" and confidence ${conf}.` };
  }
  if (correct) {
    return { code: "slip", correct: true, confidence: conf, evidence: `Correct answer ${JSON.stringify(expected)} but no method was stated — right result, unproven thinking; needs an unassisted variant before it counts as sound.` };
  }
  if (!strat) {
    return { code: "prereq-gap", correct: false, confidence: conf, evidence: `Wrong answer ${JSON.stringify(answer)} with no strategy given — prerequisite probe needed before assuming a misconception (expected ${JSON.stringify(expected)}).` };
  }
  return { code: "misconception", correct: false, confidence: conf, evidence: `Wrong answer ${JSON.stringify(answer)} (expected ${JSON.stringify(expected)}) with strategy "${strat}" that does not match the taught method.` };
}

export function elicit(item, response = {}) {
  const answer = response.answer;
  if (answer === undefined || answer === null || answer === "") {
    return { error: { code: "INSUFFICIENT_ANSWERS", message: "Answer at least one question so Professor D can see how you think." } };
  }
  return { itemId: item?.id ?? null, skill: item?.skill ?? item?.prereq ?? "general", answer, confidence: normalizeConfidence(response.confidence), strategy: String(response.strategy ?? "") };
}

// --- Teaching-experience record (immutable updates) ---
export function createTeachingRecord() { return { skills: {}, entries: [] }; }

export function recordExperience(record, { skill = "general", coded, adaptation = null, outcome = null } = {}) {
  const base = record && record.skills ? record : createTeachingRecord();
  const prev = base.skills[skill] || { attempts: 0, byCode: {}, adaptations: [], lastCode: null, mastered: false };
  const byCode = { ...prev.byCode };
  if (coded?.code) byCode[coded.code] = (byCode[coded.code] || 0) + 1;
  const entry = { skill, code: coded?.code ?? null, evidence: coded?.evidence ?? "", adaptation, outcome };
  return {
    skills: { ...base.skills, [skill]: { attempts: prev.attempts + 1, byCode, adaptations: adaptation ? [...prev.adaptations, adaptation] : [...prev.adaptations], lastCode: coded?.code ?? prev.lastCode, mastered: prev.mastered } },
    entries: [...base.entries, entry],
  };
}

export function markMastered(record, skill, transferEvidence) {
  const base = record && record.skills ? record : createTeachingRecord();
  const prev = base.skills[skill] || { attempts: 0, byCode: {}, adaptations: [], lastCode: null, mastered: false };
  return { skills: { ...base.skills, [skill]: { ...prev, mastered: true } }, entries: [...base.entries, { skill, code: "sound", evidence: String(transferEvidence || "Unassisted transfer success."), adaptation: null, outcome: "mastered" }] };
}

export function evidenceFor(record, skill) {
  if (!record) return [];
  return (record.entries || []).filter((e) => e.skill === skill);
}
export function summariseThinking(record) {
  if (!record) return [];
  return Object.entries(record.skills || {}).map(([skill, s]) => ({ skill, attempts: s.attempts, byCode: s.byCode, lastCode: s.lastCode, adaptations: s.adaptations, mastered: s.mastered, evidence: evidenceFor(record, skill).map((e) => e.evidence) }));
}

// --- Adaptive diagnostic session: 5-10 items, core -> branch, reflect unscored ---
export const REFLECT_ITEM = Object.freeze({ id: "reflect", kind: "reflect", scored: false, skill: "self-report", q: "Thinking about those answers — how sure were you, honestly?", prompt: "Thinking about those answers — how sure were you, honestly?", options: ["Sure of most", "Partly guessing", "I misread at least one question"], answer: null, prereq: "self-report" });

export function branchPlan(kernel, coreCorrect) {
  // Dedicated diagnostic probes live in kernel.diagnostic after the 3 core
  // items (kind "practice" = foundation probe, kind "transfer" = stretch
  // probe). Branching never re-asks practice/transfer items, so no question
  // repeats later in the lesson. Fallback keeps older kernels working.
  const probes = (kernel?.diagnostic || []).slice(3);
  const foundation = probes.filter((i) => i.kind === "practice");
  const stretch = probes.filter((i) => i.kind === "transfer");
  if (foundation.length || stretch.length) {
    if (coreCorrect >= 3) return { path: "fast-track", items: [...stretch.slice(0, 2), REFLECT_ITEM].filter(Boolean) };
    if (coreCorrect <= 1) return { path: "foundation-first", items: [...foundation.slice(0, 2), REFLECT_ITEM].filter(Boolean) };
    return { path: "standard", items: [foundation[0], stretch[0], REFLECT_ITEM].filter(Boolean) };
  }
  const practice = kernel?.practice || [];
  const transfer = kernel?.transfer || [];
  if (coreCorrect >= 3) return { path: "fast-track", items: [...transfer.slice(0, 2), REFLECT_ITEM].filter(Boolean) };
  if (coreCorrect <= 1) return { path: "foundation-first", items: [...practice.slice(0, 2), REFLECT_ITEM].filter(Boolean) };
  return { path: "standard", items: [practice[0], transfer[0], REFLECT_ITEM].filter(Boolean) };
}

function scoreItems(kernel, items, responses) {
  let correct = 0, total = 0;
  const coded = [], known = [], missing = [];
  items.forEach((item, i) => {
    const r = responses[i] || {};
    if (!item || item.scored === false || item.kind === "reflect") return;
    const res = kernel.checker(item, r.answer);
    total += 1;
    if (res.correct) { correct += 1; known.push(item.prereq || item.skill); } else missing.push(item.prereq || item.skill);
    coded.push({ itemId: item.id, skill: item.skill, ...codeResponse({ correct: res.correct, answer: r.answer, expected: res.expected, confidence: r.confidence, strategy: r.strategy, item }) });
  });
  return { correct, total, coded, known, missing };
}

export class AdaptiveDiagnosticSession {
  constructor(kernel) {
    if (!kernel?.diagnostic?.length || typeof kernel.checker !== "function") throw Object.assign(new Error("Kernel needs diagnostic items and a checker."), { code: "INVALID_KERNEL" });
    this.kernel = kernel;
    this.phase = "core";
    this.coreItems = kernel.diagnostic.slice(0, 3);
    this.branchItems = null;
    this.path = null;
    this._core = null;
    this._result = null;
  }
  currentItems() { return this.phase === "core" ? this.coreItems : this.phase === "branch" ? this.branchItems : []; }
  get totalPlanned() { return this.branchItems ? this.coreItems.length + this.branchItems.length : this.coreItems.length; }
  submitCore(responses = []) {
    if (this.phase !== "core") throw Object.assign(new Error("Core already submitted."), { code: "WRONG_PHASE" });
    if (!responses.length) return { error: { code: "INSUFFICIENT_ANSWERS", message: "Answer at least one diagnostic question." } };
    const scored = scoreItems(this.kernel, this.coreItems, responses);
    this._core = { responses, ...scored };
    const plan = branchPlan(this.kernel, scored.correct);
    this.path = plan.path;
    this.branchItems = plan.items;
    this.phase = "branch";
    return { coreCorrect: scored.correct, coreTotal: scored.total, path: this.path, nextItems: this.branchItems, coded: scored.coded };
  }
  submitBranch(responses = []) {
    if (this.phase !== "branch") throw Object.assign(new Error("Submit core answers first."), { code: "WRONG_PHASE" });
    const scored = scoreItems(this.kernel, this.branchItems, responses);
    const reflectIdx = this.branchItems.findIndex((it) => it.kind === "reflect");
    const reflectResp = reflectIdx >= 0 ? responses[reflectIdx] : null;
    const reflection = reflectResp ? (REFLECT_ITEM.options[reflectResp.answer] ?? reflectResp.answer ?? reflectResp.strategy ?? null) : null;
    const correct = this._core.correct + scored.correct;
    const total = this._core.total + scored.total;
    const asked = this.coreItems.length + this.branchItems.length;
    const ratio = total ? correct / total : 0;
    const coded = [...this._core.coded, ...scored.coded];
    const missing = [...this._core.missing, ...scored.missing];
    this.phase = "done";
    this._result = {
      kernelId: this.kernel.id, level: total === 0 ? "exploring-unscored" : ratio >= 0.99 ? "confident" : ratio >= 0.5 ? "developing" : "novice",
      path: this.path, correct, total, asked, reflection,
      prerequisitesKnown: [...this._core.known, ...scored.known], prerequisitesMissing: missing,
      misconceptions: [...new Set(coded.filter((c) => c.code === "misconception").map((c) => c.skill))],
      coded, evidence: coded.map((c) => `${c.itemId}: [${c.code}] ${c.evidence}`),
    };
    return this._result;
  }
  result() { return this._result; }
}

export function runDiagnostic(kernel, coreResponses, branchResponses) {
  const s = new AdaptiveDiagnosticSession(kernel);
  const core = s.submitCore(coreResponses);
  if (core.error) return core;
  return s.submitBranch(branchResponses);
}
