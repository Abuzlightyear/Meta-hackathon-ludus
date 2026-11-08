# Professor D — Specification

Professor D is a genuinely adaptive AI educator (polished, mobile-friendly web app). Adaptation must be driven by diagnosed student state, not fixed scripts.

## First screen (exact)
Heading: **"What would you like to learn today?"** — one free-text topic input + submit. No sign-up wall. Offline-demo banner visible when no Meta AI credentials.

## End-to-end flow
`topic → diagnose → personalize → teach → tool → practice → adapt → verify → summary`
1. **Topic intake**: free text; safe-topic handling (allow general educational topics; refuse/redirect unsafe requests with a brief explanation and a safe alternative).
2. **Diagnose**: 2–4 short diagnostic questions; infer level, prerequisites known/missing, likely misconceptions.
3. **Learning plan**: ordered steps tied to diagnosed gaps; prerequisites taught before dependents; plan visible to learner and revisable.
4. **Teach**: explanation at diagnosed level; visual step-by-step where the topic supports it; if a simulation is unsupported, say so truthfully and use a worked example/diagram description instead — never fake a simulation.
5. **Tool selection**: choose from allowlisted tools only (see tool-selector contract): `worked-example`, `visual-steps`, `knowledge-check`, `code-playground-readonly` (display/evaluate via fixed harness, no arbitrary AI code exec), `flashcards`, `socratic-hints`. Choice rationale shown in one line.
6. **Practice**: interactive knowledge check (not static text); immediate feedback.
7. **Adapt**: on struggle (wrong answers, hint requests, self-report), change strategy — simpler example, prerequisite recap, different tool, or slower pacing; on mastery, raise difficulty. Adaptation decision + reason recorded in student state.
8. **Verify**: final check distinct from practice items; mastery threshold explicit (e.g. ≥80% with no critical misconception remaining).
9. **Summary**: what was learned, misconceptions resolved/remaining, next recommended topic; new-challenge entry point loops back to diagnosis at higher level.

## Subjects
Must work for at least: programming (e.g. recursion), science (e.g. photosynthesis), and one other subject (e.g. fractions). No subject-specific hardcoding in core engines; subject content comes via AI adapter / content providers.

## Adaptation state machine
States: `intake → diagnosing → planning → teaching → practicing → adapting → verifying → summary`. `adapting` may return to `planning` or `teaching`. Every transition logged in student state (see contracts).

## Non-functional
- Mobile-first responsive; keyboard accessible; visible focus; readable contrast.
- Handles AI failures/timeouts with retry + offline fallback message; never blank screen.
- No secrets in client bundle; AI calls go through server-side adapter only.
