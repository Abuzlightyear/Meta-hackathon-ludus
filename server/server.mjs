// Professor D server — static files + /api (AI adapter + real AEGIS gate report). Zero dependencies.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { healthCheck, complete, completeStream, imageGenerationHealth } from "./ai-adapter.mjs";
import { searchTopic } from "./search.mjs";
async function withLookup(parsed) {
  if (!parsed || typeof parsed.topic !== "string") return parsed;
  if (!["explain", "chat", "diagnose", "assess", "complete", undefined].includes(parsed.task)) return parsed;
  const look = await searchTopic(parsed.topic).catch(() => ({ available: false, sources: [] }));
  if (look.available) { parsed.context = look.context; parsed.sources = look.sources.map(({ title, url }) => ({ title, url })); }
  return parsed;
}
import { loadEnv } from "./load-env.mjs";
loadEnv();
import { validateBlueprint } from "../tools/aegis/lib.mjs";
import { academyScene, sceneForTopic, genericTopicScene, fractionsScene, cloudsScene, animalsScene, engineeringScene, volcanoScene } from "../src/simulations.js";
import { applyDirectorCommands } from "../src/world/director.js";
import { adaptAfterWrongAnswer } from "../src/world/adaptive.js";
import { validateSceneSpec } from "../src/scene-spec.js";
import { validateCommand, applyCommand } from "../src/scene-director.js";
import { listAssets } from "../src/asset-manager.js";
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml" };
const PORT = process.env.PORT || 4173;
async function sendFile(res, path) {
  try { const data = await readFile(path); res.writeHead(200, { "content-type": MIME[extname(path)] || "application/octet-stream" }); res.end(data); }
  catch { res.writeHead(404, { "content-type": "text/plain" }); res.end("Not found"); }
}
function json(res, code, obj) { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); }
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/api/health") return json(res, 200, healthCheck());
  if (url.pathname === "/api/aegis/report") {
    try { return json(res, 200, JSON.parse(await readFile(join(ROOT, "registry/gate-report.json"), "utf8"))); }
    catch { return json(res, 200, { gates: [], note: "No gate report generated yet — run: node tools/aegis/gates.mjs run --blueprint blueprints/professor-d.blueprint.json" }); }
  }
  if (url.pathname === "/api/aegis/registry") {
    try { return json(res, 200, JSON.parse(await readFile(join(ROOT, "registry/components.json"), "utf8"))); }
    catch { return json(res, 200, { version: "1.0.0", components: [], note: "No registry file yet." }); }
  }
  if (url.pathname === "/api/aegis/events") {
    try {
      const lines = (await readFile(join(ROOT, "registry/gate-events.jsonl"), "utf8")).split("\n").filter(Boolean);
      return json(res, 200, lines.map((l) => { try { return JSON.parse(l); } catch { return { unparsed: l }; } }));
    } catch { return json(res, 200, []); }
  }
  if (url.pathname === "/api/aegis/tests") {
    try { return json(res, 200, JSON.parse(await readFile(join(ROOT, "registry/test-report.json"), "utf8"))); }
    catch { return json(res, 200, { status: "not-run", note: "No test report generated yet — run: npm run test:report" }); }
  }
  if (url.pathname === "/api/aegis/invalid") {
    // Intentionally invalid blueprint, rejected live by the executable AEGIS validator (never hand-written).
    try {
      const bp = JSON.parse(await readFile(join(ROOT, "tests/fixtures/blueprint.invalid.json"), "utf8"));
      const report = validateBlueprint(bp);
      return json(res, 200, { file: "tests/fixtures/blueprint.invalid.json", valid: report.valid, errors: report.errors, reproduce: "node tools/aegis/validate.mjs tests/fixtures/blueprint.invalid.json" });
    } catch (e) { return json(res, 200, { file: "tests/fixtures/blueprint.invalid.json", valid: null, errors: [], note: `Invalid-blueprint fixture unavailable: ${e.message}` }); }
  }
  if (url.pathname === "/aegis" || url.pathname === "/aegis.html") return sendFile(res, join(ROOT, "public/aegis.html"));
  if (url.pathname === "/api/world/scenes") {
    const topic = url.searchParams.get("topic") || "";
    const scene = topic ? (sceneForTopic(topic) || genericTopicScene(topic)) : academyScene();
    return json(res, 200, { scene, validation: validateSceneSpec(scene), mode: healthCheck().mode });
  }
  if (url.pathname === "/api/world/scene/fractions") return json(res, 200, { scene: fractionsScene({ denominator: Number(url.searchParams.get("denominator")) || 4, selected: Number(url.searchParams.get("selected")) || 1 }) });
  if (url.pathname === "/api/world/scene/clouds") return json(res, 200, { scene: cloudsScene({ temperature: Number(url.searchParams.get("temperature")) || 24, humidity: Number(url.searchParams.get("humidity")) || 60 }) });
  if (url.pathname === "/api/world/scene/animals") return json(res, 200, { scene: animalsScene({}) });
  if (url.pathname === "/api/world/scene/engineering") return json(res, 200, { scene: engineeringScene({}) });
  if (url.pathname === "/api/world/scene/volcano") return json(res, 200, { scene: volcanoScene(), mode: healthCheck().mode });
  if (url.pathname === "/api/world/image-health") return json(res, 200, imageGenerationHealth());
  if (url.pathname === "/api/world/assets") return json(res, 200, { assets: listAssets(), note: "Procedural SVG foundation; placeholders are never claimed as generated; images are never used for mathematical truth." });
  if (url.pathname === "/api/world/direct" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 20000) req.destroy(); });
    req.on("end", () => {
      let parsed; try { parsed = JSON.parse(body || "{}"); } catch { return json(res, 400, { error: { code: "INVALID_COMMAND", message: "Invalid JSON" } }); }
      const scene = parsed.scene || academyScene();
      const sv = validateSceneSpec(scene);
      if (!sv.valid) return json(res, 422, { error: { code: "INVALID_SCENE", errors: sv.errors } });
      if (!parsed.command) return json(res, 400, { error: { code: "INVALID_COMMAND", message: "command is required" } });
      const cv = validateCommand(parsed.command, scene);
      if (!cv.valid) return json(res, 422, { error: { code: "INVALID_COMMAND", errors: cv.errors } });
      const out = applyCommand(scene, parsed.command);
      if (out.error) return json(res, 422, { error: out.error });
      return json(res, 200, { scene: out.scene, applied: out.applied, mode: healthCheck().mode });
    });
    return;
  }
  if (url.pathname === "/api/world/director" && req.method === "POST") {
    // CamelCase world director (src/world/director.js). Scene decisions flow
    // through validated commands only; mode comes from the server adapter
    // (live when a key is present, labelled offline-demo otherwise). No AI
    // output is ever executed as code.
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 20000) req.destroy(); });
    req.on("end", () => {
      let parsed; try { parsed = JSON.parse(body || "{}"); } catch { return json(res, 400, { error: { code: "INVALID_COMMAND", message: "Invalid JSON" } }); }
      const scene = parsed.scene || academyScene();
      const sv = validateSceneSpec(scene);
      if (!sv.valid) return json(res, 422, { error: { code: "INVALID_SCENE", errors: sv.errors } });
      if (parsed.adapt) {
        const out = adaptAfterWrongAnswer({ scene, topic: parsed.topic || scene.topic, misconception: parsed.misconception });
        return json(res, 200, { ...out, verifyChallenge: out.verifyChallenge, mode: healthCheck().mode });
      }
      if (!Array.isArray(parsed.commands)) return json(res, 400, { error: { code: "INVALID_COMMAND", message: "commands array is required" } });
      const out = applyDirectorCommands(scene, parsed.commands);
      if (!out.ok) return json(res, 422, { error: out.error, applied: out.applied });
      return json(res, 200, { scene: out.scene, applied: out.applied, mode: healthCheck().mode });
    });
    return;
  }
  if (url.pathname === "/api/ai/chat-stream" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 20000) req.destroy(); });
    req.on("end", async () => {
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
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 20000) req.destroy(); });
    req.on("end", async () => {
      let parsed; try { parsed = JSON.parse(body || "{}"); } catch { return json(res, 400, { error: { code: "AI_INVALID_RESPONSE", message: "Invalid JSON" } }); }
      await withLookup(parsed);
      const out = await complete(parsed);
      return json(res, out.error ? 502 : 200, out);
    });
    return;
  }
  const rel = url.pathname === "/" ? "public/index.html" : url.pathname.replace(/^\//, "");
  const safe = normalize(rel).replace(/^(\.\.[\/])+/, "");
  return sendFile(res, join(ROOT, safe.startsWith("public/") || safe.startsWith("src/") ? safe : `public/${safe}`));
});
server.listen(PORT, () => console.log(`Professor D running at http://localhost:${PORT} (mode: ${healthCheck().mode})`));
