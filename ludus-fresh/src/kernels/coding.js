// kernel-coding — variables, loops and tracing code by hand, all computed.
const num = (v, fb = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fb; };
export function computeTrace({ start = 1, step = 2, count = 4 } = {}) {
  const s = num(start), st = num(step), c = Math.max(0, Math.min(12, Math.round(num(count))));
  const values = [s];
  for (let i = 0; i < c; i++) values.push(values[values.length - 1] + st);
  return { start: s, step: st, count: c, values, final: values[values.length - 1], text: `x starts at ${s}; each loop adds ${st}, ${c} times: ${values.join(" → ")}. Final x = ${values[values.length - 1]}.` };
}
export function checkCoding(item, answer) {
  let expected = item.answer;
  if (item.params?.trace) {
    const r = computeTrace(item.params.trace);
    expected = item.expectFrom === "final" ? r.final : item.expectFrom === "count" ? r.count : expected;
  }
  const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/[.!?]+$/, "");
  const numOf = (v) => { if (typeof v === "number") return v; const m = String(v ?? "").replace(/,/g, "").match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : NaN; };
  const correct = typeof expected === "number" ? Math.abs(numOf(answer) - expected) < 0.011 : norm(answer) === norm(expected);
  return { correct, expected, given: answer, feedback: correct ? (item.feedback || "Correct.") : `${item.feedback || "Not quite."} (Expected: ${expected}.)` };
}
const mk = (kind) => (id, skill, prereq, q, answer, extra = {}) => ({ id, kind, scored: true, skill, prereq, q, prompt: q, answer, ...extra });
const D = mk("diagnostic"), P = mk("practice"), T = mk("transfer");
export const codingKernel = {
  id: "coding", title: "Coding — variables, loops and tracing",
  concepts: ["A variable is a named box whose value can change", "A loop repeats its body a fixed number of times — trace it one pass at a time", "Tracing means running code in your head, writing each new value down", "Computers do exactly what the code says, in order, never what you meant"],
  prerequisites: ["adding and subtracting small numbers", "following steps strictly in order", "that the same name can hold a new value"],
  misconceptions: ["Thinking a loop runs once no matter its count", "Updating the variable in your head but forgetting earlier passes", "Thinking x = x + 3 keeps the old x as well"],
  diagnostic: [
    D("c-diag-1", "variables", "that the same name can hold a new value", "Code says: x starts at 2, then x = x + 5. What is x now? Give just the number.", 7, { params: { trace: { start: 2, step: 5, count: 1 } }, expectFrom: "final", purpose: "Starts with one reassignment: the box gets a new value.", feedback: "7. The old 2 is replaced: x = x + 5 means 'take the current x, add 5, store it back'. The box holds one value at a time." }),
    D("c-diag-2", "loops", "following steps strictly in order", "Code says: repeat 4 times: add 3 to x. If x starts at 2, what is x after the loop? Give just the number.", 14, { params: { trace: { start: 2, step: 3, count: 4 } }, expectFrom: "final", misconceptionAnswer: 5, misconception: "Thinking a loop runs once no matter its count", purpose: "The core loop trace: four passes, not one.", feedback: "14: trace it pass by pass — 2, 5, 8, 11, 14. Four passes of +3 add 12 in total." }),
    D("c-diag-3", "loops", "following steps strictly in order", "Code says: repeat 5 times: print a star. How many stars are printed? Give just the number.", 5, { params: { trace: { start: 0, step: 1, count: 5 } }, expectFrom: "count", purpose: "Checks the count itself before anything accumulates.", feedback: "5 stars. The repeat count is exactly how many times the body runs — no more, no fewer." }),
    { ...P("c-diag-4", "variables", "adding and subtracting small numbers", "Code says: score starts at 10, then score = score - 4, then score = score + 1. What is score at the end? Give just the number.", 7, { params: { trace: { start: 10, step: -3, count: 1 } }, expectFrom: "final" }), purpose: "Foundation probe: two updates in strict order.", feedback: "7: 10 - 4 = 6, then 6 + 1 = 7. Order matters; each line uses the newest value." },
    { ...P("c-diag-5", "loops", "adding and subtracting small numbers", "Code says: total starts at 0. Repeat 3 times: add 5 to total. What is total after the loop? Give just the number.", 15, { params: { trace: { start: 0, step: 5, count: 3 } }, expectFrom: "final" }), purpose: "Foundation probe: accumulating from zero.", feedback: "15: trace it — 0, 5, 10, 15. Three passes of +5, written down one pass at a time." },
    { ...T("c-diag-6", "loops", "following steps strictly in order", "Code says: x starts at 4. Repeat 5 times: add 4 to x. What is x after the loop finishes? Give just the number.", 24, { params: { trace: { start: 4, step: 4, count: 5 } }, expectFrom: "final" }), purpose: "Stretch probe: a five-pass trace without help.", feedback: "24: trace every pass — 4, 8, 12, 16, 20, 24. Five passes of +4 add 20 to the start." },
  ],
  practice: [
    P("c-prac-1", "loops", "adding and subtracting small numbers", "Code says: x starts at 10. Repeat 5 times: subtract 2 from x. What is x after the loop? Give just the number.", 0, { params: { trace: { start: 10, step: -2, count: 5 } }, expectFrom: "final", purpose: "Practises tracing downwards to zero.", feedback: "0: 10, 8, 6, 4, 2, 0 — five passes of -2." }),
    P("c-prac-2", "loops", "following steps strictly in order", "Code says: repeat 6 times: print your name. How many times is your name printed? Give just the number.", 6, { params: { trace: { start: 0, step: 1, count: 6 } }, expectFrom: "count", purpose: "Practises reading the repeat count directly.", feedback: "6 times. The repeat count is exactly how many times the loop body runs — that is the whole answer." }),
    P("c-prac-3", "variables", "that the same name can hold a new value", "Code says: lives starts at 3, then lives = lives - 1, then lives = lives - 1 again. How many lives remain? Give just the number.", 1, { params: { trace: { start: 3, step: -2, count: 1 } }, expectFrom: "final", purpose: "Practises two separate decrements in sequence.", feedback: "1: first 3 - 1 = 2, then 2 - 1 = 1. Each line works on the newest value in the box." }),
  ],
  transfer: [
    T("c-tr-1", "loops", "following steps strictly in order", "Fresh code: x starts at 3. Repeat 6 times: add 4 to x. What is x after the loop? Give just the number.", 27, { params: { trace: { start: 3, step: 4, count: 6 } }, expectFrom: "final", purpose: "Unaided check: a longer trace unaided.", feedback: "27: 3, 7, 11, 15, 19, 23, 27 — six passes of +4." }),
    T("c-tr-2", "loops", "following steps strictly in order", "Fresh code: repeat 8 times: beep. How many beeps? Give just the number.", 8, { params: { trace: { start: 0, step: 1, count: 8 } }, expectFrom: "count", purpose: "Unaided check: the repeat count unaided.", feedback: "8 beeps: the loop body runs once per repeat, and the repeat count says 8." }),
    T("c-tr-3", "variables", "adding and subtracting small numbers", "Fresh code: gold starts at 100. Repeat 4 times: subtract 10 from gold. How much gold is left? Give just the number.", 60, { params: { trace: { start: 100, step: -10, count: 4 } }, expectFrom: "final", purpose: "Unaided check: tracing down from a big start.", feedback: "60: 100, 90, 80, 70, 60 — four passes of -10." }),
  ],
  checker: checkCoding,
  compute: { trace: computeTrace },
};
export default codingKernel;
