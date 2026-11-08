import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDynamicLesson, createDynamicKernel, checkDynamic, DYNAMIC_LESSON_MESSAGE } from "../src/dynamic-lesson.js";
import { AdaptiveDiagnosticSession } from "../src/thinking.js";

const SAMPLE = {
  concepts: ["Photosynthesis uses sunlight, water and carbon dioxide", "It produces glucose and oxygen", "Chlorophyll captures light"],
  prerequisites: ["that plants need light"],
  misconceptions: ["Thinking plants get food from soil"],
  diagnostic: [
    { q: "Which gas do plants take in for photosynthesis? Give the name.", answer: "carbon dioxide", skill: "inputs", purpose: "Entry: raw materials.", feedback: "Carbon dioxide from the air is one raw material." },
    { q: "Which green pigment captures sunlight in leaves? Give the name.", answer: "chlorophyll", skill: "pigment", purpose: "Core idea.", feedback: "Chlorophyll in chloroplasts captures light energy." },
    { q: "A student says plants get their food ready-made from the soil. What do plants actually make in photosynthesis? Give the name.", answer: "glucose", skill: "product", purpose: "Misconception probe.", feedback: "Plants make glucose; soil gives water and minerals, not food.", misconceptionAnswer: "soil food" },
    { q: "Easier first step: what gas do plants release from photosynthesis? Give the name.", answer: "oxygen", skill: "outputs", purpose: "Foundation.", feedback: "Oxygen is released as a product." },
    { q: "Harder step: at what percent would 200 units of light give 6 units stored, if efficiency is stored divided by 100? Give the number.", answer: 3, skill: "efficiency", purpose: "Stretch.", feedback: "Efficiency thinking: a small fraction is stored." },
  ],
  practice: [
    { q: "Which organelle in plant cells carries out photosynthesis? Give the name.", answer: "chloroplast", skill: "site", purpose: "Practice site.", feedback: "Chloroplasts are the site of photosynthesis." },
    { q: "A plant gets 50 units of water and uses half in photosynthesis. How many units are used? Give the number.", answer: 25, skill: "amounts", purpose: "Practice amounts.", feedback: "Half of 50 is 25." },
    { q: "Which two raw materials combine in photosynthesis besides light? Name the gas first: gas and what liquid?", answer: "carbon dioxide and water", skill: "inputs", purpose: "Practice inputs.", feedback: "Carbon dioxide and water are the material inputs." },
  ],
  transfer: [
    { q: "Fresh case: algae in a pond photosynthesise. Which gas bubbles out of the pond plants? Give the name.", answer: "oxygen", skill: "outputs", purpose: "Transfer outputs.", feedback: "Oxygen bubbles from photosynthesis in water plants too." },
    { q: "Fresh case: a leaf kept in darkness for two days makes how much glucose compared with a lit leaf — more, less, or the same? Answer one word.", answer: "less", skill: "light-need", purpose: "Transfer light need.", feedback: "Less: no light means no photosynthesis to make glucose." },
  ],
};

test("dynamic lesson: fenced AI JSON becomes a valid, non-repeating lesson", () => {
  const kernel = createDynamicKernel(parseDynamicLesson("```json\n" + JSON.stringify(SAMPLE) + "\n```"), "photosynthesis");
  assert.ok(kernel, "kernel built");
  assert.equal(kernel.dynamic, true);
  assert.equal(kernel.id, "obscure", "keeps the honest generic world");
  const s = new AdaptiveDiagnosticSession(kernel);
  const asked = [...s.currentItems()];
  s.submitCore(s.currentItems().map((it) => ({ answer: it.answer, confidence: 0.5, strategy: "worked it out" })));
  asked.push(...s.currentItems());
  const flow = [...asked, ...kernel.practice, ...kernel.transfer].map((i) => i.id);
  assert.equal(new Set(flow).size, flow.length, "no question repeats in a full dynamic flow");
  assert.match(DYNAMIC_LESSON_MESSAGE("volcanoes"), /ONLY a JSON object/);
});

test("dynamic lesson: rejects garbage and checks answers by meaning", () => {
  assert.equal(createDynamicKernel(parseDynamicLesson("not json at all"), "x"), null);
  assert.equal(createDynamicKernel({ diagnostic: [{ q: "short?", answer: "x" }] }, "x"), null);
  const kernel = createDynamicKernel(SAMPLE, "photosynthesis");
  assert.equal(kernel.checker(kernel.diagnostic[0], "Carbon dioxide.").correct, true);
  assert.equal(kernel.checker(kernel.diagnostic[0], "oxygen").correct, false);
  assert.equal(kernel.checker(kernel.diagnostic[4], "3").correct, true);
  assert.equal(checkDynamic({ answer: "New York", feedback: "f" }, "new york").correct, true);
});

test("dynamic wiring: generation only replaces the generic fallback; voice speaks Professor lines", () => {
  const js = readFileSync(new URL("../public/stage.js", import.meta.url), "utf8");
  assert.ok(js.includes("generateDynamicLesson"), "live generation wired");
  assert.ok(js.includes('base.id !== "obscure"'), "built subjects keep their kernels");
  assert.ok(js.includes('j.mode !== "live"'), "offline text can never pose as a generated lesson");
  assert.ok(js.includes("AI-assessed, not kernel-verified"), "dynamic marking is labelled honestly");
  assert.ok(js.includes("suppressSaySpeech"), "chat streaming does not double-speak");
  assert.ok(/function say\(text, pose\) \{[\s\S]*speakText\(text\)/.test(js), "Professor lines are spoken, not just shown");
});
