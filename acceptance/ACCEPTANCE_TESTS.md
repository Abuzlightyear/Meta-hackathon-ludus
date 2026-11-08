# Acceptance Tests — Professor D × AEGIS V2

A test passes only with recorded evidence (command + exact passed/failed/skipped) in `docs/PROJECT_STATUS.md`. IDs map to blueprint component `tests`.

## AEGIS V2
| ID | Test | Pass condition |
|---|---|---|
| A1 | Blueprint validation (valid) | `node tools/aegis/validate.mjs blueprints/professor-d.blueprint.json` exits 0, `valid:true` |
| A2 | Negative: missing field / duplicate id / unknown dep / cycle / bad semver / empty tests / disallowed op | Each invalid fixture rejected exit 1 with structured `{path,rule,message}`; none partially built |
| A3 | Registry reuse | Resolving an already-verified `id@version`+contract hash returns `reused:true`; version mismatch fails |
| A4 | Gate truthfulness | "Built with AEGIS V2" view renders only numbers from generated gate report; `not-run` shown when a gate did not run |

## Professor D — end-to-end (browser E2E)
| ID | Test | Pass condition |
|---|---|---|
| P1 | First screen | Loads mobile viewport; heading exactly "What would you like to learn today?"; free-text input submittable |
| P2 | Programming flow | Topic "recursion": diagnose → plan (prerequisite before dependent) → teach → tool → practice → summary all reachable |
| P3 | Science flow | Topic "photosynthesis": same full flow reachable; no programming-only assumptions |
| P4 | Other-subject flow | Topic "fractions": same full flow reachable |
| P5 | Adaptation | Wrong practice answer triggers a changed strategy (new example/tool/recap) and records reason in student state |
| P6 | Verification | Final check differs from practice items; mastery shown only at ≥0.8 with no critical misconception |
| P7 | Safe topic | Unsafe topic refused/redirected with safe alternative; empty topic rejected |
| P8 | Unsupported simulation | Topic needing unsupported simulation shows truthful note + worked example, never a fake simulation |
| P9 | Tool allowlist | Selected tool always in allowlist; rationale displayed; no arbitrary AI code execution path exists |
| P10 | AI failure | With adapter forced to fail/timeout: retry then labeled offline/fallback message, no blank screen, no leaked key in client bundle or logs |

## Categories required in Phase 6 record
Unit, contract, blueprint validation, negative, integration, learning-state, tool-selection, API-error, E2E browser flow, typecheck, lint, production build — each with exact passed/failed/skipped.
