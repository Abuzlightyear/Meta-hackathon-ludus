// Dynamic lessons: Professor D (live AI) builds a topic-specific lesson in
// the window for subjects with no hand-built kernel. The generated model
// answers are AI answers — checked by normalisation here, labelled
// AI-assessed in the UI, and never presented as kernel-verified mastery.
const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/[.!?]+$/, "").replace(/^(the|a|an)\s+/, "").replace(/\s+/g, " ");
const numOf = (v) => { if (typeof v === "number") return v; const m = String(v ?? "").replace(/,/g, "").match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : NaN; };

export function checkDynamic(item, answer) {
  const expected = item.answer;
  const en = numOf(expected), an = numOf(answer);
  const correct = Number.isFinite(en) && Number.isFinite(an)
    ? Math.abs(an - en) <= Math.max(0.011, Math.abs(en) * 0.01)
    : norm(answer) === norm(expected) || norm(answer) === norm(expected).split(" (")[0];
  return { correct, expected, given: answer, feedback: correct ? (item.feedback || "Correct.") : `${item.feedback || "Not quite."} (Expected: ${expected}.)` };
}

export function parseDynamicLesson(text) {
  const raw = String(text || "").replace(/```(?:json)?/gi, "").trim();
  const start = raw.indexOf("{"), end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
}

const cleanItem = (raw, kind, i) => {
  if (!raw || typeof raw !== "object") return null;
  const q = String(raw.q || raw.question || "").trim();
  const answer = raw.answer;
  if (q.length < 25 || !q.includes("?")) return null;
  if (answer === undefined || answer === null || String(answer).trim() === "") return null;
  return {
    id: `dyn-${kind}-${i + 1}`, kind, scored: true,
    skill: String(raw.skill || "understanding").slice(0, 60),
    prereq: String(raw.prereq || "everyday reasoning").slice(0, 80),
    q, prompt: q, answer,
    purpose: String(raw.purpose || "Professor D generated this to see how you think about the topic.").slice(0, 240),
    feedback: String(raw.feedback || "Compare your answer with the expected one and notice the key idea.").slice(0, 500),
    ...(raw.misconceptionAnswer !== undefined ? { misconceptionAnswer: raw.misconceptionAnswer } : {}),
    ...(raw.misconception ? { misconception: String(raw.misconception).slice(0, 160) } : {}),
  };
};

export function createDynamicKernel(raw, topic) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.diagnostic)) return null;
  const diagRaw = raw.diagnostic;
  const core = diagRaw.slice(0, 3).map((r, i) => cleanItem(r, "diagnostic", i));
  const foundation = cleanItem(diagRaw[3] || (Array.isArray(raw.practice) ? raw.practice[0] : null), "practice", 3);
  const stretch = cleanItem(diagRaw[4] || (Array.isArray(raw.transfer) ? raw.transfer[0] : null), "transfer", 4);
  const practice = (Array.isArray(raw.practice) ? raw.practice : []).map((r, i) => cleanItem(r, "practice", i)).filter(Boolean).slice(0, 3);
  const transfer = (Array.isArray(raw.transfer) ? raw.transfer : []).map((r, i) => cleanItem(r, "transfer", i)).filter(Boolean).slice(0, 3);
  if (core.some((x) => !x) || !foundation || !stretch || practice.length < 2 || transfer.length < 2) return null;
  const diagnostic = [...core, foundation, stretch];
  const ids = [...diagnostic, ...practice, ...transfer].map((i) => i.id);
  if (new Set(ids).size !== ids.length) return null;
  const concepts = (Array.isArray(raw.concepts) ? raw.concepts : []).map((c) => String(c).slice(0, 200)).filter(Boolean).slice(0, 5);
  if (concepts.length < 2) return null;
  return {
    id: "obscure", dynamic: true,
    title: `${topic} — live-generated lesson`,
    concepts,
    prerequisites: (Array.isArray(raw.prerequisites) ? raw.prerequisites : ["everyday reasoning"]).map((c) => String(c).slice(0, 120)).slice(0, 4),
    misconceptions: (Array.isArray(raw.misconceptions) ? raw.misconceptions : []).map((c) => String(c).slice(0, 160)).slice(0, 4),
    diagnostic, practice, transfer,
    checker: checkDynamic,
    compute: {},
  };
}

export const DYNAMIC_LESSON_MESSAGE = (topic) => `Create a complete beginner lesson about "${topic}". Return ONLY a JSON object, no markdown, no commentary, in exactly this shape:
{"concepts":["3-5 short factual concepts"],"prerequisites":["..."],"misconceptions":["..."],"diagnostic":[{"q":"full question ending in ?","answer":"one unambiguous expected answer","skill":"short skill name","prereq":"...","purpose":"why this question, one sentence","feedback":"teaches the idea in 1-2 sentences","misconceptionAnswer":"optional wrong trap answer"},{"q":"...","answer":"..."},{"q":"...","answer":"..."},{"q":"easier foundation question","answer":"..."},{"q":"harder stretch question","answer":"..."}],"practice":[{"q":"...","answer":"..."},{"q":"...","answer":"..."},{"q":"...","answer":"..."}],"transfer":[{"q":"fresh-context question","answer":"..."},{"q":"fresh-context question","answer":"..."}]}
Rules: every question must be a real question about ${topic} with ONE clearly correct, short, checkable answer (a number, a term, or a name — never an opinion or an essay). Order the first three diagnostic questions as a ladder: concrete entry, core idea, common misconception. Make answers specific facts about ${topic}, not generic study advice. Keep each question under 320 characters.`;
