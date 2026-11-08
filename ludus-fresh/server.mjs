// LUDUS FRESH server — zero-dependency Node (package start: node server.mjs).
// Static theatre stage + API: /api/health, /api/ai/complete,
// /api/ai/chat-stream (SSE), /api/world/scene. Live teach/chat goes through
// the shared gold adapter + Wikipedia lookup (server/*.mjs GOLD COPYs with
// provenance headers); secrets stay server-only and are never printed.
// AI output is only ever rendered as text by the client — never eval'd;
// the adapter enforces the tool allowlist (ALLOWED_TOOLS).
import { createServer } from "node:http";
import { readFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { healthCheck, complete, completeStream } from "./server/ai-adapter.mjs";
import { searchTopic } from "./server/search.mjs";
import { loadEnv } from "./server/load-env.mjs";
import { sceneForTopic, validateSceneSpec } from "./src/world.js";

loadEnv();

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".md": "text/markdown" };
const PORT = process.env.PORT || 4180;

function json(res, code, obj) { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); }

async function sendFile(res, path) {
  try { const data = await readFile(path); res.writeHead(200, { "content-type": MIME[extname(path)] || "application/octet-stream", "cache-control": "no-cache" }); res.end(data); }
  catch { res.writeHead(404, { "content-type": "text/plain" }); res.end("Not found"); }
}

// Enrich teach/chat prompts with guardrailed Wikipedia lookup (v1).
// Failure is honest: no context attached, lesson labelled model knowledge.
async function withLookup(parsed) {
  if (!parsed || typeof parsed.topic !== "string") return parsed;
  if (!["explain", "chat", "diagnose", "assess", "complete", undefined].includes(parsed.task)) return parsed;
  const look = await searchTopic(parsed.topic).catch(() => ({ available: false, sources: [] }));
  if (look.available) { parsed.context = look.context; parsed.sources = look.sources.map(({ title, url }) => ({ title, url })); }
  return parsed;
}

// Professor D's real voice: neural Edge TTS (en-GB-RyanNeural) first,
// espeak-ng offline fallback, honest 503 when neither can speak. Audio is
// cached per line so repeated teaching lines are instant. Text is passed
// as argv (never through a shell) and length-capped.
const EDGE_TTS_CANDIDATES = [process.env.EDGE_TTS_BIN, join(ROOT, ".venv/bin/edge-tts"), join(process.env.HOME || "", ".local/bin/edge-tts"), "edge-tts"].filter(Boolean);
const ttsCache = new Map();
function execFileP(bin, args, opts = {}) {
  return new Promise((resolve, reject) => execFile(bin, args, { timeout: 25000, maxBuffer: 8 * 1024 * 1024, ...opts }, (err, stdout) => (err ? reject(err) : resolve(stdout))));
}
async function synthesizeSpeech(text, rate = 1, pitch = 1) {
  const key = createHash("sha256").update(`${text}|${rate}|${pitch}`).digest("hex");
  if (ttsCache.has(key)) return ttsCache.get(key);
  const ratePct = `${rate >= 1 ? "+" : ""}${Math.round((rate - 1) * 100)}%`;
  const pitchHz = `${pitch >= 1 ? "+" : ""}${Math.round((pitch - 1) * 100)}Hz`;
  let audio = null;
  for (const bin of EDGE_TTS_CANDIDATES) {
    if (bin.includes("/") && !existsSync(bin)) continue;
    const file = join(tmpdir(), `ludus-tts-${key}.mp3`);
    try {
      await execFileP(bin, ["--voice", "en-GB-RyanNeural", `--rate=${ratePct}`, `--pitch=${pitchHz}`, "--text", text, "--write-media", file]);
      audio = { data: await readFile(file), type: "audio/mpeg", engine: "edge-neural" };
      await unlink(file).catch(() => {});
      break;
    } catch { await unlink(file).catch(() => {}); }
  }
  if (!audio) {
    try {
      const wpm = Math.max(120, Math.min(240, Math.round(172 * rate)));
      const p = Math.max(20, Math.min(80, Math.round(50 + (pitch - 1) * 120)));
      const data = await execFileP("espeak-ng", ["--stdout", "-v", "en-GB", "-p", String(p), "-s", String(wpm), text], { encoding: "buffer" });
      if (data?.length) audio = { data, type: "audio/wav", engine: "espeak" };
    } catch { /* no offline voice either */ }
  }
  if (audio) { if (ttsCache.size > 60) ttsCache.clear(); ttsCache.set(key, audio); }
  return audio;
}

function readBody(req, res, onDone) {
  let body = "";
  req.on("data", (c) => { body += c; if (body.length > 20000) req.destroy(); });
  req.on("end", () => onDone(body));
}

export function createStageServer() {
  return createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    if (url.pathname === "/api/health") return json(res, 200, healthCheck());
    if (url.pathname === "/api/tts" && req.method === "POST") {
      readBody(req, res, async (body) => {
        let parsed; try { parsed = JSON.parse(body || "{}"); } catch { return json(res, 400, { error: { code: "TTS_BAD_REQUEST", message: "Invalid JSON" } }); }
        const text = String(parsed.text || "").trim().slice(0, 400);
        if (!text) return json(res, 400, { error: { code: "TTS_BAD_REQUEST", message: "text is required" } });
        const rate = Math.max(0.7, Math.min(1.3, Number(parsed.rate) || 1));
        const pitch = Math.max(0.7, Math.min(1.3, Number(parsed.pitch) || 1));
        const audio = await synthesizeSpeech(text, rate, pitch).catch(() => null);
        if (!audio) return json(res, 503, { error: { code: "VOICE_UNAVAILABLE", message: "No server voice available; the browser voice will be used." } });
        res.writeHead(200, { "content-type": audio.type, "x-voice-engine": audio.engine, "cache-control": "no-cache" });
        return res.end(audio.data);
      });
      return;
    }
    if (url.pathname === "/api/world/scene") {
      const topic = url.searchParams.get("topic") || "";
      try {
        const scene = sceneForTopic(topic || "welcome to LUDUS Academy");
        return json(res, 200, { scene, validation: validateSceneSpec(scene), mode: healthCheck().mode });
      } catch (e) { return json(res, 422, { error: { code: "INVALID_SCENE", message: String(e?.message || e) } }); }
    }
    if (url.pathname === "/api/ai/chat-stream" && req.method === "POST") {
      readBody(req, res, async (body) => {
        let parsed; try { parsed = JSON.parse(body || "{}"); } catch { return json(res, 400, { error: { code: "AI_INVALID_RESPONSE", message: "Invalid JSON" } }); }
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
        try {
          await withLookup(parsed);
          for await (const delta of completeStream(parsed)) res.write(`data: ${JSON.stringify({ delta })}\n\n`);
          res.write(`data: ${JSON.stringify({ done: true, mode: healthCheck().mode, ...(parsed.sources ? { sources: parsed.sources } : {}) })}\n\n`);
        } catch (e) { res.write(`data: ${JSON.stringify({ error: { code: e.code || "AI_UNAVAILABLE", message: "Stream failed. Offline demo remains available." } })}\n\n`); }
        res.end();
      });
      return;
    }
    if (url.pathname === "/api/ai/complete" && req.method === "POST") {
      readBody(req, res, async (body) => {
        let parsed; try { parsed = JSON.parse(body || "{}"); } catch { return json(res, 400, { error: { code: "AI_INVALID_RESPONSE", message: "Invalid JSON" } }); }
        await withLookup(parsed);
        const out = await complete(parsed);
        return json(res, out.error ? 502 : 200, out);
      });
      return;
    }
    // Static: / -> public/index.html; /src/* and /server-adjacent client
    // modules served from the fresh tree (adapter stays server-only).
    const rel = url.pathname === "/" ? "public/index.html" : url.pathname.replace(/^\//, "");
    const safe = normalize(rel).replace(/^(\.\.[\/])+/, "");
    if (safe.startsWith("server/")) { res.writeHead(404, { "content-type": "text/plain" }); return res.end("Not found"); }
    return sendFile(res, join(ROOT, safe.startsWith("public/") || safe.startsWith("src/") ? safe : `public/${safe}`));
  });
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1]);
if (isMain) {
  createStageServer().listen(PORT, () => console.log(`LUDUS FRESH running at http://localhost:${PORT} (mode: ${healthCheck().mode})`));
}
