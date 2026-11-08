// kernel-history — chronology, centuries, cause and turning points.
// Every scored answer is computed from the dated event table; nothing is opinion.
export const HISTORY_EVENTS = {
  "Roman Empire falls": 476,
  "Magna Carta signed": 1215,
  "printing press invented": 1440,
  "first powered flight": 1903,
  "First World War begins": 1914,
  "Second World War ends": 1945,
  "Moon landing": 1969,
  "Berlin Wall falls": 1989,
};
export function centuryOf(year) { return Math.floor((Number(year) - 1) / 100) + 1; }
export function ordinal(n) { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
export function orderEvents(names) {
  return [...names].filter((n) => n in HISTORY_EVENTS).sort((a, b) => HISTORY_EVENTS[a] - HISTORY_EVENTS[b]);
}
export function computeHistory({ events = Object.keys(HISTORY_EVENTS) } = {}) {
  const ordered = orderEvents(events).map((name) => ({ name, year: HISTORY_EVENTS[name], century: ordinal(centuryOf(HISTORY_EVENTS[name])) }));
  return { ordered, text: ordered.map((e) => `${e.year} ${e.name}`).join("  →  ") };
}
export function checkHistory(item, answer) {
  let expected = item.answer;
  if (item.params?.earlierOf) { const [a, b] = item.params.earlierOf; expected = HISTORY_EVENTS[a] <= HISTORY_EVENTS[b] ? a : b; }
  if (item.params?.centuryEvent) expected = ordinal(centuryOf(HISTORY_EVENTS[item.params.centuryEvent]));
  const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/[.!?]+$/, "");
  if (typeof expected === "boolean") {
    const said = norm(answer);
    const correct = expected ? /^(yes|true)\b/.test(said) : /^(no|false)\b/.test(said);
    return { correct, expected, given: answer, feedback: correct ? (item.feedback || "Correct.") : `${item.feedback || "Not quite."} (Expected: ${expected ? "yes" : "no"}.)` };
  }
  const a = norm(answer), e = norm(expected);
  const correct = a === e || (e.length >= 4 && a.includes(e)) || (a.length >= 4 && e.includes(a));
  return { correct, expected, given: answer, feedback: correct ? (item.feedback || "Correct.") : `${item.feedback || "Not quite."} (Expected: ${expected}.)` };
}
const mk = (kind) => (id, skill, prereq, q, answer, extra = {}) => ({ id, kind, scored: true, skill, prereq, q, prompt: q, answer, ...extra });
const D = mk("diagnostic"), P = mk("practice"), T = mk("transfer");
export const historyKernel = {
  id: "history", title: "History — timelines, centuries and turning points",
  concepts: ["Chronology: putting events in time order is the skeleton every history story hangs on", "A century is 100 years: 1969 is in the 20th century, because the 1st century is years 1–100", "Causes come before effects — an event can only cause what happens after it", "Turning points are events after which things were never quite the same"],
  prerequisites: ["reading years as numbers on a line", "that bigger year means later, not bigger importance", "cause and effect in everyday life"],
  misconceptions: ["Thinking 1969 is in the 19th century because it starts with 19", "Thinking the event you have heard of most must have happened first", "Thinking an effect can come before its cause"],
  diagnostic: [
    D("h-diag-1", "chronology", "reading years as numbers on a line", "Which came first: the printing press invented, or the Moon landing? Answer: printing press invented, or Moon landing.", "printing press invented", { params: { earlierOf: ["printing press invented", "Moon landing"] }, purpose: "Starts with pure order: can you place two famous events on the line?", feedback: "The printing press (about 1440) — over 500 years before the Moon landing (1969). Order first; stories hang on the skeleton of dates." }),
    D("h-diag-2", "centuries", "reading years as numbers on a line", "The Moon landing happened in 1969. Which century is that? Answer: 19th, 20th, or 21st.", "20th", { params: { centuryEvent: "Moon landing" }, misconceptionAnswer: "19th", misconception: "Thinking 1969 is in the 19th century because it starts with 19", purpose: "The classic century trap: the digits and the century are one apart.", feedback: "The 20th century. The 1st century is years 1–100, so 1901–2000 is the 20th — the century number is always one more than the hundreds digits suggest." }),
    D("h-diag-3", "chronology", "reading years as numbers on a line", "Which came first: the First World War begins, or the Second World War ends? Answer: First World War begins, or Second World War ends.", "First World War begins", { params: { earlierOf: ["First World War begins", "Second World War ends"] }, purpose: "Two linked events: does the numbering match the order?", feedback: "The First World War begins (1914); the Second World War ends in 1945. The numbers in their names already tell the story's order." }),
    { ...P("h-diag-4", "chronology", "reading years as numbers on a line", "Which came first: the first powered flight, or the Berlin Wall falls? Answer: first powered flight, or Berlin Wall falls.", "first powered flight", { params: { earlierOf: ["first powered flight", "Berlin Wall falls"] } }), purpose: "Foundation probe: two twentieth-century landmarks in order.", feedback: "First powered flight (1903). The Berlin Wall falls in 1989 — one lifetime later, within the same century." },
    { ...P("h-diag-5", "centuries", "reading years as numbers on a line", "Magna Carta was signed in 1215. Which century is that? Answer: 12th, 13th, or 14th.", "13th", { params: { centuryEvent: "Magna Carta signed" } }), purpose: "Foundation probe: the century rule on an older date.", feedback: "The 13th century (1201–1300). Add one to the hundreds: 12 hundreds means the 13th century." },
    { ...T("h-diag-6", "cause-effect", "cause and effect in everyday life", "Could the Moon landing (1969) have caused the first powered flight (1903)? Answer yes or no.", false, { params: {}, expectFrom: "causeOrder" }), purpose: "Stretch probe: causes must come before their effects.", feedback: "No. Causes come before effects — 1969 cannot cause 1903. In fact it runs the other way: flight made spaceflight thinkable." },
  ],
  practice: [
    P("h-prac-1", "chronology", "reading years as numbers on a line", "Which came first: Roman Empire falls, or Magna Carta signed? Answer: Roman Empire falls, or Magna Carta signed.", "Roman Empire falls", { params: { earlierOf: ["Roman Empire falls", "Magna Carta signed"] }, purpose: "Practises order across a long gap where fame misleads.", feedback: "The Roman Empire falls (476) — about 700 years before Magna Carta (1215). Less famous does not mean later." }),
    P("h-prac-2", "centuries", "reading years as numbers on a line", "The Berlin Wall falls in 1989. Which century is that? Answer: 19th, 20th, or 21st.", "20th", { params: { centuryEvent: "Berlin Wall falls" }, purpose: "Practises the century rule near a century boundary.", feedback: "The 20th century — everything from 1901 to 2000, even late-1989, sits inside it." }),
    P("h-prac-3", "chronology", "reading years as numbers on a line", "Which came first: the printing press invented, or Roman Empire falls? Answer: printing press invented, or Roman Empire falls.", "Roman Empire falls", { params: { earlierOf: ["printing press invented", "Roman Empire falls"] }, purpose: "Practises resisting the famous-first guess.", feedback: "The Roman Empire falls (476), nearly a thousand years before the printing press (about 1440)." }),
  ],
  transfer: [
    T("h-tr-1", "chronology", "reading years as numbers on a line", "Fresh pair: which came first: the first powered flight, or the Moon landing? Answer: first powered flight, or Moon landing.", "first powered flight", { params: { earlierOf: ["first powered flight", "Moon landing"] }, purpose: "Unaided check: order on a fresh pair.", feedback: "First powered flight (1903) — 66 years before the Moon landing built on it." }),
    T("h-tr-2", "centuries", "reading years as numbers on a line", "Fresh date: the Second World War ends in 1945. Which century is that? Answer: 19th, 20th, or 21st.", "20th", { params: { centuryEvent: "Second World War ends" }, purpose: "Unaided check: the century rule unaided.", feedback: "The 20th century: years 1901 to 2000. The century number always runs one ahead of the hundreds digits in the year." }),
    T("h-tr-3", "cause-effect", "cause and effect in everyday life", "A new printing press spreads in the 1440s, and book prices fall over the next fifty years. Could the falling prices have caused the press? Answer yes or no.", false, { params: {}, expectFrom: "causeOrder", purpose: "Unaided check: cause must precede effect.", feedback: "No — the price fall came after, so it is the effect. The press is the cause; cheaper books are what it changed." }),
  ],
  checker: checkHistory,
  compute: { history: computeHistory },
};
export default historyKernel;
