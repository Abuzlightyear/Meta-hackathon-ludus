import { StudentStateStore } from "/src/student-state.js";
import { checkTopic } from "/src/safety-filter.js";
import { generateDiagnostic, inferDiagnosis, coreItems, branchItems, inferAdaptiveDiagnosis } from "/src/diagnosis.js";
import { buildPlan } from "/src/planning.js";
import { explain, visualSteps } from "/src/teaching.js";
import { selectTool, listTools } from "/src/tool-selector.js";
import { generateCheck, evaluateAnswer, verifyMastery, adaptationFor } from "/src/assessment.js";
import { mountAcademy, mountTopicWorld, professorTo } from "/world.js";
import { syncInteraction } from "/src/world-state.js";
import { commandsFromDiagnosis, observeInteraction, applyDirectorCommands } from "/src/world/director.js";
import { professorStateForEvent } from "/src/world/professor.js";
import { sceneForTopic, academyScene as academySceneSpec } from "/src/simulations.js";

const store = new StudentStateStore();
const stage = document.getElementById("stage");
const crumbsEl = document.getElementById("crumbs");
const PHASES = ["intake","diagnosing","planning","teaching","practicing","adapting","verifying","summary"];
const LABELS = { intake:"Topic", diagnosing:"Diagnose", planning:"Plan", teaching:"Learn", practicing:"Practice", adapting:"Adapt", verifying:"Verify", summary:"Summary" };
let diagAnswers = [], practiceItems = [], practiceAnswers = [], verifyItems = [], verifyAnswers = [], plan = null, diagnosis = null, stepIdx = 0, currentTool = "visual-steps", struggled = false;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
function crumbs() {
  const cur = PHASES.indexOf(store.getState().phase);
  crumbsEl.innerHTML = PHASES.map((p, i) => `<li class="${i === cur ? "on" : i < cur ? "done" : ""}">${LABELS[p]}</li>`).join("");
}
function go(phase) { store.recordTransition(phase); crumbs(); }
function tieFor(topic) { const t = String(topic || "").toLowerCase(); if (/fraction/.test(t)) return "fractions"; if (/cloud|weather/.test(t)) return "clouds"; if (/animal|lion|zebra/.test(t)) return "animals"; if (/engineer|wall|bridge|castle/.test(t)) return /castle/.test(t) ? "castle" : "engineering"; return "default"; }
function stageSay(pose, text) { try { window.LudusDoctore?.say(text, pose, tieFor(store.getState().topic)); } catch { /* stage is enhancement; lesson flow never depends on it */ } }
function card(html) { stage.innerHTML = `<div class="card">${html}</div>`; stage.querySelector("h1,h2")?.setAttribute("tabindex", "-1"); stage.querySelector("h1,h2")?.focus?.({ preventScroll: false }); window.scrollTo({ top: 0, behavior: "smooth" }); }

// ---------- Intake ----------
function renderIntake(prefill = "", error = "") {
  showAcademy();
  go("intake");
  card(`<p class="muted">Professor D · Adaptive tutor</p>
  <h1>What would you like to learn today?</h1>
  <p>Type any topic in your own words — for example <em>recursion</em>, <em>photosynthesis</em>, <em>fractions</em>, or something entirely your own.</p>
  ${error ? `<div class="feedback bad" role="alert">${error}</div>` : ""}
  <form id="topic-form"><label for="topic">Your topic</label>
  <input id="topic" type="text" autocomplete="off" placeholder="e.g. How volcanoes erupt" value="${esc(prefill)}" required>
  <button class="primary" type="submit">Start learning →</button></form>
  <p class="muted"><small>Free text — no sign-up. Professor D first checks what you already know, then builds a plan around the gaps.</small></p>`);
  document.getElementById("topic-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const topic = document.getElementById("topic").value;
    const safe = checkTopic(topic);
    if (!safe.allowed) {
      const alt = safe.safeAlternative ? ` <button class="ghost" id="use-alt" type="button">Learn instead: ${esc(safe.safeAlternative)}</button>` : "";
      renderIntake(topic, `${esc(safe.reason || "That topic needs a different framing.")}${alt}`);
      document.getElementById("use-alt")?.addEventListener("click", () => startTopic(safe.safeAlternative));
      return;
    }
    startTopic(topic.trim());
  });
}
function startTopic(topic) { window.__ludusTopic = topic; store.resetSession(topic); diagAnswers = []; renderDiagnostic(); }

// ---------- Diagnose ----------
function renderDiagnostic() {
  go("diagnosing");
  const topic = store.getState().topic;
  let items = coreItems(topic);
  card(`<h2>Quick diagnostic</h2><p class="muted">Professor D adapts as you answer — strong answers fast-track you, shaky answers probe foundations first. Usually five to seven questions. There are no grades here.</p>
  <div id="diag-q"></div>`);
  let i = 0;
  const host = document.getElementById("diag-q");
  function showQ() {
    if (i >= items.length) {
      if (items.length === 3) {
        const coreCorrect = items.filter((it, k) => diagAnswers[k] === it.answer).length;
        items = [...items, ...branchItems(topic, coreCorrect)];
        if (i < items.length) { showQ(); return; }
      }
      finishDiagnosis(items); return;
    }
    const it = items[i];
    host.innerHTML = `<p><strong>Question ${i + 1}</strong> <span class="muted">(${esc(it.kind)})</span></p><p>${esc(it.q)}</p>
    <div class="opts" role="radiogroup" aria-label="Diagnostic question ${i + 1}">${it.options.map((o, j) => `<button class="opt" role="radio" aria-checked="false" data-j="${j}"> ${esc(o)}</button>`).join("")}</div>`;
    host.querySelectorAll(".opt").forEach((b) => b.addEventListener("click", () => { diagAnswers[i] = Number(b.dataset.j); i++; showQ(); }));
  }
  showQ();
}
function finishDiagnosis(items) {
  diagnosis = inferAdaptiveDiagnosis(store.getState().topic, items, diagAnswers);
  if (diagnosis.error) { renderIntake(store.getState().topic, diagnosis.error.message); return; }
  store.updateState({ level: diagnosis.level, prerequisitesKnown: diagnosis.prerequisitesKnown, prerequisitesMissing: diagnosis.prerequisitesMissing, misconceptions: diagnosis.misconceptions });
  go("planning");
  plan = buildPlan(store.getState().topic, diagnosis);
  const tool = selectTool(plan.steps.find((s) => s.kind === "core") || plan.steps[0], store.getState());
  currentTool = tool.toolId;
  // AI Scene Director: diagnosis+plan+tool mapped to validated scene commands only (never eval).
  const directorScene = sceneForTopic(store.getState().topic) || academySceneSpec();
  const directorCmds = commandsFromDiagnosis({ scene: directorScene, diagnosis, plan, toolId: tool.toolId });
  const directed = applyDirectorCommands(directorScene, directorCmds);
  window.__directorLog = { commands: directorCmds, applied: directed.applied || [], ok: directed.ok };
  card(`<h2>Your diagnosis</h2>
  <p>Starting level: <strong>${esc(diagnosis.level)}</strong> <span class="muted">(confidence ${Math.round(diagnosis.confidence * 100)}% from ${diagnosis.correct}/${diagnosis.total} scored answers, ${diagnosis.asked} asked, path: ${esc(diagnosis.path)}${diagnosis.reflection ? `, you said: ${esc(diagnosis.reflection)}` : ""})</span></p>
  <h3>Already in place</h3><div class="chips">${diagnosis.prerequisitesKnown.length ? diagnosis.prerequisitesKnown.map((p) => `<span class="chip known">${esc(p)}</span>`).join("") : '<span class="muted">None confirmed yet — that is fine.</span>'}</div>
  <h3>Missing prerequisites (taught first)</h3><div class="chips">${diagnosis.prerequisitesMissing.length ? diagnosis.prerequisitesMissing.map((p) => `<span class="chip miss">${esc(p)}</span>`).join("") : '<span class="muted">No gaps detected.</span>'}</div>
  <h3>Likely misconceptions to watch</h3><div class="chips">${diagnosis.misconceptions.length ? diagnosis.misconceptions.map((m) => `<span class="chip miss">${esc(m)}</span>`).join("") : '<span class="muted">None flagged.</span>'}</div>
  <h3>Your learning plan</h3><ol>${plan.steps.map((s) => `<li><strong>${esc(s.title)}</strong> — ${esc(s.objective)} <span class="muted">[tool: ${esc(s.toolHint)}]</span></li>`).join("")}</ol>
  <p class="muted">Recommended first tool: <strong>${esc(tool.toolId)}</strong> — ${esc(tool.rationale)}<br>Allowlisted tools only: ${listTools().join(", ")}.</p>
  <p class="muted">Scene Director queued ${directorCmds.length} validated action(s) for the classroom scene (${esc(directorCmds.map((c) => c.type).join(", "))}). Professor D: ${esc(professorStateForEvent("diagnose"))} while you answered.</p>
  <button class="primary" id="to-teach">Start learning →</button>`);
  document.getElementById("to-teach").addEventListener("click", renderTeaching);
}

// ---------- Teach (visual stepper + worked example) ----------
async function fetchLiveTeaching(topic) {
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 70000);
    const r = await fetch("/api/ai/complete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ topic, task: "explain", tool: currentTool }), signal: c.signal }).finally(() => clearTimeout(t));
    const j = await r.json().catch(() => null);
    return j && j.mode === "live" && typeof j.text === "string" && j.text.trim() ? j : null;
  } catch { return null; }
}
async function renderTeaching(adapted = false) {
  go(adapted ? "adapting" : "teaching");
  const topic = store.getState().topic;
  const lesson = explain(topic, store.getState());
  const steps = visualSteps(topic);
  stepIdx = 0;
  card(`<h2>${adapted ? "Let's try that another way" : "Learn: " + esc(lessonStepsTitle(topic))}</h2><p class="muted" role="status">Professor D is preparing your lesson…</p>`);
  stageSay("point", `Building your ${topic} lesson. Watch the wall.`);
  const live = await fetchLiveTeaching(topic);
  card(`<h2>${adapted ? "Let's try that another way" : "Learn: " + esc(lessonStepsTitle(topic))}</h2>
  ${adapted ? `<div class="notice" role="status"><strong>Teaching adapted.</strong> Professor D changed strategy: a simpler re-teach with the <strong>${esc(currentTool)}</strong> tool and slower pacing, because the last answer showed struggle. This decision and its reason are recorded in your learning history.</div>` : ""}
  ${live ? `<h3>Professor D — live lesson</h3>${live.text.split(/\n{2,}/).map((p) => `<p>${esc(p.trim())}</p>`).join("")}${Array.isArray(live.sources) && live.sources.length ? `<p class="muted">Looked up: ${live.sources.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`).join(" · ")}</p>` : `<p class="muted">No trusted lookup used — this lesson is from model knowledge, labelled as such.</p>`}` : `<div class="notice" role="status"><strong>Live AI unavailable.</strong> Showing the built-in lesson below. Nothing here is presented as a live model response.</div>`}
  <h3>Core principles</h3><ul>${lesson.markdown.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
  ${lesson.simulationSupported ? "" : `<div class="notice" role="status"><strong>Simulation unsupported — truthful notice.</strong> ${esc(lesson.simulationNote)}</div>`}
  <h3>Visual step-by-step <span class="muted">(interactive stepper)</span></h3>
  <div class="stepper" aria-label="Step by step explanation">
    <div class="bar" aria-hidden="true"><i id="step-bar" style="width:25%"></i></div>
    <p class="muted" id="step-count"></p><h4 id="step-title"></h4><p id="step-body"></p>
    <div class="row"><button class="ghost" id="step-prev">← Previous</button><button class="ghost" id="step-next">Next step →</button></div>
  </div>
  <h3>Worked example</h3><p>${esc(lesson.example)}</p>
  <button class="primary" id="to-practice">Try the knowledge check →</button>`);
  const paint = () => {
    const s = steps[stepIdx];
    document.getElementById("step-title").textContent = s.title;
    document.getElementById("step-body").textContent = s.body;
    document.getElementById("step-count").textContent = `Step ${stepIdx + 1} of ${steps.length}`;
    document.getElementById("step-bar").style.width = `${((stepIdx + 1) / steps.length) * 100}%`;
    document.getElementById("step-prev").disabled = stepIdx === 0;
    document.getElementById("step-next").disabled = stepIdx === steps.length - 1;
  };
  document.getElementById("step-prev").addEventListener("click", () => { stepIdx = Math.max(0, stepIdx - 1); paint(); });
  document.getElementById("step-next").addEventListener("click", () => { stepIdx = Math.min(steps.length - 1, stepIdx + 1); paint(); });
  document.getElementById("to-practice").addEventListener("click", renderPractice);
  showTopicWorld();
  if (topicScene) professorTo(document.getElementById("world-host"), topicScene, adapted ? "struggle" : "teach");
  stageSay(adapted ? "think" : "point", adapted ? `Let's try ${topic} another way. Watch the wall — I have rebuilt it for you.` : `Now we learn ${topic}. ${(live?.text || lesson.markdown[0] || "Watch the teaching wall.").replace(/\s+/g, " ").slice(0, 220)}`);
  paint();
}
function lessonStepsTitle(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

// ---------- Practice (knowledge check, immediate feedback) ----------
function renderPractice() {
  go("practicing");
  stageSay("think", "Your turn. Try it on the wall. I am listening.");
  practiceItems = generateCheck(store.getState().topic, "practice");
  practiceAnswers = new Array(practiceItems.length).fill(null);
  card(`<h2>Knowledge check</h2><p class="muted">Answer each question — you get immediate feedback after every answer.</p><div id="pq"></div>`);
  let i = 0; const host = document.getElementById("pq");
  function showQ() {
    if (i >= practiceItems.length) { finishPractice(); return; }
    const it = practiceItems[i];
    host.innerHTML = `<p><strong>Practice ${i + 1} of ${practiceItems.length}</strong></p><p>${esc(it.q)}</p>
    <div class="opts">${it.options.map((o, j) => `<button class="opt" data-j="${j}">${esc(o)}</button>`).join("")}</div><div id="fb" aria-live="polite"></div>`;
    host.querySelectorAll(".opt").forEach((b) => b.addEventListener("click", () => {
      const ans = Number(b.dataset.j); practiceAnswers[i] = ans;
      const ev = evaluateAnswer(it, ans);
      if (!ev.correct) struggled = true;
      document.getElementById("fb").innerHTML = `<div class="feedback ${ev.correct ? "ok" : "bad"}" role="status"><strong>${ev.correct ? "Correct." : "Not quite."}</strong> ${esc(ev.feedback)}${ev.correct ? "" : " Professor D has noted this — the teaching will adapt before your final challenge."}</div><button class="primary" id="pq-next">${i + 1 === practiceItems.length ? "See result →" : "Next question →"}</button>`;
      host.querySelectorAll(".opt").forEach((x) => (x.disabled = true));
      document.getElementById("pq-next").addEventListener("click", () => { i++; showQ(); });
    }));
  }
  showQ();
}
function finishPractice() {
  const correct = practiceItems.filter((it, i) => practiceAnswers[i] === it.answer).length;
  const score = practiceItems.length ? correct / practiceItems.length : 0;
  store.updateState({ practiceScore: score });
  const adapt = adaptationFor(struggled || score < 0.8, currentTool);
  // Director observes the practice interaction -> adaptation decision (rebuild on struggle).
  const observed = observeInteraction({ scene: topicScene || academySceneSpec(), correct: !(struggled || score < 0.8), misconception: (struggled || score < 0.8) ? (diagnosis?.misconceptions?.[0] || "A practice answer showed the underlying rule needs another look.") : undefined, topic: store.getState().topic });
  if (observed.decision === "rebuild" && topicScene) { const r = applyDirectorCommands(topicScene, observed.commands); if (r.ok) topicScene = r.scene; }
  store.getState().adaptations.push({ ...adapt, directorDecision: observed.decision, at: new Date().toISOString(), practiceScore: score });
  if (struggled || score < 0.8) {
    card(`<h2>Adapting your teaching</h2><p>You scored <strong>${correct}/${practiceItems.length}</strong> in practice.</p>
    <div class="notice" role="status"><strong>Adaptation:</strong> ${esc(adapt.reason)}</div>
    <p class="muted">Recorded in student state: strategy <code>${esc(adapt.strategy)}</code>, tool <code>${esc(adapt.toolId)}</code>.</p>
    <button class="primary" id="re-teach">Re-teach with the new approach →</button>`);
    currentTool = adapt.toolId;
    document.getElementById("re-teach").addEventListener("click", () => renderTeaching(true));
  } else {
    card(`<h2>Strong practice</h2><p>You scored <strong>${correct}/${practiceItems.length}</strong>. ${esc(adapt.reason)}</p><button class="primary" id="to-verify">Take the new challenge →</button>`);
    document.getElementById("to-verify").addEventListener("click", renderVerify);
  }
}

// ---------- Verify (new challenge, distinct items) ----------
function renderVerify() {
  go("verifying");
  verifyItems = generateCheck(store.getState().topic, "verify");
  verifyAnswers = new Array(verifyItems.length).fill(null);
  card(`<h2>New challenge — verify understanding</h2><p class="muted">These questions are different from practice. Mastery needs at least 80% with no critical misconception remaining.</p><div id="vq"></div>`);
  let i = 0; const host = document.getElementById("vq");
  function showQ() {
    if (i >= verifyItems.length) { renderSummary(); return; }
    const it = verifyItems[i];
    host.innerHTML = `<p><strong>Challenge ${i + 1} of ${verifyItems.length}</strong></p><p>${esc(it.q)}</p>
    <div class="opts">${it.options.map((o, j) => `<button class="opt" data-j="${j}">${esc(o)}</button>`).join("")}</div><div id="vfb" aria-live="polite"></div>`;
    host.querySelectorAll(".opt").forEach((b) => b.addEventListener("click", () => {
      const ans = Number(b.dataset.j); verifyAnswers[i] = ans;
      const ev = evaluateAnswer(it, ans);
      document.getElementById("vfb").innerHTML = `<div class="feedback ${ev.correct ? "ok" : "bad"}" role="status"><strong>${ev.correct ? "Correct." : "Not quite."}</strong> ${esc(ev.feedback)}</div><button class="primary" id="vq-next">${i + 1 === verifyItems.length ? "See my progress →" : "Next challenge →"}</button>`;
      host.querySelectorAll(".opt").forEach((x) => (x.disabled = true));
      document.getElementById("vq-next").addEventListener("click", () => { i++; showQ(); });
    }));
  }
  showQ();
}

// ---------- Summary ----------
function renderSummary() {
  go("summary");
  const remaining = verifyItems.filter((it, i) => verifyAnswers[i] !== it.answer).length ? (diagnosis?.misconceptions || []) : [];
  const mastery = verifyMastery(verifyAnswers, verifyItems, remaining.length && verifyAnswers.some((a, i) => a !== verifyItems[i].answer) ? remaining : []);
  // Mastery is honest: >=0.8 AND no wrong verify answer leaving a misconception unresolved.
  const honestMastery = { ...mastery, mastered: mastery.score >= 0.8 && verifyAnswers.every((a, i) => a === verifyItems[i].answer) };
  store.updateState({ verifyScore: mastery.score });
  const s = store.getState();
  card(`<h2>Your progress summary</h2>
  <p>Topic: <strong>${esc(s.topic)}</strong> · Level reached: <strong>${esc(s.level || "—")}</strong></p>
  <table><tbody>
  <tr><th>Diagnostic</th><td>${diagnosis ? `${diagnosis.correct}/${diagnosis.total} correct` : "—"}</td></tr>
  <tr><th>Practice</th><td>${s.practiceScore === null ? "—" : Math.round(s.practiceScore * 100) + "%"}</td></tr>
  <tr><th>Verification challenge</th><td>${Math.round(mastery.score * 100)}% (${mastery.correct}/${mastery.total})</td></tr>
  <tr><th>Mastery (≥80%, no critical misconception)</th><td>${honestMastery.mastered ? "✅ Mastered" : "Not yet — keep going below"}</td></tr>
  <tr><th>Adaptations made</th><td>${s.adaptations.length ? s.adaptations.map((a) => esc(a.strategy)).join(", ") : "None needed"}</td></tr>
  </tbody></table>
  <h3>What you demonstrated</h3><ul>
  <li>Worked through a diagnosed plan: ${(plan?.steps || []).map((x) => esc(x.title)).join(" → ")}</li>
  <li>Prerequisites secured: ${s.prerequisitesKnown.length ? s.prerequisitesKnown.map(esc).join(", ") : "foundations were rebuilt in the plan"}</li>
  <li>${honestMastery.mastered ? "Passed a fresh verification challenge that differed from practice." : "Completed practice and a verification challenge; the items missed above are your next focus."}</li></ul>
  <h3>Misconceptions</h3><p>${honestMastery.mastered ? "Flagged misconceptions were resolved in verification." : `Still to resolve: ${(diagnosis?.misconceptions || []).join("; ") || "review the missed challenge feedback"}.`}</p>
  <div class="row"><button class="primary" id="again" style="flex:2">Learn something new</button><button class="ghost" id="retry">Retry this topic at a higher level</button></div>`);
  stageSay("present", honestMastery.mastered ? `Verified. You truly learned ${s.topic}. Choose your next challenge.` : `Good effort on ${s.topic}. We keep building — pick your next step.`);
  document.getElementById("again").addEventListener("click", () => renderIntake());
  document.getElementById("retry").addEventListener("click", () => startTopic(s.topic));
}

let academyScene = null, topicScene = null;
function showAcademy() {
  const host = document.getElementById("academy-host");
  if (host && !academyScene) academyScene = mountAcademy(host);
  const world = document.getElementById("world-host");
  if (world) world.innerHTML = "";
}
function showTopicWorld() {
  const host = document.getElementById("world-host");
  if (!host) return;
  topicScene = mountTopicWorld(host, store.getState().topic);
  // World interactions sync back into the same student state (no private mastery copy).
  host.querySelectorAll(".world-obj-btn").forEach((b) => b.addEventListener("click", () => syncInteraction(store, { objectId: b.dataset.objectId, correct: null, prompt: b.textContent })));
}

// ---------- Banner (AEGIS evidence lives on the separate /aegis route) ----------
fetch("/api/health").then((r) => r.json()).then((h) => {
  if (h.mode === "offline-demo") document.getElementById("demo-banner").hidden = false;
}).catch(() => { document.getElementById("demo-banner").hidden = false; });
renderIntake();
