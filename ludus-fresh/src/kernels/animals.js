// kernel-animals — feature classification/compare, computed. Gold import only.
import { classifyAnimal, compareAnimals } from "../../../src/simulations.js";
export { classifyAnimal, compareAnimals };
export function classifyByFeatures({ dietKind } = {}) {
  const d = String(dietKind || "").toLowerCase();
  if (/meat|other animals|insects|fish/.test(d)) return "carnivore";
  if (/plants|grass|leaves/.test(d)) return "herbivore";
  return "omnivore";
}
export function checkAnimals(item, answer) {
  let expected = item.answer;
  if (item.params?.species) { const c = classifyAnimal(item.params.species); expected = item.expectFrom === "diet" ? c.diet : item.expectFrom === "shelter" ? c.shelter : c.group; }
  if (item.params?.compare) { const cmp = compareAnimals(item.params.compare[0], item.params.compare[1]); expected = item.expectFrom === "sameGroup" ? cmp.sameGroup : cmp.summary; }
  const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/[.!?]+$/, "").replace(/^(a|an|the)\s+/, "");
  const correct = typeof expected === "boolean" ? String(answer).toLowerCase() === String(expected) || (expected && /^(yes|true|same)([ .!]|$)/.test(norm(answer))) || (!expected && /^(no|false|different)([ .!]|$)/.test(norm(answer))) : norm(answer) === norm(expected);
  return { correct, expected, given: answer, feedback: correct ? "Matches the feature table." : `Classified result is "${expected}" — classify by diet first, then shelter.` };
}
const mk = (kind) => (id, skill, prereq, q, answer, extra = {}) => ({ id, kind, scored: true, skill, prereq, q, prompt: q, answer, ...extra });
const D = mk("diagnostic"), P = mk("practice"), T = mk("transfer");
export const animalsKernel = {
  id: "animals", title: "Animals — habitats, features, relationships",
  concepts: ["Carnivores eat other animals", "Herbivores eat plants", "Shelter is where an animal is protected", "Same diet group does not mean same shelter"],
  prerequisites: ["observing animal features", "sorting by one feature at a time", "habitat words (savanna, pond)"],
  misconceptions: ["Thinking all savanna animals eat plants", "Thinking group and shelter are the same feature"],
  // Planned ladder: plant-eater -> meat-eater -> shelter is a different feature.
  diagnostic: [
    D("a-diag-1", "classification", "sorting by one feature at a time", "A zebra spends its day grazing on grass and leaves. Which diet group does it belong to? Answer: carnivore, herbivore, or omnivore.", "herbivore", { params: { species: "zebra" }, purpose: "Starts with the friendliest case: grouping an animal by what it eats.", feedback: "Herbivore: plant-eaters. Grouping by diet first — before looks, size, or where it lives — is the habit this whole topic builds on." }),
    D("a-diag-2", "classification", "observing animal features", "A lion hunts and eats other animals on the same grassland. Which diet group is the lion in? Answer: carnivore, herbivore, or omnivore.", "carnivore", { params: { species: "lion" }, misconceptionAnswer: "herbivore", misconception: "Thinking all savanna animals eat plants", purpose: "Same habitat, different diet: does living together tempt you to group them together?", feedback: "Carnivore: meat-eaters. Lion and zebra share a habitat but not a diet — habitat and diet group are separate features." }),
    D("a-diag-3", "shelter", "habitat words (savanna, pond)", "New feature: shelter, where an animal is protected. Where does a frog shelter? Answer: pond plants, den, or open grassland.", "pond plants", { params: { species: "frog" }, expectFrom: "shelter", purpose: "Introduces the second feature, shelter, so group and shelter are never confused.", feedback: "Among pond plants. Shelter answers 'where is it protected?', diet group answers 'what does it eat?' — two different questions about the same animal." }),
    { ...P("a-diag-4", "classification", "sorting by one feature at a time", "Let's go back to diet. A fox hunts rabbits and birds. Which diet group is the fox in? Answer: carnivore, herbivore, or omnivore.", "carnivore", { params: { species: "fox" } }), purpose: "Foundation probe: one more meat-eater, to settle the diet rule.", feedback: "Carnivore again — hunting other animals is the giveaway, whatever the animal looks like." },
    { ...P("a-diag-5", "shelter", "habitat words (savanna, pond)", "And for shelter: a fox raises its cubs underground where predators cannot reach them. Where does a fox shelter? Answer: den, pond plants, or open grassland.", "den", { params: { species: "fox" }, expectFrom: "shelter" }), purpose: "Foundation probe: shelter for an animal you have just classified by diet.", feedback: "A den. You just used both features on the fox: carnivore by diet, den by shelter — independently." },
    { ...T("a-diag-6", "compare", "observing animal features", "A frog eats insects; a heron eats fish. Are the frog and the heron in the same diet group? Answer yes or no.", true, { params: { compare: ["frog", "heron"] }, expectFrom: "sameGroup" }), purpose: "Stretch probe: two different menus — are they still the same group?", feedback: "Yes. Insects and fish are both other animals, so both are carnivores. Different prey, same diet group — and their shelters still differ." },
    { ...T("a-diag-7", "classification", "sorting by one feature at a time", "A heron stands perfectly still, then spears a fish. Which diet group is the heron in? Answer: carnivore, herbivore, or omnivore.", "carnivore", { params: { species: "heron" } }), purpose: "Stretch probe: a bird that eats fish — does 'bird' distract from diet?", feedback: "Carnivore. Eating fish is eating other animals; feathers do not change the diet group." },
  ],
  practice: [
    P("a-prac-1", "shelter", "habitat words (savanna, pond)", "Between hunts, a lion rests where it is shaded and hidden. Where does a lion shelter? Answer: shade of trees, den, or pond plants.", "shade of trees", { params: { species: "lion" }, expectFrom: "shelter", purpose: "Practises the shelter feature on an animal already classified by diet.", feedback: "The shade of trees. You classified the lion as a carnivore by diet earlier; this answer used the separate shelter feature." }),
    P("a-prac-2", "compare", "observing animal features", "A lion eats other animals; a zebra eats plants. Are they in the same diet group? Answer yes or no.", false, { params: { compare: ["lion", "zebra"] }, expectFrom: "sameGroup", purpose: "Practises comparing two animals on one feature only.", feedback: "No — carnivore versus herbivore. Same grassland, opposite diets: comparing means picking one feature and holding it steady." }),
    P("a-prac-3", "classification", "sorting by one feature at a time", "At the pond edge, a frog snaps up insects one after another. Which diet group is the frog in? Answer: carnivore, herbivore, or omnivore.", "carnivore", { params: { species: "frog" }, purpose: "Practises diet classification on a small animal, where size tempts a wrong guess.", feedback: "Carnivore. Insects are other animals, so even a tiny hunter is a carnivore." }),
  ],
  transfer: [
    T("a-tr-1", "classification", "sorting by one feature at a time", "Fresh animal you have not classified: a heron eats fish it catches in the shallows. Which diet group is it in? Answer: carnivore, herbivore, or omnivore.", "carnivore", { params: { species: "heron" }, purpose: "Unaided check: diet grouping on a fresh animal.", feedback: "Carnivore — fish are other animals, so a fish-eater is a meat-eater." }),
    T("a-tr-2", "compare", "habitat words (savanna, pond)", "Fresh compare: a zebra grazing, and a fox hunting nearby. Are they in the same diet group? Answer yes or no.", false, { params: { compare: ["zebra", "fox"] }, expectFrom: "sameGroup", purpose: "Unaided check: comparing a new pair on diet alone.", feedback: "No: herbivore versus carnivore. Near each other, eating opposite things." }),
    T("a-tr-3", "shelter", "habitat words (savanna, pond)", "Fresh feature check: a heron nests and rests among tall waterside reeds. Where does a heron shelter? Answer: pond reeds, den, or open grassland.", "pond reeds", { params: { species: "heron" }, expectFrom: "shelter", purpose: "Unaided check: shelter identified separately from diet.", feedback: "Pond reeds. Diet told you carnivore; shelter is its own feature, answered on its own evidence." }),
  ],
  checker: checkAnimals,
  compute: { classify: classifyAnimal, compare: compareAnimals, classifyByFeatures },
};
export default animalsKernel;
