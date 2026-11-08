// LUDUS FRESH theatre stage — full-screen Academy, ONE speech bubble,
// wall-hosted world SVG, Doctore pose/tie life, Talk/Type/Mute-yourself dock.
// Flow: intake -> diagnostic -> plan (disclosure) -> teach -> practice ->
// adapt -> verify (transfer) -> summary, wired to the shared thinking
// engine, subject kernels and world composer. Live teach/chat goes through
// the server adapter+lookup; speech is queued British sentences via the
// shared voice helpers; the cut-out uses the shared cutout helper.
// Pure helpers are exported for Node tests; DOM wiring only runs in a browser.
import { sampleBackground, applyCutout } from "../src/world/cutout.js";
import { chooseBritishVoice, splitSentences, planSpeech } from "../src/world/voice.js";
import { checkTopic } from "../src/safety-filter.js";
import { kernelForTopic } from "../src/kernels/index.js";
import { createDynamicKernel, parseDynamicLesson, DYNAMIC_LESSON_MESSAGE } from "../src/dynamic-lesson.js";
import { AdaptiveDiagnosticSession, codeResponse, createTeachingRecord, recordExperience, markMastered, summariseThinking, teachingMethodFor } from "../src/thinking.js";
import { buildWorld, sceneForTopic, createWorldState, applyInteraction, rebuildScene, applyCodedResponse, renderSceneToSVG } from "../src/world.js";

export const POSES = { present: "/assets/doctore-present.jpg", point: "/assets/doctore-point.jpg", think: "/assets/doctore-think.jpg", master: "/assets/doctore-master.jpg" };
// Tie per subject swaps in on the PRESENT pose only (founder tie rule).
export const PRESENT_TIES = { maths: "/assets/doctore-tie-bronze.jpg", clouds: "/assets/doctore-tie-teal.jpg", animals: "/assets/doctore-tie-teal.jpg", "engineering-castle": "/assets/doctore-tie-crimson.jpg", history: "/assets/doctore-tie-crimson.jpg", physics: "/assets/doctore-tie-teal.jpg", coding: "/assets/doctore-tie-bronze.jpg" };
export const TIES = { maths: "Bronze — Mathematics & Engineering", clouds: "Teal — Clouds & Weather", animals: "Teal — Animals", "engineering-castle": "Crimson — Castles", business: "Charcoal — Academy", obscure: "Charcoal — Academy", history: "Crimson — History", physics: "Teal — Physics", coding: "Bronze — Coding" };
export const ANCHORS = { present: "4%", point: "40%", think: "14%", master: "4%" };
export const PHASE_POSES = { intake: "present", diagnostic: "think", plan: "present", teach: "point", practice: "think", adapt: "point", verify: "think", summary: "present" };
export function tieForKernel(kernelId) { return PRESENT_TIES[kernelId] || null; }
export function poseForPhase(phase) { return PHASE_POSES[phase] || "present"; }
// Confidence/method are calibration evidence, not a per-question form:
// ask "how sure" only on the first diagnostic question and on the unaided
// transfer check; ask "how did you get it" only on the first diagnostic
// question, where one thinking sample shapes the whole plan.
export function elicitationFor(phase, idx) {
  if (phase === "diagnostic") return { confidence: idx === 0, strategy: idx === 0, hint: true };
  if (phase === "verify") return { confidence: true, strategy: false, hint: false };
  return { confidence: false, strategy: false, hint: true };
}
// Tap-to-answer: when a question itself enumerates the choices
// ("Answer: carnivore, herbivore, or omnivore."), offer them as buttons
// instead of making the student retype them (Duolingo-style one tap).
export function answerOptionsFor(item) {
  const q = String(item?.q || item?.prompt || "");
  const m = q.match(/Answer:?\s+([^.]+)\./i);
  if (!m) return [];
  const parts = m[1].split(/,|\bor\b/).map((s) => s.trim().replace(/\?$/, "")).filter(Boolean);
  if (parts.length < 2 || parts.length > 6 || parts.some((p) => p.length > 40)) return [];
  return parts;
}
export function latestLine(text) {
  const parts = String(text || "").replace(/\s+/g, " ").split(/(?<=[.?!])\s+/).filter((s) => s.trim());
  return (parts[parts.length - 1] || String(text || "")).slice(0, 220);
}

const PHASES = ["intake", "diagnostic", "plan", "teach", "practice", "adapt", "verify", "summary"];
const LABELS = { intake: "Topic", diagnostic: "Diagnose", plan: "Plan", teach: "Learn", practice: "Practice", adapt: "Adapt", verify: "Verify", summary: "Summary" };

function initStage() {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let topic = "", kernel = null, phase = "intake";
  let diagSession = null, diagnosis = null, record = createTeachingRecord();
  let worldState = null, liveSources = null;
  let queue = [], responses = [], onQueueDone = null;
  let practiceResults = [], transferResults = [], struggled = false, adaptedOnce = false;

  // ---------- Doctore life: pose, tie, cut-out, walk ----------
  const cutoutCache = new Map();
  async function cutoutURL(src) {
    if (cutoutCache.has(src)) return cutoutCache.get(src);
    const job = (async () => {
      try {
        const im = new Image();
        await new Promise((res, rej) => { im.onload = res; im.onerror = rej; im.src = src; });
        const cv = document.createElement("canvas"); cv.width = im.naturalWidth; cv.height = im.naturalHeight;
        const ctx = cv.getContext("2d", { willReadFrequently: true }); if (!ctx) return null;
        ctx.drawImage(im, 0, 0);
        const px = ctx.getImageData(0, 0, cv.width, cv.height);
        const bg = sampleBackground(px.data, cv.width, cv.height);
        const { ratio } = applyCutout(px.data, bg, {});
        if (ratio < 0.2 || ratio > 0.9) return null; // implausible cut — keep framed original honestly
        ctx.putImageData(px, 0, 0);
        return cv.toDataURL("image/png");
      } catch { return null; }
    })();
    cutoutCache.set(src, job);
    return job;
  }
  const POSE_SPOTS = { present: "translateX(0)", point: "translateX(14px)", think: "translateX(-14px)", master: "translateX(7px)" };
  const POSE_STATES = { present: "Ready to teach", point: "Explaining", think: "Thinking", master: "Well done" };
  function gestureForSpeechKind(kind) { return kind === "question" ? "think" : kind === "emphasis" ? "point" : kind === "encouragement" ? "master" : "point"; }
  function setStageState(text) { const el = $("stage-state"); if (el && text) el.textContent = text; }
  function preloadPoses() { for (const src of [...Object.values(POSES), ...Object.values(PRESENT_TIES)]) { const i = new Image(); i.src = src; } }
  let poseToken = 0;
  function setPose(name) {
    const el = $("doctore-img"); if (!el || !POSES[name]) return;
    const alt = $("doctore-img-alt");
    const spot = POSE_SPOTS[name] || POSE_SPOTS.present;
    el.style.transform = spot;
    if (alt) alt.style.transform = spot;
    const tie = name === "present" && kernel ? tieForKernel(kernel.id) : null;
    const src = tie || POSES[name];
    el.dataset.pose = name;
    if (el.dataset.srcKey !== src) {
      const token = ++poseToken;
      if (alt && el.dataset.srcKey) {
        // Crossfade: fade the new pose in over the old, then make it the base.
        alt.src = src;
        alt.classList.add("show");
        window.setTimeout(() => {
          if (token !== poseToken) return;
          el.src = src; el.dataset.srcKey = src;
          alt.classList.remove("show");
        }, 430);
      } else { el.src = src; el.dataset.srcKey = src; }
    }
    el.classList.remove("cutout");
    if (!document.querySelector(".character-panel")?.classList.contains("speaking")) setStageState(POSE_STATES[name] || "Ready to teach");
    const tieEl = $("tie-label");
    if (tieEl) tieEl.textContent = `Tie: ${kernel && TIES[kernel.id] ? TIES[kernel.id] : "Charcoal — Academy"}`;
  }
  let suppressSaySpeech = false;
  let demoMode = false;
  function say(text, pose) {
    // ONE speech bubble: latest line only (2-line clamp in CSS); full text
    // is preserved in the history behind Type.
    const bubble = $("speech-bubble");
    if (bubble && text) bubble.textContent = latestLine(text);
    const el = $("doctore-img");
    const p = pose || poseForPhase(phase);
    if (el && POSES[p]) setPose(p);
    if (text && !suppressSaySpeech && !/^You ask:/.test(String(text))) speakText(text);
  }

  // ---------- Voice: queued British sentence speech ----------
  let britishVoice = null;
  function pickVoice() {
    if (!("speechSynthesis" in window)) return null;
    britishVoice = chooseBritishVoice(window.speechSynthesis.getVoices());
    return britishVoice;
  }
  if ("speechSynthesis" in window) { pickVoice(); window.speechSynthesis.onvoiceschanged = () => pickVoice(); }
  const speechQueue = [];
  let speechActive = false, keepAlive = null, speechSession = 0;
  function setStatus(t) { const s = $("voice-status"); if (s) s.textContent = t; }
  let currentAudio = null, mouthTimer = null;
  function pumpSpeech() {
    if (speechActive || !speechQueue.length) return;
    const chunk = speechQueue.shift();
    const session = speechSession;
    const panel = document.querySelector(".character-panel");
    speechActive = true;
    if (panel) panel.dataset.speechKind = chunk.kind;
    setPose(gestureForSpeechKind(chunk.kind));
    const finish = (delay = 0) => {
      if (session !== speechSession) return;
      if (keepAlive) { window.clearInterval(keepAlive); keepAlive = null; }
      if (mouthTimer) { window.clearInterval(mouthTimer); mouthTimer = null; }
      currentAudio = null;
      panel?.classList.remove("mouth-pulse");
      if (speechQueue.length && delay > 0) {
        speechActive = true;
        window.setTimeout(() => { if (session === speechSession) { speechActive = false; pumpSpeech(); } }, delay);
        return;
      }
      speechActive = false;
      panel?.classList.remove("speaking", "mouth-pulse");
      if (!speechQueue.length) { setPose(poseForPhase(phase)); setStageState(POSE_STATES[poseForPhase(phase)] || "Ready to teach"); }
      pumpSpeech();
    };
    const speakWithBrowser = () => {
      if (session !== speechSession) return;
      if (!("speechSynthesis" in window)) { setStatus("Voice not available in this browser. You can still read him."); finish(0); return; }
      const u = new SpeechSynthesisUtterance(chunk.text);
      const gb = britishVoice || pickVoice();
      if (gb) u.voice = gb;
      u.lang = gb?.lang || "en-GB"; u.rate = chunk.rate; u.pitch = chunk.pitch;
      keepAlive = window.setInterval(() => { try { window.speechSynthesis.resume(); } catch { /* browser without resume */ } }, 5000);
      u.onstart = () => { panel?.classList.add("speaking"); setStageState("Speaking…"); setStatus("He is speaking. Push Talk to interrupt him."); };
      u.onboundary = () => { panel?.classList.add("mouth-pulse"); window.setTimeout(() => panel?.classList.remove("mouth-pulse"), 120); };
      u.onend = () => finish(chunk.pauseAfterMs);
      u.onerror = (e) => { setStatus(`Voice blocked (${e.error || "error"}). You can still read him.`); finish(0); };
      try { window.speechSynthesis.resume(); window.speechSynthesis.speak(u); }
      catch { speechActive = false; setStatus("Voice blocked in this browser. You can still read him."); }
    };
    // Real server voice first (neural en-GB); browser speech is the fallback.
    fetch("/api/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: chunk.text, rate: chunk.rate, pitch: chunk.pitch }) })
      .then(async (r) => {
        if (session !== speechSession) return;
        if (!r.ok) throw new Error("server voice unavailable");
        const blob = await r.blob();
        if (session !== speechSession) return;
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudio = audio;
        audio.onplay = () => { panel?.classList.add("speaking"); setStageState("Speaking…"); setStatus("He is speaking. Push Talk to interrupt him."); if (mouthTimer) window.clearInterval(mouthTimer); mouthTimer = window.setInterval(() => panel?.classList.toggle("mouth-pulse"), 190); };
        audio.onended = () => { URL.revokeObjectURL(url); finish(chunk.pauseAfterMs); };
        audio.onerror = () => { URL.revokeObjectURL(url); speakWithBrowser(); };
        audio.play().catch(() => speakWithBrowser());
      })
      .catch(() => { if (session === speechSession) speakWithBrowser(); });
  }
  function speakText(text) {
    const clean = String(text || "").trim();
    if (!clean) return false;
    for (const chunk of planSpeech(clean)) speechQueue.push(chunk);
    pumpSpeech();
    return true;
  }
  function stopSpeaking() { speechSession += 1; speechQueue.length = 0; speechActive = false; document.querySelector(".character-panel")?.classList.remove("speaking", "mouth-pulse"); if (keepAlive) { window.clearInterval(keepAlive); keepAlive = null; } if (mouthTimer) { window.clearInterval(mouthTimer); mouthTimer = null; } if (currentAudio) { try { currentAudio.pause(); } catch { /* already stopped */ } currentAudio = null; } if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }

  // ---------- History (behind Type) + streaming chat ----------
  function addHistory(who, text) {
    const log = $("history-drawer"); if (!log) return null;
    const p = document.createElement("p");
    const strong = document.createElement("strong"); strong.textContent = `${who}: `;
    const span = document.createElement("span"); span.textContent = text;
    p.append(strong, span); log.append(p); log.scrollTop = log.scrollHeight;
    return span;
  }
  async function askDoctore(message) {
    addHistory("You", message);
    suppressSaySpeech = true;
    say(`You ask: ${message}`, "think");
    const bubbleSpan = addHistory("Professor D", "…");
    let full = "", pending = "";
    const speakSentences = (flush = false) => {
      for (;;) {
        const m = pending.match(/^[\s\S]*?[.?!](\s+|$)/);
        if (!m && !flush) return;
        const cut = flush ? pending : m[0];
        pending = flush ? "" : pending.slice(cut.length);
        if (cut.trim()) speakText(cut.trim());
        if (flush) return;
      }
    };
    try {
      const c = new AbortController(); const t = setTimeout(() => c.abort(), 70000);
      const r = await fetch("/api/ai/chat-stream", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ topic: topic || "general learning", task: "chat", message }), signal: c.signal }).finally(() => clearTimeout(t));
      if (!r.ok || !r.body) throw new Error("stream unavailable");
      const reader = r.body.getReader(); const decoder = new TextDecoder();
      let sse = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        sse += decoder.decode(value, { stream: true });
        const blocks = sse.split(/\n\n/); sse = blocks.pop() || "";
        for (const block of blocks) {
          const line = block.split(/\n/).find((l) => l.startsWith("data:"));
          if (!line) continue;
          const j = JSON.parse(line.slice(5).trim());
          if (j.delta) { full += j.delta; pending += j.delta; if (bubbleSpan) bubbleSpan.textContent = full; say(full, "think"); speakSentences(false); }
          if (j.done && Array.isArray(j.sources) && j.sources.length) addHistory("Looked up", j.sources.map((s) => s.title).join(" · "));
          if (j.error) throw new Error(j.error.code || "stream error");
        }
      }
      if (!full.trim()) throw new Error("empty stream");
      speakSentences(true);
      say(full, "present");
      suppressSaySpeech = false;
    } catch {
      suppressSaySpeech = false;
      if (!full.trim()) { full = "I could not answer just now. Try the lesson wall, then ask me again — what did you notice?"; if (bubbleSpan) bubbleSpan.textContent = full; say(full, "present"); }
    }
  }

  // ---------- Wall world ----------
  const CONTROL_DEFS = {
    maths: [{ prop: "denominator", label: "Equal parts (denominator)", min: 1, max: 24, step: 1, objectId: "frac-main" }, { prop: "selected", label: "Parts selected", min: 0, max: 24, step: 1, objectId: "frac-main" }],
    clouds: [{ prop: "temperature", label: "Temperature °C", min: -30, max: 50, step: 1, objectId: "weather-controls" }, { prop: "humidity", label: "Humidity %", min: 0, max: 100, step: 1, objectId: "weather-controls" }],
    "engineering-castle": [{ prop: "thickness", label: "Wall thickness", min: 1, max: 6, step: 1, objectId: "castle-wall" }, { prop: "heightRows", label: "Wall height (rows)", min: 1, max: 8, step: 1, objectId: "castle-wall" }, { prop: "lengthUnits", label: "Wall length", min: 1, max: 12, step: 1, objectId: "castle-wall" }],
    cars: [{ prop: "speedMph", label: "Speed mph", min: 0, max: 80, step: 5, objectId: "car-controls" }, { prop: "gearRatio", label: "Gear ratio", min: 1, max: 5, step: 1, objectId: "car-controls" }],
    business: [{ prop: "price", label: "Price £", min: 0, max: 50, step: 1, objectId: "shop-controls" }, { prop: "units", label: "Units sold", min: 0, max: 500, step: 5, objectId: "shop-controls" }, { prop: "unitCost", label: "Unit cost £", min: 0, max: 50, step: 1, objectId: "shop-controls" }, { prop: "fixedCosts", label: "Fixed costs £", min: 0, max: 1000, step: 10, objectId: "shop-controls" }],
  };
  function mountWorld(rebuild = false) {
    const host = $("world-host"); if (!host || !kernel) return;
    if (!worldState || rebuild) {
      const scene = buildWorld(kernel, { topic });
      const made = createWorldState(scene, { reducedMotion });
      if (!made.ok) { host.innerHTML = `<p class="feedback bad">Scene could not be built.</p>`; return; }
      worldState = made.state;
    }
    host.innerHTML = `${renderSceneToSVG(worldState)}<p class="muted" role="status">${esc(worldState.readout?.text || "")}</p><div id="wall-controls"></div>`;
    const controls = $("wall-controls");
    const defs = CONTROL_DEFS[kernel.id] || [];
    for (const d of defs) {
      const row = document.createElement("div"); row.className = "slider-row";
      const lab = document.createElement("label"); lab.textContent = `${d.label}: `; lab.htmlFor = `slider-${d.prop}`;
      const val = document.createElement("output"); val.textContent = String(worldState.params[d.prop] ?? "");
      const input = document.createElement("input");
      input.type = "range"; input.id = `slider-${d.prop}`; input.min = d.min; input.max = d.max; input.step = d.step; input.value = worldState.params[d.prop] ?? d.min;
      input.setAttribute("aria-label", d.label);
      input.addEventListener("input", () => {
        val.textContent = input.value;
        const out = applyInteraction(worldState, { kind: "slider", objectId: d.objectId, prop: d.prop, value: Number(input.value) });
        if (out.ok) { worldState = out.state; const svgHost = $("world-host"); const status = svgHost.querySelector('[role="status"]'); const svgWrap = svgHost.querySelector("svg"); if (svgWrap) { const tmp = document.createElement("div"); tmp.innerHTML = renderSceneToSVG(worldState); svgWrap.replaceWith(tmp.firstChild); } if (status) status.textContent = worldState.readout?.text || ""; }
      });
      row.append(lab, input, val); controls.append(row);
    }
    host.querySelector("svg")?.addEventListener("click", (ev) => {
      const g = ev.target.closest("[data-obj]"); if (!g) return;
      const sliceEl = ev.target.closest("[data-slice]");
      const out = applyInteraction(worldState, { kind: "select", objectId: g.dataset.obj, ...(sliceEl ? { sliceIndex: Number(sliceEl.dataset.slice) } : {}) });
      if (out.ok) { worldState = out.state; mountWorld(); }
    });
  }

  // Welcome diagram: the inquiry journey every subject follows, mounted on
  // the wall before a topic is chosen so the learning area is never empty.
  function mountWelcome() {
    const host = $("world-host"); if (!host) return;
    try {
      const scene = sceneForTopic("welcome to LUDUS Academy");
      const made = createWorldState(scene, { reducedMotion });
      if (!made.ok) { host.innerHTML = ""; return; }
      let st = made.state;
      const paint = () => {
        host.innerHTML = `${renderSceneToSVG(st)}<p class="muted" role="status">${esc(st.readout?.text || "Pick a subject, or tap a step to see how every lesson here works.")}</p>`;
        host.querySelector("svg")?.addEventListener("click", (ev) => {
          const g = ev.target.closest("[data-obj]"); if (!g) return;
          const out = applyInteraction(st, { kind: "select", objectId: g.dataset.obj });
          if (out.ok) { st = out.state; paint(); }
        });
      };
      paint();
    } catch { host.innerHTML = ""; }
  }

  // Activity-first questions: the scene rebuilds itself around the exact
  // case the question asks about, so students explore the thing itself
  // (a wall with those dimensions, slices of that size) instead of a form.
  function syncWorldToItem(item) {
    if (!kernel || !item) return;
    const p = {};
    if (item.params?.design) Object.assign(p, item.params.design);
    if (item.params?.denominator !== undefined) { p.denominator = item.params.denominator; p.selected = item.params.selected ?? 0; }
    if (item.params?.temperature !== undefined) { p.temperature = item.params.temperature; p.humidity = item.params.humidity; }
    if (item.params?.business) Object.assign(p, item.params.business);
    if (item.params?.car) Object.assign(p, item.params.car);
    if (Array.isArray(item.params?.compare) && item.params.compare.length >= 2) { p.focusSpecies = ""; p.compareMode = true; p.speciesA = item.params.compare[0]; p.speciesB = item.params.compare[1]; p.selectedSpecies = item.params.compare[0]; p.habitat = ["frog", "heron"].includes(item.params.compare[0]) ? "pond" : "savanna"; }
    else if (item.params?.species) { p.focusSpecies = item.params.species; p.compareMode = false; p.selectedSpecies = item.params.species; p.speciesA = item.params.species; p.habitat = { zebra: "savanna", lion: "savanna", frog: "pond", heron: "pond", fox: "woodland" }[item.params.species] || p.habitat; }
    if (!Object.keys(p).length) return;
    try {
      const scene = buildWorld(kernel, { topic, params: p });
      const made = createWorldState(scene, { reducedMotion });
      if (made.ok) { worldState = made.state; mountWorld(); }
    } catch { /* scene stays as it was; the question still works in text */ }
  }

  // ---------- Standout 1: prediction-first scenes ----------
  // Before touching a scene, the student commits to a prediction. Being
  // wrong on the record is what makes the observation teach.
  const PREDICTIONS = {
    maths: { q: "Before you touch the pizza: if you cut the same cake into MORE equal parts, what happens to each slice?", options: ["Each slice gets bigger", "Each slice gets smaller", "Slices stay the same size"], correct: 1, why: "More equal parts of the same whole means smaller parts — that is why 1/4 < 1/2." },
    clouds: { q: "Before you touch the weather: if humidity rises past about 75%, what happens in the sky?", options: ["The sky clears completely", "Droplets grow heavy and fall as precipitation", "Only the temperature changes"], correct: 1, why: "Saturated air cannot hold its vapour; droplets fall — precipitation." },
    animals: { q: "Before you classify: two animals live in the same habitat. What decides their diet group?", options: ["Where they live", "What they eat", "How big they are"], correct: 1, why: "Diet group is decided by food alone; habitat is a separate feature." },
    "engineering-castle": { q: "Before you build: you make a wall thicker but keep its front the same. What changes?", options: ["Only the front area grows", "Only the total blocks grow — the front stays the same", "Nothing changes"], correct: 1, why: "Thickness adds hidden depth: front area is untouched, total blocks multiply." },
    business: { q: "Before you price: a shop raises its price but sells fewer units. What must you do before judging?", options: ["Assume profit rose", "Assume profit fell", "Compute profit both ways — either can win"], correct: 2, why: "Price and volume pull opposite ways; only the full sum decides." },
    cars: { q: "Before you drive: a car doubles its speed from 20 to 40 mph. Its stopping distance becomes…", options: ["Twice as far", "Four times as far", "The same"], correct: 1, why: "Braking distance grows with speed squared: 2 squared is 4." },
    history: { q: "Before you place them: the printing press or the Moon landing — which came first?", options: ["The Moon landing", "The printing press", "They were the same year"], correct: 1, why: "The press (about 1440) precedes the Moon landing (1969) by over 500 years." },
    physics: { q: "Before you compute: a moving ball doubles its speed. Its kinetic energy becomes…", options: ["Twice as much", "Four times as much", "The same"], correct: 1, why: "Kinetic energy follows speed squared: double speed, four times energy." },
    coding: { q: "Before you trace: code repeats 'add 3 to x' four times, starting at 2. Where does x end?", options: ["5", "11", "14"], correct: 2, why: "Trace pass by pass: 2, 5, 8, 11, 14 — four passes, not one." },
  };
  function predictionHtml() {
    const pred = PREDICTIONS[kernel?.id];
    if (!pred || kernel.dynamic) return "";
    return `<div class="notice" id="predict-box"><strong>First, predict.</strong> ${esc(pred.q)}<div class="opts" role="radiogroup" aria-label="Your prediction">${pred.options.map((o, i) => `<button type="button" class="opt" data-pred="${i}" role="radio" aria-checked="false">${esc(o)}</button>`).join("")}</div><span id="predict-out"></span></div>`;
  }
  function wirePrediction() {
    const pred = PREDICTIONS[kernel?.id];
    if (!pred) return;
    document.querySelectorAll("[data-pred]").forEach((b) => b.addEventListener("click", () => {
      const picked = Number(b.dataset.pred);
      const right = picked === pred.correct;
      document.querySelectorAll("[data-pred]").forEach((x) => { x.setAttribute("aria-checked", String(x === b)); x.disabled = true; });
      const out = $("predict-out");
      if (out) out.innerHTML = `<div class="feedback ${right ? "ok" : "bad"}" role="status"><strong>${right ? "Committed — and correct. Now prove it on the wall." : "Committed. Hold that thought — now let the wall prove you wrong or right."}</strong> ${esc(pred.why)}</div>`;
      record = recordExperience(record, { skill: "prediction", coded: { code: right ? "sound" : "misconception", correct: right, confidence: 0.5, evidence: `Prediction on ${kernel.id}: chose "${pred.options[picked]}"${right ? "" : ` (correct: "${pred.options[pred.correct]}")`}` } });
      say(right ? "A correct prediction. Now prove it with the controls." : "Good — a prediction on record. Now move the controls and watch what actually happens.", "point");
    }));
  }

  // ---------- Standout 2: Learning Passport (evidence, not points) ----------
  function loadPassport() { try { return JSON.parse(window.localStorage.getItem("ludus-passport") || "[]"); } catch { return []; } }
  function savePassport(mastered, summary) {
    try {
      const skills = summary.filter((x) => x.mastered).map((x) => x.skill);
      const list = loadPassport().filter((r) => r.topic !== topic);
      list.push({ topic, date: new Date().toISOString().slice(0, 10), mastered: !!mastered, skills, dynamic: !!kernel.dynamic });
      window.localStorage.setItem("ludus-passport", JSON.stringify(list.slice(-24)));
    } catch { /* storage unavailable */ }
  }
  function updatePassportStrip() {
    const el = $("passport-strip"); if (!el) return;
    const list = loadPassport();
    const mastered = list.filter((r) => r.mastered).length;
    el.innerHTML = list.length
      ? `<strong>Learning Passport</strong><span>${mastered} mastered · ${list.length} topic${list.length === 1 ? "" : "s"} attempted — proof, not points.</span>`
      : `<strong>Learning Passport</strong><span>Empty for now. Master a topic unaided and it is recorded here.</span>`;
  }
  function passportHtml() {
    const list = loadPassport();
    if (!list.length) return "";
    return `<h3>Learning Passport — mastery you have evidenced</h3><div class="chips">${list.map((r) => `<span class="chip ${r.mastered ? "known" : "miss"}">${esc(r.topic)} · ${r.mastered ? "mastered" : "in progress"} · ${esc(r.date)}</span>`).join("")}</div><p class="muted"><small>No points, no streaks. This passport only records what you proved unaided — or honestly did not yet.</small></p>`;
  }
  function downloadReport(summary, mastered) {
    const lines = [
      `LUDUS Learning Report — ${topic}`, `Date: ${new Date().toISOString().slice(0, 10)}`,
      `Starting level: ${diagnosis ? `${diagnosis.level} (${diagnosis.correct}/${diagnosis.total})` : "n/a"}`,
      `Fresh unaided transfer: ${kernel.dynamic ? "AI-assessed (live-generated lesson, not kernel-verified)" : mastered ? "Mastered" : "Not yet mastered"}`, "",
      "Evidence by skill:",
      ...summary.flatMap((x) => [`- ${x.skill}: ${x.mastered ? "MASTERED" : "not yet"} (${x.attempts} attempts)`, ...x.evidence.map((e) => `    * ${e}`), ...(x.adaptations.length ? [`    adaptations: ${x.adaptations.join(", ")}`] : [])]),
      "", `Next review due: ${mastered ? "in 3 days" : "tomorrow"} (spaced practice, Review due on the opening screen)`,
      "Mastery in LUDUS is only awarded for unaided success on a fresh problem. Practice with hints never counts.",
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines], { type: "text/plain" }));
    a.download = `ludus-report-${String(topic).toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // ---------- Retention: spaced review between sessions ----------
  function loadReviews() { try { return JSON.parse(window.localStorage.getItem("ludus-reviews") || "[]"); } catch { return []; } }
  function saveReview(mastered) {
    try {
      const list = loadReviews().filter((r) => r.topic !== topic);
      list.push({ topic, due: Date.now() + (mastered ? 3 : 1) * 86400000, mastered: !!mastered });
      window.localStorage.setItem("ludus-reviews", JSON.stringify(list.slice(-12)));
    } catch { /* storage unavailable: session-only learning still works */ }
  }
  function reviewDueHtml() {
    const due = loadReviews().filter((r) => r.due <= Date.now());
    if (!due.length) return "";
    return `<h3>Review due — spaced practice</h3><p class="muted">Memory fades on a curve; a short return visit is what makes it stick. These topics are due:</p><div class="topic-chips" role="group" aria-label="Review a topic">${due.map((r) => `<button type="button" class="topic-chip" data-review="${esc(r.topic)}">${esc(r.topic)} ↻</button>`).join("")}</div>`;
  }

  // ---------- Phase panel ----------
  function panel(html) {
    const host = $("phase-panel");
    host.innerHTML = `<div class="card">${html}</div>`;
    host.querySelector("h1,h2")?.setAttribute("tabindex", "-1");
    host.querySelector("h1,h2")?.focus?.({ preventScroll: true });
  }
  function crumbsHtml() {
    const cur = PHASES.indexOf(phase);
    return `<ol class="steps" aria-label="Lesson progress">${PHASES.map((p, i) => `<li class="step${i === cur ? " now" : ""}${i < cur ? " done" : ""}"${i === cur ? ' aria-current="step"' : ""}>${LABELS[p]}</li>`).join("")}</ol>`;
  }
  function skillMeterHtml() {
    const rows = summariseThinking(record).filter((s) => s.attempts > 0);
    if (!rows.length) return "";
    return `<div class="skill-meter" aria-label="Your skills so far">${rows.map((s) => `<span class="skill-chip${s.mastered ? " mastered" : ""}">${esc(s.skill)} <span class="skill-dots" aria-hidden="true">${"●".repeat(Math.min(3, s.attempts))}${"○".repeat(Math.max(0, 3 - Math.min(3, s.attempts)))}</span>${s.mastered ? " ✓ mastered" : ""}</span>`).join("")}</div>`;
  }
  function elicitHtml(item, idx, total, heading, elicit = {}) {
    const isReflect = item.kind === "reflect";
    const tapOptions = isReflect ? [] : answerOptionsFor(item);
    const chipsHtml = tapOptions.length ? `<div class="answer-opts" role="group" aria-label="Tap an answer, or type your own below">${tapOptions.map((o) => `<button type="button" class="answer-chip" data-answer="${esc(o)}" aria-pressed="false">${esc(o)}</button>`).join("")}</div>` : "";
    const options = isReflect && Array.isArray(item.options)
      ? `<div class="opts" role="radiogroup" aria-label="Your answer">${item.options.map((o, j) => `<button type="button" class="opt" role="radio" aria-checked="false" data-opt="${j}">${esc(o)}</button>`).join("")}</div>`
      : `<label for="answer-input">Your answer</label><input id="answer-input" type="text" autocomplete="off" placeholder="Type your answer">`;
    const qtext = String(item.q || item.prompt || "").replaceAll("{topic}", topic || "your topic");
    const why = item.purpose ? `<p class="muted"><small>Why I ask: ${esc(item.purpose)}</small></p>` : "";
    return `${crumbsHtml()}<div class="q-progress" role="progressbar" aria-label="Questions in this step" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${idx}"><span style="width:${Math.round((idx / total) * 100)}%"></span></div>${skillMeterHtml()}<h2>${esc(heading)}</h2><p><strong>Question ${idx + 1} of ${total}</strong></p><p class="q-text">${esc(qtext)}</p>${why}${chipsHtml}${options}
    ${isReflect ? "" : `${elicit.confidence ? `<label for="confidence-input">How sure are you?</label><select id="confidence-input"><option value="0.9">Sure</option><option value="0.5" selected>Partly sure</option><option value="0.2">Guessing</option></select>` : ""}${elicit.strategy ? `<label for="strategy-input">How did you get it? (your method, in your own words)</label><input id="strategy-input" type="text" autocomplete="off" placeholder="e.g. I divided into equal parts and counted">` : ""}`}
    <div id="q-feedback" aria-live="polite"></div><button class="primary" id="q-next" type="button">${idx + 1 === total ? "Finish →" : "Next question →"}</button>${elicit.hint && !isReflect ? `<button class="ghost hint-btn" id="q-hint" type="button" data-level="0">Hint</button><div id="q-hint-box" class="hint-box" aria-live="polite" hidden></div>` : ""}`;
  }
  function collectResponse(item) {
    if (item.kind === "reflect") {
      const picked = document.querySelector('.opt[aria-checked="true"]');
      return { answer: picked ? Number(picked.dataset.opt) : null, confidence: 0.5, strategy: picked?.textContent || "" };
    }
    return { answer: $("answer-input")?.value ?? "", confidence: Number($("confidence-input")?.value ?? 0.5), strategy: $("strategy-input")?.value ?? "", hintsUsed: Number($("q-hint")?.dataset.level || 0) };
  }
  function answerMissing(item) {
    if (item.kind === "reflect") return !document.querySelector('.opt[aria-checked="true"]');
    return !String($("answer-input")?.value ?? "").trim();
  }
  function promptForAnswer() {
    const fb = $("q-feedback");
    if (fb) fb.innerHTML = `<div class="feedback bad" role="alert"><strong>One moment.</strong> Give an answer first — even a best guess. Guessing honestly teaches me more than a blank.</div>`;
    say("Give it a go first — even a best guess. That tells me how you think.", "think");
  }
  function eliminableOption(item) {
    const opts = answerOptionsFor(item);
    if (!opts.length) return null;
    const norm = (s) => String(s).toLowerCase().trim().replace(/[.?]$/, "");
    const expected = item.answer === true ? "yes" : item.answer === false ? "no" : norm(item.answer ?? "");
    return opts.find((o) => norm(o) !== expected && !expected.includes(norm(o)) && !norm(o).includes(expected)) || null;
  }
  function react(ok) {
    const panelEl = document.querySelector(".character-panel"); if (!panelEl) return;
    panelEl.classList.remove("react-ok", "react-miss");
    void panelEl.offsetWidth;
    panelEl.classList.add(ok ? "react-ok" : "react-miss");
    window.setTimeout(() => panelEl.classList.remove("react-ok", "react-miss"), 1800);
  }
  function wireOptions(item) {
    document.querySelectorAll(".opt").forEach((b) => b.addEventListener("click", () => {
      document.querySelectorAll(".opt").forEach((x) => x.setAttribute("aria-checked", "false"));
      b.setAttribute("aria-checked", "true");
    }));
    document.querySelectorAll(".answer-chip").forEach((b) => b.addEventListener("click", () => {
      document.querySelectorAll(".answer-chip").forEach((x) => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      const input = $("answer-input"); if (input) { input.value = b.dataset.answer || ""; input.focus(); }
    }));
    const hintBtn = $("q-hint");
    if (hintBtn && item) hintBtn.addEventListener("click", () => {
      const box = $("q-hint-box"); if (!box) return;
      const level = Math.min(3, Number(hintBtn.dataset.level || 0) + 1);
      hintBtn.dataset.level = String(level);
      box.hidden = false;
      if (level === 1) box.innerHTML = `<strong>Hint 1 — where to look.</strong> This question is about ${esc(item.skill || "one feature at a time")}. Find that feature on the wall first, then answer.`;
      else if (level === 2) { const wrong = eliminableOption(item); box.innerHTML = wrong ? `<strong>Hint 2 — cross one out.</strong> It is not “${esc(wrong)}”. Choose between what is left.` : `<strong>Hint 2 — cross one out.</strong> Rule out the option you are most sure is wrong, then choose between what is left.`; }
      else box.innerHTML = `<strong>Worked answer.</strong> ${esc(String(item.feedback || "The wall readout shows the worked result — read it, then answer in your own words.").replaceAll("{topic}", topic || "your topic"))}`;
      hintBtn.textContent = level >= 3 ? "Worked answer shown" : `Hint (${level}/3)`;
    });
  }

  // ---------- Flow: intake -> diagnostic -> plan -> teach -> practice -> adapt -> verify -> summary ----------
  function renderIntake(error = "", prefill = "") {
    phase = "intake";
    document.body.dataset.phase = "intake";
    mountWelcome();
    panel(`${crumbsHtml()}<h1>What would you like to learn today?</h1>
    <p>Name any subject, or pick one to begin. Professor D first discovers how you think, then teaches you on the wall — and only marks you as having learned it when you can do it unaided.</p>
    <p class="trust-strip"><span>No sign-up</span><span>Mastery only when unaided</span><span>Any topic, honestly labelled</span></p>
    <button class="primary demo-btn" id="start-demo" type="button">▶ Watch the 90-second demo</button>
    ${reviewDueHtml()}
    ${passportHtml()}
    <div class="subject-grid" role="group" aria-label="Pick a subject">
      ${[["Mathematics", "Fractions, numbers and shapes", "fractions"], ["Science", "Weather, water and how we know", "clouds"], ["Biology", "Living things and habitats", "animals"], ["Physics", "Motion, forces and energy", "physics"], ["Chemistry", "Elements, reactions and change", "chemistry"], ["History", "People, empires and turning points", "history"], ["Geography", "Maps, rivers and our planet", "geography"], ["English", "Words, grammar and stories", "english"], ["Coding", "Loops, logic and making things", "coding"], ["Business", "Money in, money out, profit", "business"]].map(([t, d, topic]) => `<button type="button" class="topic-chip subject-card" data-topic="${topic}"><strong>${t}</strong><span>${d}</span></button>`).join("")}
    </div>
    ${error ? `<div class="feedback bad" role="alert">${error}</div>` : ""}
    <p class="muted"><small>Type any topic in the conversation box below, push Talk and say it, or pick a subject above. No sign-up; your topic stays in this session.</small></p>`);
    say("What would you like to learn today?", "present");
    $("start-demo")?.addEventListener("click", () => startDemo());
    document.querySelectorAll(".topic-chip").forEach((b) => b.addEventListener("click", () => { const safe = checkTopic(b.dataset.topic); if (safe.allowed) startTopic(b.dataset.topic); }));
    document.querySelectorAll("[data-review]").forEach((b) => b.addEventListener("click", () => startTopic(b.dataset.review)));
  }
  // ---------- Guided 90-second demo: scripted animals lesson, deterministic ----------
  async function startDemo() {
    if (demoMode) return;
    demoMode = true;
    suppressSaySpeech = true;
    stopSpeaking();
    document.body.dataset.demo = "1";
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (fn, timeout = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (fn()) return true; await wait(250); } return false; };
    const click = (sel) => { const el = document.querySelector(sel); if (el) { el.click(); return true; } return false; };
    const DIET = { zebra: "herbivore", lion: "carnivore", frog: "carnivore", heron: "carnivore", fox: "carnivore" };
    const SHELTER = { zebra: "open grassland", lion: "shade of trees", frog: "pond plants", heron: "pond reeds", fox: "den" };
    const SPECIES = Object.keys(DIET);
    function answerCurrent() {
      const q = document.querySelector("#phase-panel .q-text")?.textContent || "";
      const named = SPECIES.filter((s) => new RegExp(`\\b${s}\\b`, "i").test(q));
      let ans = null;
      if (/same diet group/i.test(q) && named.length >= 2) ans = DIET[named[0]] === DIET[named[1]] ? "yes" : "no";
      else if (/shelter/i.test(q) && named.length) ans = SHELTER[named[named.length - 1]];
      else if (named.length) ans = DIET[named[named.length - 1]];
      const chips = [...document.querySelectorAll(".answer-chip")];
      const chip = chips.find((c) => ans && c.dataset.answer.toLowerCase() === ans.toLowerCase()) || chips.find((c) => ans && ans.toLowerCase().includes(c.dataset.answer.toLowerCase()));
      if (chip) { chip.click(); return true; }
      const input = $("answer-input");
      if (input && ans) { input.value = ans; input.dispatchEvent(new Event("input", { bubbles: true })); return true; }
      if (document.querySelector(".opt")) { document.querySelector(".opt").click(); return true; }
      return false;
    }
    async function stepQuestion(useHint) {
      if (useHint) { click("#q-hint"); await wait(1000); click("#q-hint"); await wait(1000); }
      answerCurrent();
      await wait(500);
      click("#q-next");
      await wait(850);
      if ($("q-next")?.dataset.revealed === "1") { click("#q-next"); await wait(850); }
    }
    try {
      say("Welcome to the ninety-second tour. Watch: I diagnose how you think, teach on the wall, then pass you only when you can do it unaided.", "present");
      await wait(1400);
      startTopic("animals");
      for (let i = 0; i < 9; i++) {
        if (document.querySelector("#to-teach")) break;
        if (!document.querySelector("#q-next")) { await wait(400); continue; }
        await stepQuestion(i === 0);
      }
      await until(() => document.querySelector("#to-teach"), 15000);
      click("#to-teach");
      await until(() => document.querySelector("#to-practice"), 30000);
      if (document.querySelector(".opt")) { document.querySelector(".opt").click(); await wait(600); }
      click("#to-practice");
      for (let i = 0; i < 6; i++) {
        await until(() => document.querySelector("#q-next") || document.querySelector("#to-verify"), 15000);
        if (document.querySelector("#to-verify")) { click("#to-verify"); break; }
        if (!document.querySelector("#q-next")) break;
        await stepQuestion(false);
      }
      for (let i = 0; i < 6; i++) {
        if (!document.querySelector("#q-next")) break;
        await stepQuestion(false);
      }
      await until(() => document.querySelector("#again"), 20000);
    } finally {
      demoMode = false;
      suppressSaySpeech = false;
      delete document.body.dataset.demo;
      say("Demo complete: diagnosed, taught, practised — then passed only on unaided answers. Your passport stamp is on the right.", "present");
    }
  }

  // Topic requests arrive through the one persistent conversation input.
  function submitTopicRequest(value) {
    const safe = checkTopic(value);
    if (!safe.allowed) {
      const alt = safe.safeAlternative ? ` <button class="ghost" id="use-alt" type="button">Learn instead: ${esc(safe.safeAlternative)}</button>` : "";
      renderIntake(`${esc(safe.reason || "That topic needs a different framing.")}${alt}`, value);
      $("use-alt")?.addEventListener("click", () => startTopic(safe.safeAlternative));
      return;
    }
    startTopic(value);
  }
  let dynamicFallback = false;
  async function generateDynamicLesson() {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const c = new AbortController(); const t = setTimeout(() => c.abort(), 70000);
        const message = DYNAMIC_LESSON_MESSAGE(topic) + (attempt ? "\nYour previous reply was not usable JSON. Reply with ONLY the compact JSON object, shorter questions, no markdown." : "");
        const r = await fetch("/api/ai/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, task: "diagnose", message }), signal: c.signal }).finally(() => clearTimeout(t));
        const j = await r.json().catch(() => null);
        if (!j || j.mode !== "live" || typeof j.text !== "string") return null;
        const dyn = createDynamicKernel(parseDynamicLesson(j.text), topic);
        if (dyn) return dyn;
      } catch { return null; }
    }
    return null;
  }
  function startTopic(value) {
    document.body.dataset.phase = "lesson";
    const base = kernelForTopic(value);
    if (base.id !== "obscure") { beginLesson(value, base); return; }
    topic = value; kernel = base; phase = "diagnostic"; mountWorld(true);
    panel(`${crumbsHtml()}<h2>One moment…</h2><p>Professor D is preparing questions about <strong>${esc(value)}</strong> — building this lesson live, for this topic.</p><p class="muted" role="status">Generating…</p>`);
    say(`One moment. I am preparing your ${value} lesson.`, "think");
    generateDynamicLesson().then((dyn) => { dynamicFallback = !dyn; if (topic === value) beginLesson(value, dyn || base); });
  }
  function beginLesson(value, chosenKernel) {
    topic = value; kernel = chosenKernel;
    window.__ludusTopic = topic;
    record = createTeachingRecord(); worldState = null; liveSources = null;
    practiceResults = []; transferResults = []; struggled = false; adaptedOnce = false;
    diagSession = new AdaptiveDiagnosticSession(kernel);
    queue = [...diagSession.currentItems()]; responses = [];
    onQueueDone = (coreResponses) => {
      const core = diagSession.submitCore(coreResponses);
      if (core.error) { renderIntake(core.error.message, topic); return; }
      queue = [...diagSession.currentItems()]; responses = [];
      onQueueDone = (branchResponses) => {
        diagnosis = diagSession.submitBranch(branchResponses);
        if (diagnosis.error) { renderIntake(diagnosis.error.message, topic); return; }
        for (const c of diagnosis.coded || []) record = recordExperience(record, { skill: c.skill, coded: c });
        renderPlan();
      };
      renderQueueItem(0);
    };
    phase = "diagnostic"; mountWorld(true);
    say(`Let us discover how you think about ${topic}. Answer honestly — on the first one, I will ask how sure you are and how you got it.`, "think");
    renderQueueItem(0);
  }
  function renderQueueItem(idx) {
    const item = queue[idx];
    syncWorldToItem(item);
    panel(`${dynamicFallback && idx === 0 ? `<div class="notice" role="status"><strong>Live generation unavailable.</strong> Professor D could not build a checked lesson for this topic just now, so we will explore it together with guided questions instead.</div>` : ""}${elicitHtml(item, idx, queue.length, phase === "diagnostic" ? "Before we begin…" : "A little deeper…", elicitationFor(phase, idx))}`);
    say(String(item.q || item.prompt || "").replaceAll("{topic}", topic || "your topic"), "think");
    wireOptions(item); $("answer-input")?.focus();
    $("q-next").addEventListener("click", () => {
      const advance = () => { if (idx + 1 < queue.length) renderQueueItem(idx + 1); else { const done = onQueueDone; const rs = responses; done(rs); } };
      if ($("q-next").dataset.revealed === "1") { advance(); return; }
      if (answerMissing(item)) { promptForAnswer(); return; }
      const resp = collectResponse(item);
      responses.push(resp);
      // Diagnostic questions teach too: reveal the idea behind the question
      // before moving on (practice already works this way; transfer never does).
      if (item.scored !== false && item.kind !== "reflect" && item.feedback && kernel?.checker) {
        const check = kernel.checker(item, resp.answer);
        const teach = String(item.feedback).replaceAll("{topic}", topic || "your topic");
        const fb = $("q-feedback");
        if (fb) fb.innerHTML = `<div class="feedback ${check.correct ? "ok" : "bad"}" role="status"><strong>${check.correct ? "Exactly — and here is why it matters." : "Here is the idea behind that question."}</strong> ${esc(teach)}</div>`;
        say(teach, check.correct ? "present" : "think");
        react(check.correct);
        const btn = $("q-next");
        btn.dataset.revealed = "1";
        btn.textContent = idx + 1 === queue.length ? "Finish →" : "Next question →";
        return;
      }
      advance();
    });
  }
  function renderPlan() {
    phase = "plan";
    const d = diagnosis;
    panel(`${crumbsHtml()}<h2>Your diagnosis</h2>${kernel.dynamic ? `<div class="notice" role="status"><strong>Live-generated lesson.</strong> These questions and their model answers were created by Professor D for this topic just now. Marking is AI-assessed, not kernel-verified.</div>` : ""}
    <p>Starting level: <strong>${esc(d.level)}</strong> <span class="muted">(${d.correct} of ${d.total} opening answers correct${d.reflection ? `; you said you were ${esc(String(d.reflection).toLowerCase())}` : ""})</span></p>
    <h3>What your answers showed</h3>
    <ul>${(d.coded || []).map((c) => `<li><strong>${esc({ sound: "Solid", slip: "Nearly there", misread: "Read it differently", "prereq-gap": "Missing a building block", misconception: "A mix-up to untangle" }[c.code] || "Noted")}</strong> — ${esc(c.evidence)}</li>`).join("") || "<li>No scored answers yet.</li>"}</ul>
    <h3>Already in place</h3><div class="chips">${d.prerequisitesKnown.length ? d.prerequisitesKnown.map((p) => `<span class="chip known">${esc(p)}</span>`).join("") : '<span class="muted">None confirmed yet — that is fine.</span>'}</div>
    <h3>Working on next</h3><div class="chips">${d.prerequisitesMissing.length ? d.prerequisitesMissing.map((p) => `<span class="chip miss">${esc(p)}</span>`).join("") : '<span class="muted">No gaps detected.</span>'}</div>
    <details class="plan-disclosure"><summary>Your learning plan — ${esc(kernel.title)}</summary>
    <ol>${kernel.concepts.map((c) => `<li>${esc(c)}</li>`).join("")}</ol>
    <p class="muted">Mastery is withheld until you succeed unaided on a fresh transfer problem. Practice with hints never marks mastery.</p></details>
    <button class="primary" id="to-teach" type="button">Start learning →</button>`);
    say(`Here is what I know about how you think, and your plan. Open the plan, then we learn ${topic} on the wall.`, "present");
    addHistory("Professor D", `Diagnosis for ${topic}: level ${d.level}, path ${d.path}.`);
    $("to-teach").addEventListener("click", () => renderTeach());
  }
  let teachBackPending = false;
  async function assessTeachBack(explanation) {
    const out = $("teach-back-out");
    const concepts = kernel.concepts;
    const covered = concepts.filter((c) => c.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 4).some((w) => explanation.toLowerCase().includes(w)));
    let text = "";
    if (aiLive) {
      try {
        const c = new AbortController(); const t = setTimeout(() => c.abort(), 70000);
        const r = await fetch("/api/ai/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, task: "assess", message: `The student is teaching back "${topic}" in their own words. The core ideas are: ${concepts.join("; ")}. Their explanation: "${explanation.slice(0, 900)}". Reply as Professor D in at most three short sentences: first what landed, then the most important idea missing or shaky, then one precise repair or example to try. Be warm, specific, and in your own words.` }), signal: c.signal }).finally(() => clearTimeout(t));
        const j = await r.json().catch(() => null);
        if (j?.mode === "live" && typeof j.text === "string" && j.text.trim()) text = j.text.trim();
      } catch { text = ""; }
    }
    if (!text) {
      const missing = concepts.filter((c) => !covered.includes(c));
      text = covered.length
        ? `That landed: you covered ${covered.length} of the core ideas in your own words. ${missing.length ? `Still to repair: ${missing[0]} — say that part back to me once more, with your own example.` : "Nothing essential missing. Now the knowledge check will test whether it holds unaided."}`
        : "I could not find the core ideas in that yet — which is useful to know. Look at the wall once more, then teach it back to me again, starting with the first core idea in your own example.";
    }
    addHistory("You (teach-back)", explanation);
    addHistory("Professor D", text);
    if (out) out.innerHTML = `<div class="feedback ok" role="status"><strong>Professor D:</strong> ${esc(text)}</div>`;
    say(text, "present");
  }
  async function renderTeach() {
    phase = "teach"; mountWorld();
    panel(`${crumbsHtml()}<h2>Learn: ${esc(kernel.title)}</h2><p class="muted" role="status">Professor D is preparing your lesson…</p>`);
    say(`Now we learn ${topic}. Watch the wall, then try the controls.`, "point");
    let live = null;
    try {
      if (demoMode) throw new Error("demo uses the built-in lesson");
      const c = new AbortController(); const t = setTimeout(() => c.abort(), 70000);
      const r = await fetch("/api/ai/complete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ topic, task: "explain", message: `Student diagnosis: ${diagnosis ? `level ${diagnosis.level}, ${diagnosis.correct}/${diagnosis.total} opening answers. Evidence: ${(diagnosis.coded || []).map((x) => x.code).join(", ")}` : "none recorded"}. Teach: ${kernel.concepts.join("; ")}. Choose fitting methods from your repertoire (Socratic questioning, worked examples with faded steps, Feynman teach-back, retrieval, interleaving, concrete-to-representational-to-abstract, predict-observe-explain, contrasting case, prerequisite-in-miniature), name the main method in one natural phrase, teach concretely, end with one inviting question. Put it entirely in your own words: do not copy source wording, invent one fresh example tied to the wall readout (${worldState?.readout?.text || "see the scene"}), and speak to this student's evidence, not a generic class.` }), signal: c.signal }).finally(() => clearTimeout(t));
      const j = await r.json().catch(() => null);
      if (j && typeof j.text === "string" && j.text.trim()) live = j;
    } catch { live = null; }
    liveSources = live?.sources || null;
    const honest = kernel.id === "obscure" ? `<div class="notice" role="status"><strong>Diagram, not a bespoke simulation.</strong> This topic uses the inquiry world (Observe → Predict → Test → Explain). Untested claims stay labelled.</div>` : "";
    panel(`${crumbsHtml()}<h2>Learn: ${esc(kernel.title)}</h2>${honest}
    ${live ? `<h3>Professor D — ${live.mode === "live" ? "live lesson" : "offline demo lesson"}</h3>${live.text.split(/\n{2,}/).map((p) => `<p>${esc(p.trim())}</p>`).join("")}${Array.isArray(live.sources) && live.sources.length ? `<p class="muted">Looked up: ${live.sources.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`).join(" · ")}</p>` : `<p class="muted">No trusted lookup used — this lesson is from model knowledge, labelled as such.</p>`}` : demoMode ? `<div class="notice" role="status"><strong>Guided demo.</strong> Using the built-in lesson so the tour never stalls waiting on the network.</div>` : `<div class="notice" role="status"><strong>Live AI unavailable.</strong> Showing the built-in lesson below. Nothing here is presented as a live model response.</div>`}
    <h3>Core ideas</h3><ul>${kernel.concepts.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
    <p class="muted">On the wall: ${esc(worldState?.readout?.text || "")}. Move the controls and watch what changes — that cause and effect is the lesson.</p>
    ${predictionHtml()}
    <div class="notice"><strong>Make it stick:</strong> explaining an idea back in your own words is one of the strongest ways to keep it. When you are ready, teach it back to Professor D — he will tell you what landed and what to repair.<br><button class="ghost" id="teach-back" type="button">Explain it back to Professor D →</button><span id="teach-back-out"></span></div>
    <button class="primary" id="to-practice" type="button">Try the knowledge check →</button>`);
    say(live?.text || kernel.concepts[0] || `Now we learn ${topic}.`, "point");
    wirePrediction();
    $("to-practice").addEventListener("click", () => startPractice());
    $("teach-back")?.addEventListener("click", () => {
      teachBackPending = true;
      say("Splendid. Teach it back to me in your own words, in the conversation box below — as if I had never met this subject.", "present");
      setStatus("Teach-back: type your explanation below and send it.");
      $("type-input")?.focus();
    });
  }
  function startPractice() {
    phase = "practice"; queue = [...kernel.practice]; responses = []; practiceResults = [];
    say("Your turn. Just answer — I'll only ask how sure you are when it really matters.", "think");
    renderPracticeItem(0);
  }
  function renderPracticeItem(idx) {
    const item = queue[idx];
    syncWorldToItem(item);
    panel(elicitHtml(item, idx, queue.length, "Your turn in the scene", elicitationFor("practice", idx)));
    say(String(item.q || item.prompt || "").replaceAll("{topic}", topic || "your topic"), "think");
    wireOptions(item); $("answer-input")?.focus();
    $("q-next").addEventListener("click", () => {
      if ($("q-next").dataset.revealed === "1") { if (idx + 1 < queue.length) renderPracticeItem(idx + 1); else finishPractice(); return; }
      if (answerMissing(item)) { promptForAnswer(); return; }
      const resp = collectResponse(item); responses.push(resp);
      const check = kernel.checker(item, resp.answer);
      const coded = codeResponse({ correct: check.correct, answer: resp.answer, expected: check.expected, confidence: resp.confidence, strategy: resp.strategy, item });
      practiceResults.push({ item, check, coded });
      if (!check.correct) struggled = true;
      let adaptation = null;
      if (coded.code === "misconception" && worldState) {
        const rebuilt = applyCodedResponse(worldState, coded);
        if (rebuilt.ok && rebuilt.rebuilt) { worldState = rebuilt.state; adaptation = rebuilt.strategy || "rebuild"; mountWorld(); }
      }
      record = recordExperience(record, { skill: item.skill, coded, adaptation });
      const fb = $("q-feedback");
      fb.innerHTML = `<div class="feedback ${check.correct ? "ok" : "bad"}" role="status"><strong>${check.correct ? "Correct." : "Not quite."}</strong> ${esc(check.feedback)}</div>`;
      say(check.correct ? "Correct. Tell me how you got the next one." : `Not quite — ${latestLine(check.feedback)}`, check.correct ? "present" : "think");
      react(check.correct);
      $("q-next").dataset.revealed = "1";
      $("q-next").textContent = idx + 1 === queue.length ? "See result →" : "Next question →";
      if (!check.correct) aiExplainMistake(item, check, resp.answer, fb);
    });
  }
  function finishPractice() {
    const correct = practiceResults.filter((r) => r.check.correct).length;
    if (struggled && !adaptedOnce) { renderAdapt(correct); return; }
    startVerify();
  }
  function renderAdapt(correct) {
    phase = "adapt"; adaptedOnce = true;
    if (worldState) { const rebuilt = rebuildScene(worldState, { misconception: "practice struggle" }); if (rebuilt.ok) { worldState = rebuilt.state; mountWorld(); } }
    const total = practiceResults.length;
    panel(`${crumbsHtml()}<h2>Adapting your teaching</h2>
    <p>You scored <strong>${correct}/${total}</strong> in practice. Professor D has rebuilt the wall in a new representation — same truth, different view.</p>
    <div class="notice" role="status"><strong>Adaptation — ${esc(teachingMethodFor(practiceResults.find((r) => !r.check.correct)?.coded?.code || "slip").name)}:</strong> ${esc(teachingMethodFor(practiceResults.find((r) => !r.check.correct)?.coded?.code || "slip").move)} The wall now shows the supportive representation. Work the controls, then take the fresh challenge.</div>
    <p class="muted">Wall readout: ${esc(worldState?.readout?.text || "")}</p>
    <button class="primary" id="to-verify" type="button">Take the fresh challenge →</button>`);
    say("Let us try that another way. I have rebuilt the wall for you — same truth, new view.", "point");
    $("to-verify").addEventListener("click", () => startVerify());
  }
  function startVerify() {
    phase = "verify"; transferResults = [];
    say("Fresh challenge — no hints this time. Show me unaided.", "think");
    renderVerifyItem(0);
  }
  function renderVerifyItem(idx) {
    const item = kernel.transfer[idx];
    panel(elicitHtml(item, idx, kernel.transfer.length, "Fresh challenge — verify understanding", elicitationFor("verify", idx)));
    say(String(item.q || item.prompt || "").replaceAll("{topic}", topic || "your topic"), "think");
    wireOptions(item); $("answer-input")?.focus();
    $("q-next").addEventListener("click", () => {
      if (answerMissing(item)) { promptForAnswer(); return; }
      // No feedback, no hints, no expected answers shown during transfer.
      transferResults.push({ item, resp: collectResponse(item) });
      $("q-feedback").innerHTML = `<p class="muted" role="status">Recorded. No hints on the fresh challenge.</p>`;
      if (idx + 1 < kernel.transfer.length) renderVerifyItem(idx + 1); else renderSummary();
    });
  }
  function renderSummary() {
    phase = "summary";
    let masteredSkills = [];
    for (const { item, resp } of transferResults) {
      const check = kernel.checker(item, resp.answer);
      const coded = codeResponse({ correct: check.correct, answer: resp.answer, expected: check.expected, confidence: resp.confidence, strategy: resp.strategy, item });
      record = recordExperience(record, { skill: item.skill, coded, outcome: check.correct ? "transfer-correct" : "transfer-missed" });
      if (check.correct) masteredSkills.push(item.skill);
    }
    const scoredResults = transferResults.filter(({ item }) => item.scored !== false);
    const unscoredOnly = transferResults.length > 0 && scoredResults.length === 0;
    const allCorrect = !kernel.dynamic && scoredResults.length > 0 && scoredResults.length === transferResults.length && scoredResults.every(({ item, resp }) => kernel.checker(item, resp.answer).correct);
    if (allCorrect) for (const s of [...new Set(masteredSkills)]) record = markMastered(record, s, "Unassisted transfer success on a fresh problem.");
    const summary = summariseThinking(record);
    panel(`${crumbsHtml()}<h2>Your progress summary</h2>
    <p>Topic: <strong>${esc(topic)}</strong>${diagnosis ? ` · Starting level: ${esc(diagnosis.level)} (${diagnosis.correct} of ${diagnosis.total} opening answers correct)` : ""}</p>
    <table><tbody><tr><th>Fresh transfer (unaided)</th><td>${unscoredOnly ? "Not scored — this topic has no verified answers yet, so nothing here is marked right or wrong" : `${scoredResults.filter(({ item, resp }) => kernel.checker(item, resp.answer).correct).length}/${scoredResults.length} correct`}</td></tr>
    <tr><th>Mastery (fresh transfer, unassisted)</th><td>${kernel.dynamic ? "AI-assessed — this live-generated lesson is not kernel-verified, so verified mastery is not claimed" : unscoredOnly ? "Not awarded — mastery is never claimed without verified scoring" : allCorrect ? "Mastered — unaided transfer success" : "Not yet — mastery stays withheld; revisit the wall and retry"}</td></tr></tbody></table>
    <h3>Per-skill teaching evidence</h3>
    ${summary.length ? summary.map((s) => `<h4>${esc(s.skill)} — ${s.mastered ? "mastered" : "not yet mastered"} (${s.attempts} attempt(s))</h4><ul>${s.evidence.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>${s.adaptations.length ? `<p class="muted">Adaptations tried: ${s.adaptations.map(esc).join(", ")}</p>` : ""}`).join("") : "<p>No evidence recorded.</p>"}
    <p class="muted">${liveSources && liveSources.length ? `Looked up: ${liveSources.map((s) => esc(s.title)).join(" · ")}` : "Sources: model knowledge (no trusted lookup labelled otherwise)."}</p>
    <p class="muted">For retention: this topic is now scheduled in <strong>Review due</strong> on the opening screen (${allCorrect ? "in 3 days — you earned the longer gap" : "tomorrow — a quick return while it is fresh"}). Explaining an idea back and recalling it after a gap are what move it into long-term memory.</p>
    <div class="row"><button class="primary" id="again" type="button">Learn something new</button><button class="ghost" id="retry" type="button">Retry this topic</button><button class="ghost" id="report" type="button">Download learning report</button></div>`);
    say(unscoredOnly ? `You explored ${topic} well. I cannot honestly mark mastery here — this topic has no verified answers yet, so we explored rather than scored.` : allCorrect ? `Verified. You truly learned ${topic} — unaided, on a fresh problem.` : `Good effort on ${topic}. Mastery stays withheld until the fresh challenge is unaided — let us keep building.`, "present");
    addHistory("Professor D", `Summary for ${topic}: transfer ${unscoredOnly ? "unscored inquiry (mastery not claimed)" : allCorrect ? "mastered" : "not yet mastered"}.`);
    saveReview(allCorrect);
    savePassport(allCorrect, summary);
    updatePassportStrip();
    $("report")?.addEventListener("click", () => downloadReport(summary, allCorrect));
    $("again").addEventListener("click", () => { topic = ""; kernel = null; worldState = null; $("world-host").innerHTML = ""; renderIntake(); });
    $("retry").addEventListener("click", () => startTopic(topic));
  }

  // ---------- Dock: Talk / Type / Mute-yourself ONLY ----------
  let micMuted = false, activeRec = null;
  const muteBtn = $("btn-mute");
  function paintMute() {
    if (!muteBtn) return;
    muteBtn.setAttribute("aria-pressed", String(micMuted));
    muteBtn.innerHTML = micMuted ? "<span>You: muted</span>" : "<span>You: live</span>";
  }
  muteBtn?.addEventListener("click", () => {
    micMuted = !micMuted;
    if (micMuted && activeRec) { try { activeRec.abort(); } catch { /* already stopped */ } activeRec = null; }
    paintMute();
    setStatus(micMuted ? "You are muted. He cannot hear you. Push Mute again when ready." : "Your mic is live. Push Talk and ask.");
  });
  paintMute();
  // Back: abandon the current topic at any point and learn something different.
  $("btn-back")?.addEventListener("click", () => {
    stopSpeaking();
    topic = ""; kernel = null; worldState = null; liveSources = null;
    diagSession = null; diagnosis = null; record = createTeachingRecord();
    queue = []; responses = []; onQueueDone = null;
    practiceResults = []; transferResults = []; struggled = false; adaptedOnce = false;
    const wh = $("world-host"); if (wh) wh.innerHTML = "";
    renderIntake();
  });
  // Captions: the speech bubble is the caption of his latest spoken line.
  const captionsBtn = $("btn-captions");
  captionsBtn?.addEventListener("click", () => {
    const bubble = $("speech-bubble"); if (!bubble) return;
    bubble.hidden = !bubble.hidden;
    captionsBtn.setAttribute("aria-pressed", String(!bubble.hidden));
    captionsBtn.textContent = bubble.hidden ? "Captions off" : "Captions on";
  });
  // History button: the input is always here now; this only opens the transcript.
  const typeBtn = $("btn-type");
  typeBtn?.addEventListener("click", () => {
    const history = $("history-drawer");
    if (!history) return;
    history.hidden = !history.hidden;
    typeBtn.setAttribute("aria-expanded", String(!history.hidden));
    if (!history.hidden) $("type-input")?.focus();
  });
  // ONE persistent input: topics, answers, and chat all arrive here.
  $("type-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("type-input");
    const msg = (input?.value || "").trim();
    const nextBtn = $("q-next");
    if (!msg) { if (nextBtn?.dataset.revealed === "1") nextBtn.click(); return; }
    if (input) input.value = "";
    if (nextBtn?.dataset.revealed === "1" && phase !== "verify") { nextBtn.click(); return; }
    const opts = [...document.querySelectorAll(".opt")];
    if (opts.length && !$("answer-input")) {
      const pick = opts.find((o) => o.textContent.toLowerCase().includes(msg.toLowerCase()));
      if (!pick) { setStatus("Choose one of the options shown, or tap it — I won't guess for you."); return; }
      pick.click(); nextBtn?.click(); return;
    }
    const ans = $("answer-input");
    if (ans && (phase === "diagnostic" || phase === "practice" || phase === "verify")) { ans.value = msg; nextBtn?.click(); return; }
    if (teachBackPending && phase === "teach") { teachBackPending = false; assessTeachBack(msg); return; }
    if (phase === "intake" && !topic) { submitTopicRequest(msg); return; }
    askDoctore(msg);
  });
  const talkBtn = $("btn-talk");
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (talkBtn && !Rec) { talkBtn.disabled = true; talkBtn.innerHTML = "<span>No mic here</span>"; }
  talkBtn?.addEventListener("click", () => {
    if (!Rec) { setStatus("Microphone is not available in this browser. Type in the box below instead."); return; }
    if (micMuted) { setStatus("You are muted. Push Mute (You: muted) first, then Talk."); return; }
    stopSpeaking(); // Talk interrupts speech
    const rec = new Rec(); activeRec = rec;
    rec.lang = "en-GB"; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      const said = ev.results[0][0].transcript.trim(); if (!said) return;
      // Talk auto-sends: a topic on the first screen starts learning;
      // anything else streams as chat with Professor D.
      if (phase === "intake" && !topic) { const safe = checkTopic(said); if (safe.allowed) { startTopic(said); return; } renderIntake(esc(safe.reason || "That topic needs a different framing."), said); return; }
      askDoctore(said);
    };
    rec.onerror = (e) => setStatus(`Mic problem (${e.error || "error"}). Check headset permission, or type below.`);
    rec.onend = () => { activeRec = null; };
    try { rec.start(); setStatus("Listening… speak now. He answers when you finish."); }
    catch { setStatus("Mic could not start. Check permission, or type below."); }
  });

  window.LudusStage = { say, askDoctore, getPhase: () => phase, getTopic: () => topic };
  let aiLive = false;
  fetch("/api/health").then((r) => r.json()).then((h) => { aiLive = h.mode === "live"; const pill = $("mode-pill"); if (pill) { pill.textContent = h.mode === "live" ? "Live AI" : "Offline demo"; pill.dataset.mode = h.mode; } if (h.mode === "offline-demo") $("demo-banner").hidden = false; }).catch(() => { $("demo-banner").hidden = false; });
  updatePassportStrip();
  // Live AI explains a mistake in the student's own terms. The kernel
  // checker's verdict is the referee and is never overridden by this.
  function aiExplainMistake(item, check, given, fb) {
    if (!aiLive || !fb) return;
    fetch("/api/ai/complete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, task: "explain", message: `Question: ${String(item.q || "").replaceAll("{topic}", topic)}\nThe correct answer is ${check.expected}. The student answered: ${given}.\nExplain in at most two short, kind sentences why ${check.expected} is right and where the student's answer went wrong. Be specific to these numbers; do not mention being an AI.` }),
    }).then((r) => r.json()).then((j) => {
      const text = String(j.text || "").trim();
      if (!text || fb.dataset.aiDone) return;
      fb.dataset.aiDone = "1";
      fb.insertAdjacentHTML("beforeend", `<div class="notice"><strong>Professor D adds:</strong> ${esc(text)}</div>`);
    }).catch(() => { /* kernel feedback already explains it */ });
  }
  preloadPoses();
  setPose("present");
  renderIntake();
  if (new URLSearchParams(window.location.search).get("demo") === "1") window.setTimeout(() => startDemo(), 700);
}

if (typeof document !== "undefined") initStage();


