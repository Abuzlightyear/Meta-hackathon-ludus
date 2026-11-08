# Demo Script — Professor D × AEGIS V2 (truthful)

Run only steps whose status in `docs/PROJECT_STATUS.md` is actually passing. If Meta credentials are absent, say "offline demo mode" out loud at step 1.

## Launch
```bash
npm start   # node server/server.mjs, zero-dependency: no install step
# learn: http://localhost:4173/   technical view: http://localhost:4173/aegis   health: http://localhost:4173/api/health
```
Production check: `npm run build && npm test` (expect BUILD OK — 24 files; 52 passed / 0 failed / 0 skipped).

## Script (≈6 minutes)
1. **First screen (Living Classroom)** — Show "What would you like to learn today?" with Professor D welcoming in LUDUS Academy. Point out the offline-demo banner if present (say "offline demo mode" out loud). Note the Scholar-Commander palette and that the professor is in-scene, not a separate page.
2. **Programming** — Type `recursion`. Answer diagnostics honestly. Show the plan: prerequisites before the dependent step.
3. **Teach + tool** — Open the lesson; name the selected tool and its one-line rationale; walk the visual step-by-step. The professor's gesture follows the phase (present/listen/think).
4. **Practice + adapt** — Deliberately answer wrong once. Show Professor D changing strategy (new example/recap/tool) and saying why — the rebuild names the observed misconception, never a learning-style label.
5. **Verify + summary** — Complete the final check; show mastery result, remaining misconceptions, and the recommended next topic. Start "new challenge".
6. **Science swap** — Repeat quickly with `photosynthesis` to prove the flow is not programming-only.
7. **World demo — fractions** — Type `fractions`. In the topic world, divide the pizza and select slices; read the live fraction and equivalence (computed, never read off the picture). Answer wrong with the denominator misconception and show the pizza → bar rebuild with a new challenge.
8. **World demo — clouds (+ one more)** — Type `clouds`; move the temperature/moisture sliders and show the sky, cloud type and water-cycle stage recompose. If time allows, show `animals` (classify/compare) or engineering (place the block, test the design). For an unfamiliar topic (e.g. "how volcanoes erupt"), show the diagram composed from primitives and read the honest "not a physics simulation" label + worked example — do not present it as a simulation.
9. **Built with AEGIS V2** — Open http://localhost:4173/aegis . Show the 16 verified components, the real gate report (G0/G1 passed, G2–G6 not-run — say so), one invalid-blueprint rejection (run `node tools/aegis/validate.mjs fixtures/invalid-world-invalid-deps.json`), and one reused component (`node tools/aegis/registry.mjs resolve world-engine@1.0.0`). Read numbers only from the reports — do not round or embellish.

## Do not claim
Live Meta AI (unless credentials were actually supplied and `/api/health` shows `live`), AI-generated imagery (all visuals are procedural SVG; image generation is unavailable, `paidCallMade: false`), fake simulations (volcano physics is not simulated), browser-E2E passes (not-run — no Chromium/Playwright), or any gate/test count not in `docs/PROJECT_STATUS.md`. Gates G2–G6 are `not-run` by design; the suite count lives in `registry/test-report.json`.
