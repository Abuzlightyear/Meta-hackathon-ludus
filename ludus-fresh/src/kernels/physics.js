// kernel-physics — motion, forces and energy, all computed.
const num = (v, fb = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fb; };
export function computePhysics({ distanceM = 100, timeS = 20, massKg = 2, speedMps = 5 } = {}) {
  const d = Math.max(0, num(distanceM)), t = Math.max(0.1, num(timeS, 1)), m = Math.max(0, num(massKg)), v = Math.max(0, num(speedMps));
  const speed = Math.round((d / t) * 100) / 100;
  return {
    distanceM: d, timeS: t, massKg: m, speedMps: Math.round(v * 100) / 100,
    speed, kineticEnergy: Math.round(0.5 * m * v * v * 100) / 100, weightN: Math.round(m * 10 * 100) / 100,
    text: `Speed = distance ÷ time = ${d} ÷ ${t} = ${speed} m/s. Weight of ${m} kg ≈ ${Math.round(m * 10)} N. Kinetic energy at ${v} m/s ≈ ${Math.round(0.5 * m * v * v * 100) / 100} J.`,
  };
}
export function checkPhysics(item, answer) {
  let expected = item.answer;
  if (item.params?.phys) {
    const r = computePhysics(item.params.phys);
    expected = item.expectFrom === "speed" ? r.speed : item.expectFrom === "kineticEnergy" ? r.kineticEnergy : item.expectFrom === "weightN" ? r.weightN : expected;
  }
  const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/[.!?]+$/, "");
  const numOf = (v) => { if (typeof v === "number") return v; const m = String(v ?? "").replace(/,/g, "").match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : NaN; };
  const correct = typeof expected === "number" ? Math.abs(numOf(answer) - expected) < 0.011 : norm(answer) === norm(expected);
  return { correct, expected, given: answer, feedback: correct ? (item.feedback || "Correct.") : `${item.feedback || "Not quite."} (Expected: ${expected}.)` };
}
const mk = (kind) => (id, skill, prereq, q, answer, extra = {}) => ({ id, kind, scored: true, skill, prereq, q, prompt: q, answer, ...extra });
const D = mk("diagnostic"), P = mk("practice"), T = mk("transfer");
export const physicsKernel = {
  id: "physics", title: "Physics — motion, forces and energy",
  concepts: ["Speed = distance ÷ time: how far, per second", "Weight is a force: mass (kg) × about 10 gives newtons on Earth", "Kinetic energy grows with the square of speed: double the speed, four times the energy", "Forces change motion — push harder or longer and speed changes more"],
  prerequisites: ["division as sharing into equal parts", "that measurements need units", "squares (3² = 9) at a friendly level"],
  misconceptions: ["Thinking heavier things always fall faster", "Thinking doubling speed doubles kinetic energy", "Mixing up mass (kg) and weight (newtons)"],
  diagnostic: [
    D("p-diag-1", "speed", "division as sharing into equal parts", "A runner covers 100 metres in 20 seconds. What is their speed in metres per second? Give just the number.", 5, { params: { phys: { distanceM: 100, timeS: 20 } }, expectFrom: "speed", purpose: "Starts with the core rate: distance shared over time.", feedback: "5 m/s: 100 ÷ 20. Speed is always distance divided by time — how much ground each second buys you." }),
    D("p-diag-2", "weight", "that measurements need units", "A bag has a mass of 4 kilograms. On Earth, about how much does it weigh in newtons? Give just the number.", 40, { params: { phys: { massKg: 4 } }, expectFrom: "weightN", misconceptionAnswer: 4, misconception: "Mixing up mass (kg) and weight (newtons)", purpose: "Separates mass from weight: same bag, two different measurements.", feedback: "About 40 newtons: mass × 10 (4 × 10). Kilograms measure how much stuff; newtons measure how hard Earth pulls it." }),
    D("p-diag-3", "energy", "squares (3² = 9) at a friendly level", "A 2 kg ball moves at 3 metres per second. Its kinetic energy is ½ × mass × speed². How many joules? Give just the number.", 9, { params: { phys: { massKg: 2, speedMps: 3 } }, expectFrom: "kineticEnergy", purpose: "The energy formula once, with friendly numbers.", feedback: "9 joules: ½ × 2 × 3² = 1 × 9. Notice the speed is squared before anything else happens." }),
    { ...P("p-diag-4", "speed", "division as sharing into equal parts", "A cyclist rides 240 metres in 60 seconds. What is their speed in metres per second? Give just the number.", 4, { params: { phys: { distanceM: 240, timeS: 60 } }, expectFrom: "speed" }), purpose: "Foundation probe: the speed division with new numbers.", feedback: "4 m/s: 240 ÷ 60. Same move, new journey." },
    { ...P("p-diag-5", "energy", "squares (3² = 9) at a friendly level", "That 2 kg ball speeds up from 3 to 6 metres per second — double the speed. Its kinetic energy was 9 joules. What is it now? Give just the number.", 36, { params: { phys: { massKg: 2, speedMps: 6 } }, expectFrom: "kineticEnergy", misconceptionAnswer: 18, misconception: "Thinking doubling speed doubles kinetic energy" }), purpose: "Foundation probe: does double speed double energy, or quadruple it?", feedback: "36 joules — four times, not two: ½ × 2 × 6² = 36. Energy follows speed squared, which is why fast crashes are so much worse." },
    { ...T("p-diag-6", "energy", "squares (3² = 9) at a friendly level", "A 1 kg ball moves at 10 metres per second. Using ½ × mass × speed², how much kinetic energy does it have, in joules? Give just the number.", 50, { params: { phys: { massKg: 1, speedMps: 10 } }, expectFrom: "kineticEnergy" }), purpose: "Stretch probe: the energy formula with a light, fast ball.", feedback: "50 joules: ½ × 1 × 10² = 50. A light ball can still carry serious energy when it is quick." },
  ],
  practice: [
    P("p-prac-1", "speed", "division as sharing into equal parts", "A scooter travels 90 metres in 15 seconds. What is its speed in metres per second? Give just the number.", 6, { params: { phys: { distanceM: 90, timeS: 15 } }, expectFrom: "speed", purpose: "Practises the speed division until it is a habit.", feedback: "6 m/s: 90 ÷ 15. Distance divided by time, every single time — that one division is what speed means." }),
    P("p-prac-2", "weight", "that measurements need units", "A toolbox has a mass of 7 kilograms. About how much does it weigh on Earth, in newtons? Give just the number.", 70, { params: { phys: { massKg: 7 } }, expectFrom: "weightN", purpose: "Practises mass-to-weight with a new mass.", feedback: "About 70 newtons: 7 × 10. Kilograms times ten gives weight in newtons anywhere on Earth." }),
    P("p-prac-3", "energy", "squares (3² = 9) at a friendly level", "A 2 kg drone flies at 4 metres per second. How much kinetic energy does it have, in joules? Give just the number.", 16, { params: { phys: { massKg: 2, speedMps: 4 } }, expectFrom: "kineticEnergy", purpose: "Practises ½mv² with even numbers.", feedback: "16 joules: ½ × 2 × 4² = 16. Square the speed first, then multiply by half the mass." }),
  ],
  transfer: [
    T("p-tr-1", "speed", "division as sharing into equal parts", "Fresh journey: a train covers 270 metres in 45 seconds. What is its speed in metres per second? Give just the number.", 6, { params: { phys: { distanceM: 270, timeS: 45 } }, expectFrom: "speed", purpose: "Unaided check: speed on an unpractised journey.", feedback: "6 m/s: 270 ÷ 45. New journey, same division — the method carries, not the memorised answer." }),
    T("p-tr-2", "energy", "squares (3² = 9) at a friendly level", "Fresh case: a 3 kg stone moves at 2 metres per second. How much kinetic energy, in joules? Give just the number.", 6, { params: { phys: { massKg: 3, speedMps: 2 } }, expectFrom: "kineticEnergy", purpose: "Unaided check: the energy formula unaided.", feedback: "6 joules: ½ × 3 × 2² = 6. Half the mass, times the speed squared, in that order." }),
    T("p-tr-3", "weight", "that measurements need units", "Fresh mass: a suitcase of 12 kilograms. About how much does it weigh on Earth, in newtons? Give just the number.", 120, { params: { phys: { massKg: 12 } }, expectFrom: "weightN", purpose: "Unaided check: mass to weight unaided.", feedback: "About 120 newtons: 12 × 10. Twelve kilograms pulled by Earth is a 120-newton weight." }),
  ],
  checker: checkPhysics,
  compute: { physics: computePhysics },
};
export default physicsKernel;
