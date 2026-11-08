import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { teachingMethodFor, TEACHING_METHODS } from "../src/thinking.js";

test("pedagogy: every diagnosis code maps to a named teaching method", () => {
  for (const code of ["sound", "slip", "misread", "prereq-gap", "misconception"]) {
    const m = teachingMethodFor(code);
    assert.ok(m.name.length > 3 && m.move.length > 20, code);
  }
  assert.match(teachingMethodFor("misconception").name, /[Cc]ontrasting case/);
  assert.match(teachingMethodFor("prereq-gap").move, /missing building block/i);
  assert.equal(Object.keys(TEACHING_METHODS).length, 5);
});

test("pedagogy wiring: persona repertoire, diagnosis-aware teach prompt, named adaptation", () => {
  const adapter = readFileSync(new URL("../server/ai-adapter.mjs", import.meta.url), "utf8");
  for (const method of ["Socratic questioning", "Feynman teach-back", "retrieval practice", "interleaving", "contrasting case"]) {
    assert.ok(adapter.includes(method), `persona commands ${method}`);
  }
  const js = readFileSync(new URL("../public/stage.js", import.meta.url), "utf8");
  assert.ok(js.includes("Choose fitting methods from your repertoire"), "teach prompt asks Professor D to select methods from evidence");
  assert.ok(js.includes("teachingMethodFor"), "adaptation names its method");
  assert.ok(js.includes("dynamicFallback"), "failed live generation is announced, never silent");
});

test("standout: prediction-first scenes + Learning Passport evidence", () => {
  const js = readFileSync(new URL("../public/stage.js", import.meta.url), "utf8");
  assert.ok(js.includes("PREDICTIONS") && js.includes("wirePrediction"), "prediction committed before manipulation");
  assert.ok(js.includes("First, predict."), "student-facing prediction prompt");
  for (const id of ["maths", "clouds", "animals", "engineering-castle", "business", "cars"]) assert.ok(js.includes(`"${id}"`) || js.includes(`${id}:`), `prediction for ${id}`);
  assert.ok(js.includes("ludus-passport") && js.includes("Learning Passport"), "persistent mastery passport");
  assert.ok(js.includes("Download learning report") && js.includes("downloadReport"), "exportable evidence report");
  assert.ok(js.includes("No points, no streaks"), "anti-gamification stance is explicit");
});

test("retention: teach-back assessment + spaced review scheduling are wired", () => {
  const js = readFileSync(new URL("../public/stage.js", import.meta.url), "utf8");
  assert.ok(js.includes("assessTeachBack"), "teach-back (Feynman) assessment exists");
  assert.ok(js.includes("teachBackPending"), "conversation box routes the teach-back");
  assert.ok(js.includes("ludus-reviews"), "spaced review persists between sessions");
  assert.ok(js.includes("Review due — spaced practice"), "due reviews surface on the opening screen");
  assert.ok(js.includes("saveReview(allCorrect)"), "summary schedules the next review");
  const adapter = readFileSync(new URL("../server/ai-adapter.mjs", import.meta.url), "utf8");
  assert.ok(adapter.includes("never copy its sentences"), "sources are evidence, not a script");
  assert.ok(adapter.includes("Teach in your own voice"), "persona teaches in its own words");
});
