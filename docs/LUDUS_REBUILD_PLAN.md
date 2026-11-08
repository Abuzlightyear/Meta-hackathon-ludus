# LUDUS Rebuild Plan — problems first, then fixes in order

Founder direction: spectacular, immersive, smart. Spirit: Frizzle field-trip + Reading Rainbow wonder (original, never copied). LUDUS is the platform; Professor D is its Doctore (locked face in docs/DOCTORE_LOCK.md). Triple-check every fix: (1) automated tests, (2) live API/stream smoke, (3) founder eyes on the real page. A fix is not done on tests alone.

## Problems (why it looks cheap and feels dumb today)

- **P1 Stage is a dashboard.** Chat history, lesson cards, world, and controls all stack and fill the window. No single place for the eye to rest. *Fix:* one cinematic stage — world on the great wall, Doctore standing in the room, last spoken line as one speech bubble, full history hidden behind Type, lesson detail behind a disclosure. (This pass.)
- **P2 Poses are boxed photos.** Raster poses carry stone backdrops, so he looks pasted in. *Fix:* transparent cut-outs (segment/background-remove the locked poses), soft shadow, feet on the stage floor. Needs an approved segmentation route; until then, frame poses as portraits on the wall easel honestly, never fake cut-outs.
- **P3 Worlds are flat shapes.** SVG primitives prove logic, not wonder. *Fix:* styled scene art layers (painted backdrops per subject family) behind exact interactive objects; maths/science truth stays computed, art never proves facts.
- **P4 Brain only half-wired.** Live teach/chat/stream works, but diagnosis is 3 fixed questions and most topics fall back to templates. *Fix:* 5–10 adaptive diagnosis (live-generated, deterministically scored where possible), live scene choice, misconception rebuild, transfer verify. No generic filler.
- **P5 Obscure topics have no home.** Arbitrary safe topics get words, not a world. *Fix:* composer maps new topics to verified primitives + labelled limits; search grounding only via an approved, verified API — never invent lookups.
- **P6 Voice is browser-best-effort.** Free speech synthesis/recognition varies by browser; no true interruptible duplex yet. *Fix:* keep streaming + sentence speech + self-mute now; evaluate the verified realtime endpoint later without exposing keys.
- **P7 No visual proof loop.** No browser engine in this Codespace, so beauty was judged by tests. *Fix:* founder screenshot gates per stage (Academy, pose, world, lesson) at 1366×768 + mobile; defects logged in docs/PROJECT_STATUS.md.

## Practical feature set (in build order)

1. Immersive stage + 3 controls (Talk / Type / Mute-yourself) + single speech bubble. (P1, this pass)
2. Live smart loop: adaptive diagnosis, live teach, stream chat, adapt, transfer. (P4)
3. Per-subject worlds through the composer, castle included; obscure = primitives + honest limit. (P5/P3)
4. Doctore life: cut-outs, walk/point/listen/think, tie per subject, British voice. (P2/P6)
5. AEGIS gates + founder visual QA + judge slice (castle or unfamiliar topic end-to-end). (P7)

## Order and gates

Fix P1 → triple-check → founder look. Then P4 (smart) → triple-check → founder lesson. Then P5/P3 (worlds) → triple-check → founder worlds. Then P2/P6 (life/voice polish). Never mass-generate art before the founder locks each visual gate. No spend beyond verified free credits without a stage allowance; no push/deploy/submit without approval.
