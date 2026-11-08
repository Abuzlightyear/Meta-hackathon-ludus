import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

process.env.META_AI_API_KEY = "";
process.env.META_API_KEY = "";
process.env.LLAMA_API_KEY = "";
process.env.NO_PROXY = "127.0.0.1,localhost";
process.env.no_proxy = "127.0.0.1,localhost";

const root = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(root + p, "utf8");
const sha = (buf) => createHash("sha256").update(buf).digest("hex");

test("stage assets: verbatim gold copies with provenance note", () => {
  const goldRoot = "/workspaces/Meta-hackathon-ludus/public/assets/";
  for (const f of ["academy.jpg", "doctore-master.jpg", "doctore-present.jpg", "doctore-point.jpg", "doctore-think.jpg", "doctore-tie-bronze.jpg", "doctore-tie-teal.jpg", "doctore-tie-crimson.jpg"]) {
    assert.ok(existsSync(`${root}public/assets/${f}`), f);
    assert.equal(sha(readFileSync(`${root}public/assets/${f}`)), sha(readFileSync(goldRoot + f)), `${f} must be a verbatim copy`);
  }
  const prov = read("public/assets/PROVENANCE.md");
  assert.match(prov, /8e1453d70dda3a83/, "locked master hash recorded");
  assert.match(prov, /GOLD COPY|verbatim COPY/i);
});

test("stage gold JS copies carry provenance headers and stay importable", async () => {
  for (const p of ["server/ai-adapter.mjs", "server/search.mjs", "server/load-env.mjs", "src/world/cutout.js", "src/world/voice.js", "src/safety-filter.js"]) {
    assert.match(read(p).split("\n")[0], /GOLD COPY of .* @ sha256:[0-9a-f]{16}/, p);
  }
  const { applyCutout, sampleBackground } = await import("../src/world/cutout.js");
  const { chooseBritishVoice, splitSentences } = await import("../src/world/voice.js");
  assert.equal(typeof applyCutout, "function"); assert.equal(typeof sampleBackground, "function");
  assert.ok(splitSentences("One. Two! Three?").length >= 3);
  assert.ok(chooseBritishVoice([{ name: "Daniel", lang: "en-GB" }]));
});

test("voice delivery: natural voice preferred; questions, praise and emphasis do not share one robotic prosody", async () => {
  const { chooseBritishVoice, planSpeech, classifySpeechSentence } = await import("../src/world/voice.js");
  const chosen = chooseBritishVoice([{ name: "Google UK English Male", lang: "en-GB" }, { name: "Daniel Natural", lang: "en-GB" }]);
  assert.equal(chosen.name, "Daniel Natural", "natural British voice wins over the first listed voice");
  assert.equal(classifySpeechSentence("What do you notice?"), "question");
  assert.equal(classifySpeechSentence("Well done — that is the rule."), "encouragement");
  assert.equal(classifySpeechSentence("Remember: diet is decided by food."), "emphasis");
  const plan = planSpeech("What do you notice? Well done — that is the rule. Remember: diet is decided by food. Now we use it.");
  assert.deepEqual(plan.map((c) => c.kind), ["question", "encouragement", "emphasis", "explanation"]);
  assert.ok(new Set(plan.map((c) => c.rate)).size > 1, "speech rate varies by sentence intent");
  assert.ok(new Set(plan.map((c) => c.pitch)).size > 1, "speech pitch varies by sentence intent");
  assert.ok(plan.slice(0, -1).every((c) => c.pauseAfterMs >= 200), "sentences get breathing pauses");
  const js = read("public/stage.js");
  for (const needle of ["planSpeech", "gestureForSpeechKind", "chunk.rate", "chunk.pitch", "chunk.pauseAfterMs", "mouth-pulse", "dataset.speechKind", "p.focusSpecies = item.params.species", "p.compareMode = true", "item.params.compare[0]"]) assert.ok(js.includes(needle), needle);
  const html = read("public/index.html");
  assert.ok(html.includes('id="voice-wave"') && html.includes('class="speech-ring"'), "speaking has visible wave and presence cues");
  const css = read("public/styles.css");
  assert.match(css, /prof-breathe/); assert.match(css, /voice-wave/); assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("stage HTML: first-screen question, ONE bubble, wall, dock Talk/Type/Mute-yourself ONLY", () => {
  const html = read("public/index.html");
  assert.match(html, /What would you like to learn today\?/);
  assert.equal((html.match(/id="speech-bubble"/g) || []).length, 1, "exactly one speech bubble");
  assert.ok(html.includes('id="world-host"'), "wall hosts world SVG");
  assert.ok(html.includes('id="history-drawer"') && html.includes('id="btn-type"'), "history behind Type toggle");
  assert.ok(html.includes('id="btn-talk"') && html.includes('id="btn-mute"'), "Talk + Mute-yourself dock buttons");
  assert.equal((html.match(/class="dock-btn"/g) || []).length, 3, "dock has Talk/Type/Mute-yourself ONLY");
  assert.ok(html.includes('src="/assets/doctore-present.jpg"'), "Doctore present pose on first screen");
});

test("stage CSS: 2-line bubble clamp, reduced-motion, no purple gradients", () => {
  const css = read("public/styles.css");
  assert.match(css, /-webkit-line-clamp:\s*2/, "bubble clamped to 2 lines");
  assert.match(css, /prefers-reduced-motion:\s*reduce/, "reduced-motion preserved");
  assert.doesNotMatch(css, /purple/i, "taste rule: no purple");
  assert.match(css, /academy\.jpg/, "full-screen Academy backdrop");
});

test("stage layout: avatar in flow (never covers controls), aligned timeline, welcome diagram mounted", () => {
  const js = read("public/stage.js");
  assert.ok(js.includes("mountWelcome"), "intake mounts the interactive welcome diagram");
  assert.ok(js.includes('<ol class="steps"') && js.includes('aria-current="step"'), "timeline is structured steps, not a text line");
  assert.ok(!js.includes("el.style.right"), "avatar is never absolutely repositioned over controls");
  const css = read("public/styles.css");
  assert.match(css, /\.doctore-img\{[^}]*position:relative/, "character moves inside its own stage, in flow");
  assert.match(css, /\.step\.now/, "current timeline step is highlighted in place");
  assert.ok(!css.includes("min-height:420px"), "no forced empty wall height");
});

test("stage JS: pure helpers + flow wiring to thinking/kernels/worlds and live routes", async () => {
  const { latestLine, tieForKernel, poseForPhase, PRESENT_TIES, elicitationFor, answerOptionsFor } = await import("../public/stage.js");
  assert.deepEqual(elicitationFor("diagnostic", 0), { confidence: true, strategy: true, hint: true }, "first diagnostic question samples confidence + method");
  assert.deepEqual(elicitationFor("diagnostic", 1), { confidence: false, strategy: false, hint: true }, "later diagnostic questions are answer-only");
  assert.deepEqual(elicitationFor("practice", 0), { confidence: false, strategy: false, hint: true }, "practice never nags for confidence");
  assert.deepEqual(elicitationFor("verify", 2), { confidence: true, strategy: false, hint: false }, "unaided transfer still checks confidence, never hints");
  assert.deepEqual(answerOptionsFor({ q: "A zebra grazes. Which diet group? Answer: carnivore, herbivore, or omnivore." }), ["carnivore", "herbivore", "omnivore"], "enumerated choices become tap options");
  assert.deepEqual(answerOptionsFor({ q: "Are they in the same group? Answer yes or no." }), ["yes", "no"]);
  assert.deepEqual(answerOptionsFor({ q: "What is 6 x 4? Answer: 24." }), [], "a single numeric answer is not a choice list");
  assert.deepEqual(answerOptionsFor({ q: "Explain in your own words." }), [], "open questions stay open");
  assert.equal(latestLine("First sentence. Second one here!"), "Second one here!");
  assert.equal(tieForKernel("maths"), PRESENT_TIES.maths);
  assert.match(tieForKernel("engineering-castle"), /crimson/);
  assert.equal(tieForKernel("business"), null, "no fake tie variant");
  assert.equal(poseForPhase("teach"), "point");
  assert.equal(poseForPhase("diagnostic"), "think");
  const js = read("public/stage.js");
  for (const needle of ["AdaptiveDiagnosticSession", "kernelForTopic", "buildWorld", "createWorldState", "applyInteraction", "applyCodedResponse", "codeResponse", "markMastered", "chooseBritishVoice", "splitSentences", "sampleBackground", "applyCutout", "/api/ai/complete", "/api/ai/chat-stream", "prefers-reduced-motion", "You: muted"]) assert.ok(js.includes(needle), needle);
  for (const phase of ["diagnostic", "plan", "teach", "practice", "adapt", "verify", "summary"]) assert.ok(js.includes(`"${phase}"`), `phase ${phase} wired`);
  for (const needle of ["answer-chip", "q-hint", "q-hint-box", "q-progress", "skill-meter", "react(check.correct)", "hintsUsed", "start-demo", "startDemo", "/api/tts", "doctore-img-alt", "stage-state", "preloadPoses", "poseToken"]) assert.ok(js.includes(needle), needle);
  assert.ok(read("public/index.html").includes('id="doctore-img-alt"'), "pose crossfade layer exists");
  assert.ok(read("public/index.html").includes('id="stage-state"'), "stage state plate exists");
  assert.match(read("public/styles.css"), /prof-idle/, "idle drift animation exists");
  assert.match(js, /plan-disclosure/, "plan is a disclosure");
  assert.match(js, /No hints on the fresh challenge/, "transfer withholds hints");
});

let server, base;
before(async () => {
  const { createStageServer } = await import("../server.mjs");
  server = createStageServer();
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server?.close());

test("server: /api/health + /api/world/scene + static stage, adapter stays server-only", async () => {
  const health = await (await fetch(`${base}/api/health`)).json();
  assert.equal(health.mode, "offline-demo");
  assert.equal(health.credentialsPresent, false);
  const world = await (await fetch(`${base}/api/world/scene?topic=fractions`)).json();
  assert.equal(world.scene.kernelId, "maths");
  assert.equal(world.validation.valid, true);
  assert.equal(world.mode, "offline-demo");
  const obscure = await (await fetch(`${base}/api/world/scene?topic=${encodeURIComponent("how axolotls regrow limbs")}`)).json();
  assert.equal(obscure.scene.simulationSupported, false, "obscure topics stay honest");
  const home = await (await fetch(`${base}/`)).text();
  assert.match(home, /What would you like to learn today\?/);
  assert.equal((await fetch(`${base}/server/ai-adapter.mjs`)).status, 404, "secrets/adapter never served to client");
});

test("server: /api/tts returns real voice audio or an honest 503, never silence", async () => {
  const res = await fetch(`${base}/api/tts`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "Let us learn something new.", rate: 1, pitch: 1 }) });
  assert.ok([200, 503].includes(res.status), `unexpected tts status ${res.status}`);
  if (res.status === 200) {
    assert.match(res.headers.get("content-type") || "", /audio\//);
    const buf = await res.arrayBuffer();
    assert.ok(buf.byteLength > 1000, "audio payload is real sound data");
    assert.ok(["edge-neural", "espeak"].includes(res.headers.get("x-voice-engine") || ""), "voice engine is labelled");
  } else {
    const j = await res.json();
    assert.equal(j.error.code, "VOICE_UNAVAILABLE");
  }
  const bad = await fetch(`${base}/api/tts`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: " " }) });
  assert.equal(bad.status, 400, "empty text is rejected");
});

test("server: /api/ai/complete offline-demo labelled; /api/ai/chat-stream SSE streams", async () => {
  const done = await (await fetch(`${base}/api/ai/complete`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ topic: "fractions", task: "explain" }) })).json();
  assert.equal(done.mode, "offline-demo");
  assert.match(done.text, /Offline demo/);
  const res = await fetch(`${base}/api/ai/chat-stream`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ topic: "fractions", task: "chat", message: "What is a fraction?" }) });
  assert.match(res.headers.get("content-type"), /text\/event-stream/);
  const body = await res.text();
  assert.match(body, /"delta"/);
  assert.match(body, /"done":true/);
});
