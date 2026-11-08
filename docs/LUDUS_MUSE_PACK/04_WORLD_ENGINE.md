# Dynamic 2D World Engine / AI Scene Director

## Architecture
- AI **Learning Environment Architect**: interprets objective, student evidence, prerequisites; selects pedagogy and scene type; determines desired observable student actions.
- AI **Scene Director**: outputs a structured scene *plan* and a list of allowlisted typed actions, referring to scene graph IDs.
- Trusted **World Renderer**: validates and runs the plan; never evals AI-generated JS or lets AI freely fetch/execute code. Reuse registry components where possible.
- Deterministic **Simulations**: math, units, and scientific causal relationships must be coded/tested, not guessed from AI art.
- **Asset Manager**: selects approved sprites, layered backgrounds, procedurally rendered shapes and optional model-generated imagery. Maintain style/provenance/cache.
- **Learner Model**: reports observed interactions and understanding back to Director; never infer mastery from a flashy animation.

## Minimum typed commands
`createObject(type, properties, location)`, `compose(objects, relationships)`, `show/hide`, `move/rotate/scale`, `highlight`, `annotate`, `transitionScene`, `cameraFocus`, `playValidatedSimulation`, `startInteraction`, `observeInteraction`, `characterAction`.
Define schemas, permissions, coordinate constraints, units, collision/placement if necessary, runtime failures, and safe fallback.

## Reusable primitives
- Geometric/fraction shapes, tiling/masking, rulers and number lines
- Draggable blocks/bricks/walls, hinges, gates, spans, levers, labels and arrows
- Weather layers, solar heat, vapor, condensation, cloud categories, gauges
- Animal/habitat sprites, comparison panels, anatomical labels, interactive hotspots
- Timelines, maps, plots, diagrams and structured callouts
- Text/image panel, validated question widget, code editor/simulator hooks

## Topic proof scenarios
**Castle:** Learner assembles wall segments, towers and gate placement for a medieval castle, learns defensive design, material/structural constraints and tradeoffs. Objects must actually drag/connect or change, not just display named rectangles. No invented historical universals.
**Fractions:** Pizza/blocks show equal partitions with exact mathematics, equivalence, compare/compose, learner can manipulate fractions and get checked state.
**Clouds:** Interact with temperature/humidity simplified condensation model, different cloud types and correct explanation of rising air/cooling; explicitly label simplified physical model.
**Animals:** Habitat and real animal visuals with factual labels and meaningful classification/adaptation interaction; art should not be used as proof of biology fact.
**Unfamiliar topic:** Build a distinct scene by composing already-verified primitives or use an explicit limited fallback. Do not hardcode the unfamiliar test.

## Scene and asset hierarchy
High fidelity scenic art behind programmatic hit targets. Rich background can be an image layer; teachable dynamic objects must be discrete, independently manipulable, labeled through accessible UI, and track their state. Never force generic generated image to pretend to be a physical simulation.

## Reuse and testing
Each world component has version, contract, asset dependencies, input/output events, security requirements, tests and known supported domains. AEGIS V2 gates validate plans and tool selection. Browser test verifies visible world render, action, student manipulation, targeted adaptation and correct results. State performance limits and cache/budget behavior.
