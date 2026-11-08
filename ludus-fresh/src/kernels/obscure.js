// kernel-obscure — fallback for any safe obscure topic: inquiry steps, no fake facts.
// simulationSupported:false mirrors gold genericTopicScene honesty contract.
export const INQUIRY_STEPS = ["Observe", "Predict", "Test", "Explain"];
export function inquiryPlan(topic) {
  const name = String(topic || "your topic").trim().slice(0, 80) || "your topic";
  return { topic: name, simulationSupported: false, steps: INQUIRY_STEPS, supportedParts: ["Labelled diagram composed from verified primitives", "Observe → predict → test → explain sequence", "Live lesson labelled with looked-up sources or as model knowledge"], unsupportedParts: ["A bespoke interactive simulation for this exact topic — not built", "Verified facts beyond the labelled lookup — not claimed"], workedExample: "Worked method: name the parts, predict a change, test what you can, then explain the result in your own words. Anything untested is labelled untested.", requiresLookupLabelling: true };
}
export function checkInquiry(item, answer) {
  // Unscored for facts: only checks the inquiry move was made, never invents a fact key.
  const text = String(answer ?? "").toLowerCase();
  const step = item.expectStep || "observe";
  const hit = text.includes(step) || (step === "explain" && text.length >= 20);
  return { correct: hit, scored: false, factual: false, expected: `An ${step} move (state your ${step === "explain" ? "explanation in your own words" : step})`, given: answer, feedback: hit ? "Inquiry move recorded. Factual claims still need a labelled source — none is invented here." : `Try an explicit ${step} statement. This kernel cannot verify topic facts and will not fake them.` };
}
const mk = (kind) => (id, skill, prereq, q, answer, extra = {}) => ({ id, kind, scored: false, skill, prereq, q, prompt: q, answer, ...extra });
const D = mk("diagnostic"), P = mk("practice"), T = mk("transfer");
export const obscureKernel = {
  id: "obscure", title: "Any other topic — inquiry method (no bespoke simulation)",
  concepts: ["Start from a concrete example", "Name the parts before the rule", "Test a rule on a new example", "Label what is observed, guessed, or looked up"],
  prerequisites: ["everyday words connected to the topic", "one concrete example", "the difference between an example and a definition"],
  misconceptions: ["Memorising a definition without an example", "Confusing an example with the general rule"],
  // Planned inquiry ladder about the learner's own topic ({topic} is filled
  // in by the stage): example -> prediction -> own-words explanation.
  diagnostic: [
    D("o-diag-1", "inquiry-observe", "one concrete example", "Think about {topic}. What is one real example of it that you have seen, read about, or can picture clearly? Start with 'I observe …' and describe that example.", null, { expectStep: "observe", purpose: "Anchors the new topic in one concrete example before any definition.", feedback: "Good — learning starts from a real example you can point to. Definitions will be built on this example, not memorised before it." }),
    D("o-diag-2", "inquiry-predict", "the difference between an example and a definition", "Stay with that example of {topic}. If one part of it changed, what do you think would happen next? Start with 'I predict …' and say why.", null, { expectStep: "predict", purpose: "Turns looking into thinking: a prediction gives the lesson something to test.", feedback: "A prediction is a bet your next step can settle. Notice you now have a claim about {topic}, not just a description." }),
    D("o-diag-3", "inquiry-explain", "everyday words connected to the topic", "In your own words: what is {topic} about so far? Write one full sentence explaining it as you would to a friend who has never met it.", null, { expectStep: "explain", purpose: "Checks the story you already carry about this topic, before teaching adds to it.", feedback: "Your own-words version is the starting map. Where it is vague is exactly where the teaching will dig — that is information, not failure." }),
    { ...P("o-diag-4", "inquiry-test", "one concrete example", "How could you check whether your prediction about {topic} is right? Start with 'I test …' and name something you could observe, try, or look up.", null, { expectStep: "test" }), purpose: "Foundation probe: can you design a check, however simple?", feedback: "A test turns an opinion into evidence. Even 'look it up and compare two sources' counts, if you say what would change your mind." },
    { ...P("o-diag-5", "inquiry-observe", "everyday words connected to the topic", "What is a second example of {topic}, different from your first one? Start with 'I observe …' and describe what is different about it.", null, { expectStep: "observe" }), purpose: "Foundation probe: a second example stops one case pretending to be the whole topic.", feedback: "Two examples start to show what is always true about {topic} and what was just true of the first case." },
    { ...T("o-diag-6", "inquiry-explain", "the difference between an example and a definition", "Take a new example of {topic} that you have not used yet. In your own words, how does it fit what you said earlier — and where does it not fit?", null, { expectStep: "explain" }), purpose: "Stretch probe: does your early explanation survive a case it was not built on?", feedback: "Where the new example breaks your explanation is the most valuable spot in the lesson — that edge is where the real rule lives." },
    { ...T("o-diag-7", "inquiry-predict", "one concrete example", "For that new example of {topic}, what do you expect to happen next, and why? Start with 'I predict …' and give your reason.", null, { expectStep: "predict" }), purpose: "Stretch probe: prediction on unfamiliar ground, with reasoning attached.", feedback: "A reasoned prediction can be checked. Keep hold of yours — the lesson will come back and settle it." },
  ],
  practice: [
    P("o-prac-1", "inquiry-test", "one concrete example", "Go back to your first example of {topic}. What does your rule explain well about it, and what does it miss? Start with 'I test …' and test the rule against the example.", null, { expectStep: "test", purpose: "Practises testing a rule against a known case and naming its limits.", feedback: "Naming what a rule misses is real testing. A rule with known limits beats a vague rule that claims everything." }),
    P("o-prac-2", "inquiry-observe", "everyday words connected to the topic", "Look at {topic} a second time: what is one detail you notice now that you missed at first? Start with 'I observe …'.", null, { expectStep: "observe", purpose: "Practises second-look observation, where most new understanding hides.", feedback: "Second looks are where learning compounds — the detail you just named is material the first look could not give you." }),
    P("o-prac-3", "inquiry-explain", "everyday words connected to the topic", "Which word connected with {topic} is hardest to explain? Say the word, and what you think it means so far, in a full sentence.", null, { expectStep: "explain", purpose: "Practises finding the exact word where understanding runs out.", feedback: "That hard word is a precise target. Naming it honestly tells the teaching exactly where to aim next." }),
  ],
  transfer: [
    T("o-tr-1", "inquiry-explain", "the difference between an example and a definition", "Fresh case: which example of {topic} that you have not used anywhere above will you take? Explain it in your own words, and say how it follows the rule you built.", null, { expectStep: "explain", purpose: "Unaided check: your rule, carried to genuinely new ground.", feedback: "Explaining a fresh case without help is the evidence that counts. Where it wobbled shows what to revisit — honestly, not harshly." }),
    T("o-tr-2", "inquiry-predict", "one concrete example", "Fresh case: for that new example of {topic}, what happens next? Start with 'I predict …' and give your reason.", null, { expectStep: "predict", purpose: "Unaided check: a reasoned prediction on the fresh case.", feedback: "A prediction with a reason can be settled by evidence. That settle-able claim is what understanding looks like from outside." }),
    T("o-tr-3", "inquiry-explain", "everyday words connected to the topic", "Final fresh test: how would you explain {topic} to someone who has never heard of it, using your best example? Write it in your own words, in full sentences.", null, { expectStep: "explain", purpose: "Unaided check: teaching it back is the strongest evidence of learning.", feedback: "If a newcomer could follow that, the idea is yours now. Anything you had to skip is the honest remainder to work on." }),
  ],
  checker: checkInquiry,
  compute: { plan: inquiryPlan, steps: () => [...INQUIRY_STEPS] },
};
export default obscureKernel;
