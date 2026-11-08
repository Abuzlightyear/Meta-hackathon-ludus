# Professor D Animation / Performance Contract

## Do not confuse 'character present' with 'animated educator'
Animation must communicate a teaching purpose. Character should walk to the object, face it, gesture at the relevant part, observe student input, react to assessment and return to idle. No meaningless constant looping or arbitrary success animations.

## Actions
- `enter(x,y)`, `moveTo(anchor,speed)`, `face(target)`, `point(target)`, `gesture(kind)`, `present(target)`, `listen()`, `think()`, `encourage()`, `celebrateAfterVerifiedCorrect()`, `idle()`.
- Each action has a schema, coordinates bounded to safe stage, optional duration, and declared fallback. Character motion/state managed by one coordinator to avoid contradictory simultaneous actions.
- Scene object anchors are typed names/IDs, never freeform CSS injected by AI.
- Arrival/gesture sequences align with spoken text or onscreen caption; navigation cannot obscure the educational object or text.

## Execution realism
Use layered 2D/2.5D sprites, sprite atlases, tweening, CSS/Canvas or a carefully chosen animation library. A full motion-capture rig is not required. Prioritize high-quality walk cycle, turn, point, idle and thoughtful expressions. Keep fps, memory and bundle size reasonable. Provide reduced-motion fallback (static states, no forced pans) and keyboard equivalents.

## Proof
Show in-browser: intro walk -> stop at teaching wall -> point to fraction object -> explain -> student moves object -> listen/thinking -> targeted response. Record screenshot sequence or reproducible manual test. Tests inspect state changes, but founder visually judges naturalness and art quality.
