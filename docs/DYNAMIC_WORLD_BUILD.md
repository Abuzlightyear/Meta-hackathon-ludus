# Dynamic Learning World Engine — Executable Build Plan

_Extends the existing Professor D × AEGIS V2 zero-dependency Node app in this repository. Start command stays `node server/server.mjs` (`package.json` → `start`). There is no GENESIS, no separate game folder, and no new framework. Every existing behaviour is preserved: first screen heading exactly “What would you like to learn today?”, flow diagnose → plan → teach → practice → adapt → verify → summary, `safety-filter`, `tool-selector`, server-side `ai-adapter`, `/aegis` showcase, and the original 24 tests (the suite is now 52 tests: 24 original + 28 world/AEGIS tests in `tests/world.test.mjs`). This document is a plan plus a record of what is already built; §12 and §16 state blockers honestly and nothing is claimed as run when it was not run._

---

## 1. Inventory — what was verified before changing anything

Each row was checked by reading the file or running the command, not assumed.

| Item | Verified state | Where |
|---|---|---|
| Runtime | Node v24.22.2 (`node --version`); `engines >=20` | [package.json](/workspaces/Meta-hackathon-ludus/package.json) |
| Stack | Zero dependencies; `type: module`; scripts `start`, `build`, `test`, `test:report` | [package.json](/workspaces/Meta-hackathon-ludus/package.json) |
| Entry point | `node server/server.mjs` on `PORT` (default 4173) | [server/server.mjs](/workspaces/Meta-hackathon-ludus/server/server.mjs) |
| First screen | Exact heading “What would you like to learn today?” | [public/app.js](/workspaces/Meta-hackathon-ludus/public/app.js), [public/index.html](/workspaces/Meta-hackathon-ludus/public/index.html) |
| Learn flow | `intake → diagnosing → planning → teaching → practicing → adapting → verifying → summary` | [public/app.js](/workspaces/Meta-hackathon-ludus/public/app.js) |
| Safety | Server+client share `checkTopic` / `checkContent` with safe alternatives; topic length cap 120 chars | [src/safety-filter.js](/workspaces/Meta-hackathon-ludus/src/safety-filter.js) |
| Tool policy | Allowlist of 6 only: `worked-example`, `visual-steps`, `knowledge-check`, `code-playground-readonly`, `flashcards`, `socratic-hints`; rationale recorded; never executes AI code | [src/tool-selector.js](/workspaces/Meta-hackathon-ludus/src/tool-selector.js), [server/ai-adapter.mjs](/workspaces/Meta-hackathon-ludus/server/ai-adapter.mjs) |
| AI adapter | Server-only key lookup (`META_AI_API_KEY` / `META_API_KEY` / `LLAMA_API_KEY`); Meta Model API shape `POST https://api.meta.ai/v1/chat/completions`, bearer auth, strict `choices[0].message.content` validation, 15s timeout + 1 retry, tool/task allowlists checked before any network call; key never shipped to client | [server/ai-adapter.mjs](/workspaces/Meta-hackathon-ludus/server/ai-adapter.mjs) |
| AI credentials | All of `META_AI_API_KEY` / `META_API_KEY` / `LLAMA_API_KEY` / `OPENAI_API_KEY` **absent** in this environment (checked by name only; values never printed). `/api/health` therefore reports `{mode: "offline-demo", credentialsPresent: false}` and the UI shows the “Limited offline demo” banner. Live path is proven only against mocked `fetch` in `tests/adapter.test.mjs`. | `tests/adapter.test.mjs` = 7 tests |
| Browser binaries | `which chromium / chromium-browser / google-chrome / playwright` → **none found**. Nothing was installed via `npx`/`uvx`. Browser E2E is therefore `not-run`; the headless module replay in `tests/flow.test.mjs` is the substitute. | — |
| Palette before world | `public/styles.css` used indigo `#4f46e5` → violet `#7c3aed` gradients (logo, buttons, progress) — conflicts with the Scholar-Commander brief and the taste DON'Ts. **Replaced** in the world build. | [public/styles.css](/workspaces/Meta-hackathon-ludus/public/styles.css) |
| Palette after world | Scholar-Commander palette: ink `#1c2b33`, brass `#8c6a2f`, terracotta `#b3542e`, stone `#f4f1e6`, serif display headings, no purple/indigo/violet accent, no purple-blue gradient, `prefers-reduced-motion` disables professor animation | [public/styles.css](/workspaces/Meta-hackathon-ludus/public/styles.css) |
| Tests before world | 24/24 passing (`tests/app.test.mjs` 10, `tests/adapter.test.mjs` 7, `tests/flow.test.mjs` 7) | [registry/test-report.json](/workspaces/Meta-hackathon-ludus/registry/test-report.json) |
| Tests after world | **52/52 passing, 0 failed, 0 skipped** (`node --test tests/app.test.mjs tests/adapter.test.mjs tests/flow.test.mjs tests/world.test.mjs`); 28 tests are in `tests/world.test.mjs` (13 flat-world + 15 `src/world/*` engine/director/demo/AEGIS-fixture tests) | [tests/world.test.mjs](/workspaces/Meta-hackathon-ludus/tests/world.test.mjs) |
| Build | `npm run build` → `BUILD OK — 24 required files present` (file-presence check in `server/build-check.mjs`, zero-dependency, no bundler) | [server/build-check.mjs](/workspaces/Meta-hackathon-ludus/server/build-check.mjs) |
| Blueprint | `blueprints/professor-d.blueprint.json` now declares **26 components** (11 original + 9 flat-world + 6 `src/world/*` engine components); `node tools/aegis/validate.mjs …` → `valid: true`, exit 0 | [blueprints/professor-d.blueprint.json](/workspaces/Meta-hackathon-ludus/blueprints/professor-d.blueprint.json) |
| Registry | `registry/components.json` holds **16 verified** entries: `safety-filter` plus the 9 flat-world and 6 `src/world/*` components (see §10). Resolution is version-pinned: `@2.0.0` → `contract-version-mismatch`, exit 1. | [registry/components.json](/workspaces/Meta-hackathon-ludus/registry/components.json) |
| Gates | `tools/aegis/gates.mjs run` → G0 `passed`, G1 `passed`, G2–G6 `not-run` **by design** (the gate tool validates the blueprint only; suite results live in `registry/test-report.json`). Never relabelled as passed. | [tools/aegis/gates.mjs](/workspaces/Meta-hackathon-ludus/tools/aegis/gates.mjs) |
| Routes before world | `/`, `/aegis`, `/api/health`, `/api/ai/complete`, `/api/aegis/report|registry|tests|events|invalid`, static `public/*` + `src/*` | [server/server.mjs](/workspaces/Meta-hackathon-ludus/server/server.mjs) |
| Routes added | `GET /api/world/scenes`, `GET /api/world/scene/fractions|clouds|animals|engineering|volcano`, `GET /api/world/assets`, `GET /api/world/image-health`, `POST /api/world/direct` (legacy kebab, scene + command schema-validated; 422 `INVALID_COMMAND` / `INVALID_SCENE`), `POST /api/world/director` (camelCase `src/world/*`, validated batch + adapt) | [server/server.mjs](/workspaces/Meta-hackathon-ludus/server/server.mjs) |
| Existing fixtures | 9 AEGIS negative fixtures (`fixtures/invalid-*.json`) + `tests/fixtures/blueprint.invalid.json`, each rejected with structured `{path, rule, message}` | [tools/aegis/lib.mjs](/workspaces/Meta-hackathon-ludus/tools/aegis/lib.mjs) |
| World fixtures added | `fixtures/invalid-world-malformed-scene.json`, `invalid-world-bad-ref.json`, `invalid-world-unsupported-action.json`, `invalid-world-unsafe.json` (scene/command targeted validators) + `invalid-world-invalid-deps.json`, `invalid-world-unsafe-op.json` (blueprint validator) — 15 `fixtures/invalid-*.json` total, each exit 1 via `validate.mjs`; targeted rules proven in `tests/world.test.mjs` | `fixtures/` |

### Taste DON'Ts enforced (defaults for this build)

The world build removes the old purple system and is held to these negatives: no purple/indigo/violet accent or purple-blue gradient; no `bg-clip-text` headline; no cream whole-page background; no aurora blobs or glow-everywhere; no single-font identity; no grey body text; no uniform weight/size; no tracked all-caps kickers everywhere; no centred eyebrow + headline + 2-CTA hero; no identical 3-card grid; no bento-everything; no single radius everywhere; no glass-everywhere; no `hover:scale-105` everywhere; no emoji icons; no left-border/nested cards; no fade-up everywhere; respect `prefers-reduced-motion`; no purposeless scribble mascots. The Scholar-Commander direction replaces them: warm stone ground, deep ink, brass and terracotta accents, serif display type paired with a humanist sans, and motion only where a lesson event causes it (see §6).

---

## 2. Architecture — one reusable 2D world, never a page per lesson

### 2.1 Principle

A lesson is **data**, not a page. Any topic is composed at runtime from typed object specs drawn from a shared primitive vocabulary, positioned and animated by validated director commands, and rendered by one procedural SVG engine. Adding “volcanoes”, “the Romans”, or “quadratic equations” never creates a new HTML file; it creates a new scene spec (or lets the Director compose one).

### 2.2 Component map

```
free-text topic (safety-checked by safety-filter)
   │
   ▼
diagnosis / planning / tool-selector        (existing src/*.js — contracts unchanged)
   │
   ▼
AI Scene Director ──validated commands only──► Scene Spec (typed JSON, scene.schema.json)
   │                                                  │
   │                                                  ▼
   │                                        World Renderer → procedural SVG
   │                                                  │
   │                                    Professor D (in-scene) + Simulations
   │                                                  │
   └──────────── learner interaction ◄───────────────┘
                          │
                          ▼
        assessment / adaptation (misconception-driven)
                          │
                          ▼
              state sync → StudentStateStore (single source of mastery)
```

New files added by the world build (all separate, per brief):

| Layer | File | Responsibility |
|---|---|---|
| Scene contract | [src/scene-spec.js](/workspaces/Meta-hackathon-ludus/src/scene-spec.js) | Typed `SceneSpec` / `ObjectSpec`, structured validation |
| Object library | [src/world-objects.js](/workspaces/Meta-hackathon-ludus/src/world-objects.js) | Reusable factories for every object category |
| Renderer | [src/world-renderer.js](/workspaces/Meta-hackathon-ludus/src/world-renderer.js) | Validated scene → SVG string; invalid scene → honest error, never a fake scene |
| Director | [src/scene-director.js](/workspaces/Meta-hackathon-ludus/src/scene-director.js) | Allowlisted commands, validation, pure reducer, offline directors |
| Character | [src/professor.js](/workspaces/Meta-hackathon-ludus/src/professor.js) | Scholar-Commander SVG + gesture state machine |
| Simulations | [src/simulations.js](/workspaces/Meta-hackathon-ludus/src/simulations.js) | Academy + fractions / clouds / animals / engineering scene builders, computed truth |
| Assets | [src/asset-manager.js](/workspaces/Meta-hackathon-ludus/src/asset-manager.js) | Authorised sources, provenance, cache, placeholder honesty |
| State sync | [src/world-state.js](/workspaces/Meta-hackathon-ludus/src/world-state.js) | World interaction → shared `StudentStateStore` |
| Browser host | [public/world.js](/workspaces/Meta-hackathon-ludus/public/world.js) | Living Classroom mount, topic-world mount, keyboard mirror |
| Learn shell | [public/index.html](/workspaces/Meta-hackathon-ludus/public/index.html), [public/app.js](/workspaces/Meta-hackathon-ludus/public/app.js), [public/styles.css](/workspaces/Meta-hackathon-ludus/public/styles.css) | Academy/world hosts added; flow, safety and tool selection untouched |
| Server | [server/server.mjs](/workspaces/Meta-hackathon-ludus/server/server.mjs) | New `/api/world/*` routes; keys stay server-only |
| Schemas | [schemas/scene.schema.json](/workspaces/Meta-hackathon-ludus/schemas/scene.schema.json), [schemas/scene-command.schema.json](/workspaces/Meta-hackathon-ludus/schemas/scene-command.schema.json) | JSON Schema mirrors of the two validators (drafted in this task, §3) |

### 2.3 Data flow invariants

1. **The scene spec is the only thing the renderer trusts.** `renderSceneToSVG` validates first; an invalid spec renders a visible “Scene could not be built” error naming the first structured error — never a plausible-looking fake scene.
2. **The Director never executes code.** It may only emit the 12 commands in §5; `applyCommand` is a pure reducer (`structuredClone` in, new scene out, input never mutated).
3. **Truth is computed, never drawn.** Fraction equivalence, water-cycle stage, animal classification and structural test results come from pure functions in `src/simulations.js`; images and SVG area are illustrations, not evidence (§8).
4. **Mastery has one home.** World clicks and rebuilds are written through `src/world-state.js` into the same `StudentStateStore` the quiz flow uses. The world keeps no private mastery copy.
5. **Live AI is primary when credentials exist; offline is labelled.** With no key the deterministic local directors and curriculum engine run, and the UI banner says “Limited offline demo”. Nothing offline is ever presented as a live model response.

### 2.4 Rendering and performance strategy

SVG-first, transform-only animation, no Unreal and no heavy assets. Scenes are a few dozen nodes; the renderer is a pure string function (testable in Node, mountable in the browser). The DOM mirror in `public/world.js` turns every interactive object into a real `<button>` for keyboard and assistive-tech access. `prefers-reduced-motion` freezes professor animation to static poses. Desktop is the polished target; layout collapses cleanly at mobile widths (existing `max-width: 560px` breakpoint plus the world wrappers).

---

## 3. Scene-description format — the typed spec every lesson is written in

Source of truth: [src/scene-spec.js](/workspaces/Meta-hackathon-ludus/src/scene-spec.js) (`validateSceneSpec`, `validateObjectSpec`, `createSceneSpec`). Machine-readable mirror drafted in this task: [schemas/scene.schema.json](/workspaces/Meta-hackathon-ludus/schemas/scene.schema.json) (JSON Schema draft 2020-12; parses cleanly — see §12). The schema expresses structure, enums and bounds; rules JSON Schema cannot express (duplicate ids, safety-filter content checks, cross-object reference existence) stay in the JS validators and return the same structured `{path, rule, message}` errors as the AEGIS blueprint validator.

### 3.1 `SceneSpec`

```json
{
  "id": "fractions-pizza",
  "topic": "fractions",
  "title": "Fractions — equal parts of a whole",
  "objects": [ { "…": "ObjectSpec, see §4" } ],
  "professor": { "x": 110, "y": 350, "gesture": "point" },
  "viewport": { "w": 800, "h": 450, "zoom": 1 },
  "interactions": [
    { "kind": "manipulate", "objectId": "frac-main", "prompt": "Select 1 of 4 equal parts." },
    { "kind": "observe", "prompt": "Which is bigger, 1/2 or 1/4?" }
  ]
}
```

| Field | Rule (enforced) | Notes |
|---|---|---|
| `id` | Required; kebab-case `^[a-z0-9]+(?:-[a-z0-9]+)*$` | Stable scene identity; used in routes and fixtures |
| `topic` | Required; non-empty; passed through `safety-filter.checkContent` (`unsafe` rule) | Free-text topic exactly as the learner typed it |
| `title` | Required; non-empty | Human-readable scene heading; rendered as the SVG `aria-label` |
| `objects` | Required; array (may be empty for a professor-only beat) | Each entry is an `ObjectSpec` (§4); ids must be unique in the scene (`duplicate-id`) |
| `professor` | Optional; if present, `{x, y}` finite numbers, `gesture` from the 9-gesture enum (§6) | Default from `createSceneSpec`: `{x: 80, y: 300, gesture: "present"}` |
| `viewport` | Optional; if present, `w > 0`, `h > 0`, `zoom ∈ (0, 8]` | Default `{w: 800, h: 450, zoom: 1}`; the renderer scales around the centre |
| `interactions` | Optional; if present, must be an array | Entries `{kind, prompt?, objectId?}`; prompted kinds are safety-checked by the Director (§5) |

Validation never throws on bad input: `validateSceneSpec(scene)` returns `{valid: boolean, errors: [{path, rule, message}]}`. Rule names used today: `schema`, `duplicate-id`, `unknown-type`, `unsupported-action`, `out-of-bounds`, `unsafe`.

### 3.2 Example — Academy intro scene (abridged, real builder output shape)

```js
// src/simulations.js → academyScene()
{
  id: "academy-intro", topic: "welcome", title: "LUDUS Academy — Living Classroom",
  objects: [
    createColumn({ id: "col-left",  x: 70,  y: 360 }),
    createColumn({ id: "col-right", x: 730, y: 360 }),
    createArch({ id: "arch-top", x: 400, y: 92 }),
    createMap({ id: "world-map", x: 570, y: 150 }),
    createDesk({ id: "desk-1", x: 250, y: 356 }),
    createLabel({ id: "academy-title", x: 400, y: 52,
                  text: "LUDUS ACADEMY", purpose: "Name the Living Classroom" })
  ],
  professor: { x: 150, y: 356, gesture: "present" },
  interactions: [{ kind: "welcome", prompt: "What would you like to learn today?" }]
}
```

### 3.3 Authoring contract

- Build scenes only through `createSceneSpec` + the factories in `src/world-objects.js`, or by applying validated director commands (§5). Hand-rolled object literals that skip factories are rejected by `validateObjectSpec` for the same reasons fixtures are.
- A scene is complete only when every object declares position, scale, appearance, label, actions, interactivity and educational purpose (§4). There is no “decorative” object without a `purpose`.

---

## 4. Object model — the reusable vocabulary scenes are composed from

Source of truth: [src/world-objects.js](/workspaces/Meta-hackathon-ludus/src/world-objects.js) (factories) + `OBJECT_TYPES` / `OBJECT_ACTIONS` in [src/scene-spec.js](/workspaces/Meta-hackathon-ludus/src/scene-spec.js). JSON Schema mirror: [schemas/scene.schema.json](/workspaces/Meta-hackathon-ludus/schemas/scene.schema.json) `/$defs/objectSpec`.

### 4.1 `ObjectSpec` — every object carries the same seven facets

```json
{
  "id": "pizza-1",
  "type": "fraction-pizza",
  "x": 400, "y": 195,
  "scale": 1, "rotation": 0,
  "appearance": { "fill": "#c05a2e", "stroke": "#7a3418", "label": "Pizza" },
  "label": "Pizza in 4 equal parts",
  "actions": ["select-slice", "divide"],
  "interactive": true,
  "purpose": "Show equal parts of a whole and select a fraction",
  "props": { "denominator": 4, "selected": 1, "radius": 90 }
}
```

| Facet | Field(s) | Enforcement |
|---|---|---|
| Identity | `id` (kebab-case, unique in scene) | `schema` / `duplicate-id` |
| Kind | `type` ∈ 26-type enum (§4.2) | `unknown-type` |
| Position | `x ∈ [-200, 1200]`, `y ∈ [-200, 900]` (finite) | `out-of-bounds` |
| Scale / orientation | `scale ∈ (0, 10]` (default 1), `rotation` finite (default 0) | `schema` |
| Appearance | `appearance.fill` non-empty string required; `stroke`, `label` optional | `schema` |
| Label | `label` non-empty; passed through `safety-filter` | `schema` / `unsafe` |
| Actions | `actions` array, every entry ∈ 11-action enum (§4.3) | `unsupported-action` |
| Interactivity | `interactive` boolean | `schema` |
| Educational purpose | `purpose` non-empty string — why this object is in the lesson | `schema` |
| Kind-specific data | `props` free object (e.g. `denominator`, `density`, `species`, `rows`) | Interpreted by renderer + simulation truth functions only |

### 4.2 Object types (26) grouped by teaching job

| Group | Types | Typical factories |
|---|---|---|
| Primitives | `shape`, `label`, `line`, `instrument` | `createShape`, `createLabel`, `createLine`, `createInstrument` |
| Maths manipulatives | `fraction-pizza`, `fraction-bar`, `number-line` | `createFractionPizza`, `createFractionBar`, `createNumberLine` |
| Science objects & processes | `cloud`, `sun`, `sea`, `plant`, `animal`, `habitat`, `tree` | `createCloud`, `createSun`, `createSea`, `createPlant`, `createAnimal`, `createHabitat`, `createTree` |
| Architecture / engineering | `column`, `arch`, `desk`, `map`, `block`, `beam`, `wall` | `createColumn`, `createArch`, `createDesk`, `createMap`, `createBlock`, `createBeam`, `createWall` |
| Diagrams / timelines / sequences | `timeline`, `sequence`, `diagram-node` | `createTimeline`, `createSequence`, `createDiagramNode` |
| Imported / AI 2D assets | `imported-asset` (authorised images only; provenance enforced by §9) | `createImportedAsset` |
| Custom combos | `group` (named bundle of children in `props.children`) | `createGroup` |

### 4.3 Object actions (11)

`select`, `select-slice`, `divide`, `drag`, `place`, `classify`, `observe`, `measure`, `test-design`, `reveal`, `none`. An object with `actions: ["none"]` and `interactive: false` is presentational (e.g. the sun); anything the learner can affect declares the verb it supports, and the renderer's keyboard mirror only turns `interactive: true` objects into buttons.

### 4.4 Composition rule

New topics compose these primitives; they do not add types casually. A new type is added only when no existing type + `props` can carry the concept, and then in four places at once: `OBJECT_TYPES` in `src/scene-spec.js`, a factory in `src/world-objects.js`, a render branch in `src/world-renderer.js` (`objectSVG`), and the enum in `schemas/scene.schema.json` — plus a world test proving the factory output validates.

---

## 5. AI Scene Director — validated commands only, never arbitrary code

Source of truth: [src/scene-director.js](/workspaces/Meta-hackathon-ludus/src/scene-director.js) (`validateCommand`, `applyCommand`, `DIRECTOR_COMMANDS`, `ANIMATION_EVENTS`). Machine-readable mirror drafted in this task: [schemas/scene-command.schema.json](/workspaces/Meta-hackathon-ludus/schemas/scene-command.schema.json) (parses cleanly; cross-references `scene.schema.json#/$defs/objectSpec` for `create-object`). Server enforcement point: `POST /api/world/direct` in [server/server.mjs](/workspaces/Meta-hackathon-ludus/server/server.mjs).

### 5.1 The 12-command allowlist

| # | Command (`type`) | Required fields | Optional fields | Effect in `applyCommand` |
|---|---|---|---|---|
| 1 | `create-object` | `object: ObjectSpec` | — | Appends the spec; rejected if `object.id` already exists (`duplicate-id`) or the spec is invalid |
| 2 | `place-object` | `objectId` | `x`, `y`, `scale ∈ (0, 10]` | Moves/resizes the target (move + resize in one verb) |
| 3 | `reveal-object` | `objectId` | — | View-state flag for the renderer (object becomes visible) |
| 4 | `hide-object` | `objectId` | — | View-state flag for the renderer (object hidden) |
| 5 | `highlight-object` | `objectId` | — | View-state flag; renderer draws the terracotta highlight stroke |
| 6 | `professor-move` | `x`, `y` (finite) | — | Sets professor position and `gesture: "walk"` |
| 7 | `professor-gesture` | `gesture` ∈ 9-gesture enum | — | Sets the in-scene gesture (§6) |
| 8 | `zoom-viewport` | `zoom ∈ (0, 8]` | — | Sets `viewport.zoom` (classroom → topic transition uses this, §7) |
| 9 | `animate-event` | `event` ∈ 7-event enum | `objectId` | Fires a named process animation; scene data unchanged |
| 10 | `ask-manipulate` | — | `objectId`, `prompt` (safety-checked) | Asks the learner to manipulate; scene data unchanged |
| 11 | `observe` | — | `objectId`, `prompt` (safety-checked) | Asks the learner to observe/interpret; scene data unchanged |
| 12 | `rebuild-on-struggle` | `misconception` (non-empty string, from actual answers) | `strategy` (string) | Sets professor to `encourage`; the rebuild itself is a follow-up command batch (§8) |

Brief mapping: *create/place* → 1–2; *move/resize* → 2; *reveal/hide* → 3–4; *highlight* → 5; *professor move* → 6; *point/gesture* → 7 (pointing is a gesture); *zoom* → 8; *animate event* → 9; *ask manipulate* → 10; *observe/interpret* → 11; *rebuild on struggle* → 12.

Animation events (`ANIMATION_EVENTS`, 7): `evaporate`, `condense`, `rain`, `grow`, `divide-pizza`, `test-load`, `none`.

### 5.2 Validation pipeline (every instruction, no exceptions)

```
AI / offline director emits a command object
  → validateCommand(cmd, scene) in src/scene-director.js
      • type must be in DIRECTOR_COMMANDS, else rule "unsupported-action"
        (this is where "eval", "executeArbitraryCode", "shell" and any
         unknown verb are rejected — they are never executed)
      • targeted verbs require objectId ∈ scene object ids, else "bad-ref"
      • create-object requires a full ObjectSpec with a fresh id
      • professor-gesture / animate-event values must be in their enums
      • place-object / zoom-viewport numbers must be finite and in bounds
      • ask-manipulate / observe prompts pass safety-filter ("unsafe")
      • rebuild-on-struggle requires the observed misconception string
  → applyCommand(scene, cmd) — pure reducer
      • structuredClone → mutate the clone only → validateSceneSpec(next)
      • invalid result → { error: { code: "INVALID_SCENE", … } }
  → server POST /api/world/direct wraps this: 200 {scene, applied, mode}
    or 422 { error: { code: "INVALID_COMMAND" | "INVALID_SCENE", errors[] } }
```

Negative fixtures proving the gates: `fixtures/invalid-world-unsupported-action.json` (`executeArbitraryCode` → `unsupported-action`), `fixtures/invalid-world-bad-ref.json` (`highlight-object` on `does-not-exist` → `bad-ref`), `fixtures/invalid-world-malformed-scene.json` (rejected by `validateSceneSpec`). The world test suite additionally asserts that `public/app.js` + `src/scene-director.js` contain no `eval(` / `new Function`.

### 5.3 Who may direct

- **Live AI (primary when credentials exist):** the model is asked — via the server-side adapter — to return command JSON only. Its output is treated as untrusted data and must pass `validateCommand` + the post-apply `validateSceneSpec` re-check before anything renders. A malformed batch is dropped with a 422, never partially applied.
- **Offline directors (labelled fallback):** `welcomeCommands()`, `demonstrateFractionCommands(denominator, selected)` and `rebuildOnStruggle({misconception, topic})` in `src/scene-director.js` emit the same validated commands deterministically, so the world works with no key. They are curriculum templates, never presented as live model output.

---

## 6. Professor D — Scholar-Commander character states

Source of truth: [src/professor.js](/workspaces/Meta-hackathon-ludus/src/professor.js) (`createProfessor`, `moveProfessor`, `setProfessorGesture`, `gestureForEvent`, `professorSVG`). One reusable procedural SVG asset (`professor-d-svg`, §9): dark academic robe with brass clasp and laurel, warm skin tones, grey-streaked hair. No external art, no scribble mascot, no purposeless motion. Browser animation is CSS transforms on the SVG group (`prof-bob` / `prof-nod` keyframes in `public/styles.css`); `prefers-reduced-motion` freezes it to static poses. Walk is a pose + bob, not skeletal animation — stated as a limitation in the registry.

### 6.1 States (9 gestures)

| Gesture | Pose (SVG) | Lesson events that select it (`PROFESSOR_EVENTS`) |
|---|---|---|
| `idle` | Arms resting | Default / unknown event |
| `walk` | Striding arms + bob animation; `facing` flips toward travel direction | `professor-move` commands; entering a scene |
| `turn` | Turned stance | Reorienting to a new object or learner |
| `point` | One arm extended toward the object | `teach` demonstrations; `highlight-object` accompaniment |
| `present` | Both arms open | `welcome`, `teach`, `summary` |
| `think` | Hand raised to chin | `verify` (weighing the learner's answer) |
| `listen` | Attentive resting pose | `diagnose`, `practice` (learner is answering) |
| `encourage` | Both arms raised + nod animation | `struggle` — always paired with `rebuild-on-struggle` (§8) |
| `demonstrate` | One arm extended holding a pointer/tablet | Worked examples; engineering test beats |

State machine rules: `createProfessor` clamps an unknown gesture to `idle`; `setProfessorGesture` returns `{error: {code: "UNSUPPORTED_GESTURE"}}` for anything outside the enum (e.g. `backflip` is covered by a world test); `moveProfessor` derives `facing` from the sign of travel; `gestureForEvent(event)` maps the eight lesson events (`welcome`, `diagnose`, `teach`, `demonstrate`, `practice`, `struggle`, `verify`, `summary`) and falls back to `idle`. Every gesture change is tied to a lesson event — the professor never idles into random motion.

### 6.2 Consistency contract

The same SVG group is rendered inside every scene by `world-renderer` (`professorSVG` appended after the objects, inside the zoom group). Position is scene data (`professor.x/y`, ground line at the feet), so director commands move the identical character between the Academy and topic worlds without swapping assets.

---

## 7. Living Classroom → topic transition

Hosts: `<div id="academy-host">` and `<div id="world-host">` in [public/index.html](/workspaces/Meta-hackathon-ludus/public/index.html); controller: [public/world.js](/workspaces/Meta-hackathon-ludus/public/world.js) (`mountAcademy`, `mountTopicWorld`, `professorTo`); wiring: `showAcademy()` / `showTopicWorld()` in [public/app.js](/workspaces/Meta-hackathon-ludus/public/app.js).

### 7.1 The Academy (scene `academy-intro`)

LUDUS Academy: a scholarly Roman-inspired premium 2D/2.5D room built entirely from primitives — two marble `column`s, a spanning `arch`, wooden `desk`s, a framed world `map`, and the `LUDUS ACADEMY` label — in the warm stone + brass + terracotta palette. Professor D stands at `{x: 150, y: 356}` in `present` and welcomes the learner under the exact first-screen heading. The room is a real scene spec (`academyScene()` in `src/simulations.js`), not a static illustration, so the Director can already move the professor and highlight the map.

### 7.2 Transition sequence

1. **Intake (Academy visible).** `renderIntake()` mounts the Academy (`mountAcademy`) and shows “What would you like to learn today?”. The learner types a free-text topic.
2. **Safety + diagnosis.** `checkTopic` gates the topic (unsafe → explanation + safe alternative); the three-question diagnostic runs in the card below. The Academy stays mounted — the learner never leaves the room context.
3. **Plan.** Diagnosis and plan render as before (existing flow, unchanged). The professor's gesture follows the phase via `gestureForEvent` (`diagnose → listen`, `teach → present`, …).
4. **Teach (world swap).** `renderTeaching()` calls `showTopicWorld()`, which mounts the topic scene into `#world-host`: `fractionsScene`, `cloudsScene`, `animalsScene` or `engineeringScene` for the four demo families, otherwise the Academy scene retitled `Exploring {topic}` with a composed-primitives notice (§10). The swap is a scene-spec replacement plus a `zoom-viewport` framing — the same renderer, the same professor asset walking to the new scene's stance (`professor-move`).
5. **Practice / adapt / verify / summary.** The quiz flow continues in the card; world interactions (keyboard-mirror button clicks) sync into `StudentStateStore` through `src/world-state.js`, and a struggle triggers the adaptive rebuild (§8) without leaving the topic world.
6. **Loop back.** “Learn something new” returns to intake and the Academy welcome. No route change, no page reload.

Desktop-polished and mobile-responsive throughout; every interactive world object is reachable as a real button in the DOM mirror (`public/world.js` builds one `<button class="world-obj-btn">` per `interactive` object, with the object's `purpose` announced in an `aria-live` region).

---

## 8. Adaptive loop — rebuild from the learner's actual answers

Sources: [src/scene-director.js](/workspaces/Meta-hackathon-ludus/src/scene-director.js) (`rebuildOnStruggle`), [src/world-state.js](/workspaces/Meta-hackathon-ludus/src/world-state.js) (`syncInteraction`, `recordWorldAdaptation`), [src/assessment.js](/workspaces/Meta-hackathon-ludus/src/assessment.js) (`adaptationFor`), [src/simulations.js](/workspaces/Meta-hackathon-ludus/src/simulations.js) (perspective alternatives).

### 8.1 The loop

```
learner answers (quiz item or world manipulation)
  → evaluateAnswer / syncInteraction records {correct, misconception}
  → misconception appended to StudentStateStore.misconceptions (deduplicated)
  → on struggle, Director emits rebuild-on-struggle {misconception, strategy}
      • professor → encourage
      • perspective switch: same truth, new representation
        (fractions: pizza → bar → number line; clouds: isolate one cycle stage;
         animals: re-sort by a different feature; engineering: simplify the span)
      • a NEW interaction (ask-manipulate / observe with a fresh prompt)
      • a NEW challenge (verify items are always distinct from practice items)
  → recordWorldAdaptation(store, {strategy, reason, misconception}) — auditable
  → re-teach → practice → verify (mastery ≥ 0.8 AND no critical misconception left)
```

### 8.2 Rules that keep adaptation honest

- **Misconception-driven only.** The trigger is the observed wrong answer and the misconception it maps to (plus any missing prerequisite from diagnosis). Learning-style labels (“visual learner”, “auditory learner”, …) are never inferred, stored or acted on — the world test asserts `rebuildOnStruggle` output contains no such label.
- **`rebuild-on-struggle` requires the misconception string.** A command without it is invalid (`validateCommand` → `schema` error); there is no generic “make it easier” without a diagnosed cause.
- **Change the world, not just the words.** A rebuild must change an object, simulation parameter or perspective and offer a new interaction — re-showing the identical scene with simpler text does not satisfy the loop.
- **Everything is recorded.** Interactions land in `state.worldInteractions[]`; adaptations land in `state.adaptations[]` with `source: "world"`, the strategy and the reason, visible in the summary. Mastery is withheld below 0.8 or while a critical misconception remains (existing `verifyMastery` contract, unchanged).

Worked example (fractions): the learner insists “1/4 > 1/2 because 4 > 2”. The practice evaluator flags the denominator misconception; the Director first highlights the pizza and asks for a fresh selection (`highlight-object` + `ask-manipulate`), then rebuilds to the bar model at the same value (“Same amount, new view: 1/2 is still 1/2”) and issues a new challenge comparing 2/4 with 1/2 on the number line. Equivalence is recomputed by `fractionEquivalence` — the picture illustrates the result, it does not assert it.

---

## 9. Asset strategy — procedural first, authorised images only

Source of truth: [src/asset-manager.js](/workspaces/Meta-hackathon-ludus/src/asset-manager.js) (`registerAsset`, `getAsset`, `listAssets`, `AUTHORIZED_SOURCES`). Served at `GET /api/world/assets`.

### 9.1 Foundation

Procedural SVG/Canvas is the foundation and the default. Every object in §4 renders from code (`world-renderer.objectSVG`); there are no raster dependencies, so scenes load instantly, scale cleanly, and stay testable as strings in Node. Canvas is reserved for a future high-node-count scene; today SVG alone meets the lightweight brief (no Unreal, desktop-polished + mobile-responsive).

### 9.2 Authorised-image rules

1. **Sources allowlist (4):** `procedural-svg`, `authorised-upload`, `meta-ai-generated`, `open-license`. Anything else (e.g. `random-web-image`) is rejected with rule `unauthorised-source`.
2. **Provenance is mandatory.** Every asset declares `{id, source, provenance: {origin}, license, generated, placeholder, useForMathTruth}`. Missing `provenance.origin` → `missing-provenance`; missing `license` → `schema` error.
3. **Placeholders are honest.** `placeholder: true` assets render as a dashed “image: {assetId}” box (`imported-asset` branch) and are labelled placeholder everywhere. A placeholder with `generated: true` is rejected with rule `false-claim` — a placeholder is **never** claimed as generated, in code, UI copy or docs.
4. **Images never carry mathematical truth.** `useForMathTruth: true` on any non-`procedural-svg` source is rejected with rule `math-truth`. Fraction values, cycle stages, classifications and structural results are always computed (§2.3, §10); an imported image may illustrate a result, never assert it.
5. **Cache + provenance travel together.** The in-memory cache (`Map` in `asset-manager.js`) stores the full entry including provenance; `GET /api/world/assets` returns the cached entries so the showcase can display exactly where each visual came from.

### 9.3 Seeded assets (truthful)

The only built-in assets are procedural, both `generated: false`:

| Asset id | Source | Provenance | License |
|---|---|---|---|
| `professor-d-svg` | `procedural-svg` | `src/professor.js` (hand-drawn SVG paths) | `project-owned` |
| `academy-room-svg` | `procedural-svg` | `src/simulations.js academyScene()` + `src/world-renderer.js` | `project-owned` |

### 9.4 Meta image generation — investigated, not used

Meta image generation was investigated for this build: the adapter's verified surface is the Chat Completions shape (`api.meta.ai/v1/chat/completions`, text in / text out). No authorised image endpoint or image credentials are available in this environment, and no paid generation was used — purchasing or enabling one would need explicit approval. The plan therefore treats generated imagery as a future, authorised-only skin behind the same `registerAsset` contract: when (and only when) an authorised endpoint + key exist server-side, a generated asset may be registered as `source: "meta-ai-generated", generated: true` with its real provenance. Until then, claiming any current visual is AI-generated would be false, and this plan does not.

---

## 10. AEGIS V2 — new testable components and gates

Blueprint: [blueprints/professor-d.blueprint.json](/workspaces/Meta-hackathon-ludus/blueprints/professor-d.blueprint.json) (26 components). Staged manifests: `registry/staged/*.json` (16 manifests). Registry: [registry/components.json](/workspaces/Meta-hackathon-ludus/registry/components.json) (16 verified). Gates: [tools/aegis/gates.mjs](/workspaces/Meta-hackathon-ludus/tools/aegis/gates.mjs) + [tools/aegis/lib.mjs](/workspaces/Meta-hackathon-ludus/tools/aegis/lib.mjs). Each component follows the existing `safety-filter` pattern: contract (typed inputs/outputs/errors) + version + dependencies + evidence + limitations. Accepted components are preserved; only an affected component is repaired (this run repaired `world-simulations` `sourceHash` only — see §16).

### 10.1 Flat-world components (9)

| Component | Version | Implementation | Depends on | Contract (summary) |
|---|---|---|---|---|
| `scene-spec` | 1.0.0 | `src/scene-spec.js` | `safety-filter` | `validateSceneSpec`, `validateObjectSpec`, `createSceneSpec` → `SceneValidation{valid, errors[]}` |
| `world-objects` | 1.0.0 | `src/world-objects.js` | `scene-spec` | Factories → `ObjectSpec{id, type, x, y, scale, appearance, label, actions, interactive, purpose}` |
| `world-renderer` | 1.0.0 | `src/world-renderer.js` | `scene-spec`, `professor-character` | `renderSceneToSVG`, `objectSVG` → `SVGString`; invalid scene → honest error |
| `professor-character` | 1.0.0 | `src/professor.js` | — | `createProfessor`, `moveProfessor`, `setProfessorGesture`, `professorSVG` → `Professor{x, y, gesture, facing}` |
| `scene-director` | 1.0.0 | `src/scene-director.js` | `scene-spec`, `professor-character`, `safety-filter` | `validateCommand`, `applyCommand`, `rebuildOnStruggle` → validated scene transitions |
| `world-simulations` | 1.0.0 | `src/simulations.js` | `world-objects`, `scene-spec` | `academyScene`, `fractionsScene`, `cloudsScene`, `animalsScene`, `engineeringScene`, `sceneForTopic` → `SceneSpec` |
| `world-interactions` | 1.0.0 | `src/world-renderer.js` + `public/world.js` | `world-renderer`, `scene-director` | Rendered world + keyboard-mirror controls |
| `world-state-sync` | 1.0.0 | `src/world-state.js` | `student-state-store`, `scene-director` | `syncInteraction`, `recordWorldAdaptation` → shared-state writes |
| `asset-manager` | 1.0.0 | `src/asset-manager.js` | `scene-spec` | `registerAsset`, `getAsset`, `listAssets` with provenance enforcement |

All 9 plus the pre-existing `safety-filter` are `verified` in the registry. Each staged manifest carries `contract`, `dependencies`, `sourceHash`, `provenance.source`, `testEvidence` (the `tests/world.test.mjs` run) and honest `limitations` (e.g. “Offline directors are deterministic templates; live-AI directing needs `META_AI_API_KEY` (absent)”).

### 10.1b Engine-layer components (`src/world/*`, 6)

Added when the reusable engine, camelCase director and adaptive loop were built (director/engine/demos prior runs). Coverage against the brief's ten responsibilities — world rendering (`world-rendering`), object generation (`world-object-generation`), scene specs (`scene-spec`, shared), director (`world-director`; legacy `scene-director` preserved), movement (`world-professor-movement`), simulations (`world-simulations` + `world-adaptive-loop`), tool selection (`tool-selector`, unchanged), interaction (`world-engine` + `world-interactions`), state sync (`world-state-sync`), asset management (`asset-manager`, unchanged):

| Component | Version | Implementation | Depends on | Contract (summary) |
|---|---|---|---|---|
| `world-object-generation` | 1.0.0 | `src/world/objects.js` | `scene-spec`, `world-objects` | `createObject`, `createObjects` → typed `ObjectSpec` dispatch over all 26 types; `UNKNOWN_TYPE`/`DUPLICATE_ID` rejected |
| `world-engine` | 1.0.0 | `src/world/engine.js` | `scene-spec`, `world-object-generation` | `composeScene`, `createWorldState`, `applyInteraction` (pure select/drag/slider/divide; `BAD_REF`/`UNSUPPORTED_ACTION`) |
| `world-rendering` | 1.0.0 | `src/world/render-svg.js` | `scene-spec`, `world-renderer` | `renderSVG`, `objectSVG`, `drawSceneToCanvas`, `focusableObjects`, `nextFocusId`, `prefersReducedMotion` (exact SVG + Canvas fallback) |
| `world-director` | 1.0.0 | `src/world/director.js` | `scene-spec`, `safety-filter`, `world-object-generation` | 13 camelCase verbs (`create`…`rebuild`); `validateDirectorCommand`/`applyDirectorCommand(s)`, `commandsFromDiagnosis`, `struggleRebuild`, `observeInteraction` |
| `world-professor-movement` | 1.0.0 | `src/world/professor.js` | `professor-character`, `scene-spec` | `professorStateForEvent`, `transitionProfessor`, `walkProfessorTo`, `professorSVGForState` (8 states, event-driven) |
| `world-adaptive-loop` | 1.0.0 | `src/world/adaptive.js` | `world-director`, `world-state-sync`, `assessment-engine` | `adaptAfterWrongAnswer`, `checkMastery` (≥0.8, misconception-driven, no style labels) |

All 6 are `verified` in the registry (count 16 with §10.1). Blueprint total is 26 (11 original + 9 flat-world + 6 engine-layer); `validate.mjs` stays green and the graph stays acyclic. No validator code change was needed: the existing scene/director/blueprint validators already reject every required category (§10.2); this run added only fixtures + fixture-driven tests.

### 10.2 Gates and rejection rules

Gate run (`node tools/aegis/gates.mjs run --blueprint blueprints/professor-d.blueprint.json`):

| Gate | Name | Status (truthful) | Meaning |
|---|---|---|---|
| G0 | schema | **passed** | Blueprint parses and matches `schemas/blueprint.schema.json` shape |
| G1 | contract | **passed** | Operations ⊆ typed contract; dependency version pins check out (validator) |
| G2 | unit | **not-run** | Gate tool does not execute the suite by design; results live in `registry/test-report.json` (52/52) |
| G3 | negative | **not-run** | Exercised via `validate.mjs` against the fixtures below, not by the gate runner |
| G4 | integration | **not-run** | Covered headlessly by `tests/flow.test.mjs` + API smoke (§12) |
| G5 | e2e | **not-run** | No Chromium/Playwright in the sandbox (§14) |
| G6 | typecheck+lint+build | **not-run** | Zero-dependency plain JS: `node --check` substitutes for tsc/eslint; `npm run build` is the build gate |

The world gates reject, with structured errors, exactly what the brief requires:

| Rejection | Rule | Enforced by | Negative evidence |
|---|---|---|---|
| Malformed scene | `schema` | `validateSceneSpec` (`src/scene-spec.js`) | `fixtures/invalid-world-malformed-scene.json` (targeted-validator test loads the file); inline world negatives |
| Unsupported action (object or command) | `unsupported-action` | `validateObjectSpec`, `validateCommand`, `validateDirectorCommand` | `fixtures/invalid-world-unsupported-action.json` (`executeArbitraryCode`, asserted against both directors); `eval`/`shell` cases in tests |
| Bad reference | `bad-ref` | `validateCommand`, `validateDirectorCommand` (target id ∉ scene) | `fixtures/invalid-world-bad-ref.json` (fixture-driven test) |
| Invalid dependencies | `unknown-dependency`, `contract-version-mismatch`, `circular-dependency` | AEGIS blueprint validator (`tools/aegis/lib.mjs`) | `fixtures/invalid-missing-dep.json`, `invalid-contract-mismatch.json`, `invalid-circular-dep.json`, `invalid-world-invalid-deps.json` (`nonexistent-engine`); resolve `@2.0.0` → exit 1 |
| Unsafe content | `unsafe`, `unapproved-operation` | `safety-filter` via scene topic/label/prompt checks; blueprint blocked-operations | `fixtures/invalid-world-unsafe.json` (label → `unsafe`), `fixtures/invalid-world-unsafe-op.json` (`eval` → `unapproved-operation`); director `code`-field → `unsafe` |
| Duplicate identity | `duplicate-id` | `validateSceneSpec`, `validateCommand` (create-object) | World test: duplicated pizza object |
| Missing educational purpose | `schema` | `validateObjectSpec` | World test: `purpose: ""` rejected |
| False asset claim | `false-claim`, `math-truth`, `unauthorised-source`, `missing-provenance` | `registerAsset` (`src/asset-manager.js`) | World test: placeholder-as-generated, raster-for-maths-truth, random-web-image |

Acceptance flow per component: stage `registry/staged/{id}.json` → `node tools/aegis/gates.mjs accept --staged …` (validates the manifest, refuses silent version upgrades with `contract-version-mismatch`) → entry appended to `registry/components.json` with `contractHash` + `sourceHash`. Resolution (`registry.mjs resolve {id}@{version}`) returns `reused: true` only on an exact id + version + contract-hash match.

---

## 11. Demo matrix — four demos that prove the engine, not its limits

Builders in [src/simulations.js](/workspaces/Meta-hackathon-ludus/src/simulations.js); scenes served at `GET /api/world/scene/{fractions|clouds|animals|engineering}` and mounted by `mountTopicWorld`. Each demo is a composition of §4 primitives; the “New topic” row shows the same path with no new page.

| Demo (scene id) | Learner input | World objects composed | Manipulation | Computed truth (never from an image) | Struggle rebuild |
|---|---|---|---|---|---|
| Fractions (`fractions-pizza`) | “fractions”, denominator, selected count | `fraction-pizza` (or `fraction-bar`), `number-line`, `label` | Divide the pizza into N equal slices; select slices; read `selected/denominator` | `fractionEquivalence(d)` → `[1/2, 2/4, 3/6…]` with `value` checked to 1e-9; selection read from `props`, not pixel area | Pizza → bar → number line at the same value; new compare challenge (§8) |
| Clouds / water cycle (`clouds-water-cycle`) | “clouds”, temperature °C, humidity % (manipulable) | `sun`, `cloud` ×2 (density-driven), `sea`, `sequence` Evaporate→Condense→Form cloud→Rain, `label` | Raise/lower humidity and temperature; watch cloud density and stage label update; trace water sea → sky | `waterCycleStage({temperature, humidity})`: humidity ≥75 → `precipitation`; ≥45 → `cloud-formation`; else temp ≥20 → `evaporation`, else `condensation` | Slow the cycle; isolate one stage with `animate-event` (`evaporate` / `condense` / `rain`); re-observe that stage only |
| Animals & habitats (`animals-habitats`) | “animals”, habitat kind (`savanna` / `pond`) | `habitat`, `tree`, `plant`, `animal` ×2 (species by habitat), `label` | Sort animals by diet; match features to habitat; compare two species side by side | `classifyAnimal(species)` → `{diet, shelter, group}` table (lion/zebra/frog/heron/fox); unknown species → `{group: "omnivore", diet: "varies"}` | Re-sort by a different feature (shelter instead of diet); swap the habitat and re-classify the same animals |
| Engineering (`engineering-wall`) | “engineering”, wall rows, beam placement | `wall` (brick rows), `beam`, loose `block`, `label` | Place the loose block; centre the beam; run the design test (`test-load`) | `testDesign({wallRows, beamOffset})`: holds iff `rows ≥ 3 AND |offset| ≤ 40`, with a spoken reason either way | Add rows / re-centre with `place-object`; simplify the span; re-test — failure is information, not a dead end |
| New topic (no scene builder) | Any other safe topic, e.g. “how volcanoes erupt” | Director composes `shape` / `label` / `line` / `timeline` / `sequence` / `diagram-node` primitives | `sceneForTopic` returns `null` by design — the Director (live or offline template) composes a scene from primitives and the Academy hosts it retitled `Exploring {topic}` | Whatever the composed simulation computes; if no simulation fits, the teaching engine says so truthfully (`simulationSupported: false`) and uses a worked example | Same misconception loop (§8) over the composed scene; primitives are sufficient — no hardcoded page is ever created |

Routes for live checking: `GET /api/world/scenes?topic=fractions` (topic-dispatched, falls back to the Academy scene), plus the four direct scene routes and `POST /api/world/direct` for command application.

---

## 12. Test plan — what proves each claim, and what is honestly not-run

### 12.1 Suites (all run headlessly; no browser required)

| Suite | File | Count | Covers |
|---|---|---|---|
| App unit | `tests/app.test.mjs` | 10 | First screen, safety, student state, diagnosis, plan ordering, truthful simulation notice, tool allowlist, assessment/mastery/adaptation, adapter offline + validation, mobile/a11y hooks |
| Adapter contract | `tests/adapter.test.mjs` | 7 | No-key offline (network never called); tool permission before network; mocked live success (official endpoint/model/messages + `Authorization: Bearer` server-side only, key absent from output); mocked 500 → `AI_UNAVAILABLE` after exactly 2 attempts; bad shape → `AI_INVALID_RESPONSE`; timeout (`META_AI_TIMEOUT_MS=25`) → `AI_TIMEOUT`; client bundle contains neither `META_AI_API_KEY` nor `api.meta.ai` |
| Learning flow (integration) | `tests/flow.test.mjs` | 7 | Headless replay of the real pipeline in spec order for `recursion`, `photosynthesis`, `fractions`, “how volcanoes erupt”: diagnose(3) → plan (topological, verify last) → teach (≥3 steps + worked example) → tool (allowlisted + rationale) → practice (immediate feedback, 1 deliberate wrong) → adapt (`change-tool-and-simplify` recorded) → verify (distinct items, mastery ≥ 0.8) → summary; plus novice-diagnosis and mastery-withholding cases |
| World engine | `tests/world.test.mjs` | 28 | (1) Academy + all demo scenes validate, every object carries purpose/interactivity; (2) scene negatives — malformed, duplicate id, unknown type/action, missing purpose, unsafe label, out-of-bounds; (3) factories produce typed specs; (4) renderer: valid scene → SVG with professor, invalid → honest error, never a fake scene; (5) fraction equivalence computed; (6) cloud stage from manipulable conditions; (7) animal classify + engineering test-design computed; generic topic → `null`; (8) director allowlist — arbitrary code/bad refs rejected, `applyCommand` pure (input unmutated); (9) professor state machine + reduced-motion; (10) rebuild uses the misconception, never a style label; (11) asset provenance / false-claim / maths-truth gates; (12) world state sync into the shared store; (13) Living Classroom palette (no purple), first screen preserved; (14–16) `src/world/*` factory/composer/pure interactions; (17–20) camelCase director (13 verbs), professor 8 states; (21–25) fractions/clouds/animals+engineering/volcano THROUGH the engine + classroom/asset strategy; (26) render-svg/Canvas/keyboard; (27–28) fixture-driven AEGIS negatives (targeted validators + blueprint deps/unsafe) |
| **Total** | `npm test` | **52/52 pass, 0 fail, 0 skipped** | Recorded by execution in `registry/test-report.json` via `npm run test:report` |

### 12.2 Negative and gate checks (commands, expected exits)

```bash
node tools/aegis/validate.mjs blueprints/professor-d.blueprint.json   # valid:true, exit 0 (26 components)
node tools/aegis/validate.mjs fixtures/invalid-world-malformed-scene.json
node tools/aegis/validate.mjs tests/fixtures/blueprint.invalid.json   # duplicate-id + circular-dependency, exit 1
# each fixtures/invalid-*.json (15 files) + tests/fixtures/blueprint.invalid.json   # exit 1, structured {path, rule, message}
node tools/aegis/gates.mjs run --blueprint blueprints/professor-d.blueprint.json  # G0/G1 passed, G2–G6 not-run (componentCount 26)
node tools/aegis/registry.mjs resolve world-engine@1.0.0   # reused:true, exit 0
node tools/aegis/registry.mjs resolve world-engine@2.0.0   # contract-version-mismatch, exit 1
npm run build                                                  # BUILD OK — 24 required files present
node --check src/world/*.js src/*.js server/*.mjs tools/aegis/*.mjs tests/*.mjs public/*.js   # all clean
```

World negative fixtures are exercised through the validators they target (`validateSceneSpec` for the malformed/unsafe scenes; `validateCommand` + `validateDirectorCommand` for the bad-ref and unsupported-action fixtures; `validateBlueprint` for the invalid-deps and unsafe-op blueprints), matching how `tools/aegis/validate.mjs` exercises blueprint fixtures. The two fixture-driven tests in `tests/world.test.mjs` load the files and assert the targeted rules, so `npm test` proves the rejections, not just the CLI exit codes.

### 12.3 Schema checks (this task)

```bash
node -e "JSON.parse(require('fs').readFileSync('schemas/scene.schema.json','utf8'))"          # PARSE OK
node -e "JSON.parse(require('fs').readFileSync('schemas/scene-command.schema.json','utf8'))"  # PARSE OK
node -e "JSON.parse(require('fs').readFileSync('schemas/blueprint.schema.json','utf8'))"      # PARSE OK (pre-existing)
```

Both new schemas were parse-validated in this session (JSON parses; enum counts cross-checked against the JS sources: scene 26 types / 11 actions / 9 gestures; commands 12 verbs / 7 animation events). They are documentation-and-tooling mirrors — runtime enforcement stays in `src/scene-spec.js` / `src/scene-director.js`, so adding them cannot break the app.

### 12.4 API smoke (spawned server, proxy bypassed)

`GET /api/health` → offline-demo; `GET /api/world/scenes?topic=fractions` → 200 with a validated scene; `POST /api/world/direct` with a valid command → 200, with `{type: "eval"}` → 422 `INVALID_COMMAND`; `POST /api/world/director` zoom → 200, `eval` → 422 (unsafe + unsupported-action); `GET /api/world/assets`, `GET /api/world/image-health` → 200 with procedural provenance (`paidCallMade: false`); `GET /`, `/aegis`, `/world.js` → 200; disallowed tool `shell` → 502 `AI_INVALID_RESPONSE`. Smoke runs in one namespace (`NO_PROXY=127.0.0.1`, `PORT=41739`); no processes are left running after the smoke.

### 12.5 Honestly not-run

- **Browser E2E:** `not-run` — Chromium/Playwright absent in this sandbox and not installed via `npx`/`uvx` per instructions. The world is verified headlessly (SVG strings + API smoke + the DOM-mirror logic in tests). A real-browser playthrough (keyboard traversal, reduced-motion, mobile viewport) remains unverified until a browser exists.
- **Typecheck / lint:** `not-run` — no `tsc`/`eslint` in the zero-dependency stack. Substitute: `node --check` on every JS/MJS file.
- **Live Meta AI:** unverified live — no credentials (see §14). The adapter and the live-director path are proven only against mocked `fetch` and the deterministic offline directors.
- **Gates G2–G6:** `not-run` by design of `tools/aegis/gates.mjs` (it validates the blueprint only). Suite evidence lives in `registry/test-report.json`; this plan never relabels them.

### 12.6 Adding a test (for the next change)

World behaviour changes land with a test in `tests/world.test.mjs` in the existing style (`node:test` + `node:assert/strict`, importing the real `src/` modules — never a copy). Scene/command shape changes must also update the matching JSON Schema and prove at least one positive (factory output validates) and one negative (fixture or mutated spec rejected with the expected rule) case before `npm test` is re-run and `registry/test-report.json` regenerated.

---

## 13. Execution order — steps 1–11 for an implementer starting from the current tree

The world engine (steps 1–9) is already built and verified as recorded above; the order below is the reproducible sequence — re-run it in order for any rebuild, audit or continuation. Do not skip ahead: each step's exit condition gates the next.

| Step | Action | Key files / commands | Exit condition |
|---|---|---|---|
| 1 | **Inventory and freeze the baseline.** Confirm Node, zero deps, routes, credential absence (by name only), browser absence, and the 24-test baseline. Record the old purple palette as the thing being replaced. | `node --version`; read `package.json`, `server/server.mjs`, `public/*`; `npm test` | Baseline written down (§1); 24/24 green before any world edit |
| 2 | **Specify the scene contract.** Define `SceneSpec` / `ObjectSpec` (seven facets per object), the 26-type and 11-action enums, bounds, and the structured error shape. | `src/scene-spec.js`; mirror: `schemas/scene.schema.json` | `validateSceneSpec` accepts the Academy spec and rejects malformed/duplicate/unknown/unsafe/out-of-bounds specs |
| 3 | **Build the object library.** One factory per type, each returning a complete spec with `purpose`; groups for custom combos; `imported-asset` as the only image-bearing type. | `src/world-objects.js` | Every factory output passes `validateObjectSpec`; world test (3) green |
| 4 | **Render procedurally.** Pure SVG renderer per type; validated scenes render, invalid scenes render an honest error; professor appended in-scene. | `src/world-renderer.js`, `src/professor.js` | `renderSceneToSVG(valid)` contains the fraction text + “Professor D”; `renderSceneToSVG(invalid)` matches “could not be built” |
| 5 | **Direct with validated commands only.** Implement the 12-command allowlist, `validateCommand` (bad-ref / unsupported-action / unsafe / schema) and the pure `applyCommand` reducer; add the offline directors. | `src/scene-director.js`; mirror: `schemas/scene-command.schema.json` | `eval` / `shell` / unknown verbs and bad refs rejected; valid `place-object` applies without mutating the input |
| 6 | **Animate the Scholar-Commander.** Nine-gesture state machine tied to the eight lesson events; CSS-transform animation with `prefers-reduced-motion` freeze; Scholar-Commander palette replaces purple. | `src/professor.js`, `public/styles.css` | Unknown gesture → `UNSUPPORTED_GESTURE`; CSS contains `prefers-reduced-motion` and no `#4f46e5` / `#7c3aed` |
| 7 | **Compose the demo simulations.** Academy welcome plus fractions, clouds, animals and engineering builders over the primitives; truth in pure functions (`fractionEquivalence`, `waterCycleStage`, `classifyAnimal`, `testDesign`); generic topics → `null`. | `src/simulations.js` | All five scenes validate; equivalence/stage/classify/test-design unit checks green; unknown topic composes primitives |
| 8 | **Close the adaptive loop and the asset gates.** Misconception-required `rebuild-on-struggle` with perspective switches; sync interactions/adaptations into `StudentStateStore`; provenance-enforced asset registry (placeholders honest, images never for maths truth). | `src/scene-director.js`, `src/world-state.js`, `src/asset-manager.js` | Rebuild output names the misconception and no style label; placeholder-as-generated and raster-for-truth rejected |
| 9 | **Wire the Living Classroom and the server.** Academy/world hosts in the learn page, keyboard-mirror controller, teach-phase mounting; validated `/api/world/*` routes with server-only keys. | `public/index.html`, `public/app.js`, `public/world.js`, `server/server.mjs` | First screen unchanged; Academy mounts at intake, topic world at teach; `/api/world/direct` returns 200 valid / 422 invalid |
| 10 | **Register with AEGIS V2.** Add the 9 flat-world components to the blueprint, stage manifests with contract/version/deps/evidence/limitations, accept each through the gates, and add the world negative fixtures. Preserve accepted components; repair only the affected one. | `blueprints/professor-d.blueprint.json`, `registry/staged/*.json`, `fixtures/invalid-world-*.json`; `gates.mjs accept`, `registry.mjs resolve` | Blueprint `valid: true`; registry verified; `@2.0.0` resolve refused; G0/G1 passed, G2–G6 truthfully `not-run` (counts by run: §10.1b/§16 — now 26 blueprint / 16 registry) |
| 11 | **Verify end to end and report honestly.** Full suite, test report, build, syntax sweep, blueprint + negative fixtures, JSON Schema parses, API smoke; write down blockers without inventing passes. No commit/push/deploy without approval. | `npm test`, `npm run test:report`, `npm run build`, `node --check …`, schema parses (§12.3) | All run checks green with exact counts (§16); browser E2E, live AI and G2–G6 reported as not-run/blocked (§14), never as passed |

---

## 14. Blockers and honest status

| Blocker | Impact | What works today | Unblock condition |
|---|---|---|---|
| **No Meta AI credentials** — `META_AI_API_KEY` / `META_API_KEY` / `LLAMA_API_KEY` / `OPENAI_API_KEY` all absent (name-checked only) | Live AI (explanations and live scene directing) unverified; `/api/health` reports `offline-demo` | Deterministic offline directors + built-in curriculum engine run the full world; UI banner labels it “Limited offline demo”; adapter live path proven against mocked `fetch` (official endpoint, model, messages, bearer header, retry/timeout mapping) | Set `META_AI_API_KEY` server-side only (optional `META_AI_MODEL`, `META_AI_API_URL`, `META_AI_TIMEOUT_MS`); never expose it to the client bundle |
| **No browser engine** — Chromium/Playwright absent, not installed via `npx`/`uvx` per instructions | Real-browser E2E (keyboard traversal, reduced-motion rendering, mobile layout, visual check of the Scholar-Commander palette) unverified | Headless verification: SVG string assertions, full module-pipeline replay (`tests/flow.test.mjs`), API smoke against a spawned server | Provide Chromium/Playwright in the environment, then run a browser playthrough of intake → topic world → struggle rebuild → summary |
| **No authorised image generation** — no Meta image endpoint/credentials; no paid use without approval | No generated raster imagery; `imported-asset` renders as an honest placeholder box | All visuals are procedural SVG with honest provenance (`generated: false`); the asset contract already supports a future authorised `meta-ai-generated` source | Authorised image endpoint + server-side credentials + explicit approval for any paid generation; register results through `registerAsset` with real provenance |
| **Gates G2–G6 `not-run` by design** — `tools/aegis/gates.mjs` validates the blueprint only | Gate report alone cannot evidence unit/integration/e2e/build status | Suite evidence lives in `registry/test-report.json` (52/52 by execution); build gate is `npm run build`; negatives run via `validate.mjs` and the world tests | Extend the gate tool to execute the suite, or keep citing the test report — never relabel `not-run` as `passed` |
| **No typechecker/linter** — zero-dependency plain JS, no `tsc`/`eslint` installed | No static type or lint gate | `node --check` syntax sweep over all JS/MJS; typed contracts enforced at runtime by the validators and mirrored in the JSON Schemas | Add tooling only if the zero-dependency constraint is lifted by approval |

**Current verified state:** see §16 for the latest executed counts (52/52 tests, 26 blueprint components, 16 registry entries). Live Meta AI, browser E2E and gates G2–G6 are **not** claimed. No purchase, publish, deploy, push or submission was performed; all changes are local files in this workspace, in separate modules (`public/*.html|js|css`, `src/*.js`, `server/*.mjs`, `schemas/*.json`), with the existing app intact.

---

## 15. Addendum — demonstrations composed THROUGH the engine (this run)

All four demonstrations are scene data composed by `composeScene` (`src/world/engine.js`) from `src/world/objects.js` factories — there are no separate hardcoded pages. The Living Classroom (`academyScene`, LUDUS Academy) welcomes in `public/world.js#mountAcademy` and transitions to topic scenes in `mountTopicWorld`; the first screen heading is unchanged.

| Demo | Composition (through the engine) | Student change | Computed truth | Adaptive rebuild |
|---|---|---|---|---|
| Fractions / pizza | `fractionsScene` → `fraction-pizza`/`fraction-bar` + `number-line` + live `frac-read`/`frac-equiv` labels; `scene.fraction` = `fractionState()` | `applyInteraction` `divide` (denominator) + `select` (cycles slices); browser divide slider + live readout in `public/world.js` | `fractionState` (value/decimal/simplified/equivalents) + `fractionEquivalence`; never from an image | `struggleRebuild` `switch-pizza-to-bar`: hide pizza, create bar at the simplified same amount, highlight + new `askManipulate` |
| Clouds / weather | `cloudsScene` → `sun` + `cloud`×2 (density) + `sea` + `sequence` + `weather-controls` (`diagram-node` with temperature/humidity) + stage/type labels; animated sky via density + `cloud-drift` CSS (frozen under `prefers-reduced-motion`) | Engine `slider` on `weather-controls` + `cloudsSceneAfterChange` recomposition; browser Temperature/Moisture sliders | `waterCycleStage` + `cloudTypeFor` (clear/cumulus/stratocumulus/stratus/nimbostratus) with evaporation/condensation explanations | `isolate-one-stage`: `animate evaporate` → `condense` + highlight + new observe prompt |
| Animals (+ engineering) | `animalsScene` → `habitat`/`tree`/`plant`/`animal`×2; `engineeringScene` → `wall`/`beam`/`block` | `select` to classify; `drag`/`place` the loose block, then test | `classifyAnimal` + `compareAnimals` (diet/shelter/group); `testDesign` (holds iff rows ≥ 3 and \|offset\| ≤ 40) | Generic simplify-and-retry rebuild + new verify challenge |
| Volcanoes (unfamiliar) | `volcanoScene` from primitives only (`shape` cone/magma, `label`, `diagram-node`, `sequence`, `timeline`); no new page | `select` on `eruption-seq`; cone is honestly presentational (`NOT_INTERACTIVE`) | `VOLCANO_STEPS` order; `simulationSupported: false` with `supportedParts`/`unsupportedParts` + `VOLCANO_WORKED_EXAMPLE` (worked-example fallback, also via `explain()`) | Simplify-and-retry rebuild + distinct verify challenge |

**Adaptive loop** (`src/world/adaptive.js`): wrong answer/misconception → `struggleRebuild` (director rebuilds/simplifies/switches perspective) → `newInteraction` → NEW verify challenge (`generateCheck(..., "verify")`, distinct from practice) → `checkMastery` (mastery ≥ 0.8 with no remaining misconception, withheld otherwise). Adaptations sync through `world-state` into the shared `StudentStateStore`; no learning-style labels anywhere.

**Asset strategy (verified this run):** procedural SVG first. `GET /api/world/image-health` (`imageGenerationHealth` in `server/ai-adapter.mjs`) is a server-side presence check only — it never calls an image endpoint (`paidCallMade: false`). This environment has no `META_IMAGE_API_KEY`/`META_IMAGE_KEY`, so the limitation stands: *no generated raster imagery; procedural SVG only, cached with provenance fields only* (`src/asset-manager.js`). No placeholder is claimed as generated; images are never used for maths truth. The server adapter remains primary (`/api/health` mode `live` when a key is present, labelled `offline-demo` otherwise) and scene decisions flow through `POST /api/world/director` (validated camelCase commands) or the deterministic fallback.

**Headless evidence (demo run):** five scenario tests in `tests/world.test.mjs` each assert relevance, objects appear, Professor action, student changes scene, adapt after wrong answer, accurate info and assessment. At that run `npm test` → 50/50 pass (now 52/52 with §16); `npm run build` → BUILD OK; single-process API smoke (proxy bypassed) → health/image/volcano/fractions routes 200, director zoom 200, `eval` 422, adapt 200 `offline-demo`. Browser E2E and live AI remain not-run/unverified (no browser, no credentials) — never claimed as passed.

---

## 16. AEGIS V2 handoff — blueprint completion and verification (this run)

This run did not rebuild the engine, director or demos (prior runs, §15); it completed their AEGIS V2 registration and proved the gates. Reused prior evidence: engine (`src/world/engine.js` + `objects.js`), director (`src/world/director.js`, 13 verbs), professor movement (`src/world/professor.js`, 8 states), adaptive loop (`src/world/adaptive.js`) and the four engine-through demos plus volcano-from-primitives.

**Blueprint (26).** Added 6 components to [blueprints/professor-d.blueprint.json](/workspaces/Meta-hackathon-ludus/blueprints/professor-d.blueprint.json), each with typed contract, `version: 1.0.0`, dependencies, `tests: ["tests/world.test.mjs"]` and operations ⊆ contract (§10.1b): `world-object-generation` (`src/world/objects.js`), `world-engine` (`src/world/engine.js`), `world-rendering` (`src/world/render-svg.js`), `world-director` (`src/world/director.js`), `world-professor-movement` (`src/world/professor.js`), `world-adaptive-loop` (`src/world/adaptive.js`). Together with the existing components they cover the brief's ten responsibilities: world rendering, object generation, scene specs, director, movement, simulations, tool selection, interaction, state sync, asset management. Validator stayed green; no existing contract was edited.

**Registry (16 verified).** Staged manifests in `registry/staged/world-*.json` (contract + dependencies + `sourceHash` of the `src/world/*` file + `provenance.source` + `testEvidence` + `limitations`) were accepted via `gates.mjs accept` (all `accepted: true`, exit 0). Registry now holds 16 verified entries. Repair of the only affected component: `world-simulations` `sourceHash` was stale after simulations were rewired to `composeScene`; the staged manifest hash was updated to the current `src/simulations.js` hash and re-accepted at the same `1.0.0` (contract unchanged, no silent upgrade). `resolve world-engine@1.0.0` → `reused: true` exit 0; `@2.0.0` → `contract-version-mismatch` exit 1.

**Validator/gates — no code change needed.** The existing validators already reject every required category, so `tools/aegis/lib.mjs`, `src/scene-spec.js` and both directors were left untouched. Added only negative fixtures + fixture-driven tests: `fixtures/invalid-world-unsafe.json` (scene label → `unsafe`), `fixtures/invalid-world-invalid-deps.json` (`world-engine` → `nonexistent-engine`, `unknown-dependency`), `fixtures/invalid-world-unsafe-op.json` (`world-director` op `eval`, `unapproved-operation`). Two tests appended to `tests/world.test.mjs` load every world fixture and assert the targeted rule (`validateSceneSpec` / `validateCommand` / `validateDirectorCommand` / `validateBlueprint`), so rejection is proven by `npm test`, not only by CLI exit codes. Total negative fixtures: 15 in `fixtures/invalid-*.json` + `tests/fixtures/blueprint.invalid.json`, each exit 1 via `validate.mjs`.

**Executed verification (this run, exact).** `npm test` → **52 passed / 0 failed / 0 skipped**, exit 0 (app 10, adapter 7, flow 7, world 28); `npm run test:report` → `registry/test-report.json` 52/52 `passed`. `npm run build` → `BUILD OK — 24 required files present`, exit 0. `node tools/aegis/validate.mjs blueprints/professor-d.blueprint.json` → `valid: true`, exit 0. All 16 invalid fixtures → exit 1. `gates.mjs run` → G0 `passed`, G1 `passed`, G2–G6 `not-run` (truthful; `componentCount: 26`). `node --check` sweep over `src/world/*.js src/*.js server/*.mjs public/*.js tests/*.mjs tools/aegis/*.mjs` → clean. API smoke in one namespace (`NO_PROXY=127.0.0.1`, `PORT=41739`, server killed after): `/api/health` offline-demo, `/` 200, `/aegis` 200, fractions/clouds scenes 200, `/api/world/assets` + `/api/world/image-health` 200 (`paidCallMade: false`), director zoom 200, director `eval` 422.

**Not-run / blockers (honest).** Browser E2E **not-run**: `which chromium/chromium-browser/google-chrome` empty and no Playwright cache (`~/.cache/ms-playwright` absent); nothing installed via `npx`/`uvx`; headless `node --test` + API smoke is the substitute. Live Meta AI **unverified**: no `META_AI_API_KEY`/`META_API_KEY`/`LLAMA_API_KEY` in env; labelled offline fallback only. Meta image generation **unavailable**: no `META_IMAGE_API_KEY`/`META_IMAGE_KEY`; procedural SVG only, no paid call. Gates G2–G6 **not-run by design**. Typecheck/lint **not-run** (no `tsc`/`eslint`; `node --check` substitute). Nothing committed, pushed or deployed.

**Start (exact).** `npm start` (`node server/server.mjs`, `PORT` default 4173) → learn at http://localhost:4173/ , technical view at http://localhost:4173/aegis , health at http://localhost:4173/api/health . Set `META_AI_API_KEY` server-side only to enable live mode.

---

## 17. Continuation re-check — live-AI primary loop + browser E2E (exact evidence)

Re-checked without printing any secret value:

- Credentials: `META_AI_API_KEY:ABSENT`, `META_API_KEY:ABSENT` (name-only test). The PRIMARY live-AI teaching loop is therefore still **blocked**, not verified live. Deterministic offline directors remain fallback only and are labelled as such; nothing offline is recorded here as a live result.
- Browser: `~/.cache/ms-playwright` → missing; `/root/.cache/ms-playwright` → not accessible; `PLAYWRIGHT_BROWSERS_PATH=unset`; `chromium:ABSENT`, `chromium-browser:ABSENT`, `google-chrome:ABSENT`, `firefox:ABSENT`; `node_modules/playwright` absent. Browser-level rendering and interaction E2E is therefore still **not-run**. No browser was installed (per the never-install rule); headless `node --test` + same-namespace API smoke remain the substitute evidence.
- Runtime: `node v24.22.2`, `npm 11.19.1`. Verified counts in §16 (52/52 tests, 26 blueprint components, 16 registry verified, gates G0/G1 passed, G2–G6 not-run by design) are unchanged by this re-check.

Unblock path (founder action, no code change needed): provide `META_AI_API_KEY` as a server-side environment secret only, restart `npm start`, confirm `GET /api/health` reports live mode, then re-run the director/teaching checks against the real endpoint. Provide a pre-installed Chromium/Playwright to enable real-browser E2E. Until then, live AI and browser E2E must not be claimed.

## 18. Founder-key fix pass — Codespace secret needs a Codespace restart

The founder added the key as a Codespace secret. This session predates it: `META_AI_API_KEY:ABSENT` / `META_API_KEY:ABSENT` / `LLAMA_API_KEY:ABSENT` in normal and login shells, no `.env` file. Secrets inject at Codespace start only, so live AI is still blocked and unverified here; the labelled offline fallback must not be presented as live.

What was fixed for the restart (no secret value touched): the chat-completions endpoint and model were re-checked against the official dev.meta.ai quickstart and already match (`https://api.meta.ai/v1/chat/completions`, `muse-spark-1.3`, Bearer); a `.gitignore` now ignores `.env` / `.env.*` (verified via `git check-ignore`) with a names-only `.env.example`; and `server/load-env.mjs` + `loadEnv()` in `server/server.mjs` loads a gitignored local `.env` without ever overwriting injected secrets or logging values (covered by a new test in `tests/adapter.test.mjs`). After the fix: `npm test` 53/53, `npm run test:report` 53/53, `npm run build` OK, blueprint valid (supersedes §16's 52). Browser E2E remains not-run (no Chromium/Playwright found; nothing installed).

Founder next step: restart the Codespace so the secret injects, run `npm start`, and require `GET /api/health` to report live mode before claiming live teaching. Keep the key server-side only — never in chat, tracked files, or commits.

## 19. Live AI verified — timeout fix (post-restart)

After the founder restarted the Codespace, `META_AI_API_KEY` is present server-side (value never printed). `GET /api/health` now reports live mode, and `POST /api/ai/complete` for fractions returned real live tutoring text (`mode:live`, 17.0s). The first live attempt exposed a real bug: a direct completion took 14.53s, exceeding the adapter's old 15s timeout (`AI_TIMEOUT` after retry). The default timeout is now 60s in `server/ai-adapter.mjs`; a tried `max_tokens: 800` cap starved the reasoning reply (`AI_INVALID_RESPONSE`) and was removed, with a regression assertion in `tests/adapter.test.mjs` (8/8 focused, 53/53 full suite, build OK). Director/world routes inherit live mode from the same health check. Browser E2E is still not-run (no Chromium/Playwright; nothing installed), and gates G2–G6 remain not-run by design. Only minimal live calls were made; nothing was committed, pushed, or deployed.

