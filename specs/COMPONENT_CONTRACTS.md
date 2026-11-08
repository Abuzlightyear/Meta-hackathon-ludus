# Component Contracts — Professor D × AEGIS V2

All inter-component calls use these contracts. Types are TypeScript; errors are structured `{code, message}` — never thrown strings. Blueprint `blueprints/professor-d.blueprint.json` is the machine-readable mirror of this file; keep both in sync.

## student-state-store@1.0.0
- Operations: `getState`, `updateState`, `resetSession`, `recordTransition`
- Inputs: `updateState(patch: Partial<StudentState>)`. Outputs: `StudentState {sessionId, topic, level, prerequisitesKnown[], prerequisitesMissing[], misconceptions[], mastery: Record<stepId, number>, history[]}`.
- Errors: `INVALID_PATCH`, `SESSION_NOT_FOUND`.

## safety-filter@1.0.0
- Operations: `checkTopic`, `checkContent`
- Inputs: `checkTopic(text: string)`. Outputs: `{allowed: boolean, reason?: string, safeAlternative?: string}`.
- Errors: `EMPTY_INPUT`. Unsafe topics are refused with a safe alternative, never silently allowed.

## diagnosis-engine@1.0.0
- Operations: `generateDiagnostic`, `inferDiagnosis`
- Inputs: `generateDiagnostic(topic)`, `inferDiagnosis(topic, answers[])`. Outputs: `Diagnosis {level: 'novice'|'developing'|'confident', prerequisitesKnown[], prerequisitesMissing[], misconceptions[], confidence: 0..1}`.
- Errors: `INSUFFICIENT_ANSWERS`, `AI_UNAVAILABLE`.

## lesson-planner@1.0.0
- Operations: `buildPlan`, `revisePlan`
- Inputs: `buildPlan(topic, diagnosis)`. Outputs: `Plan {steps: [{id, title, objective, dependsOn[], toolHint}]}` (topologically ordered).
- Errors: `NO_PREREQUISITE_PATH`, `AI_UNAVAILABLE`.

## teaching-engine@1.0.0
- Operations: `explain`, `visualSteps`, `workedExample`
- Inputs: `explain(step, studentState)`. Outputs: `LessonContent {markdown, visualSteps?: [{title, body}], example?: string}`. If simulation unsupported, output includes `simulationSupported: false` and a truthful note.
- Errors: `UNSUPPORTED_SIMULATION` (handled, not fatal), `AI_UNAVAILABLE`.

## tool-selector@1.0.0
- Operations: `selectTool`, `listTools`
- Allowlist: `worked-example`, `visual-steps`, `knowledge-check`, `code-playground-readonly`, `flashcards`, `socratic-hints`.
- Inputs: `selectTool(step, studentState)`. Outputs: `{toolId, rationale}`. Never returns a tool outside the allowlist; no arbitrary AI code execution.
- Errors: `NO_SUITABLE_TOOL` (falls back to `worked-example` and records fallback).

## assessment-engine@1.0.0
- Operations: `generateCheck`, `evaluateAnswer`, `verifyMastery`
- Inputs: `evaluateAnswer(itemId, answer, studentState)`. Outputs: `{correct, feedback, misconceptionDetected?, masteryDelta}`. `verifyMastery` outputs `{mastered: boolean, score, remainingMisconceptions[]}` with threshold ≥0.8.
- Errors: `UNKNOWN_ITEM`, `AI_UNAVAILABLE`.

## ai-adapter-meta@1.0.0
- Operations: `complete`, `healthCheck`
- Server-side only. Env: `META_AI_API_KEY` (or `META_API_KEY`/`LLAMA_API_KEY`). Without credentials: returns `mode:'offline-demo'` with deterministic labeled demo responses — never pretends to be live.
- Inputs validated; outputs schema-validated before use; timeout (default 15s) + one retry; failures map to `AI_UNAVAILABLE`/`AI_TIMEOUT`/`AI_INVALID_RESPONSE`.
- Errors: `AI_UNAVAILABLE`, `AI_TIMEOUT`, `AI_INVALID_RESPONSE`, `MISSING_CREDENTIALS` (demo mode, non-fatal).

## ui-shell@1.0.0
- Operations: `renderFlow`, `renderAegisView`
- Renders Professor D flow (first screen exactly "What would you like to learn today?") and the separate "Built with AEGIS V2" view from real gate-report data only.

## aegis-blueprint-validator@1.0.0
- Operations: `validateBlueprint`, `checkGraph`
- Implements all rules in `specs/AEGIS_V2.md`; outputs `{valid, errors: [{path, rule, message}]}`; exit-code CLI wrapper.

## aegis-component-registry@1.0.0
- Operations: `register`, `resolve`, `listVerified`
- Resolves `id@version` + contract hash; records `reused` vs `created`; version mismatch fails, never silently upgrades.

## Cross-cutting
- No component calls the AI except through `ai-adapter-meta`. No component executes AI-generated code. All state changes go through `student-state-store`.
