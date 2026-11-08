# Master Specification — LUDUS / Professor D / AEGIS V2

## Identity and non-negotiables
- **LUDUS** is the platform and academy. **Professor D** is its Doctore: the teacher physically present in the scene. Do not title the product 'LUDUS Professor D.'
- He is a LIVE AI-powered, adaptive educator and an in-world guide, not a static mascot, a generic chatbot or a template lesson-plan generator.
- The core stage is a cinematic, original 2D/2.5D classroom and explorable-feeling topic scenes. They do not require a full navigable 3D world or Unreal Engine.
- Environments and objects must be *substantive teaching tools*: show a concept, respond to input, accurately change state, and support assessment.
- Support arbitrary safe topics through **composition from verified primitives and available assets**, not a claim of unlimited generative physics or custom worlds. Disclose unsupported cases.
- All development occurs through Muse in the existing Codespace, under AEGIS V2 reusable component and verification gates. Not GENESIS.

## UX core loop
1. Enter LUDUS Academy; Professor D welcomes student by name only if provided.
2. Student selects a topic and goal in natural language.
3. Professor D conducts adaptive **5–10-question** initial assessment (minimum 5 by default); question sequence adapts to answers, scope and prereqs. Offer skip/accessibility option and continue diagnosing during instruction. No universal one-size-fits-all fixed quiz.
4. Student receives a brief human-readable learning goal; full plan stays behind a disclosure panel, not center stage.
5. World Architect picks or composes an interactive lesson scene; Scene Director places Professor D and tools.
6. Professor D moves, points, demonstrates, asks for learner action, explains based on actual state and real model output.
7. Student manipulates objects and explains observations. The interaction is evidence for updating learner model.
8. Errors trigger changed explanation/representation and another attempt, not arbitrary 'Correct!'.
9. Exit test uses NEW problem; only then make evidence-based mastery claim; provide summary and next challenge.

## Ordering of success
**P0** Preserve functioning app, secure live AI and verify real lesson response; no breakage.
**P1** Canonical Professor D art, well-designed LUDUS Academy, meaningful walking/gesture animation and on-screen teaching surface.
**P1** Real adaptive assessment with actual evidence and topic-specific learner state.
**P1** Scene Director connects live reasoning to safe structured actions that render meaningfully.
**P1** At least one end-to-end new-topic lesson visually demonstrated in browser, with user-action, adaptation, and verification.
**P2** More rich scene art, topic packs, voice selection, sprite refinement, image generation on demand.
**P3** 3D worlds, autonomous arbitrary simulation generation, real-time lip sync and sophisticated character rigs.

## Hard acceptance
- Screenshot of app must immediately read as premium original academy, **not** white page with a few vector labels.
- Character must not be tiny stick figure or generic vector professor. Consistent character master and derived poses.
- AI lesson for 'how to build a castle' must teach real castle design tradeoffs with actual manipulable walls, gates, towers or clearly grounded supported parts; no generic 'find an everyday example' repeated filler.
- 'Clouds', 'fractions', 'animals', and an unfamiliar safe topic must generate appropriately differentiated scenes and explanations, with valid limitations.
- Real browser human/automated test, not unit tests alone; document if browser automation unavailable.
