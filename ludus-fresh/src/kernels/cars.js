// kernel-cars — how cars work: engine cycle, gears, braking, fuel.
// Every scored answer is computed here; nothing is opinion.
const num = (v, fb = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fb; };

export function computeCar({ engineRpm = 3000, gearRatio = 3, speedMph = 30, miles = 100, mpg = 40, fuelPrice = 1.5 } = {}) {
  const rpm = Math.max(0, num(engineRpm)), ratio = Math.max(0.1, num(gearRatio, 1));
  const speed = Math.max(0, num(speedMph)), brakingAt = (v) => Math.round(12 * ((Math.max(0, num(v)) / 20) ** 2));
  const gallons = Math.max(0, num(miles)) / Math.max(1, num(mpg, 1));
  return {
    engineRpm: rpm, gearRatio: ratio, wheelRpm: Math.round(rpm / ratio),
    speedMph: speed, brakingDistanceM: brakingAt(speed), brakingAt20: brakingAt(20), brakingAt40: brakingAt(40),
    miles: Math.max(0, num(miles)), mpg: Math.max(1, num(mpg, 1)), gallons: Math.round(gallons * 100) / 100,
    tripCost: Math.round(gallons * Math.max(0, num(fuelPrice)) * 100) / 100,
  };
}
export function checkCar(item, answer) {
  let expected = item.answer;
  if (item.params?.car) {
    const r = computeCar(item.params.car);
    expected = item.expectFrom === "wheelRpm" ? r.wheelRpm : item.expectFrom === "brakingDistanceM" ? r.brakingDistanceM : item.expectFrom === "gallons" ? r.gallons : item.expectFrom === "tripCost" ? r.tripCost : expected;
  }
  const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/[.!?]+$/, "");
  const numOf = (v) => { if (typeof v === "number") return v; const m = String(v ?? "").replace(/,/g, "").match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : NaN; };
  const correct = typeof expected === "number" ? Math.abs(numOf(answer) - expected) < 0.011 : norm(answer) === norm(expected);
  return { correct, expected, given: answer, feedback: correct ? (item.feedback || "Correct.") : `${item.feedback || "Not quite."} (Expected: ${expected}.)` };
}
const mk = (kind) => (id, skill, prereq, q, answer, extra = {}) => ({ id, kind, scored: true, skill, prereq, q, prompt: q, answer, ...extra });
const D = mk("diagnostic"), P = mk("practice"), T = mk("transfer");
export const carsKernel = {
  id: "cars", title: "Cars — engines, gears, braking and fuel",
  concepts: ["A four-stroke engine repeats: intake, compression, power, exhaust", "Gears trade speed for turning force: wheel rpm = engine rpm ÷ gear ratio", "Braking distance grows with the square of speed (double speed, four times the distance)", "Fuel used = miles ÷ miles-per-gallon; trip cost = fuel used × price"],
  prerequisites: ["division and ratios", "that doubling can multiply an effect more than twice", "reading simple units (rpm, mph, metres)"],
  misconceptions: ["Thinking braking distance doubles when speed doubles", "Thinking a bigger gear ratio means faster wheels", "Thinking the engine turns the wheels directly at engine speed"],
  diagnostic: [
    D("car-diag-1", "engine-cycle", "that machines repeat a cycle of steps", "A car engine repeats four strokes in order. Which stroke makes the power that pushes the car — intake, compression, power, or exhaust? Answer with the one word.", "power", { purpose: "Starts with the engine's job: which moment actually makes the power?", feedback: "The power stroke. Intake draws fuel and air in, compression squeezes it, then ignition makes the power stroke push the piston — exhaust clears the way to repeat." }),
    D("car-diag-2", "gear-ratio", "division and ratios", "An engine spins at 3,000 rpm through a gear ratio of 3 to 1, so the wheels turn slower than the engine. How fast do the wheels turn, in rpm? Give just the number.", 1000, { params: { car: { engineRpm: 3000, gearRatio: 3 } }, expectFrom: "wheelRpm", misconceptionAnswer: 9000, misconception: "Thinking a bigger gear ratio means faster wheels", purpose: "Tests the core gear idea: dividing speed to gain turning force.", feedback: "1,000 rpm: 3,000 ÷ 3. Gears trade wheel speed for turning force — that trade is why cars can pull away from rest at all." }),
    D("car-diag-3", "braking-distance", "that doubling can multiply an effect more than twice", "A car needs 12 metres to stop from 20 mph. From 40 mph — double the speed — how many metres does it need? Give just the number.", 48, { params: { car: { speedMph: 40 } }, expectFrom: "brakingDistanceM", misconceptionAnswer: 24, misconception: "Thinking braking distance doubles when speed doubles", purpose: "The topic's big trap: does stopping distance just double with speed?", feedback: "48 metres — four times as far, not two. Braking distance grows with the square of speed (2² = 4), which is why small speed increases matter so much." }),
    { ...P("car-diag-4", "engine-cycle", "that machines repeat a cycle of steps", "Back to the engine: before the power stroke can happen, the fuel and air must be squeezed tight. Which stroke does that squeezing? Answer: intake, compression, power, or exhaust.", "compression", {}), purpose: "Foundation probe: the stroke that prepares the power stroke.", feedback: "Compression. Squeezing the mixture first is what makes the power stroke strong when it fires." },
    { ...P("car-diag-5", "fuel-economy", "division and ratios", "A car travels 100 miles at 40 miles per gallon. How many gallons does it use? Give just the number.", 2.5, { params: { car: { miles: 100, mpg: 40 } }, expectFrom: "gallons" }), purpose: "Foundation probe: fuel as a simple division.", feedback: "2.5 gallons: miles ÷ mpg (100 ÷ 40). Economy questions are always distance divided by rate." },
    { ...T("car-diag-6", "gear-ratio", "division and ratios", "An engine at 4,000 rpm drives through a 2-to-1 gear. How fast do the wheels turn, in rpm? Give just the number.", 2000, { params: { car: { engineRpm: 4000, gearRatio: 2 } }, expectFrom: "wheelRpm" }), purpose: "Stretch probe: the gear division with fresh numbers.", feedback: "2,000 rpm: 4,000 ÷ 2. A lower ratio keeps more wheel speed and gives less turning force." },
    { ...T("car-diag-7", "braking-distance", "that doubling can multiply an effect more than twice", "A car stops from 20 mph in 12 metres. From 60 mph — three times the speed — how many metres? Give just the number.", 108, { params: { car: { speedMph: 60 } }, expectFrom: "brakingDistanceM", misconceptionAnswer: 36, misconception: "Thinking braking distance scales in proportion to speed" }), purpose: "Stretch probe: the square law pushed to triple speed.", feedback: "108 metres: 3² = 9 times the 20 mph distance. Triple the speed, nine times the stopping room." },
  ],
  practice: [
    P("car-prac-1", "engine-cycle", "that machines repeat a cycle of steps", "After the power stroke, burnt gases must leave before the cycle repeats. Which stroke pushes them out? Answer: intake, compression, power, or exhaust.", "exhaust", { purpose: "Practises the cycle order at its closing step.", feedback: "Exhaust. Then intake starts the next cycle — the four strokes repeat thousands of times a minute." }),
    P("car-prac-2", "braking-distance", "that doubling can multiply an effect more than twice", "In a car park at 10 mph — half of 20 mph — the same car needs how many metres to stop, if 20 mph needs 12? Give just the number.", 3, { params: { car: { speedMph: 10 } }, expectFrom: "brakingDistanceM", purpose: "Practises the square law downwards, where intuition often overshoots.", feedback: "3 metres: half the speed means (1/2)² = a quarter of 12. Slow really is disproportionately safer." }),
    P("car-prac-3", "fuel-economy", "division and ratios", "A trip is 200 miles in a car doing 40 mpg, and fuel costs £1.50 per gallon-unit used here. How much does the fuel cost in £? Give just the number.", 7.5, { params: { car: { miles: 200, mpg: 40, fuelPrice: 1.5 } }, expectFrom: "tripCost", purpose: "Practises chaining fuel used into trip cost.", feedback: "£7.50: 200 ÷ 40 = 5 units of fuel, × £1.50. Two small steps, each checkable." }),
  ],
  transfer: [
    T("car-tr-1", "gear-ratio", "division and ratios", "Fresh numbers: engine 3,600 rpm, gear ratio 4 to 1. How fast do the wheels turn, in rpm? Give just the number.", 900, { params: { car: { engineRpm: 3600, gearRatio: 4 } }, expectFrom: "wheelRpm", purpose: "Unaided check: gear division on fresh numbers.", feedback: "900 rpm: 3,600 ÷ 4. High ratio, slow strong wheels — the pulling-away gear." }),
    T("car-tr-2", "braking-distance", "that doubling can multiply an effect more than twice", "Fresh case: from 50 mph, how many metres to stop, if 20 mph needs 12? Give just the number.", 75, { params: { car: { speedMph: 50 } }, expectFrom: "brakingDistanceM", purpose: "Unaided check: the square law at an unpractised speed.", feedback: "75 metres: (50 ÷ 20)² × 12 = 6.25 × 12. The formula, not memory, carries you to new speeds." }),
    T("car-tr-3", "engine-cycle", "that machines repeat a cycle of steps", "Fresh start: a cold engine turns over and draws fuel and air into the cylinder first. Which stroke is that? Answer: intake, compression, power, or exhaust.", "intake", { purpose: "Unaided check: the cycle from its first stroke.", feedback: "Intake — the cycle opens by breathing in, then compression, power, exhaust, repeat." }),
  ],
  checker: checkCar,
  compute: { car: computeCar },
};
export default carsKernel;
