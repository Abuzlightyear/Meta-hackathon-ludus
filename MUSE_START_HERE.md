# MUSE START HERE — Professor D × AEGIS V2

You are in `/workspaces/Meta-hackathon-ludus`, an existing git repo (initial commit `f40cd07`, only `README.md` plus the spec pack). Do not start a new repo elsewhere.

## What you are building
1. **Professor D** — adaptive AI educator: free-text topic → diagnose → construct lesson → choose teaching tool → adapt on struggle → verify understanding.
2. **AEGIS V2** — executable blueprint-driven verified-component workflow (validator + registry + gates) actually used to build Professor D. Not GENESIS.

## Start sequence (do in order)
1. Read `AGENTS.md` and `MUSE_EXECUTION_PROMPT.md` in full.
2. Read `specs/AEGIS_V2.md`, `specs/PROFESSOR_D.md`, `specs/COMPONENT_CONTRACTS.md`.
3. Parse `blueprints/professor-d.blueprint.json` (`node -e "JSON.parse(require('fs').readFileSync('blueprints/professor-d.blueprint.json','utf8'))"`).
4. Check `docs/PROJECT_STATUS.md` for current phase and blockers; check `docs/KNOWN_LIMITATIONS.md`.
5. Continue at the earliest incomplete phase; preserve all existing files; update `docs/PROJECT_STATUS.md` with real results only.

## Current state at spec time
- Repo is greenfield except `README.md` and this spec pack; no app code, no `package.json` yet.
- No Meta AI credentials in env (`META_AI_API_KEY` etc. NOT_SET) → Professor D must run in clearly labeled **offline demo** mode until credentials are supplied server-side.
- Node v24.22.2 / npm 11.19.1 / Python 3.14.2 available.

## Hard boundaries
- First screen text: "What would you like to learn today?" (free text, safe-topic handling).
- No arbitrary AI code execution; allowlisted tools only; handle failures/timeouts/permissions.
- "Built with AEGIS V2" view shows **only** real gate results, verified components, test reports, invalid-blueprint rejection, and real reuse — no fabricated numbers.
- No paid charges / deploy / push / submit without approval. Never print secrets.
