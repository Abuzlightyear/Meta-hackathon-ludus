// Offline content provider — enriched topics + generic generator for ANY safe free-text topic.
// No subject hardcoding in engines; engines consume this shape.
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const ENRICHED = {
  recursion: {
    label: "Recursion", prereqs: ["functions", "function calls", "a stopping condition (base case)"],
    principles: ["A recursive function calls itself on a smaller input.", "Every recursion needs a base case that stops the calls.", "Each call waits on the stack until the smaller call returns."],
    steps: [
      { title: "Start with the big problem", body: "Ask: can I solve a smaller version of this same problem? For factorial(4), that's factorial(3)." },
      { title: "Shrink the input", body: "Each call reduces the problem: factorial(4) → factorial(3) → factorial(2) → factorial(1)." },
      { title: "Hit the base case", body: "factorial(1) = 1. This is the stopping condition — without it, calls never end." },
      { title: "Unwind and combine", body: "Results flow back up: 1 → 2×1=2 → 3×2=6 → 4×6=24." }],
    example: "factorial(3): 3 × factorial(2) → 3 × (2 × factorial(1)) → 3 × (2 × 1) = 6.",
    misconceptions: ["Thinking recursion is just a loop with no stopping rule", "Forgetting the base case"],
    diagnostic: [
      { q: "What must every recursive function have to stop?", options: ["A base case", "An infinite loop", "A global variable"], answer: 0, prereq: "a stopping condition (base case)" },
      { q: "In factorial(4), what does the function call next?", options: ["factorial(5)", "factorial(3)", "factorial(0) only"], answer: 1, prereq: "function calls" },
      { q: "Where do unfinished calls wait?", options: ["On the call stack", "In a database", "Nowhere — they vanish"], answer: 0, prereq: "functions" }],
    practice: [
      { q: "What is factorial(1) in the base case?", options: ["0", "1", "It calls factorial(0) forever"], answer: 1, feedback: "The base case returns 1 directly — that's what stops the recursion." },
      { q: "What happens with no base case?", options: ["It runs faster", "Calls never stop (stack overflow)", "It returns 0"], answer: 1, feedback: "Without a base case, calls keep piling onto the stack until it overflows." }],
    verify: [
      { q: "Trace: sumTo(3) = 3 + sumTo(2). What is sumTo(3) if sumTo(1)=1?", options: ["3", "6", "9"], answer: 1, feedback: "sumTo(2)=2+1=3, so sumTo(3)=3+3=6." },
      { q: "Which change makes recursion terminate?", options: ["Calling itself with a larger input", "Moving the input toward the base case each call", "Removing the return"], answer: 1, feedback: "Each call must get closer to the base case." }],
  },
  photosynthesis: {
    label: "Photosynthesis", prereqs: ["that plants need energy to grow", "what sunlight, water and air are", "basic idea of a chemical change"],
    principles: ["Photosynthesis turns light energy into stored chemical energy (glucose).", "Inputs: sunlight, water, and carbon dioxide. Outputs: glucose and oxygen.", "It happens in chloroplasts, using the pigment chlorophyll."],
    steps: [
      { title: "Capture light", body: "Chlorophyll in the leaves absorbs sunlight, mostly blue and red light." },
      { title: "Take in ingredients", body: "Roots absorb water; tiny pores (stomata) take in carbon dioxide from the air." },
      { title: "Build glucose", body: "Light energy powers the joining of water and CO₂ into glucose — stored energy." },
      { title: "Release oxygen", body: "Oxygen is released as a by-product through the stomata." }],
    example: "A sunflower on a bright day: light + water + CO₂ → glucose for growth + oxygen released.",
    misconceptions: ["Thinking plants get their food from the soil", "Thinking photosynthesis happens at night"],
    diagnostic: [
      { q: "Where does a plant get most of the material to grow?", options: ["From the soil only", "Built from air and water using light", "From other plants"], answer: 1, prereq: "that plants need energy to grow" },
      { q: "Which gas do plants take in for photosynthesis?", options: ["Oxygen", "Carbon dioxide", "Nitrogen only"], answer: 1, prereq: "what sunlight, water and air are" },
      { q: "Photosynthesis mainly happens when…", options: ["It is dark", "There is light", "It rains"], answer: 1, prereq: "basic idea of a chemical change" }],
    practice: [
      { q: "Which is an OUTPUT of photosynthesis?", options: ["Carbon dioxide", "Oxygen", "Soil"], answer: 1, feedback: "Oxygen is released; CO₂ is an input." },
      { q: "A plant kept in the dark will…", options: ["Photosynthesise faster", "Stop photosynthesising and weaken", "Make more glucose"], answer: 1, feedback: "No light means no energy to drive the reaction." }],
    verify: [
      { q: "A sealed plant in light gains mass. The extra mass mostly came from…", options: ["The soil", "Carbon dioxide in the air", "The pot"], answer: 1, feedback: "Carbon from CO₂ becomes the glucose that builds the plant." },
      { q: "Which set is correct?", options: ["Inputs: oxygen + glucose", "Inputs: light + water + CO₂ → outputs: glucose + oxygen", "Inputs: soil + darkness"], answer: 1, feedback: "That's the full photosynthesis equation in words." }],
  },
  fractions: {
    label: "Fractions", prereqs: ["counting and equal groups", "division as sharing", "comparing sizes of numbers"],
    principles: ["A fraction names part of a whole: numerator ÷ denominator.", "The denominator says how many equal parts; the numerator says how many you have.", "Equivalent fractions (1/2 = 2/4) name the same amount."],
    steps: [
      { title: "Split the whole equally", body: "Cut a pizza into 4 equal slices. The '4' is the denominator — equal parts matter." },
      { title: "Count your parts", body: "Take 3 slices. The '3' is the numerator. You have 3/4." },
      { title: "Compare fairly", body: "1/2 vs 1/4: fewer, bigger slices win — 1/2 is larger." },
      { title: "Rename equivalently", body: "1/2 = 2/4 = 4/8. Same amount, different name." }],
    example: "Sharing 3 pizzas among 4 friends: each gets 3/4 of a pizza.",
    misconceptions: ["Thinking a bigger denominator means a bigger fraction", "Adding numerators and denominators straight across"],
    diagnostic: [
      { q: "In 3/4, what does the 4 tell you?", options: ["How many parts you have", "How many equal parts the whole is split into", "The answer"], answer: 1, prereq: "division as sharing" },
      { q: "Which is bigger: 1/2 or 1/4?", options: ["1/4", "1/2", "They are equal"], answer: 1, prereq: "comparing sizes of numbers" },
      { q: "Sharing 1 cake equally among 4 people, each gets…", options: ["4 cakes", "1/4 of the cake", "1 cake"], answer: 1, prereq: "counting and equal groups" }],
    practice: [
      { q: "Which fraction equals 1/2?", options: ["2/4", "1/3", "3/2"], answer: 0, feedback: "2 out of 4 equal parts is the same amount as 1 out of 2." },
      { q: "You eat 2 of 8 equal slices. As a fraction?", options: ["8/2", "2/8", "2/6"], answer: 1, feedback: "Numerator = parts you have (2), denominator = total equal parts (8)." }],
    verify: [
      { q: "Which is the largest?", options: ["1/3", "1/2", "1/5"], answer: 1, feedback: "With numerator 1, the smallest denominator gives the biggest parts." },
      { q: "3/6 simplified is…", options: ["1/2", "3/3", "6/3"], answer: 0, feedback: "Divide top and bottom by 3: 3/6 = 1/2." }],
  },
};
export function matchEnriched(topic) {
  const t = topic.toLowerCase();
  for (const k of Object.keys(ENRICHED)) if (t.includes(k)) return ENRICHED[k];
  if (/photosynth/.test(t)) return ENRICHED.photosynthesis;
  if (/fraction/.test(t)) return ENRICHED.fractions;
  if (/recursi/.test(t)) return ENRICHED.recursion;
  return null;
}
export function genericContent(topic) {
  const T = cap(topic.trim());
  return {
    label: T, prereqs: [`everyday words connected to ${topic}`, `one concrete example of ${topic}`, `the difference between an example and a definition of ${topic}`],
    principles: [`${T} is best learned by starting from a concrete example, then naming the general rule.`, `Every part of ${topic} can be checked with the question: "what changes, and what stays the same?"`, `Explaining ${topic} in your own words is the test that the idea has landed.`],
    steps: [
      { title: "Meet a concrete example", body: `Picture one real, everyday case of ${topic}. Describe it in plain words before using any technical terms.` },
      { title: "Name the parts", body: `Break the example into parts. Label what each part does and how the parts connect.` },
      { title: "State the rule", body: `Turn what you saw into a one-sentence rule about ${topic} that would still hold for a new example.` },
      { title: "Test the rule", body: `Try the rule on a second example. If it fails, refine the rule — that refinement is the learning.` }],
    example: `Worked example: take one familiar case of ${topic}, label its parts, state the rule it follows, then check the rule against a second case.`,
    misconceptions: [`Memorising a definition of ${topic} without being able to give an example`, `Confusing an example of ${topic} with the general rule`],
    diagnostic: [
      { q: `Which is the best first step for learning ${topic}?`, options: ["Memorise a long definition", "Start from a concrete example, then find the rule", "Skip the basics"], answer: 1, prereq: `one concrete example of ${topic}` },
      { q: `You can explain ${topic} in your own words. That usually means…`, options: ["You understand it", "You have memorised without understanding", "Nothing yet"], answer: 0, prereq: `the difference between an example and a definition of ${topic}` },
      { q: `A good way to check a rule about ${topic} is to…`, options: ["Never test it", "Try it on a new example", "Repeat it louder"], answer: 1, prereq: `everyday words connected to ${topic}` }],
    practice: [
      { q: `Which shows real understanding of ${topic}?`, options: ["Reciting a definition word-for-word", "Giving a new example and explaining why it fits", "Recognising the word only"], answer: 1, feedback: "A new example you can justify proves the rule, not just the wording." },
      { q: `Your rule about ${topic} fails on a new example. Best next step?`, options: ["Give up", "Refine the rule and re-test", "Ignore the example"], answer: 1, feedback: "Refining a rule after a counterexample is exactly how understanding deepens." }],
    verify: [
      { q: `Which is a NEW test of your ${topic} rule (not seen in practice)?`, options: ["Repeating the practice example", "Applying the rule to an unfamiliar case and predicting the result", "Re-reading the definition"], answer: 1, feedback: "Transfer to an unfamiliar case is the real verification." },
      { q: `To summarise ${topic} well, you should state…`, options: ["Only the definition", "The rule, an example, and one common mistake to avoid", "Nothing — summaries don't help"], answer: 1, feedback: "Rule + example + pitfall is a complete, honest summary." }],
  };
}
export function contentFor(topic) { return matchEnriched(topic) || genericContent(topic); }
export const SIM_TOPICS = /orbit|pendulum|circuit|wave|projectile|gravity|simulation|simulate|magnet|volcano|erupt/i;
export function simulationSupported(topic) { return !SIM_TOPICS.test(topic); }
