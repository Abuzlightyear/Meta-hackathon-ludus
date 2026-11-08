# LUDUS FRESH — Plan (docs/PLAN.md)

> Status: **PLAN ONLY.** No app code in this folder yet. Build starts only after this plan passes its gate.
> Fallback preserved: the existing app at `/workspaces/Meta-hackathon-ludus` is read-only during the plan phase and remains the working fallback until LUDUS FRESH proves itself stage by stage. Nothing in the existing app is deleted or overwritten by this plan.
> Zero-dependency Node: `package.json` → `"start": "node server.mjs"` (no `npm install`, no bundler, Node ≥ 20).
> AEGIS V2 is the construction method (not GENESIS). One integrated teaching intelligence, not 28 gadgets.

---

## 0. Grounding — what this plan is built on (inspected, not assumed)

| Source inspected (read-only) | What it proves | How FRESH reuses it |
|---|---|---|
| `docs/LUDUS_SYNC_RECORD.md` | Live brain + composer + AEGIS already work: adaptive diagnosis 5–7 Q (`src/diagnosis.js`), castle `testCastleDesign` (thickness → volume, never front area), `genericTopicScene` (honest diagram, `simulationSupported:false`), per-subject ties (`PRESENT_TIES` in `public/doctore.js`), runtime cut-out (`src/world/cutout.js`), voice helpers (`src/world/voice.js`), Wikipedia lookup v1 (`server/search.mjs`), suite 62/62, blueprint valid, live health live. Documented-but-not-built: persistent maps, retention, history, community/IEP, ranks/credentials, cognitive toolkit, purpose/pathways, 3D. | Plan never re-claims future parts as built. Every "reuse" line below traces to a row in this record. |
| `docs/DOCTORE_LOCK.md` | Locked master: `public/assets/doctore-master.jpg` (sha256 prefix `8e1453d70dda3a83`, 284K), age ~41, sharp short beard, hard-part fade with lines, amber-gold eyes, charcoal vest + bronze book-and-shield crest, rolled sleeves. Tie changes per subject; master tie is neutral default. British voice direction. Five AI generations to lock; tool shows no dollar price; founder-reported $140 credit balance unverified. | §5 Doctore life copies this file verbatim as provenance; all poses derive from the locked master, never a new face. |
| `server/ai-adapter.mjs` (`ai-adapter-meta@1.0.0`) | Server-only `META_AI_API_KEY` (never shipped to client). Live path: `POST https://api.meta.ai/v1/chat/completions`, Bearer auth, OpenAI-compatible `{model, messages}`, `DEFAULT_MODEL = "muse-spark-1.3"`, `DEFAULT_ENDPOINT` above, `60s` timeout + one retry, `validatePrompt` / `validateCompletion`, `extractDeltas` (SSE), `complete()` / `completeStream()`, `healthCheck()` → `{mode:"live"|"offline-demo"}`, `imageGenerationHealth()` (presence check only, `paidCallMade:false`), `ALLOWED_TOOLS = [worked-example, visual-steps, knowledge-check, code-playground-readonly, flashcards, socratic-hints]`, `PERSONA` (Professor D, British professor, 2–4 short paragraphs, never executes code). Offline demo is deterministic and explicitly labelled. | FRESH imports/copies this file **unchanged** (server-only). See §3.2. |
| `server/search.mjs` | Guardrailed retrieval v1: Wikipedia MediaWiki API only (fixed host `https://en.wikipedia.org/w/api.php`, no arbitrary URLs / no SSRF), `checkTopic` safety gate from `src/safety-filter.js`, 8 s timeout, top-3 plain-text extracts (≤1200 chars each), 10-min in-memory cache, `wikiSearchURL` / `parseWikiResponse` (non-Wikipedia hosts dropped by parser). Failure → `{available:false}`; callers must label model knowledge as model knowledge. | FRESH imports/copies this file **unchanged**. See §3.2 and §7 obscure-topic rule. |
| `server/load-env.mjs` | Minimal `.env` loader, no dependencies, never logs values, existing env wins. `parseEnv` / `loadEnvFile` / `loadEnv`. | FRESH imports/copies unchanged; secrets stay server-only. |
| `src/simulations.js` (header + body) | `world-simulations@1.0.0` — demo simulations composed from primitives (`composeScene` from `src/world/engine.js`), truth is computed, never read off an image. Exports: `academyScene`, `fractionState` / `fractionsScene` / `fractionEquivalence` / `fractionFromScene`, `cloudTypeFor` / `cloudsScene` / `cloudsSceneAfterChange` / `waterCycleStage`, `animalsScene` / `classifyAnimal` / `compareAnimals`, `engineeringScene` / `testDesign`, `castleState` / `testCastleDesign` / `castleScene` / `castleSceneAfterChange`, `genericTopicScene`, `volcanoInfo` / `volcanoScene` / `VOLCANO_STEPS` / `VOLCANO_WORKED_EXAMPLE`, `sceneForTopic`. Castle invariant: `holds = thickness >= 2 && heightRows >= 3`; `faceArea = L×H`, `volumeBlocks = L×H×T`. Clouds: `cloudTypeFor({temperature, humidity})` → stage / type / density computed. Animals: `classifyAnimal` table + `compareAnimals`. Generic: `simulationSupported:false`, `supportedParts` / `unsupportedParts` / `workedExample` carried with the scene. | FRESH kernels (§2.3) are thin, tested wrappers over these computed truths; the wall composer reuses the same primitive vocabulary. |
| `src/diagnosis.js` (`diagnosis-engine@1.0.0`) | `generateDiagnostic(topic)`, `coreItems(topic)` (3 core, `scored:true`), `branchItems(topic, coreCorrect)` (fast-track transfer / foundation probes / unscored `reflect` self-report), `adaptiveDiagnostic(topic, coreCorrect)`, `inferAdaptiveDiagnosis(topic, items, answers)` → `{level: confident|developing|novice, prerequisitesKnown[], prerequisitesMissing[], misconceptions[], confidence, correct, total, asked, path: fast-track|foundation-first|standard, reflection}`, `inferDiagnosis` (legacy). Deterministic scoring; `INSUFFICIENT_ANSWERS` on empty input. Depends on `contentFor` from `src/content.js`. | FRESH thinking engine (§2.2) extends this contract with answer+confidence+strategy elicitation and slip coding; it does not replace the deterministic scorer. |
| `src/world/cutout.js` | Dependency-free background removal: `sampleBackground` (corner-sample, patch 8), `colorDistance`, `alphaForDistance` (tolerance 52, feather 36), `applyCutout` → `{transparent, total, ratio}`. Honest fallback: caller keeps framed image on failure. | FRESH imports/copies unchanged. See §5. |
| `src/world/voice.js` | Pure helpers: `chooseBritishVoice(voices)` (named British male → any `en-GB` → any English; female-name substring bug already caught and fixed by test), `splitSentences(text, maxLen=300)` (chunks without dropping words). | FRESH imports/copies unchanged. See §6. |
| `tools/aegis/` (`lib.mjs`, `validate.mjs`, `registry.mjs`, `gates.mjs`, `test-report.mjs`) | AEGIS V2: `validateBlueprint(bp)` (schema, `invalid-semver`, `duplicate-id`, `unknown-dependency`, `circular-dependency`, `contract-version-mismatch`, `unapproved-operation`, `missing-tests`, `missing-operations`), `contractHash` (sha256 over `stableStringify`), `sourceHash`, `BLOCKED_OPERATIONS = [exec, eval, execute, executeCode, runCode, runArbitraryCode, executeArbitraryCode, shell, spawn, system]`, `ID_RE`, `SEMVER_RE`, `OP_RE`. CLI: `node tools/aegis/validate.mjs <blueprint.json>` → JSON report, exit 0/1. Existing blueprint `blueprints/professor-d.blueprint.json` has 26 components; registry staged only with hash+evidence. | FRESH writes a **new** blueprint for fresh components (§8); validator must go green before any component is coded. |
| `LUDUS_MUSE_MISSION_AND_ALL_28_PARTS_COMPLETE_HANDOFF_2026-11-04.md` | 28-part canon is one system: discovery of how the learner thinks → kernel teaching → composed world → adaptation → transfer → mastery withheld until unassisted success. Frizzle-trip + Reading-Rainbow spirit (original only). | §2 maps P1–P7 onto the canon; §7 keeps feasibility honest. |

**Provenance rule:** every file FRESH copies or imports carries a header comment naming its exact source path and sha256 prefix at copy time. No silent vendoring. If a gold file changes upstream, the header hash makes the drift visible.

---

## 1. Problem breakdown

LUDUS FRESH is **one integrated teaching intelligence** wearing a theatre stage. The learner names any safe subject; Professor D the Doctore discovers *how* the learner thinks, teaches through a subject kernel and a composed world on the great wall, adapts on struggle, and withholds mastery until the learner succeeds unaided on a fresh problem. The stage, the brain, and the world are one loop — not a dashboard with a chatbot bolted on.

### P1 — Theatre stage ONLY (the whole screen is the Academy)

- Full-screen Academy: great wall (world surface), Doctore cut-out, **one** speech bubble (latest line only), three controls — **Talk / Type / Mute-yourself** — and nothing else competing for attention.
- History lives **behind Type** (expandable transcript), never as a permanent second column.
- Captions always on. Streaming chat + queued British sentence speech (see P6).
- Taste DON'Ts are defaults, not suggestions: **no purple gradients, no glass-everywhere, no emoji feature icons** — the only glyph exceptions are the founder-ordered Talk/Type/Mute glyphs. Respect `prefers-reduced-motion` (no walk/point animation when reduced; Doctore stays present, static).
- **Contract:** stage is a pure view over `SessionState` (see §3.4). It owns no teaching logic; it renders `bubble`, `doctorePose`, `wallScene`, and the three controls, and emits learner input upward.

### P2 — Thinking engine (discover HOW the learner thinks)

- For every diagnostic and practice answer the learner gives **three things**: the answer, a **confidence** rating, and a **strategy** ("how I got it" — free text or structured choice).
- Each response is **coded** deterministically: `slip` (right method, arithmetic/reading slip), `misread` (answered a different question), `prereq-gap` (missing prerequisite), `misconception` (systematic wrong model), `sound` (correct with sound reasoning). Coding is rule-based over (answer correctness, confidence, strategy text signals, prerequisite tags) — see §7 for the honesty boundary.
- **Teaching-experience evidence per skill** is recorded: what was tried, what adaptation fired, what happened next. This evidence (not a black-box score) drives `adapt` decisions and the session summary.
- Adaptive diagnosis is **5–10 questions**: 3 core (`coreItems`) → branch (`branchItems`) — fast-track transfer probe if `coreCorrect ≥ 3`, foundation probes if `≤ 1`, mixed otherwise — plus one unscored self-report (`reflect`). Scoring stays deterministic (`inferAdaptiveDiagnosis`): ratio → `confident|developing|novice`, `prerequisitesKnown/Missing`, `misconceptions`, `path`.
- **Phase question the stage must always be able to answer:** "What do we know about how this learner thinks, and what evidence supports it?"

### P3 — Five subject kernels + business (computed truth, never painted)

Each kernel is a pure, tested module that **computes** its truth. The wall visual is a rendering of the computation, never the source of it.

| Kernel | Computed truth (source of truth today) | Wall manipulation |
|---|---|---|
| **Maths (fractions)** | `fractionState(denominator, selected)` → `{numerator, denominator, value, decimal, simplified, equivalents, display}`; `fractionEquivalence`. GCD-based simplification. | Pizza/bar manipulative; select parts → readout recomputes. |
| **Clouds (water cycle)** | `cloudTypeFor({temperature, humidity})` → `{stage, cloudType, description, density}`; `waterCycleStage`. Variables → formation. | Temperature + humidity sliders → cloud recomposes. |
| **Animals** | `classifyAnimal(species)` table (diet / shelter / group) + `compareAnimals(a, b)` (same-group / same-diet / summary sentence). Feature classification. | Sort/classify interaction over habitat scene. |
| **Engineering / castle** | `castleState({lengthUnits, heightUnits→heightRows, thickness})` → `faceArea = L×H`, `volumeBlocks = L×H×T`; `testCastleDesign` → `holds = thickness ≥ 2 && heightRows ≥ 3` with a reason string that names the hidden-depth misconception. `testDesign` for beam/wall. Design-test incl. **area vs volume**. | Thickness slider → `HOLDS` / `FALLS` readout; front area stays fixed while volume changes — the misconception is made visible. |
| **Business** | **New kernel, same contract shape:** budget / price / cost / profit computed: `profit = revenue − costs`, `revenue = price × units`, margin, break-even units. All arithmetic in code, unit-tested with exact expected values. | Budget table manipulative: change price/costs → profit recomputes; wall shows break-even. |

- Kernels never call the AI adapter. They are deterministic and offline.
- A kernel that cannot compute a requested sub-topic says so (`simulationSupported:false` pattern) and falls back to a worked example — never a fake simulation.

### P4 — Worlds (one composer on the great wall)

- **One composer** (`composeScene` via `src/world/engine.js` + primitives in `src/world-objects.js` / `src/world/`) builds every world from the same primitive vocabulary: columns, arches, clouds, seas, animals, habitats, walls, blocks, beams, labels, sequences, timelines, diagram nodes, shapes.
- World loop is always **manipulate → consequence → rebuild on struggle**: the learner changes a variable, the kernel recomputes, the wall recomposes; on a coded struggle (`P2`), the director issues a typed command (see `src/world/director.js` / `src/scene-director.js` contracts) that rebuilds the scene at a more supportive grain — never a page reload, never a different app.
- `sceneForTopic(topic)` routes known kernels; everything else composes via `genericTopicScene` (P7 obscure rule).
- Scenes validate through `validateSceneSpec` (`src/scene-spec.js`) before render. Invalid scenes are rejected, never rendered broken.

### P5 — Doctore life (the character is alive, not a sticker)

- Locked master (see §0 `DOCTORE_LOCK.md`): one face, every pose derived from it. Poses: present / point / think / listen (walk between wall positions is purposeful — he moves to what he is talking about, then stops; **no idle wandering, no decorative rotation** — a placed figure is motionless unless movement is the teaching point).
- **Tie per subject:** `PRESENT_TIES` mapping — bronze (fractions/engineering), teal (clouds/animals), crimson (castles) — swaps in on the present pose; teaching poses keep the neutral tie and are **labelled** as such, never faked.
- Runtime cut-out (`src/world/cutout.js`) removes the stone backdrop in-browser with an honest framed fallback when the cut is implausible (ratio check). Cut-out pixels in a real browser remain a **founder visual gate** (no browser engine in this Codespace; nothing installed to fake one).
- Animation respects `prefers-reduced-motion`: reduced → static present pose, instant bubble change.

### P6 — Voice / talk (hear him, talk back, always readable)

- **Talk** (mic, browser speech recognition where available), **Type** (keyboard, always available), **Mute-yourself** (aborts listening; stray speech is never sent; button state reads `You: muted`).
- Speech out: queued **British sentence speech** — `chooseBritishVoice` picks the best available voice, `splitSentences` chunks the stream so speech starts on the first sentence while the reply is still arriving. One-by-one queue; Talk interrupts speech; 5-second keep-alive against browser pause stalls.
- **Captions always** — the speech bubble *is* the caption. Voice failure never blocks learning: if no voice / no mic, Type carries the whole session and the UI says so plainly.
- Streaming chat: tokens arrive incrementally (`completeStream`), sentences are spoken as they complete, the bubble shows the latest complete line.

### P7 — Mastery, AEGIS, QA (proof, not promises)

- **Mastery is withheld until unassisted success:** practice with support → adaptation on struggle → **transfer** (fresh problem, no hints, no worked example visible) → only an unaided correct transfer marks the skill mastered. The session summary lists per-skill evidence: diagnosis coding, adaptations tried, transfer result.
- **AEGIS:** fresh blueprint for fresh components (contracts / dependencies / tests per component), validator green, negative fixtures rejected, registry staged **only** with contract hash + test evidence. Blocked operations (`eval`, `exec`, …) are rejected by the validator even if a contract lists them. **Never `eval` AI code;** AI output is only ever rendered as text or fed to **allowlisted tools** (`ALLOWED_TOOLS`).
- **QA triple-check per stage** (see §4): (1) focused tests for the stage, (2) full suite, (3) live health/stream smoke with **minimal** live calls. Founder visual gate is recorded as **pending** — never claimed passed without a browser.

### Problem → canon mapping (28-part handoff)

| Plan problem | Canon parts it serves | Status discipline |
|---|---|---|
| P1 stage | Stage direction in sync record; character/world parts | Implemented pattern reused; FRESH stage is new code on proven contracts. |
| P2 thinking engine | Assessment / teaching-intelligence parts | Extends `diagnosis-engine`; slip coding is new, deterministic, tested. |
| P3 kernels | Subject teaching parts (maths, science, engineering, business) | Four kernels wrap proven computed truth; business kernel is new with the same contract. |
| P4 worlds | World-engine parts | One composer; no per-topic hardcoded pages. |
| P5 Doctore life | Character art/animation parts | Locked assets only; new poses need founder gate + image-tool generations for missing art only. |
| P6 voice/talk | Voice parts | Browser speech now; realtime duplex is **future** (see §7). |
| P7 mastery/AEGIS/QA | Mastery, AEGIS, QA parts | Transfer-gated mastery; AEGIS blueprint-first. Parts the sync record marks future (persistent maps, retention, history, community/IEP, ranks/credentials, cognitive toolkit, purpose/pathways, 3D) stay **future** — hooks only, never claimed built. |

---

## 2. Architecture

### 2.1 Folder tree (LUDUS FRESH, new — existing app untouched)

```
ludus-fresh/
  docs/
    PLAN.md                  ← this file (written FIRST, before any code)
  package.json               ← { "type":"module", "scripts": { "start": "node server.mjs" } } — zero deps
  server.mjs                 ← thin entry: loadEnv → createServer (delegates to server/)
  server/
    ai-adapter.mjs           ← GOLD COPY of /workspaces/Meta-hackathon-ludus/server/ai-adapter.mjs (provenance header)
    search.mjs               ← GOLD COPY of /workspaces/Meta-hackathon-ludus/server/search.mjs
    load-env.mjs             ← GOLD COPY of /workspaces/Meta-hackathon-ludus/server/load-env.mjs
    server.mjs               ← HTTP: static + /api/health, /api/lesson, /api/chat (stream), /api/world/scenes, /api/diagnose …
  src/
    safety-filter.js         ← reused contract (checkTopic/checkContent) — imported by search + intake
    content.js               ← topic content provider (ENRICHED + genericContent) — diagnosis/teaching consume its shape
    diagnosis.js             ← GOLD-ADAPTED from /workspaces/Meta-hackathon-ludus/src/diagnosis.js (scorer unchanged)
    thinking.js              ← NEW: confidence+strategy elicitation, slip coding, per-skill evidence log (P2)
    kernels/
      fractions.js           ← wraps fractionState/fractionsScene truth
      clouds.js              ← wraps cloudTypeFor/waterCycleStage
      animals.js             ← wraps classifyAnimal/compareAnimals
      castle.js              ← wraps castleState/testCastleDesign (area vs volume)
      business.js            ← NEW: budget/price/cost/profit computed kernel
    simulations.js           ← GOLD-ADAPTED scene builders (academy/fractions/clouds/animals/castle/generic/volcano)
    world/
      engine.js              ← composer (composeScene) — reused contract
      objects.js             ← primitives — reused vocabulary
      director.js            ← typed scene commands (validateCommand/applyCommand pattern)
      adaptive.js            ← adaptAfterWrongAnswer pattern: rebuild-on-struggle
      cutout.js              ← GOLD COPY of src/world/cutout.js
      voice.js               ← GOLD COPY of src/world/voice.js
      render-svg.js          ← wall renderer (SVG, computed layout)
    session.js               ← SessionState store (createStudentState shape) + summary builder
  public/
    index.html               ← theatre stage (P1)
    app.js                   ← stage wiring: bubble, controls, wall, history-behind-Type
    doctore.js               ← pose/tie/cut-out/speech-queue wiring (PRESENT_TIES pattern)
    assets/
      doctore-master.jpg     ← GOLD COPY, locked (see §3.2)
      doctore-present.jpg    ← GOLD COPY
      doctore-point.jpg      ← GOLD COPY
      doctore-think.jpg      ← GOLD COPY
      doctore-tie-bronze.jpg ← GOLD COPY
      doctore-tie-teal.jpg   ← GOLD COPY
      doctore-tie-crimson.jpg← GOLD COPY
      academy.jpg            ← GOLD COPY
  blueprints/
    ludus-fresh.blueprint.json ← NEW AEGIS blueprint (§8)
  registry/
    staged/                  ← staged component records (hash+evidence only)
    test-report.json         ← generated by test runner
  tests/
    *.test.mjs               ← node --test, zero deps (mirrors existing tests/ layout)
  tools/
    aegis/                   ← GOLD COPY of validator toolchain (validate/lib/registry/gates/test-report)
```

- Existing app at `/workspaces/Meta-hackathon-ludus` (`server/`, `src/`, `public/`, `tests/`, `tools/`, `blueprints/`, `registry/`) is **never written to** by FRESH work. FRESH reads it for gold copies at build time, with provenance headers.

### 2.2 Shared-gold imports — exact source paths & provenance

Copy-with-provenance (not cross-folder import) so FRESH is self-contained and the fallback stays untouched. Each copied file gets a first-line header: `// GOLD COPY of <abs source> @ <sha256-prefix> — do not edit without re-syncing provenance.`

| FRESH destination | Exact gold source | Why proven |
|---|---|---|
| `ludus-fresh/server/ai-adapter.mjs` | `/workspaces/Meta-hackathon-ludus/server/ai-adapter.mjs` | Live-tested adapter; suite + live stream smoke in sync record. |
| `ludus-fresh/server/search.mjs` | `/workspaces/Meta-hackathon-ludus/server/search.mjs` | Unit-tested with stubbed fetch incl. timeout → honest unavailable; one grounded live axolotl lesson verified. |
| `ludus-fresh/server/load-env.mjs` | `/workspaces/Meta-hackathon-ludus/server/load-env.mjs` | In production use by existing server; never logs values. |
| `ludus-fresh/src/world/cutout.js` | `/workspaces/Meta-hackathon-ludus/src/world/cutout.js` | Pure math unit-tested; honest framed fallback. |
| `ludus-fresh/src/world/voice.js` | `/workspaces/Meta-hackathon-ludus/src/world/voice.js` | Pure, unit-tested; female-name substring bug caught by test. |
| `ludus-fresh/tools/aegis/*` | `/workspaces/Meta-hackathon-ludus/tools/aegis/` (`lib.mjs`, `validate.mjs`, `registry.mjs`, `gates.mjs`, `test-report.mjs`) | Validator green on 26-component blueprint; invalid fixture rejected live via `/api/aegis/invalid`. |
| `ludus-fresh/public/assets/doctore-*.jpg`, `academy.jpg` | `/workspaces/Meta-hackathon-ludus/public/assets/doctore-master.jpg`, `doctore-present.jpg`, `doctore-point.jpg`, `doctore-think.jpg`, `doctore-tie-bronze.jpg`, `doctore-tie-teal.jpg`, `doctore-tie-crimson.jpg`, `academy.jpg` | Locked by founder (`docs/DOCTORE_LOCK.md`, master sha256 `8e1453d70dda3a83`). Tie variants verified by eye at generation. |
| `ludus-fresh/docs/DOCTORE_LOCK.md` (copy) | `/workspaces/Meta-hackathon-ludus/docs/DOCTORE_LOCK.md` | Single source of truth for the face; copied so FRESH is self-describing. |
| `ludus-fresh/src/diagnosis.js`, `src/simulations.js`, `src/content.js`, `src/safety-filter.js`, world composer files | `/workspaces/Meta-hackathon-ludus/src/diagnosis.js`, `src/simulations.js`, `src/content.js`, `src/safety-filter.js`, `src/world/engine.js`, `src/world-objects.js`, etc. | **Adapted, not blind-copied:** scorer/composer logic unchanged; only import paths + FRESH `thinking.js` hooks added. Diff against gold is reviewed at the stage gate. |

Rules: secrets never copied (no `.env` in FRESH; `loadEnv` reads FRESH-local env at runtime); no key is ever printed, logged, or shipped to the client; adapter stays server-only.

### 2.3 Data flow (one loop)

```
 topic ──► diagnose ──► kernel ──► world ──► adapt ──► transfer ──► summary
 (P1 intake)  (P2)        (P3)       (P4/P5)    (P2/P4)     (P7)        (P7)
```

1. **topic** — Learner names any safe subject on the stage (Talk or Type). `checkTopic` gates it; unsafe → safe alternative offered, never taught as asked.
2. **diagnose** — Adaptive 5–10 Q (`adaptiveDiagnostic`): each answer carries answer+confidence+strategy; `inferAdaptiveDiagnosis` scores deterministically; `thinking.js` codes each response (`slip/misread/prereq-gap/misconception/sound`) and opens a per-skill evidence log. Live lesson context may be enriched by `searchTopic` (Wikipedia v1) — sources labelled; on lookup failure the lesson is labelled model knowledge.
3. **kernel** — The matching P3 kernel computes the truth for the first teaching beat (e.g. castle `faceArea` vs `volumeBlocks`). AI (`complete`/lesson) explains *from* the computed state + trusted source context; it never invents numbers the kernel owns.
4. **world** — Composer builds the wall scene from primitives through the one composer; `validateSceneSpec` gates render; Doctore takes the pose/tie for the subject; bubble streams the explanation; sentences queue to British speech.
5. **adapt** — Learner manipulates (slider, sort, place-block). Kernel recomputes → wall recomposes (consequence). A wrong/struggling response is coded; `adaptAfterWrongAnswer`-pattern director command rebuilds the scene at a supportive grain (worked example, smaller step, or prerequisite probe) and the evidence log records what fired.
6. **transfer** — Fresh problem, new surface values, no hints. Unaided success → skill marked mastered in `SessionState.mastery`; failure → back to adapt (mastery stays withheld, honestly).
7. **summary** — Session summary: per-skill evidence (diagnosis coding, adaptations, transfer outcome), sources looked up (`Looked up:` list) vs model-knowledge labels, and what to revisit. Rendered on stage; history behind Type holds the full transcript.

Every arrow is a typed contract (§2.4); no component reaches inside another.

### 2.4 Contracts per component

Format mirrors `blueprints/professor-d.blueprint.json` (AEGIS V2): `inputs` as `op(args)`, `outputs` as typed shapes, `errors` as codes, plus `dependencies` and `tests`. The FRESH blueprint (§8) is the executable form of this table.

| Component (FRESH) | Inputs | Outputs | Errors | Depends on |
|---|---|---|---|---|
| `safety-filter` | `checkTopic(text)`, `checkContent(text)` | `SafetyResult{allowed, reason?, safeAlternative?}` | `EMPTY_INPUT` | — |
| `thinking-engine` (P2, NEW) | `elicit(item, answer, confidence, strategy)`, `codeResponse(...)`, `evidenceFor(skill)` | `CodedResponse{code: slip\|misread\|prereq-gap\|misconception\|sound, evidence}`, `SkillEvidence[]` | `INSUFFICIENT_ANSWERS` | `diagnosis-engine` |
| `diagnosis-engine` | `generateDiagnostic(topic)`, `adaptiveDiagnostic(topic, coreCorrect)`, `inferAdaptiveDiagnosis(topic, items, answers)` | `Diagnosis{level, prerequisitesKnown[], prerequisitesMissing[], misconceptions[], confidence, path}` | `INSUFFICIENT_ANSWERS` | `content-provider`, `thinking-engine` |
| `kernel-fractions` / `kernel-clouds` / `kernel-animals` / `kernel-castle` / `kernel-business` (P3) | kernel-specific typed inputs (e.g. `castleState({lengthUnits, heightRows, thickness})`) | computed state + `holds`/classification + reason string | `INVALID_INPUT` (clamped, never throws on learner input) | — (pure) |
| `world-composer` (P4) | `composeScene(spec)`, `sceneForTopic(topic)`, `genericTopicScene(topic)` | validated `SceneSpec` (+ `simulationSupported`, `supportedParts`, `unsupportedParts`, `workedExample` where honest) | `INVALID_SCENE` | `world-objects`, kernels (state only) |
| `world-director` (P4) | `validateCommand(cmd)`, `applyCommand(scene, cmd)`, `adaptAfterWrongAnswer(...)` | new `SceneSpec` | `INVALID_COMMAND` | `world-composer` |
| `doctore-presenter` (P5) | `poseFor(phase, subject)`, `tieFor(subject)` | pose asset + tie variant + cutout/fallback decision | — (fallback is a value, not an error) | `world-cutout` |
| `world-cutout` (P5) | `sampleBackground`, `applyCutout` | `{transparent, total, ratio}` + fallback flag | — (honest fallback) | — |
| `voice-helpers` (P6) | `chooseBritishVoice(voices)`, `splitSentences(text)` | chosen voice / sentence chunks | — | — |
| `ai-adapter-meta` | `complete(prompt)`, `completeStream(prompt)`, `healthCheck()` | `Completion{mode: live\|offline-demo, text, sources?}`, token stream | `AI_UNAVAILABLE`, `AI_TIMEOUT`, `AI_INVALID_RESPONSE` | — (server-only) |
| `source-lookup` | `searchTopic(topic)` | `{available, sources[{title,url}], context?}` | — (unavailable is a value) | `safety-filter` |
| `session-store` | `createStudentState(topic)`, `updateState(patch)`, `recordTransition(phase)` | `StudentState{sessionId, topic, level, prerequisitesKnown[], prerequisitesMissing[], misconceptions[], mastery, history[], adaptations[]}` | `INVALID_PATCH` | — |
| `session-summary` (P7) | `summarise(state, evidence)` | per-skill evidence + mastery (transfer-gated) + source labels | — | `session-store`, `thinking-engine` |
| `aegis-blueprint-validator` / `aegis-component-registry` (P7) | `validateBlueprint(bp)`, staged registration with hash | `{valid, errors[]}`, registry record | schema/rule errors listed in §8 | — |

Security invariants on every contract: never `eval`/`exec` AI output; AI reaches only `ALLOWED_TOOLS`; request bodies capped (adapter validates topic ≤120 chars, chat ≤500 chars; server caps bodies, cf. existing `20 000`-byte destroy pattern); keys read from env server-side only.

---

## 3. Test list per behaviour (page-own input → visible result)

Every test names the **page's own input** and the **visible result** a founder would see — plus the pure-function test behind it where the truth is computed. Runner: `node --test tests/*.test.mjs` (zero deps, mirrors existing suite). Live calls are smoke-only (minimal), never the unit oracle.

### P1 — Stage

| # | Page input → visible result | Behind it |
|---|---|---|
| S1 | Type a topic → great wall shows the Academy/topic world, bubble shows Professor D's opening line, only Talk/Type/Mute-yourself controls visible | Stage renders `SessionState`; history collapsed behind Type |
| S2 | Second tutor line arrives → bubble shows **latest line only**; earlier lines move to history behind Type | Bubble is single-line state, transcript appends to history |
| S3 | `prefers-reduced-motion` on → Doctore present and static, no walk animation, session fully usable | Reduced-motion branch in presenter |
| S4 | Unsafe topic typed → refusal with safe alternative in bubble; no world built for the unsafe ask | `checkTopic` gate before diagnose |

### P2 — Thinking engine

| # | Page input → visible result | Behind it |
|---|---|---|
| T1 | Answer 3 core questions → 4th–7th questions adapt (transfer probe if strong, foundation probe if weak) and bubble/phase label reflects the path | `branchItems` path selection; `adaptiveDiagnostic` length 5–10 incl. unscored reflect |
| T2 | Give a correct answer with "I guessed" confidence + strategy → coded `slip`/low-confidence path: Doctore re-checks with a variant instead of marking mastery | `codeResponse` uses confidence+strategy, not correctness alone |
| T3 | Give a systematically wrong answer (e.g. "bigger denominator = bigger fraction") → coded `misconception`; next world beat targets that misconception by name | misconception list from `inferAdaptiveDiagnosis` + coding rules |
| T4 | Answer nothing / skip → "Answer at least one diagnostic question" state; no fake diagnosis | `INSUFFICIENT_ANSWERS` surfaced honestly |
| T5 | Finish diagnosis → visible level + "what we know / what we're working on" from evidence, not a bare score | `Diagnosis` + `SkillEvidence` rendering |

### P3 — Kernels

| # | Page input → visible result | Behind it |
|---|---|---|
| K1 | Fractions: set denominator 4, select 3 → wall reads `3/4 (0.75)`, equivalents `3/4 = 6/8 = 9/12` update live | `fractionState` exact values; simplification via GCD |
| K2 | Clouds: drag humidity 60→90 → cloud type/ stage label changes to precipitation-class and description explains why | `cloudTypeFor` thresholds; `density` clamped 0.1–1 |
| K3 | Animals: sort lion vs zebra → wall/feedback states both groups correctly ("lion is a carnivore…; zebra is a herbivore…") | `classifyAnimal`/`compareAnimals` exact strings |
| K4 | Castle: thickness 1→3 with front 6×4 fixed → front area stays `24`, total blocks `24→72`, readout flips `FALLS → HOLDS` with reason naming depth | `castleState`/`testCastleDesign`: `holds = T≥2 && H≥3` |
| K5 | Business: set price/costs/units → profit, margin, break-even recompute exactly; loss shows as negative profit, not hidden | business kernel arithmetic unit tests with hand-computed fixtures |
| K6 | Kernel given out-of-range input (denominator 0, humidity 200) → clamped sane world, no crash, no NaN on wall | clamp behaviour in every kernel |

### P4 — Worlds

| # | Page input → visible result | Behind it |
|---|---|---|
| W1 | Choose clouds → manipulate temperature/moisture → cloud recomposes on the same wall (no page change) | `cloudsSceneAfterChange` through composer |
| W2 | Struggle twice on castle → wall rebuilds at supportive grain (sequence steps appear: Draw front → Add depth → Count → Test) | director `adaptAfterWrongAnswer` command validated then applied |
| W3 | Name an obscure topic (e.g. axolotls) → labelled diagram world ("diagram, not a bespoke simulation"), live lesson labelled with `Looked up:` Wikipedia sources or "model knowledge" | `genericTopicScene` honesty fields; `searchTopic` labelling |
| W4 | Invalid scene spec injected (test) → rejected before render; wall keeps last good scene | `validateSceneSpec` negative test |

### P5 — Doctore life

| # | Page input → visible result | Behind it |
|---|---|---|
| D1 | Start fractions lesson → Doctore present pose wears **bronze** tie; switch to clouds → **teal**; castles → **crimson** | `PRESENT_TIES` mapping (present pose only) |
| D2 | Teaching beat → point/think pose keeps neutral tie and is not presented as a tie variant | tie rule from `DOCTORE_LOCK.md` |
| D3 | Cut-out implausible (test image) → framed original shown, no broken transparency | `applyCutout` ratio → honest fallback decision |
| D4 | New topic → Doctore moves to the wall object he references, then stops (still while speaking) | purposeful movement contract; no idle motion |

### P6 — Voice / talk

| # | Page input → visible result | Behind it |
|---|---|---|
| V1 | Press Talk, ask a question → streaming bubble text appears sentence-by-sentence; speech queues sentence 1 while rest streams | `completeStream` + `splitSentences` queue |
| V2 | Press Mute-yourself while listening → state reads `You: muted`; background speech never appears in transcript | mute aborts recognition; stray-speech negative test |
| V3 | Press Talk mid-speech → speech stops, listening starts | interrupt behaviour |
| V4 | No mic / no voice available → Type carries session; UI states the limitation plainly; captions carry everything | capability detection; captions-always invariant |
| V5 | Voice list without British voice (test) → best English fallback chosen, never a female-named voice mis-picked by substring | `chooseBritishVoice` regression tests |

### P7 — Mastery / summary

| # | Page input → visible result | Behind it |
|---|---|---|
| M1 | Pass practice **with** hints → skill shows "practising", **not** mastered | mastery requires transfer gate |
| M2 | Pass fresh transfer unaided → skill flips to mastered in summary with the transfer evidence | transfer-gated `mastery` update |
| M3 | Fail transfer → summary shows what adaptation will retry; mastery stays withheld | honest negative path |
| M4 | End session → summary lists per-skill evidence + `Looked up:` sources vs model-knowledge labels | `summarise` over evidence log |

### AEGIS / security (see §8 for the full gate)

| # | Input → visible result |
|---|---|
| A1 | `node tools/aegis/validate.mjs blueprints/ludus-fresh.blueprint.json` → `{valid:true}` |
| A2 | Blueprint with `eval` operation / missing tests / unknown dependency / duplicate id → `{valid:false}` with the specific rule named (negative fixtures) |
| A3 | Register a component without contract hash + test evidence → registry refuses staging |
| A4 | Client bundle inspected → no API key string anywhere; `/api/health` reports mode without credentials presence beyond boolean |
| A5 | AI asked to run code / off-allowlist tool → refused by `validatePrompt` allowlist; nothing executed |

---

## 4. Build order with triple-check gates

**Gate rule (every stage):** (1) focused tests for the stage pass, (2) full suite passes, (3) live health/stream smoke passes with **minimal** live calls (health + one short stream; lookup smoke uses cache/stub where possible). Founder visual gate is recorded as **pending** at every stage — no browser engine exists in this Codespace and none is installed; spoken sound, mic permission, and cut-out pixels are founder-checked on a real device. A stage is not "done" until checks 1–3 are green; check 3 never spends beyond verified free credits (image generations only for missing art, founder quality-over-cost, unknown $-cost tracked honestly — cf. `DOCTORE_LOCK.md`: tool shows no price).

| Stage | Build | Focused tests | Exit criteria |
|---|---|---|---|
| **0. Plan** | This `docs/PLAN.md` only. No code. | — (plan review) | Founder approves plan; existing app untouched (verified: no writes outside `ludus-fresh/`). |
| **1. Skeleton + gold import** | `package.json` (`node server.mjs`), `server.mjs`, gold copies (§2.2) with provenance headers, static stage shell (P1 layout, no brain). | Gold-copy hash check vs sources; `/api/health` offline-demo mode; stage serves. | Triple-check green; no key in client; fallback app still runs standalone. |
| **2. Thinking engine + diagnosis** | `thinking.js` (elicit/code/evidence) over adapted `diagnosis.js` + `content.js`; intake UI (answer+confidence+strategy). | T1–T5. | Diagnosis adapts 5–10 Q; coding deterministic on fixtures. |
| **3. Kernels** | Five kernels (business new), each pure + clamped. | K1–K6 with exact hand-computed fixtures. | All kernel truths exact; no AI in kernels. |
| **4. Worlds + Doctore life** | Composer wiring, `sceneForTopic`, director/adapt, poses/ties/cut-out on the wall. | W1–W4, D1–D4. | Manipulate→consequence→rebuild loop works for castle + clouds; generic world honest. |
| **5. Voice/talk + live** | Streaming chat, sentence speech queue, Talk/Type/Mute, lookup labelling. | V1–V5, S/T/W integration; one short live stream smoke. | Live mode labelled; offline demo labelled; captions always. |
| **6. Mastery + summary** | Transfer gate, evidence summary, `Looked up:` labelling end-to-end. | M1–M4. | Mastery impossible without unaided transfer (negative test proves it). |
| **7. AEGIS close-out** | Fresh blueprint (§8) validated; registry staged with hash+evidence; security sweep. | A1–A5 + full suite + smoke. | Validator green, negatives rejected, registry staged only with evidence. Founder visual gate scheduled. |

No commit / push / deploy / spend at any stage without explicit founder approval. Each stage leaves the previous stage's tests green or it does not close.

---

## 5. Doctore life — asset provenance (locked)

- Master: `/workspaces/Meta-hackathon-ludus/public/assets/doctore-master.jpg` (sha256 prefix `8e1453d70dda3a83`) per `/workspaces/Meta-hackathon-ludus/docs/DOCTORE_LOCK.md` — copied to `ludus-fresh/public/assets/` with provenance header/sidecar; `docs/DOCTORE_LOCK.md` copied alongside.
- Poses copied: `doctore-present.jpg`, `doctore-point.jpg`, `doctore-think.jpg`; backdrop `academy.jpg`; ties `doctore-tie-bronze.jpg` (fractions/engineering), `doctore-tie-teal.jpg` (clouds/animals), `doctore-tie-crimson.jpg` (castles).
- Any **missing** pose art is generated **only** via the image tool at founder direction (quality over cost; $-cost unknown and tracked as unknown, never invented), derived from the locked master, and founder-gated by eye before use. No other generation spend.

---

## 6. Voice/talk — implementation boundary

- Now: browser speech (recognition where available + synthesis via `chooseBritishVoice`/`splitSentences`), streaming text, queued sentence delivery, captions always, Talk interrupts, Mute-yourself aborts listening.
- Future (not built, not claimed): realtime duplex voice (paid endpoint evaluation is a founder decision in the sync record's "Still to decide").

---

## 7. Feasibility substitutions (honest limits — read before building)

| Ambition | What FRESH actually does | What it never claims |
|---|---|---|
| "Discovers HOW the learner thinks" | **Elicits** answer + confidence + strategy ("how I got it") and **codes** the response deterministically (`slip / misread / prereq-gap / misconception / sound`) from correctness, confidence, strategy signals, and prerequisite tags. Evidence is stored per skill and shown in the summary. | Never claims to read the learner's mind. The bubble says what the learner *showed*, with the evidence — e.g. "Your method was right; the slip was in the arithmetic" — not what they "really thought". |
| "Teaches any subject, even obscure ones" | **Primitives + labelled lookup:** `genericTopicScene` composes a labelled diagram world from verified primitives (Observe → Predict → Test → Explain), and `searchTopic` grounds the live lesson in Wikipedia v1 with `Looked up:` citations. `simulationSupported:false`, `supportedParts`/`unsupportedParts` ride with the scene. | Never claims a bespoke simulation or verified-facts search it doesn't have. No lookup → lesson labelled **model knowledge**. No filler text dressed as fact. Wider/cross-checked sources remain a founder decision. |
| "Talks with a British professor voice" | **Browser speech:** best-available British voice via `chooseBritishVoice`, sentence-chunked queued delivery, captions always, Type always works. Quality varies by machine — stated plainly in UI when fallback voice is used. | Never claims paid-studio or realtime duplex quality. Duplex is **future**, pending verified endpoint evaluation + founder approval. |
| "Sees the learner / reads work" | Text/voice input only; wall manipulation state is the observable evidence. | No camera, handwriting, or affect claims. |
| Mastery | Transfer-gated: unaided success on a fresh problem. | Practice-with-hints never marks mastery; the summary shows the gate evidence either way. |

Security substitutions are not downgrades but invariants: AI output is never `eval`'d; only `ALLOWED_TOOLS` may be invoked; secrets live server-only and are never printed; lookup can never leave the Wikipedia allowlist (fixed host, parser drops foreign hosts — unit-tested).

---

## 8. AEGIS blueprint for fresh components

- **New blueprint:** `ludus-fresh/blueprints/ludus-fresh.blueprint.json`, `id: "ludus-fresh"`, semver versioned, `metadata{aegisVersion:"2.0.0", target:"node-zero-dep-web", createdFor:"Meta-hackathon-ludus"}`.
- **Components** = the §2.4 table (safety-filter, thinking-engine, diagnosis-engine, five kernels as one `subject-kernels` component or five — decided at Stage 7 with dependency order kept acyclic, world-composer, world-director, doctore-presenter, world-cutout, voice-helpers, ai-adapter-meta, source-lookup, session-store, session-summary, aegis validators). Each declares `contract{inputs, outputs, errors}`, `dependencies`, `tests`, `operations` (operation names must match contract inputs; `BLOCKED_OPERATIONS` auto-rejected).
- **Gates:** `node tools/aegis/validate.mjs blueprints/ludus-fresh.blueprint.json` must print `valid:true` (exit 0). Negative fixtures (blocked op, missing tests, unknown dep, duplicate id, circular dep, contract-version mismatch) must each print `valid:false` naming the rule.
- **Registry:** components are staged into `ludus-fresh/registry/staged/` **only** with `contractHash` (sha256 over stable-stringified contract) + test-report evidence. No hash, no evidence → no staging. The existing 26-component blueprint/registry in the fallback app is evidence of the method, not something FRESH edits.

---

## 9. Non-goals & preserved boundaries

- No dashboard layout; no second permanent column; no purple gradients / glass-everywhere / emoji feature icons; reduced-motion respected.
- No edits to `/workspaces/Meta-hackathon-ludus` outside `ludus-fresh/`; the existing app remains the fallback until FRESH passes Stage 7 and the founder says otherwise.
- No commit, push, deploy, or spend beyond verified free credits; image generations only for missing Doctore art; unknown $-cost tracked as unknown.
- Future canon parts (persistent maps, spaced retention, history inquiry, community/IEP, life skills, ranks/credentials, cognitive toolkit, purpose/pathways, 3D/VR) keep interface hooks only — never claimed built.

## 10. Open founder gates (recorded, not blocking the plan)

1. Founder visual lock: Academy stage composition, pose set, cut-out pixels, first judge world.
2. Stage spend caps for art gates (quality-over-cost direction noted; explicit caps still required before mass generation).
3. Obscure-topic grounding beyond Wikipedia v1; child-appropriate source tiers.
4. Realtime duplex voice endpoint evaluation vs current browser speech.
5. Transparent cut-out route approval if runtime cut-out proves insufficient on real devices.
