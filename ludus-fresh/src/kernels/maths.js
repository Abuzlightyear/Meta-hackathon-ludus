// kernel-maths — fractions + area/volume, computed. Gold reuse by import only:
// fractionState/fractionEquivalence from ../../.. /src/simulations.js (gold).
import { fractionState, fractionEquivalence } from "../../../src/simulations.js";

export { fractionState, fractionEquivalence };
const clampInt = (v, lo, hi, fb) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fb; };
export function computeFraction(denominator, selected) { return fractionState(clampInt(denominator, 1, 24, 4), clampInt(selected, 0, 24, 0)); }
export function areaRectangle(length, width) { const l = Math.max(0, Number(length) || 0), w = Math.max(0, Number(width) || 0); return { length: l, width: w, area: l * w }; }
export function volumeBox(length, width, depth) { const l = Math.max(0, Number(length) || 0), w = Math.max(0, Number(width) || 0), d = Math.max(0, Number(depth) || 0); return { length: l, width: w, depth: d, faceArea: l * w, volume: l * w * d }; }

function parseFraction(v) {
  if (v && typeof v === "object" && "numerator" in v) return Number(v.numerator) / Number(v.denominator);
  if (typeof v === "number") return v;
  const m = String(v ?? "").trim().match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (m) return Number(m[1]) / Number(m[2]);
  const n = Number(v); return Number.isFinite(n) ? n : NaN;
}
export function checkMaths(item, answer) {
  let expected = item.answer;
  if (item.params?.denominator !== undefined) expected = fractionState(item.params.denominator, item.params.selected).value;
  if (item.params?.area) expected = item.params.area[0] * item.params.area[1];
  if (item.params?.volume) expected = item.params.volume[0] * item.params.volume[1] * item.params.volume[2];
  const got = item.checkType === "text" ? String(answer ?? "").trim().toLowerCase().replace(/[.!?]+$/, "").replace(/^(the|a|an)\s+/, "") : parseFraction(answer);
  const expN = item.checkType === "text" ? String(expected).trim().toLowerCase() : parseFraction(expected);
  const textOk = got === expN || (item.accept || []).some((a) => String(a).toLowerCase() === got) || (expN.length >= 4 && got.includes("equal parts"));
  const correct = item.checkType === "text" ? textOk : Number.isFinite(got) && Math.abs(got - expN) < 1e-9;
  return { correct, expected, given: answer, feedback: correct ? (item.feedback || "Correct — computed value matches.") : `${item.feedback || "Not quite."} (Expected: ${expected}.)` };
}

const D = (id, skill, prereq, q, answer, extra = {}) => ({ id, kind: "diagnostic", scored: true, skill, prereq, q, prompt: q, answer, ...extra });
const P = (id, skill, prereq, q, answer, extra = {}) => ({ ...D(id, skill, prereq, q, answer, extra), kind: "practice" });
const T = (id, skill, prereq, q, answer, extra = {}) => ({ ...D(id, skill, prereq, q, answer, extra), kind: "transfer" });

export const mathsKernel = {
  id: "maths", title: "Mathematics — fractions, area and volume",
  concepts: ["A fraction is numerator equal parts out of denominator equal parts", "Equivalent fractions name the same amount", "Area = length × width", "Volume = length × width × depth"],
  prerequisites: ["counting and equal groups", "division as sharing", "comparing sizes of numbers", "multiplication as repeated groups"],
  misconceptions: ["Thinking a bigger denominator means a bigger fraction", "Adding numerators and denominators straight across", "Thinking area and volume are the same (ignoring depth)"],
  // Planned ladder: 1 meaning -> 2 comparison -> 3 sharing, then dedicated
  // probes (foundation = easier, stretch = harder) used only for branching.
  diagnostic: [
    D("m-diag-1", "fraction-meaning", "division as sharing", "One whole cake is shared equally between 4 friends, and each share is written as a fraction with denominator 4. What does that 4 stand for — the number of equal what in the whole? Give one word.", "parts", { checkType: "text", accept: ["equal parts", "pieces", "slices"], purpose: "Starts with meaning, not symbols: do you know the denominator counts equal parts of one whole?", feedback: "The 4 is the denominator: one whole split into 4 equal parts. The top number then counts how many of those parts you take — that is all a fraction says." }),
    D("m-diag-2", "fraction-comparison", "comparing sizes of numbers", "You may take one slice from a cake cut into 2 equal slices, or one slice from an identical cake cut into 4 equal slices. Which single slice is bigger? Give the fraction (1/2 or 1/4).", "1/2", { params: { denominator: 2, selected: 1 }, misconceptionAnswer: "1/4", misconception: "Thinking a bigger denominator means a bigger fraction", purpose: "Tests the classic trap: does a bigger denominator tempt you, even though it means smaller slices?", feedback: "1/2 is bigger. The more equal parts you cut a whole into, the smaller each part is — so a bigger denominator means a smaller slice when the top number is 1." }),
    D("m-diag-3", "fraction-of-whole", "counting and equal groups", "Four friends share 1 whole cake equally, with nothing left over. What fraction of the cake does each friend get? Give the fraction.", "1/4", { params: { denominator: 4, selected: 1 }, purpose: "Connects fractions to fair sharing: 1 whole divided by 4 people.", feedback: "Sharing 1 whole into 4 equal parts gives 1/4 each. Notice the link: dividing by 4 and taking one part of 4 are the same action." }),
    { ...P("m-diag-4", "fraction-meaning", "division as sharing", "Let's start smaller. A chocolate bar is split into 2 equal parts and you take 1 part. What fraction of the bar have you taken? Give the fraction.", "1/2", { params: { denominator: 2, selected: 1 } }), purpose: "Foundation probe: the simplest possible fraction, one part of two.", feedback: "1 out of 2 equal parts is 1/2. Every fraction works this way: parts taken over parts in the whole." },
    { ...P("m-diag-5", "area", "multiplication as repeated groups", "A rectangle is 3 units long and 2 units wide. How many single unit squares would cover it exactly? Give just the number.", 6, { params: { area: [3, 2] } }), purpose: "Foundation probe: can you build area by counting rows of unit squares?", feedback: "3 rows of 2 squares = 6 squares. That counting is why area = length × width: rows × squares in each row." },
    { ...T("m-diag-6", "fraction-comparison", "comparing sizes of numbers", "Both fractions have the same top number: 2/3 and 2/4. Which one is bigger? Give the fraction.", "2/3", { params: { denominator: 3, selected: 2 }, misconceptionAnswer: "2/4", misconception: "Thinking a bigger denominator means a bigger fraction" }), purpose: "Stretch probe: same numerator, different denominators — the trap in a harder form.", feedback: "2/3 is bigger. With the same number of parts taken, thirds are bigger parts than quarters, so 2/3 > 2/4." },
    { ...T("m-diag-7", "volume", "multiplication as repeated groups", "A box is 2 units long, 2 units wide and 2 units deep. What is its volume in unit cubes? Give just the number.", 8, { params: { volume: [2, 2, 2] } }), purpose: "Stretch probe: have you met volume as area stacked through depth?", feedback: "Volume = 2×2×2 = 8. The base holds 4 cubes (2×2) and there are 2 layers of them — area first, then depth." },
  ],
  practice: [
    P("m-prac-1", "fraction-equivalence", "division as sharing", "A cake cut into 4 equal slices gives you 2 slices. Which fraction of the cake do you have, and notice it is worth the same as 1/2? Give the fraction (for example 2/4).", "2/4", { params: { denominator: 4, selected: 2 }, purpose: "Teaches equivalence: different-looking fractions can name the same amount.", feedback: "2/4 simplifies to 1/2: you took half the cake, just cut into smaller slices. Same amount, different name — those are equivalent fractions." }),
    P("m-prac-2", "area", "multiplication as repeated groups", "A garden bed is 6 metres long and 4 metres wide. What is its area in square metres? Give just the number.", 24, { params: { area: [6, 4] }, purpose: "Applies area = length × width to a real rectangle, with units.", feedback: "Area = 6 × 4 = 24 square metres. You are counting 4 rows of 6 unit squares without drawing them." }),
    P("m-prac-3", "fraction-of-whole", "counting and equal groups", "A pizza is cut into 8 equal slices and you eat 3 of them. What fraction of the whole pizza did you eat? Give the fraction.", "3/8", { params: { denominator: 8, selected: 3 }, purpose: "Numerator above 1: counting several equal parts, not just one.", feedback: "3 out of 8 equal parts is 3/8. The denominator names the cuts (8), the numerator names your slices (3)." }),
  ],
  transfer: [
    T("m-tr-1", "fraction-comparison", "comparing sizes of numbers", "Fresh problem, no picture this time: which is the largest — 1/3, 1/2 or 1/5? Give the fraction.", "1/2", { params: { denominator: 2, selected: 1 }, purpose: "Unaided check: can you rank unit fractions in a new set?", feedback: "1/2 is largest. For numerator 1, the smallest denominator makes the biggest parts." }),
    T("m-tr-2", "volume", "multiplication as repeated groups", "Fresh problem: a storage box is 6 long, 4 wide and 3 deep. What is its volume? Give just the number.", 72, { params: { volume: [6, 4, 3] }, purpose: "Unaided check: volume in a new context, where answering the area (24) is the trap.", feedback: "Volume = 6×4×3 = 72. The face area is 24, but volume stacks that face through a depth of 3." }),
    T("m-tr-3", "fraction-of-whole", "counting and equal groups", "Fresh problem: a 1-metre ribbon is cut into 5 equal pieces. How long is each piece, written as a fraction of a metre? Give the fraction.", "1/5", { params: { denominator: 5, selected: 1 }, purpose: "Unaided check: sharing one whole into a new number of parts.", feedback: "Each piece is 1/5 of a metre: 1 whole shared into 5 equal parts." }),
  ],
  checker: checkMaths,
  compute: { fraction: computeFraction, equivalence: fractionEquivalence, area: areaRectangle, volume: volumeBox },
};
export default mathsKernel;
