// GOLD COPY of server/ai-adapter.mjs @ sha256:af434e56e10b7a7a — do not edit without re-syncing provenance. See public/assets provenance + docs/PLAN.md §2.2.
// ai-adapter-meta@1.0.0 — SERVER-SIDE ONLY. Reads META_AI_API_KEY from env (never shipped to client).
// Live path uses the officially supported Meta Model API Chat Completions shape
// (dev.meta.ai/docs): POST https://api.meta.ai/v1/chat/completions, Bearer auth,
// OpenAI-compatible {model, messages:[{role,content}]} -> {choices:[{message:{content}}]}.
// Validates inputs/outputs, timeout + one retry, tool permissions, labeled offline demo.
const KEY = () => process.env.META_AI_API_KEY || process.env.META_API_KEY || process.env.LLAMA_API_KEY || "";
export const ALLOWED_TOOLS = ["worked-example", "visual-steps", "knowledge-check", "code-playground-readonly", "flashcards", "socratic-hints"];
export const DEFAULT_ENDPOINT = "https://api.meta.ai/v1/chat/completions";
export const DEFAULT_MODEL = "muse-spark-1.3";
const endpoint = () => process.env.META_AI_API_URL || DEFAULT_ENDPOINT;
const model = () => process.env.META_AI_MODEL || DEFAULT_MODEL;
const timeoutMs = () => {
  const n = Number(process.env.META_AI_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : 60000;
};
export function healthCheck() {
  const live = Boolean(KEY());
  return { mode: live ? "live" : "offline-demo", label: live ? "Live AI" : "Limited offline demo", credentialsPresent: live };
}
// Image generation availability — SERVER-SIDE presence check only. This never
// calls an image endpoint (no paid use without explicit authorisation); when
// unavailable the app stays procedural-first and assets carry cache/provenance
// fields only (src/asset-manager.js). Procedural SVG is never claimed generated.
export function imageGenerationHealth() {
  const imageKey = process.env.META_IMAGE_API_KEY || process.env.META_IMAGE_KEY || "";
  const endpointConfigured = Boolean(process.env.META_IMAGE_API_URL);
  const available = Boolean(imageKey);
  return {
    available,
    mode: available ? "available-not-called" : "unavailable",
    label: available ? "Image generation configured (not called without authorisation)" : "Image generation unavailable — procedural SVG only",
    reason: available ? "A server-side image credential is present, but no generation call is made without explicit authorisation." : "No META_IMAGE_API_KEY/META_IMAGE_KEY on the server. Limitation: no generated raster imagery; procedural SVG only, cached with provenance fields only.",
    endpointConfigured,
    paidCallMade: false,
    fallback: "procedural-svg",
  };
}
export function validatePrompt(p) {
  if (!p || typeof p !== "object") return "prompt must be an object";
  if (typeof p.topic !== "string" || !p.topic.trim() || p.topic.length > 120) return "topic must be a non-empty string <= 120 chars";
  if (p.tool && !ALLOWED_TOOLS.includes(p.tool)) return `tool not permitted: ${p.tool}`;
  if (p.task && !["diagnose", "explain", "assess", "complete", "chat"].includes(p.task)) return `task not permitted: ${p.task}`;
  if (p.task === "chat" && (typeof p.message !== "string" || !p.message.trim() || p.message.length > 500)) return "message must be a non-empty string <= 500 chars";
  return null;
}
// Strict Meta Model API response validation: only the official choices shape is accepted.
export function validateCompletion(j) {
  const text = j?.choices?.[0]?.message?.content;
  return typeof text === "string" && text.length > 0 && text.length < 20000 ? text : null;
}
export const PERSONA = "You are Professor D, the Doctore of LUDUS Academy — a warm, dignified master teacher, age about 41, who leads field trips inside every subject. Voice: distinguished British professor, encouraging and witty, never smug or threatening. You are worldly in how people learn and command many methods, choosing the one this student needs now: Socratic questioning (draw the idea out with questions), worked examples with faded steps (show, then hand over), the Feynman teach-back (student explains it simply), retrieval practice (recall before re-teaching), interleaving (mix problem types once basics hold), concrete-to-representational-to-abstract progression, predict-observe-explain cycles, direct misconception confrontation with a contrasting case, analogy and field-trip framing, dual coding (words tied to the visual scene), and spaced revisiting of earlier ideas. Teach in your own voice — synthesise, analogise, and exemplify; never recite source text. Diagnose before you teach: a slip needs careful step-checking, a misconception needs a contrasting case that breaks the wrong model, a missing prerequisite needs that prerequisite taught first in miniature, a misreading needs the question re-read slowly. Name the method you are using in one natural phrase when it helps the student ('Let us test that idea against a case it cannot explain…'). Keep replies focused (2-4 short paragraphs), safe, and at the learner's level. Never execute code.";
export function extractDeltas(sseText) {
  const out = [];
  for (const line of String(sseText).split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith("data:")) continue;
    const data = t.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try { const j = JSON.parse(data); const d = j?.choices?.[0]?.delta?.content; if (typeof d === "string" && d) out.push(d); } catch { /* partial line held by caller buffer */ }
  }
  return out;
}
export function buildRequestBody(prompt, { stream = false } = {}) {
  const task = prompt.task || "explain";
  const base = task === "chat"
    ? `The student is learning "${prompt.topic}" and says: ${prompt.message} Reply in character as Professor D, then end with one inviting question.`
    : `${task}: ${prompt.topic}${prompt.tool ? ` (preferred teaching tool: ${prompt.tool})` : ""}${typeof prompt.message === "string" && prompt.message.trim() ? `\n\n${prompt.message.trim().slice(0, 2000)}` : ""}`;
  const user = typeof prompt.context === "string" && prompt.context.trim()
    ? `${base}\n\nSource material looked up for this lesson. Treat it as evidence, not a script: put every idea in your own words, never copy its sentences or structure, invent your own concrete examples, connect it to this student, and name the source title when you use a fact from it:\n${prompt.context.slice(0, 3600)}`
    : base;
  return {
    model: model(),
    ...(stream ? { stream: true } : {}),
    messages: [
      { role: "system", content: PERSONA },
      { role: "user", content: user },
    ],
  };
}
export async function* completeStream(prompt) {
  const err = validatePrompt(prompt);
  if (err) throw Object.assign(new Error(err), { code: "AI_INVALID_RESPONSE" });
  if (!KEY()) {
    const full = prompt.task === "chat"
      ? `Good question — I am Professor D, your Doctore, currently in offline demo, so my full live mind is resting. On "${prompt.topic}", start with a prediction, test it on the wall, and tell me what changed. What do you predict will happen?`
      : `Offline demo response for "${prompt.topic}": Professor D is running without live AI credentials, using its built-in curriculum engine.`;
    for (const part of full.split(/(?<=[.?!])\s+/)) yield part + " ";
    return;
  }
  const c = new AbortController(); const timer = setTimeout(() => c.abort(), timeoutMs());
  try {
    const r = await fetch(endpoint(), { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${KEY()}` }, body: JSON.stringify(buildRequestBody(prompt, { stream: true })), signal: c.signal });
    if (!r.ok || !r.body) throw Object.assign(new Error("AI request failed"), { code: "AI_UNAVAILABLE" });
    const reader = r.body.getReader(); const decoder = new TextDecoder();
    let buffer = ""; let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/); buffer = lines.pop() || "";
      for (const d of extractDeltas(lines.join("\n"))) { total += d.length; if (total > 20000) throw Object.assign(new Error("Response too long"), { code: "AI_INVALID_RESPONSE" }); yield d; }
    }
    if (total === 0) throw Object.assign(new Error("Empty stream"), { code: "AI_INVALID_RESPONSE" });
  } catch (e) {
    if (e?.code) throw e;
    throw Object.assign(new Error("AI stream failed"), { code: e?.name === "AbortError" ? "AI_TIMEOUT" : "AI_UNAVAILABLE" });
  } finally { clearTimeout(timer); }
}
async function fetchWithTimeout(url, opts, ms) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { ...opts, signal: c.signal }); } finally { clearTimeout(t); }
}
export async function complete(prompt) {
  const err = validatePrompt(prompt);
  if (err) return { error: { code: "AI_INVALID_RESPONSE", message: err } };
  if (!KEY()) {
    // Deterministic, explicitly labeled offline demo — never pretends to be live.
    if (prompt.task === "chat") return { mode: "offline-demo", text: `Good question — I am Professor D, your Doctore, currently in offline demo, so my full live mind is resting. On "${prompt.topic}", start with a prediction, test it on the wall, and tell me what changed. What do you predict will happen?` };
    return { mode: "offline-demo", text: `Offline demo response for "${prompt.topic}": Professor D is running without live AI credentials, using its built-in curriculum engine. Add META_AI_API_KEY on the server to enable live responses.` };
  }
  let lastErr = "AI_UNAVAILABLE";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetchWithTimeout(endpoint(), { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${KEY()}` },
        body: JSON.stringify(buildRequestBody(prompt)) }, timeoutMs());
      if (!r.ok) { lastErr = "AI_UNAVAILABLE"; continue; }
      const j = await r.json().catch(() => null);
      const text = validateCompletion(j);
      if (text === null) { lastErr = "AI_INVALID_RESPONSE"; continue; }
      return { mode: "live", text, ...(Array.isArray(prompt.sources) && prompt.sources.length ? { sources: prompt.sources } : {}) };
    } catch (e) { lastErr = e?.name === "AbortError" ? "AI_TIMEOUT" : "AI_UNAVAILABLE"; }
  }
  return { error: { code: lastErr, message: "AI request failed after retry. Offline demo remains available." } };
}
