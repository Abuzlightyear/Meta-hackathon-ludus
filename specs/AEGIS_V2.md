# AEGIS V2 — Specification

AEGIS V2 is an **actual executable** blueprint-driven verified-component construction workflow used to build Professor D. It is not a document-only process and is **not GENESIS**.

## Purpose
Given `blueprints/professor-d.blueprint.json`, AEGIS V2 validates the blueprint, resolves components from a registry, checks contracts, runs gates, and records truthful evidence. A component may be marked verified only by passing gates.

## Inputs / Outputs
- Input: blueprint JSON (schema below), component registry, test suites.
- Output: validation report (valid/invalid + errors[]), gate report per component, build manifest (component id@version, reused|created, test evidence refs). Reports feed the "Built with AEGIS V2" view verbatim — no manual editing of numbers.

## Blueprint schema (machine-valid)
Top level: `id` (string), `version` (semver), `components` (array), `metadata` (object: `name`, `description`, `aegisVersion`, `target`, `createdFor`).
Each component: `id` (kebab-case, unique), `version` (semver), `contract` (`{inputs, outputs, errors}`), `dependencies` (array of component ids), `tests` (array of test ids/paths), `operations` (array of allowed operation names).

## Validator rules (all must be implemented + negative-tested)
1. JSON parses; top-level `id`, `version`, `components`, `metadata` present and typed.
2. Every component has `id`, `version`, `contract`, `dependencies`, `tests`, `operations`.
3. Component ids unique; versions valid semver.
4. Every dependency references an existing component id.
5. Dependency graph is acyclic.
6. `tests` non-empty per component; `operations` non-empty and from the component's contract.
7. Unknown/extra operations not in the allowlist for that component are rejected.
Invalid blueprints are rejected with structured errors (path + rule + message); never partially built.

## Registry
- Maps component `id@version` → implementation path, contract hash, test list, status (`candidate|verified|deprecated`).
- Reuse: if a verified component satisfies id+version+contract hash, reuse it and record `reused:true`; otherwise scaffold as `candidate`.
- Registry must not silently upgrade versions; version mismatch is a gate failure.

## Gates (in order)
`G0 schema → G1 contract → G2 unit → G3 negative → G4 integration → G5 E2E → G6 typecheck+lint+build`
- A failed gate blocks `verified` status and is recorded with exact passed/failed/skipped counts.
- Negative tests must prove rejection of: missing field, duplicate id, unknown dependency, cycle, bad semver, empty tests, disallowed operation.

## CLI contract (Phase 2 deliverable)
```bash
node tools/aegis/validate.mjs blueprints/professor-d.blueprint.json   # exit 0 valid / 1 invalid, JSON report to stdout
node tools/aegis/registry.mjs list                                    # list id@version status
node tools/aegis/gates.mjs run --blueprint blueprints/professor-d.blueprint.json  # runs gates, writes report JSON
```

## Truthfulness
- Gate results shown anywhere come only from the generated report file.
- If a gate was not run, its status is `not-run`, never `passed`.
