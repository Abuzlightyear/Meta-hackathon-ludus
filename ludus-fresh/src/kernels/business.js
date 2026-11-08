// kernel-business — NEW pure kernel (PLAN P3): budget/price/units/cost/profit computed.
const num = (v, fb = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fb; };
const clampNonNeg = (v, fb = 0) => Math.max(0, num(v, fb));

export function computeBusiness({ price = 0, units = 0, unitCost = 0, fixedCosts = 0 } = {}) {
  const p = clampNonNeg(price), u = Math.max(0, Math.round(num(units))), c = clampNonNeg(unitCost), f = clampNonNeg(fixedCosts);
  const revenue = p * u, variableCosts = c * u, totalCosts = variableCosts + f, profit = revenue - totalCosts;
  const marginPerUnit = p - c;
  const breakEvenUnits = marginPerUnit > 0 ? Math.ceil(f / marginPerUnit) : (f === 0 ? 0 : Infinity);
  return { price: p, units: u, unitCost: c, fixedCosts: f, revenue, variableCosts, totalCosts, profit, marginPerUnit, breakEvenUnits, isProfit: profit > 0, isLoss: profit < 0 };
}
export function withinBudget({ budget = 0, ...rest } = {}) { const r = computeBusiness(rest); return { ...r, budget: clampNonNeg(budget), withinBudget: r.totalCosts <= clampNonNeg(budget), remaining: clampNonNeg(budget) - r.totalCosts }; }

export function evaluateDecisions(scenario, options) {
  const scored = (options || []).map((o) => { const r = computeBusiness({ ...scenario, ...o }); return { id: o.id, label: o.label || o.id, ...r, tradeoffs: [r.profit >= 0 ? `Profit ${r.profit}` : `Loss ${r.profit} — price or units must rise, or costs fall`, `Fixed costs ${r.fixedCosts} must be covered before profit`, r.marginPerUnit <= 0 ? "Margin per unit ≤ 0: selling more cannot break even" : `Break-even at ${r.breakEvenUnits} units`] }; });
  const ranked = [...scored].sort((a, b) => b.profit - a.profit);
  return { options: scored, bestByProfit: ranked[0] || null, rankedIds: ranked.map((o) => o.id) };
}

export function checkBusiness(item, answer) {
  let expected = item.answer;
  if (item.params?.business) { const r = computeBusiness(item.params.business); expected = item.expectFrom === "revenue" ? r.revenue : item.expectFrom === "breakEvenUnits" ? r.breakEvenUnits : item.expectFrom === "totalCosts" ? r.totalCosts : r.profit; }
  if (item.params?.decision) { expected = evaluateDecisions(item.params.decision.scenario, item.params.decision.options).bestByProfit?.id; }
  const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/[.!?]+$/, "").replace(/^option\s+/, "");
  const numOf = (v) => { if (typeof v === "number") return v; const m = String(v ?? "").replace(/,/g, "").match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : NaN; };
  const correct = typeof expected === "number" ? numOf(answer) === expected : norm(answer) === norm(expected);
  return { correct, expected, given: answer, feedback: correct ? "Matches the computed business result." : `Computed result is ${expected}. Revenue = price×units; profit = revenue − (unitCost×units + fixedCosts); break-even = ceil(fixedCosts / (price−unitCost)).` };
}
const mk = (kind) => (id, skill, prereq, q, answer, extra = {}) => ({ id, kind, scored: true, skill, prereq, q, prompt: q, answer, ...extra });
const D = mk("diagnostic"), P = mk("practice"), T = mk("transfer");
const SCEN = { price: 5, units: 100, unitCost: 3, fixedCosts: 150 };
export const businessKernel = {
  id: "business", title: "Business — budget, price, cost, profit, break-even",
  concepts: ["Revenue = price × units sold", "Total costs = unit cost × units + fixed costs", "Profit = revenue − total costs (negative profit is a loss)", "Break-even units = ceil(fixed costs ÷ (price − unit cost))"],
  prerequisites: ["multiplication and subtraction with money", "reading a simple table", "comparing two options fairly"],
  misconceptions: ["Thinking revenue is profit (ignoring costs)", "Thinking selling more always fixes a negative margin", "Ignoring fixed costs"],
  // Planned ladder: money in -> money left -> how many sales to survive.
  diagnostic: [
    D("b-diag-1", "revenue", "multiplication and subtraction with money", "A small shop sells notebooks at £5 each and sells 100 of them. How much money comes in (the revenue) in £? Give just the number.", 500, { params: { business: SCEN }, expectFrom: "revenue", purpose: "Starts with money in: the one amount every shopkeeper counts first.", feedback: "Revenue = £5 × 100 = £500. That is money in — not money kept. What it cost to earn it comes next." }),
    D("b-diag-2", "profit", "multiplication and subtraction with money", "Same shop: each notebook cost £3 to buy in, and rent plus bills (fixed costs) are £150. How much profit is left from that £500, in £? Give just the number.", 50, { params: { business: SCEN }, expectFrom: "profit", misconceptionAnswer: 500, misconception: "Thinking revenue is profit (ignoring costs)", purpose: "The topic's big trap: £500 in feels like profit. Is it?", feedback: "Only £50. Costs were £3 × 100 = £300 plus £150 fixed = £450, and £500 − £450 = £50. Revenue is never profit until every cost is subtracted." }),
    D("b-diag-3", "break-even", "comparing two options fairly", "Still the same shop (£5 price, £3 unit cost, £150 fixed costs). Each notebook sold contributes £2 towards the fixed costs. How many notebooks must be sold just to break even? Give just the number.", 75, { params: { business: SCEN }, expectFrom: "breakEvenUnits", purpose: "Turns profit into a survival target: how many sales before a single penny is earned?", feedback: "75 notebooks. Each sale contributes £5 − £3 = £2, and £150 ÷ £2 = 75 sales to cover fixed costs. Sale 76 is the first profitable one." }),
    { ...P("b-diag-4", "profit", "multiplication and subtraction with money", "Before profit, count the costs for that shop: unit cost £3 on 100 notebooks, plus £150 fixed costs. What are the total costs in £? Give just the number.", 450, { params: { business: SCEN }, expectFrom: "totalCosts" }), purpose: "Foundation probe: the costs half of the profit sum, on its own.", feedback: "£450: £300 of unit costs (100 × £3) plus £150 fixed. Profit is always revenue minus this total." },
    { ...P("b-diag-5", "profit", "reading a simple table", "A market stall sells 10 mugs at £6 each. Each mug cost £4 to make, and there are no fixed costs. What is the profit in £? Give just the number.", 20, { params: { business: { price: 6, units: 10, unitCost: 4, fixedCosts: 0 } }, expectFrom: "profit" }), purpose: "Foundation probe: a tiny clean profit sum with nothing hidden.", feedback: "£20: in £60, costs £40, nothing fixed. Small numbers, same shape as every profit sum you will meet here." },
    { ...T("b-diag-6", "break-even", "comparing two options fairly", "A different stall: price £8, unit cost £4, fixed costs £80. How many sales are needed to break even? Give just the number.", 20, { params: { business: { price: 8, units: 50, unitCost: 4, fixedCosts: 80 } }, expectFrom: "breakEvenUnits" }), purpose: "Stretch probe: break-even with fresh numbers — margin first, then divide.", feedback: "20 sales. Margin is £8 − £4 = £4 per sale, and £80 ÷ £4 = 20. Ignore the 50 units figure; break-even never needs it." },
    { ...T("b-diag-7", "decision", "comparing two options fairly", "A shop (unit cost £2, fixed costs £100) chooses: A) price £4, sell 100; or B) price £5, sell 60. Which option makes more profit? Answer A or B.", "A", { params: { decision: { scenario: { unitCost: 2, fixedCosts: 100 }, options: [{ id: "A", price: 4, units: 100 }, { id: "B", price: 5, units: 60 }] } } }), purpose: "Stretch probe: a real trade-off — higher price, fewer sales. Which wins?", feedback: "A wins: profit £100 against B's £80. A higher price only helps if the lost sales do not eat the gain — you have to compute both, never guess." },
  ],
  practice: [
    P("b-prac-1", "profit", "reading a simple table", "A café sells 50 sandwiches at £4 each. Each costs £4 to make, and fixed costs are £100. What is the profit in £? (A negative answer is a loss — give it honestly.)", -100, { params: { business: { price: 4, units: 50, unitCost: 4, fixedCosts: 100 } }, expectFrom: "profit", purpose: "Practises a loss, where price equals unit cost and fixed costs sink the day.", feedback: "−£100: revenue £200, costs £200 + £100. When price equals unit cost, every sale contributes £0 and fixed costs are pure loss." }),
    P("b-prac-2", "decision", "comparing two options fairly", "The notebook shop (unit cost £3, fixed costs £150) considers raising its price. A: keep £5 and sell 100. B: charge £6 but sell only 80. Which option makes more profit? Answer A or B.", "B", { params: { decision: { scenario: { unitCost: 3, fixedCosts: 150 }, options: [{ id: "A", price: 5, units: 100 }, { id: "B", price: 6, units: 80 }] } }, purpose: "Practises the price-versus-volume trade-off with computed answers.", feedback: "B wins: A profits £50; B takes £480 in, pays £240 + £150, and profits £90. Here the higher price more than pays for the lost sales — the opposite of the earlier probe, which is why we always compute." }),
    P("b-prac-3", "profit", "multiplication and subtraction with money", "A baker sells 25 loaves at £12 each. Each loaf cost £7 to make, and the market stall fee (fixed) is £50. What is the profit in £? Give just the number.", 75, { params: { business: { price: 12, units: 25, unitCost: 7, fixedCosts: 50 } }, expectFrom: "profit", purpose: "Practises the full profit sum — revenue, unit costs, fixed costs — in one new story.", feedback: "£75: in £300, unit costs £175, stall £50. Revenue − (unit costs + fixed costs), every time." }),
  ],
  transfer: [
    T("b-tr-1", "profit", "multiplication and subtraction with money", "Fresh shop: candles at £10 each, 40 sold, each costing £6 to make, fixed costs £100. What is the profit in £? Give just the number.", 60, { params: { business: { price: 10, units: 40, unitCost: 6, fixedCosts: 100 } }, expectFrom: "profit", purpose: "Unaided check: the whole profit chain on fresh numbers.", feedback: "£60: £400 in, £240 + £100 out. Revenue alone (£400) would be the revenue-is-profit trap." }),
    T("b-tr-2", "break-even", "comparing two options fairly", "That candle shop (£10 price, £6 unit cost, £100 fixed costs): how many candles must be sold to break even? Give just the number.", 25, { params: { business: { price: 10, units: 40, unitCost: 6, fixedCosts: 100 } }, expectFrom: "breakEvenUnits", purpose: "Unaided check: break-even following directly from the shop you just costed.", feedback: "25 candles: margin £4 each, £100 ÷ £4 = 25. The 40 sold figure was profit information, not break-even information." }),
    T("b-tr-3", "decision", "comparing two options fairly", "Fresh trade-off (unit cost £5, fixed costs £200): A) price £9, sell 100; or B) price £11, sell 70. Which option makes more profit? Answer A or B.", "B", { params: { decision: { scenario: { unitCost: 5, fixedCosts: 200 }, options: [{ id: "A", price: 9, units: 100 }, { id: "B", price: 11, units: 70 }] } }, purpose: "Unaided check: a fresh price-versus-volume decision, computed both ways.", feedback: "B wins narrowly: £220 against A's £200. Twenty fewer sales, £20 more profit — only the full sum on both options can tell you that." }),
  ],
  checker: checkBusiness,
  compute: { business: computeBusiness, withinBudget, decisions: evaluateDecisions },
};
export default businessKernel;
