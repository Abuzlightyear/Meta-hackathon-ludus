import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { complete, completeStream, extractDeltas, healthCheck, validatePrompt, validateCompletion, buildRequestBody, DEFAULT_ENDPOINT, DEFAULT_MODEL } from "../server/ai-adapter.mjs";
import { parseEnv, loadEnvFile } from "../server/load-env.mjs";

const KEY_VARS = ["META_AI_API_KEY", "META_API_KEY", "LLAMA_API_KEY"];
const savedEnv = {};
const savedFetch = globalThis.fetch;
let fetchCalls = [];

function clearKeys() { for (const k of KEY_VARS) delete process.env[k]; }
beforeEach(() => {
  for (const k of [...KEY_VARS, "META_AI_API_URL", "META_AI_MODEL", "META_AI_TIMEOUT_MS"]) { savedEnv[k] = process.env[k]; delete process.env[k]; }
  fetchCalls = [];
});
afterEach(() => {
  globalThis.fetch = savedFetch;
  for (const k of [...KEY_VARS, "META_AI_API_URL", "META_AI_MODEL", "META_AI_TIMEOUT_MS"]) {
    if (savedEnv[k] === undefined) delete process.env[k]; else process.env[k] = savedEnv[k];
  }
});
function stubFetch(impl) {
  globalThis.fetch = async (url, opts) => { fetchCalls.push({ url, opts }); return impl(url, opts); };
}
const okResponse = (text) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { role: "assistant", content: text } }] }) });

test("no-key path: labeled offline demo, network never called", async () => {
  clearKeys();
  stubFetch(async () => { throw new Error("must not be called offline"); });
  assert.equal(healthCheck().mode, "offline-demo");
  assert.equal(healthCheck().label, "Limited offline demo");
  assert.equal(healthCheck().credentialsPresent, false);
  const out = await complete({ topic: "recursion", task: "explain", tool: "visual-steps" });
  assert.equal(out.mode, "offline-demo");
  assert.match(out.text, /Offline demo/);
  assert.equal(fetchCalls.length, 0);
});

test("tool permission enforced before any network call, even with credentials", async () => {
  process.env.META_AI_API_KEY = "test-key-not-a-real-secret";
  stubFetch(async () => okResponse("should not happen"));
  const out = await complete({ topic: "recursion", tool: "shell" });
  assert.equal(out.error.code, "AI_INVALID_RESPONSE");
  assert.match(out.error.message, /not permitted/);
  assert.equal(fetchCalls.length, 0);
  assert.match(validatePrompt({ topic: "x", task: "hack" }), /not permitted/);
});

test("chat: personality prompt, message validated, live reply in character shape", async () => {
  assert.match(validatePrompt({ topic: "fractions", task: "chat", message: "  " }), /message/);
  assert.equal(validatePrompt({ topic: "fractions", task: "chat", message: "Why is 1/2 bigger than 1/4?" }), null);
  process.env.META_AI_API_KEY = "test-key-not-a-real-secret";
  stubFetch(async () => okResponse("Splendid question. Smaller pieces, fewer of them. What do you predict for 1/3 versus 1/4?"));
  const out = await complete({ topic: "fractions", task: "chat", message: "Why is 1/2 bigger than 1/4?" });
  assert.equal(out.mode, "live");
  const body = JSON.parse(fetchCalls[0].opts.body);
  assert.match(body.messages[0].content, /Doctore of LUDUS Academy/);
  assert.match(body.messages[1].content, /bigger than 1\/4/);
  clearKeys();
  const off = await complete({ topic: "fractions", task: "chat", message: "Hello Professor" });
  assert.equal(off.mode, "offline-demo");
  assert.match(off.text, /Doctore/);
});

test("stream: SSE deltas extracted and live stream yields words incrementally", async () => {
  assert.deepEqual(extractDeltas('data: {"choices":[{"delta":{"content":"Hello "}}]}\ndata: {"choices":[{"delta":{"content":"there"}}]}\ndata: [DONE]\n'), ["Hello ", "there"]);
  assert.equal(buildRequestBody({ topic: "fractions", task: "chat", message: "hi" }, { stream: true }).stream, true);
  process.env.META_AI_API_KEY = "test-key-not-a-real-secret";
  const enc = new TextEncoder();
  const chunks = ['data: {"choices":[{"delta":{"content":"Come along. "}}]}\n', 'data: {"choices":[{"delta":{"content":"We learn by doing."}}]}\n', "data: [DONE]\n"];
  let i = 0;
  stubFetch(async () => ({ ok: true, status: 200, body: { getReader: () => ({ read: async () => i < chunks.length ? { done: false, value: enc.encode(chunks[i++]) } : { done: true } }) } }));
  let joined = "";
  for await (const d of completeStream({ topic: "fractions", task: "chat", message: "Teach me" })) joined += d;
  assert.equal(joined, "Come along. We learn by doing.");
  assert.equal(JSON.parse(fetchCalls[0].opts.body).stream, true);
});

test("lookup: Wikipedia-only guardrails, parsed citations, honest unavailable fallback", async () => {
  const { wikiSearchURL, parseWikiResponse, searchTopic } = await import("../server/search.mjs");
  assert.match(wikiSearchURL("axolotl"), /^https:\/\/en\.wikipedia\.org\/w\/api\.php/);
  const fake = { query: { pages: [{ title: "Axolotl", canonicalurl: "https://en.wikipedia.org/wiki/Axolotl", extract: "The axolotl is a salamander that can regrow limbs, heart tissue, and parts of its brain across its life." }, { title: "Evil", canonicalurl: "https://evil.example/x", extract: "x".repeat(80) }] } };
  const parsed = parseWikiResponse(fake);
  assert.equal(parsed.length, 1, "non-Wikipedia hosts must be dropped");
  assert.equal(parsed[0].title, "Axolotl");
  const okFetch = async (url) => { assert.match(String(url), /^https:\/\/en\.wikipedia\.org\//, "fetch must never leave the allowlisted host"); return { ok: true, json: async () => fake }; };
  const found = await searchTopic("axolotl lookup test", { fetchImpl: okFetch });
  assert.equal(found.available, true); assert.match(found.context, /Axolotl/);
  const down = await searchTopic("axolotl timeout test", { fetchImpl: async () => { throw Object.assign(new Error("aborted"), { name: "AbortError" }); } });
  assert.equal(down.available, false); assert.deepEqual(down.sources, []);
  const withCtx = buildRequestBody({ topic: "axolotl", task: "explain", context: found.context });
  assert.match(withCtx.messages[1].content, /Trusted source material/);
});

test("mocked live success uses official Meta Model API shape; secret stays server-side", async () => {
  process.env.META_AI_API_KEY = "test-key-not-a-real-secret";
  stubFetch(async () => okResponse("A base case stops the calls."));
  assert.equal(healthCheck().mode, "live");
  const out = await complete({ topic: "recursion", task: "explain", tool: "worked-example" });
  assert.equal(out.mode, "live");
  assert.equal(out.text, "A base case stops the calls.");
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, DEFAULT_ENDPOINT);
  assert.equal(DEFAULT_ENDPOINT, "https://api.meta.ai/v1/chat/completions");
  assert.equal(fetchCalls[0].opts.headers.authorization, "Bearer test-key-not-a-real-secret");
  const body = JSON.parse(fetchCalls[0].opts.body);
  assert.equal(body.model, DEFAULT_MODEL);
  assert.ok(!("max_tokens" in body) || body.max_tokens >= 2000, "must not starve reasoning with a tiny cap");
  assert.ok(!("max_tokens" in buildRequestBody({ topic: "fractions" })) || buildRequestBody({ topic: "fractions" }).max_tokens >= 2000);
  assert.equal(DEFAULT_MODEL, "muse-spark-1.3");
  assert.ok(Array.isArray(body.messages));
  assert.equal(body.messages[0].role, "system");
  assert.match(body.messages.at(-1).content, /recursion/);
  assert.ok(!JSON.stringify(out).includes("test-key-not-a-real-secret"), "key must never appear in adapter output");
});

test("mocked HTTP failure: retried once, then AI_UNAVAILABLE (no blank, no leak)", async () => {
  process.env.META_AI_API_KEY = "test-key-not-a-real-secret";
  stubFetch(async () => ({ ok: false, status: 500, json: async () => ({}) }));
  const out = await complete({ topic: "photosynthesis" });
  assert.equal(out.error.code, "AI_UNAVAILABLE");
  assert.equal(fetchCalls.length, 2);
  assert.ok(!JSON.stringify(out).includes("test-key-not-a-real-secret"));
});

test("mocked invalid response shape: AI_INVALID_RESPONSE after retry", async () => {
  process.env.META_AI_API_KEY = "test-key-not-a-real-secret";
  stubFetch(async () => ({ ok: true, status: 200, json: async () => ({ text: "non-official shape" }) }));
  const out = await complete({ topic: "fractions" });
  assert.equal(out.error.code, "AI_INVALID_RESPONSE");
  assert.equal(fetchCalls.length, 2);
  assert.equal(validateCompletion({ choices: [{ message: { content: "" } }] }), null);
  assert.equal(validateCompletion(null), null);
  assert.equal(validateCompletion({ choices: [{ message: { content: "ok" } }] }), "ok");
});

test("mocked timeout: AbortError maps to AI_TIMEOUT after retry", async () => {
  process.env.META_AI_API_KEY = "test-key-not-a-real-secret";
  process.env.META_AI_TIMEOUT_MS = "25";
  stubFetch(async (url, opts) => new Promise((_, reject) => {
    opts.signal.addEventListener("abort", () => { const e = new Error("aborted"); e.name = "AbortError"; reject(e); });
  }));
  const out = await complete({ topic: "how volcanoes erupt" });
  assert.equal(out.error.code, "AI_TIMEOUT");
  assert.equal(fetchCalls.length, 2);
});

test("env loader: parses .env without overwriting existing secrets", () => {
  assert.deepEqual(parseEnv('# c\n A=1 \nB="two"\nBAD-LINE\n'), { A: "1", B: "two" });
  const dir = mkdtempSync(join(tmpdir(), "professor-d-env-"));
  const file = join(dir, ".env");
  writeFileSync(file, "META_AI_API_KEY=from-file-should-not-win\nEXTRA_FROM_FILE=yes\n");
  process.env.META_AI_API_KEY = "already-present-wins";
  try {
    assert.equal(loadEnvFile(file), 1);
    assert.equal(process.env.META_AI_API_KEY, "already-present-wins");
    assert.equal(process.env.EXTRA_FROM_FILE, "yes");
  } finally { delete process.env.EXTRA_FROM_FILE; }
});

test("client bundle never references the server secret", () => {
  const client = readFileSync("public/app.js", "utf8") + readFileSync("public/index.html", "utf8") + readFileSync("public/aegis.js", "utf8");
  assert.ok(!client.includes("META_AI_API_KEY"), "client must not reference the API key env name");
  assert.ok(!client.includes("api.meta.ai"), "client must call the server adapter, never Meta directly");
});
