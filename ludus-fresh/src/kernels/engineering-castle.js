// kernel-engineering-castle — design holds/fails + area vs volume, computed. Gold import only.
import { castleState, testCastleDesign, testDesign } from "../../../src/simulations.js";
export { castleState, testCastleDesign, testDesign };
export function evaluateDesign(input = {}) {
  const r = testCastleDesign(input);
  return { ...r, areaVsVolume: `Front area stays ${r.faceArea} (length×height) while total blocks = ${r.volumeBlocks} (area×thickness ${r.thickness}). Changing thickness changes volume, not front area.`, verdict: r.holds ? "HOLDS" : "FALLS" };
}
export function checkCastle(item, answer) {
  let expected = item.answer;
  if (item.params?.design) { const r = testCastleDesign(item.params.design); expected = item.expectFrom === "faceArea" ? r.faceArea : item.expectFrom === "volumeBlocks" ? r.volumeBlocks : item.expectFrom === "verdict" ? (r.holds ? "HOLDS" : "FALLS") : r.holds; }
  const norm = (s) => String(s ?? "").trim().toLowerCase();
  const verdict = (s) => { const v = norm(s); if (v === "hold" || v === "holds") return "holds"; if (v === "fall" || v === "falls") return "falls"; return v; };
  let correct;
  if (typeof expected === "boolean") correct = norm(answer) === String(expected) || (expected && /^(holds|yes|true)/.test(norm(answer))) || (!expected && /^(falls|no|false)/.test(norm(answer)));
  else if (typeof expected === "number") { const m = String(answer ?? "").replace(/,/g, "").match(/-?\d+(\.\d+)?/); correct = (typeof answer === "number" ? answer : m ? Number(m[0]) : NaN) === expected; }
  else if (item.expectFrom === "verdict" || /^(holds|falls)$/.test(norm(expected))) correct = verdict(answer) === verdict(expected);
  else correct = norm(answer) === norm(expected);
  return { correct, expected, given: answer, feedback: correct ? "Matches the computed design test." : `Computed result is "${expected}". Holds needs thickness ≥2 AND height ≥3; front area = L×H, volume = L×H×T.` };
}
const mk = (kind) => (id, skill, prereq, q, answer, extra = {}) => ({ id, kind, scored: true, skill, prereq, q, prompt: q, answer, ...extra });
const D = mk("diagnostic"), P = mk("practice"), T = mk("transfer");
export const castleKernel = {
  id: "engineering-castle", title: "Engineering — castles, area vs volume, design-test",
  concepts: ["Front area = length × height", "Volume (total blocks) = length × height × thickness", "A design holds when thickness ≥2 and height ≥3", "Depth is hidden in a front drawing"],
  prerequisites: ["multiplication as area", "comparing two designs fairly", "reading a front view"],
  misconceptions: ["Thinking wall strength is only length × height (ignoring depth)", "Thinking changing thickness changes the front area"],
  // Planned ladder: front area -> will it hold? -> the hidden depth, then probes.
  diagnostic: [
    D("e-diag-1", "area-vs-volume", "multiplication as area", "You are looking at a castle wall from the front. It is 6 blocks long and 4 blocks high (and 1 block thick). What is its front area in square blocks? Give just the number.", 24, { params: { design: { lengthUnits: 6, heightRows: 4, thickness: 1 } }, expectFrom: "faceArea", purpose: "Starts with what you can see: the front face, length × height.", feedback: "Front area = 6 × 4 = 24. That is the face you see in a front drawing — length times height, nothing about depth yet." }),
    D("e-diag-2", "design-test", "comparing two designs fairly", "That same wall is only 1 block thick. The rule here: a wall HOLDS only if it is at least 2 thick AND at least 3 high. Does this wall HOLD or FALL? Answer HOLD or FALL.", "FALLS", { params: { design: { lengthUnits: 6, heightRows: 4, thickness: 1 } }, expectFrom: "verdict", misconceptionKeywords: ["only length", "front is enough"], purpose: "First design judgement: can a good-looking front still fail?", feedback: "It FALLS. Height 4 passes, but thickness 1 fails the at-least-2 rule. A wall can look fine from the front and still be too thin to stand." }),
    D("e-diag-3", "area-vs-volume", "reading a front view", "Now rebuild the same front (6 long, 4 high) but make it 3 blocks thick. The front looks identical — how many blocks are in the whole wall now? Give just the number.", 72, { params: { design: { lengthUnits: 6, heightRows: 4, thickness: 3 } }, expectFrom: "volumeBlocks", purpose: "Reveals the hidden third measurement: depth multiplies the block count.", feedback: "72 blocks: 24 on the front face, stacked 3 deep (24 × 3). Thickness changed the total blocks without changing the front area at all." }),
    { ...P("e-diag-4", "design-test", "comparing two designs fairly", "Let's test the rule on a smaller wall: 4 long, 3 high, 2 thick. Remember, HOLD needs thickness at least 2 AND height at least 3. Does it HOLD or FALL? Answer HOLD or FALL.", "HOLDS", { params: { design: { lengthUnits: 4, heightRows: 3, thickness: 2 } }, expectFrom: "verdict" }), purpose: "Foundation probe: applying both halves of the holds rule, with nothing to spare.", feedback: "It HOLDS — exactly. Thickness 2 meets its threshold and height 3 meets its own; both must pass." },
    { ...P("e-diag-5", "area-vs-volume", "multiplication as area", "That smaller wall (4 long, 3 high, 2 thick): what is its front area in square blocks? Give just the number.", 12, { params: { design: { lengthUnits: 4, heightRows: 3, thickness: 2 } }, expectFrom: "faceArea" }), purpose: "Foundation probe: front area again, on the wall you just judged.", feedback: "Front area = 4 × 3 = 12. Thickness plays no part in the front face — it only enters the block count." },
    { ...T("e-diag-6", "area-vs-volume", "reading a front view", "The 4 long, 3 high, 2 thick wall: how many blocks in the whole wall, counting the hidden depth? Give just the number.", 24, { params: { design: { lengthUnits: 4, heightRows: 3, thickness: 2 } }, expectFrom: "volumeBlocks" }), purpose: "Stretch probe: volume on a wall whose area you already know.", feedback: "24 blocks: front area 12, stacked 2 deep. Volume = length × height × thickness, always in that order of thinking." },
    { ...T("e-diag-7", "design-test", "comparing two designs fairly", "A builder makes a wall 5 long, 2 high, and a chunky 3 thick, and says the thickness will save it. Using the rule (thickness at least 2 AND height at least 3), does it HOLD or FALL? Answer HOLD or FALL.", "FALLS", { params: { design: { lengthUnits: 5, heightRows: 2, thickness: 3 } }, expectFrom: "verdict" }), purpose: "Stretch probe: can one strong measurement rescue a failed one?", feedback: "It FALLS. Thickness 3 passes easily, but height 2 fails — the rule needs both, and extra thickness cannot substitute for height." },
  ],
  practice: [
    P("e-prac-1", "design-test", "comparing two designs fairly", "A new wall is 5 long, 3 high and 2 thick. Using the rule (thickness at least 2 AND height at least 3), does it HOLD or FALL? Answer HOLD or FALL.", "HOLDS", { params: { design: { lengthUnits: 5, heightRows: 3, thickness: 2 } }, expectFrom: "verdict", purpose: "Practises the two-part holds rule on a fresh design.", feedback: "It HOLDS: thickness 2 and height 3 both meet their thresholds exactly." }),
    P("e-prac-2", "area-vs-volume", "multiplication as area", "That wall (5 long, 3 high, 2 thick) — how many blocks in the whole wall, counting depth? Give just the number.", 30, { params: { design: { lengthUnits: 5, heightRows: 3, thickness: 2 } }, expectFrom: "volumeBlocks", purpose: "Practises volume right after judging the same wall.", feedback: "30 blocks: front area 15 (5 × 3), stacked 2 deep. Judging and counting are two different questions about one wall." }),
    P("e-prac-3", "area-vs-volume", "reading a front view", "Same wall again (5 long, 3 high, 2 thick). A painter asks: what is the front area to paint, in square blocks? Give just the number.", 15, { params: { design: { lengthUnits: 5, heightRows: 3, thickness: 2 } }, expectFrom: "faceArea", purpose: "Practises keeping area and volume apart on one familiar wall.", feedback: "15 — length × height only. The painter never pays for depth; the block counter always does." }),
  ],
  transfer: [
    T("e-tr-1", "design-test", "comparing two designs fairly", "Fresh design: 4 long, 2 high, and a very chunky 4 thick. Using the rule (thickness at least 2 AND height at least 3), does it HOLD or FALL? Answer HOLD or FALL.", "FALLS", { params: { design: { lengthUnits: 4, heightRows: 2, thickness: 4 } }, expectFrom: "verdict", purpose: "Unaided check: extreme thickness must not rescue low height.", feedback: "It FALLS: height 2 fails, and no amount of thickness fixes that half of the rule." }),
    T("e-tr-2", "area-vs-volume", "reading a front view", "Fresh design: a wall 4 long, 5 high and 2 thick. How many blocks in the whole wall? Give just the number.", 40, { params: { design: { lengthUnits: 4, heightRows: 5, thickness: 2 } }, expectFrom: "volumeBlocks", purpose: "Unaided check: volume computed on unseen dimensions.", feedback: "40 blocks: front area 20 (4 × 5), stacked 2 deep. Answering 20 would be the area — the trap this topic warns about." }),
    T("e-tr-3", "design-test", "comparing two designs fairly", "Fresh design: a long wall, 6 long, 3 high and 2 thick. Using the rule (thickness at least 2 AND height at least 3), does it HOLD or FALL? Answer HOLD or FALL.", "HOLDS", { params: { design: { lengthUnits: 6, heightRows: 3, thickness: 2 } }, expectFrom: "verdict", purpose: "Unaided check: a passing design, so 'falls' is not just the habit.", feedback: "It HOLDS: both thresholds met. Length was never in the rule — spotting what does not matter is part of the test." }),
  ],
  checker: checkCastle,
  compute: { state: castleState, test: testCastleDesign, evaluate: evaluateDesign, beamTest: testDesign },
};
export default castleKernel;
