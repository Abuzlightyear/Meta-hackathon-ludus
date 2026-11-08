// LUDUS Doctore stage: 3 controls — Talk (mic), Type (chat), Mute (mute yourself).
import { sampleBackground, applyCutout } from "/src/world/cutout.js";
import { chooseBritishVoice, splitSentences } from "/src/world/voice.js";
const POSES = { present: "/assets/doctore-present.jpg", point: "/assets/doctore-point.jpg", think: "/assets/doctore-think.jpg", master: "/assets/doctore-master.jpg" };
const PRESENT_TIES = { fractions: "/assets/doctore-tie-bronze.jpg", engineering: "/assets/doctore-tie-bronze.jpg", clouds: "/assets/doctore-tie-teal.jpg", animals: "/assets/doctore-tie-teal.jpg", castle: "/assets/doctore-tie-crimson.jpg" };
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
const TIES = { default: "Charcoal — Academy", fractions: "Bronze — Fractions", clouds: "Teal — Clouds & Weather", animals: "Green — Animals", engineering: "Rust — Engineering", castle: "Crimson — Castles" };
const img = () => document.getElementById("doctore-img");
const statusEl = () => document.getElementById("voice-status");
function setStatus(t) { const s = statusEl(); if (s) s.textContent = t; }
export function setPose(name, tieKey) {
  const el = img(); if (!el || !POSES[name]) return;
  const src = name === "present" && tieKey && PRESENT_TIES[tieKey] ? PRESENT_TIES[tieKey] : POSES[name];
  el.src = src; el.dataset.pose = name; el.dataset.srcKey = src;
  cutoutURL(src).then((url) => { if (url && img()?.dataset.srcKey === src) { img().src = url; img().classList.add("cutout"); } });
  const tie = document.getElementById("tie-label");
  if (tieKey && tie && TIES[tieKey]) tie.textContent = `Tie: ${TIES[tieKey]}`;
}
setPose("present");
let britishVoice = null;
function pickVoice() {
  if (!("speechSynthesis" in window)) return null;
  britishVoice = chooseBritishVoice(window.speechSynthesis.getVoices());
  return britishVoice;
}
if ("speechSynthesis" in window) { pickVoice(); window.speechSynthesis.onvoiceschanged = () => pickVoice(); }
const speechQueue = [];
let speechActive = false;
let keepAlive = null;
function pumpSpeech() {
  if (speechActive || !speechQueue.length || !("speechSynthesis" in window)) return;
  const clean = speechQueue.shift();
  const u = new SpeechSynthesisUtterance(clean);
  const gb = britishVoice || pickVoice();
  if (gb) u.voice = gb;
  u.lang = "en-GB"; u.rate = 0.98; u.pitch = 0.8;
  speechActive = true;
  keepAlive = window.setInterval(() => { try { window.speechSynthesis.resume(); } catch { /* browser without resume */ } }, 5000);
  const finish = () => { speechActive = false; if (keepAlive) { window.clearInterval(keepAlive); keepAlive = null; } pumpSpeech(); };
  u.onstart = () => setStatus("He is speaking. Push Talk to interrupt him.");
  u.onend = finish;
  u.onerror = (e) => { setStatus(`Voice blocked (${e.error || "error"}). You can still read him.`); finish(); };
  try { window.speechSynthesis.resume(); window.speechSynthesis.speak(u); }
  catch { speechActive = false; setStatus("Voice blocked in this browser. You can still read him."); }
}
export function speakText(text) {
  if (!("speechSynthesis" in window)) { setStatus("Voice not available in this browser. You can still read him."); return false; }
  const clean = String(text || "").trim();
  if (!clean) return false;
  for (const s of splitSentences(clean)) speechQueue.push(s);
  pumpSpeech();
  return true;
}
export function speakCaption() {
  const cap = document.getElementById("doctore-caption");
  stopSpeaking();
  speakText((cap?.textContent || "").trim() || "Welcome to LUDUS Academy.");
}
export function stopSpeaking() { speechQueue.length = 0; speechActive = false; if (keepAlive) { window.clearInterval(keepAlive); keepAlive = null; } if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }
const ANCHORS = { present: "4%", point: "46%", think: "14%", master: "4%" };
export function latestLine(text) {
  const parts = String(text || "").replace(/\s+/g, " ").split(/(?<=[.?!])\s+/).filter((s) => s.trim());
  return (parts[parts.length - 1] || String(text || "")).slice(0, 220);
}
export function say(text, pose, tieKey) {
  const cap = document.getElementById("doctore-caption");
  if (cap && text) cap.textContent = text;
  const bubble = document.getElementById("speech-bubble");
  if (bubble && text) bubble.textContent = latestLine(text);
  const el = img();
  if (el && pose && POSES[pose]) {
    el.classList.add("walking");
    el.style.right = ANCHORS[pose] || "4%";
    setPose(pose, tieKey);
    window.setTimeout(() => el.classList.remove("walking"), 950);
  }
}
window.LudusDoctore = { setPose, say, speakCaption, stopSpeaking };
let micMuted = false;
let activeRec = null;
export async function askDoctore(message) {
  const log = document.getElementById("chat-log");
  const topic = window.__ludusTopic || "general learning";
  const add = (who, text) => { if (!log) return null; const p = document.createElement("p"); p.innerHTML = `<strong>${who}:</strong> `; const span = document.createElement("span"); span.textContent = text; p.append(span); log.append(p); log.scrollTop = log.scrollHeight; return span; };
  add("You", message);
  say(`You ask: ${message}`, "think");
  const bubble = add("Professor D", "…");
  let full = ""; let pending = "";
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
    const r = await fetch("/api/ai/chat-stream", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ topic, task: "chat", message }), signal: c.signal }).finally(() => clearTimeout(t));
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
        if (j.delta) { full += j.delta; pending += j.delta; if (bubble) bubble.textContent = full; const sb = document.getElementById("speech-bubble"); if (sb) sb.textContent = latestLine(full); if (log) log.scrollTop = log.scrollHeight; speakSentences(false); }
        if (j.done && Array.isArray(j.sources) && j.sources.length) add("Looked up", j.sources.map((s) => s.title).join(" · "));
        if (j.error) throw new Error(j.error.code || "stream error");
      }
    }
    if (!full.trim()) throw new Error("empty stream");
    speakSentences(true);
    say(full.replace(/\s+/g, " ").slice(0, 240), "present");
  } catch {
    if (!full.trim()) { full = "I could not answer just now. Try the lesson wall, then ask me again — what did you notice?"; if (bubble) bubble.textContent = full; speakText(full); }
  }
}
document.getElementById("chat-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("chat-input");
  const msg = (input?.value || "").trim(); if (!msg) return;
  if (input) input.value = "";
  askDoctore(msg);
});
const typeBtn = document.getElementById("btn-type");
typeBtn?.addEventListener("click", () => {
  const form = document.getElementById("chat-form");
  const history = document.getElementById("chat-log");
  if (!form) return;
  form.hidden = !form.hidden;
  if (history) history.hidden = form.hidden;
  typeBtn.setAttribute("aria-expanded", String(!form.hidden));
  if (!form.hidden) document.getElementById("chat-input")?.focus();
});
const muteBtn = document.getElementById("btn-mute");
function paintMute() {
  if (!muteBtn) return;
  muteBtn.setAttribute("aria-pressed", String(micMuted));
  muteBtn.innerHTML = micMuted ? "🔇<span>You: muted</span>" : "🔊<span>You: live</span>";
}
muteBtn?.addEventListener("click", () => {
  micMuted = !micMuted;
  if (micMuted && activeRec) { try { activeRec.abort(); } catch { /* already stopped */ } activeRec = null; }
  paintMute();
  setStatus(micMuted ? "You are muted. He cannot hear you. Push Mute again when ready." : "Your mic is live. Push Talk and ask.");
});
paintMute();
const micBtn = document.getElementById("btn-mic");
const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
if (micBtn && !Rec) { micBtn.disabled = true; micBtn.innerHTML = "🎤<span>No mic here</span>"; }
micBtn?.addEventListener("click", () => {
  if (!Rec) { setStatus("Mic typing is not available in this browser. Push Type instead."); return; }
  if (micMuted) { setStatus("You are muted. Push Mute (You: muted) first, then Talk."); return; }
  stopSpeaking();
  const rec = new Rec(); activeRec = rec;
  rec.lang = "en-GB"; rec.interimResults = false; rec.maxAlternatives = 1;
  rec.onresult = (ev) => { const said = ev.results[0][0].transcript; if (said.trim()) askDoctore(said.trim()); };
  rec.onerror = (e) => setStatus(`Mic problem (${e.error || "error"}). Check headset permission, or push Type.`);
  rec.onend = () => { activeRec = null; };
  try { rec.start(); setStatus("Listening… speak now. He answers when you finish."); }
  catch { setStatus("Mic could not start. Check permission, or push Type."); }
});
