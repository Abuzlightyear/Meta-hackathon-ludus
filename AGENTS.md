# AGENTS.md — Professor D × AEGIS V2

## Mission
Build (1) Professor D, a genuinely adaptive AI educator, and (2) AEGIS V2, an executable blueprint-driven verified-component construction workflow used to build Professor D. AEGIS V2 is **not** GENESIS; do not rename or reintroduce GENESIS.

## Read order
1. `MUSE_START_HERE.md`
2. `MUSE_EXECUTION_PROMPT.md` (entire mission verbatim)
3. `specs/AEGIS_V2.md`, `specs/PROFESSOR_D.md`, `specs/COMPONENT_CONTRACTS.md`
4. `blueprints/professor-d.blueprint.json`
5. `acceptance/ACCEPTANCE_TESTS.md`
6. `docs/PROJECT_STATUS.md`, `docs/KNOWN_LIMITATIONS.md`

## Non-negotiables
- Preserve existing files; never delete without explicit approval. Read before overwriting.
- No paid charges, deploy, push, or external submit without approval.
- Never expose credentials; AI keys are server-side only (`process.env`, never `VITE_*`).
- No arbitrary AI-generated code execution. Tools run from an allowlist only.
- Truthfulness: label offline demo when no Meta AI credentials; never fake gate results, test counts, or simulation support.
- First screen of Professor D is exactly: **"What would you like to learn today?"** with free-text input.

## Architecture rules
- Modular boundaries: `student-state`, `diagnosis`, `planning`, `teaching`, `assessment`, `tool-selection`, `ai-adapter` — no cross-imports except via contracts in `specs/COMPONENT_CONTRACTS.md`.
- Every component in the blueprint must have `id`, `version`, `contract`, `dependencies`, `tests`, `operations`.
- A component is "verified" only when its listed tests pass in CI/local run recorded in `docs/PROJECT_STATUS.md`.
- Blueprint validation must reject: missing fields, duplicate ids, unknown dependencies, dependency cycles, semver violations, unlisted operations.

## Workflow (AEGIS V2 loop)
`blueprint → validate → registry lookup → scaffold/reuse → contract tests → negative tests → integration → E2E → record gates`

## Verification before claiming done
Run and record exact passed/failed/skipped: unit, contract, blueprint validation, negative, integration, learning-state, tool-selection, API-error, E2E browser flow, typecheck, lint, production build. Update `docs/PROJECT_STATUS.md` with real numbers only.

## Stack default (unless blueprint amended)
Vite + TypeScript + React (mobile-first), Vitest + Testing Library, Playwright for E2E. Node 24 available. Keep dependencies minimal.
