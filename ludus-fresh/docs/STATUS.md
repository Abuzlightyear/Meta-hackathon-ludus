# LUDUS FRESH — Status (docs/STATUS.md)

> Build: **LUDUS FRESH** in `ludus-fresh/` (new folder, zero-dependency Node).
> Fallback preserved: the existing app at `/workspaces/Meta-hackathon-ludus` was
> never deleted or overwritten; all FRESH writes stayed inside `ludus-fresh/`
> (plus the appended fresh-build entry in `docs/LUDUS_SYNC_RECORD.md`).
> Nothing committed, pushed, deployed, or spent beyond the live calls noted
> below. Plan first: `docs/PLAN.md` (P1–P7) was written before code; its
> "PLAN ONLY" banner is superseded by this status file.

## Exact start

```bash
cd ludus-fresh && PORT=4174 npm start
# -> http://localhost:4174  (PORT 4174 avoids the old app)
```

`npm start` runs `node server.mjs` (no `npm install`, no bundler, Node ≥ 20).
Without `PORT`, `server.mjs` defaults to 4180 — always set `PORT=4174` for
the FRESH handoff above.

## What is built (one integrated teaching intelligence)

Learner names any safe subject → Professor D the Doctore discovers *how* the
learner thinks (answer + confidence + strategy, coded
`slip/misread/prereq-gap/misconception/sound` with evidence) → adaptive 5–10
diagnosis (deterministic scoring, reflect item unscored) → subject kernel
teaches computed truth → world through one composer on the great wall
(manipulate → consequence → rebuild on struggle) → transfer on a fresh
problem, mastery withheld until unassisted success (`markMastered` only) →
session summary. Obscure topics get the generic inquiry world
(`simulationSupported:false`, Wikipedia-grounded live lesson labelled;
bespoke-sim/lookup limits stated, no filler). Theatre stage only:
full-screen Academy, Doctore cut-out walks/points/listens/thinks, tie per
subject, ONE speech bubble (latest line), history behind Type, 3 controls
Talk/Type/Mute-yourself, streaming chat + queued British sentence speech,
captions always. AI output is rendered as text only — never eval'd;
allowlisted tools only; secrets server-only, never printed.

Components (AEGIS blueprint `blueprints/ludus-fresh.blueprint.json`, 12):
`safety-filter`, `thinking-engine`, `kernel-maths`, `kernel-clouds`,
`kernel-animals`, `kernel-engineering-castle`, `kernel-business`,
`kernel-obscure`, `subject-kernels`, `world-composer`, `adapter-bridge`,
`theatre-stage`. Gold reuse is copy-with-provenance (see
`public/assets/PROVENANCE.md`, locked master `8e1453d70dda3a83`, and
first-line headers on copied JS); kernels import proven computed truth
from the gold simulations where it exists.

## Tested (observed in this environment, 2026-11-04)

- **AEGIS validator (shared tool):**
  `node tools/aegis/validate.mjs ludus-fresh/blueprints/ludus-fresh.blueprint.json`
  → `valid:true`, exit **0**. Gate run (`gates.mjs run`, fresh paths) →
  G0 schema `passed`, G1 contract `passed`; G2–G6 honestly `not-run` in the
  gate report (unit/negative evidence lives in the test suite below, not
  claimed as gate-tool passes).
- **Negatives rejected (all four required):** bad scene
  (`fixtures/invalid-bad-scene.json` → `validateSceneSpec` invalid),
  unsupported director action (`fixtures/invalid-unsupported-action.json` →
  `unsupported-action`; blocked blueprint operation `eval` →
  `unapproved-operation`), contract mismatch
  (`fixtures/invalid-contract-mismatch.blueprint.json` → validator exit 1,
  `contract-version-mismatch`), unsafe topic
  (`fixtures/invalid-unsafe-topic.json` → `checkTopic` refused with safe
  alternative; typed scene gate `unsafe`). Covered by
  `tests/aegis-fresh.test.mjs` (5/5).
- **Registry (shared tooling, fresh paths):** started empty (honest), then
  staged only with source sha256 + executed test evidence
  (`registry/staged/*.json`) and accepted via `gates.mjs accept` →
  `registry/components.json` holds **12/12 `verified`**. Resolve of
  `thinking-engine@1.0.0` succeeds (`reused:true`); `@9.9.9` is rejected
  (no silent upgrade).
- **Full fresh suite:** `npm test` in `ludus-fresh/` →
  **71/71 pass, 0 fail** (kernels 8, thinking 7, adaptive 5, world 15,
  stage 10, aegis-fresh 5, questions 8, scene 6, dynamic-lesson 3,
  pedagogy 4). Latest fixes: animal
  scenes render the exact species the question names (species-specific
  zebra/lion/fox/frog/heron artwork, single-animal focus scenes and
  pair scenes for compare questions, locked by tests + browser probe);
  Professor D's voice now plans prosody per sentence (questions,
  encouragement and emphasis get distinct rate/pitch/pauses, natural
  British voices preferred) with speech-linked pose gestures, a voice
  wave and speaking ring (reduced-motion safe); confidence/method
  prompts now appear only on the first diagnostic question and
  confidence on the unaided transfer check, not on every question.
  Competitor-informed interface pass (vs Khanmigo, Duolingo, Brilliant,
  Synthesis, MATHia): tap-to-answer chips when a question enumerates
  its choices, a 3-level hint ladder (where-to-look → cross-one-out →
  worked answer; never in the unaided verify step), a per-step
  progress bar, a live per-skill meter (Skillometer-style dots that
  update as answers are coded), and Professor D reaction motion on
  correct/missed answers — all browser-verified in the animals flow.
  Competition pass: (1) real server voice — `POST /api/tts` synthesises
  Professor D's lines with the neural en-GB-RyanNeural Edge voice
  (project `.venv/bin/edge-tts`), espeak-ng offline fallback, honest
  503 + browser-voice fallback when neither can speak; the client
  plays server audio first with per-sentence rate/pitch from the
  prosody planner. (2) Guided 90-second demo: "Watch the 90-second
  demo" button (or `?demo=1`) runs a scripted animals lesson —
  diagnose (with hint ladder shown), teach (built-in lesson so it
  never stalls), practice, unaided verify, passport stamp —
  browser-verified end-to-end in ~30s ending in verified mastery.
  (3) First-screen polish: Live AI mode pill, Learning Passport strip
  beside Professor D, subject cards with descriptions, trust strip,
  slimmer intake wall so the opening question is above the fold, and
  `cache-control: no-cache` on static files so refreshes always show
  the current build. Suite now **69/69**.
  Full school subjects pass: the picker now offers Mathematics,
  Science, Biology, Physics, Chemistry, History, Geography, English,
  Coding and Business. Three new computed kernels — History
  (dated-event chronology, century rule, cause-before-effect),
  Physics (speed/weight/kinetic-energy) and Coding (variable and
  loop tracing) — each with diagnostic ladders, practice, unaided
  transfer, world scenes (timeline, live motion chart, code trace)
  and prediction-first teach moments. Chemistry, Geography and
  English ride the live-generated lesson path with honest labelling.
  Generated environments: open topics now get a themed world —
  space (stars, ringed planet), ocean, volcano, chemistry lab,
  code terminal, ancient monuments, garden, body — chosen from the
  topic and drawn into the scene backdrop (`topicTheme` +
  `themeBackdrop`, `data-theme` on the SVG), still honestly labelled
  as a composed diagram, not a bespoke simulation. Suite **71/71**,
  browser-verified across Physics/History/Coding lessons and a
  generated space scene.
  Animation box upgrade: Professor D's stage now crossfades between
  poses (preloaded double-buffer layer, no hard cuts or blank
  flashes), drifts gently while idle, bobs in time with his speech
  pulses, warms its stage light while speaking, and carries a state
  plate (Ready to teach / Thinking / Explaining / Speaking… / Well
  done). All motion is disabled under `prefers-reduced-motion`.
  Browser-verified mid-lesson (point pose, speaking ring and wave,
  "Speaking…" plate). Suite remains **71/71**. Post-audit Blockers 1-5
  fixed: no fabricated multiple-choice submissions, blank answers are
  guarded in diagnose/practice/verify, castle HOLD/FALL wording matches
  (plus a full `cars` kernel: engine cycle, gear ratios, braking square
  law and fuel, computed and world-backed, so common topics no longer
  fall into the generic sequence)
  its checker, cloud answers require whole matches, and the wall draws
  bricks by lengthUnits. Scene-first shell: the
  world is the page, Professor D stands in the scene with a dialogue
  bubble, controls are a slim strip, and questions rebuild the scene
  around their own case (`syncWorldToItem`). Working scene #1 is
  geometry: the castle-wall architectural model whose own computed
  readout answers its diagnostic questions. Conversation-first shell
  (checkpoint `refs/tbh/recovery/before-conversation-first-ui/20261104T183758Z-4`):
  ONE persistent bottom input routes topics, answers (including
  multiple-choice), and chat; Professor D has a dedicated character
  area with honest pose images (fake walking removed); captions toggle;
  verified end-to-end in headless Chromium via that single input. Question banks were rebuilt as
  planned per-subject diagnostic ladders with dedicated branching probes
  (no question repeats in a full flow), real practice/transfer questions
  with teaching feedback, and the world renderer gained per-subject
  themed graphics (exact geometry preserved).
- **Build check:** `node --check` over `server.mjs`, `public/stage.js`,
  `src/**`, `server/*.mjs` → **0 failures**.
- **Live smoke (ONE namespace, minimal calls):** in-process server on
  4174 — health `live` (`credentialsPresent:true`); castle scene
  `engineering-castle-wall` valid; business scene `business-shop` valid;
  generic scene `generic-inquiry` valid with `simulationSupported:false`;
  home `200` with the first-screen question; **ONE** short streamed chat
  (`/api/ai/chat-stream`, fractions) returned SSE deltas ending
  `done:true`. Exactly one live streamed-chat call was made in this final
  verification run. Live-call dollar cost is **unknown** (tooling reports
  no price); an earlier stage smoke may also have completed one live call
  server-side — also unquantified. No other live calls were made for
  verification (SSE behaviour is additionally proven offline in tests).

## Founder-pending (explicitly NOT verified — no browser engine)

**Founder browser/sound/pixel gates are pending.** No browser engine is
available in this environment and none was installed (never install one to
fake a gate). Unverified by eye/ear: Doctore cut-out pixels, walk/pose
composition on the Academy stage, tie rendering, spoken British sound,
microphone/Talk quality, and reduced-motion behaviour in a real browser.
Open `http://localhost:4174` (start command above) to judge them.

## Remaining gaps / honesty notes

- Persistent maps, retention, history, community/IEP, ranks/credentials,
  cognitive toolkit, purpose/pathways and 3D remain future (canon hooks
  only) — not claimed as built.
- Obscure-topic grounding is Wikipedia-only v1 via the adapter bridge;
  the obscure kernel itself verifies no facts (`scored:false`).
- Gate-report G2–G6 stay `not-run` by design of the shared tool; the
  corresponding evidence is the executed suite + validator runs above.
