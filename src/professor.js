// professor-character@1.0.0 — Professor D, Scholar-Commander (in-scene).
// One reusable procedural SVG professor: dark academic robe with brass clasp and
// laurel, warm skin tones, grey-streaked hair. No external art, no scribble mascot.
// Pure state machine + SVG string renderer so it is testable headlessly and
// animatable in the browser with CSS transforms (frozen by prefers-reduced-motion).
export const PROFESSOR_GESTURES = ["idle", "walk", "turn", "point", "present", "think", "listen", "encourage", "demonstrate"];
export const PROFESSOR_EVENTS = {
  welcome: "present", diagnose: "listen", teach: "present", demonstrate: "demonstrate",
  practice: "listen", struggle: "encourage", verify: "think", summary: "present",
};

export function createProfessor({ x = 80, y = 300, gesture = "present", facing = 1 } = {}) {
  if (!PROFESSOR_GESTURES.includes(gesture)) gesture = "idle";
  return { x, y, gesture, facing: facing === -1 ? -1 : 1, walking: false };
}
export function moveProfessor(prof, { x, y } = {}) {
  const next = { ...prof };
  if (typeof x === "number" && Number.isFinite(x)) { next.facing = x < prof.x ? -1 : 1; next.x = x; }
  if (typeof y === "number" && Number.isFinite(y)) next.y = y;
  next.walking = true;
  next.gesture = "walk";
  return next;
}
export function setProfessorGesture(prof, gesture) {
  if (!PROFESSOR_GESTURES.includes(gesture)) return { ...prof, error: { code: "UNSUPPORTED_GESTURE", message: `Unknown gesture "${String(gesture)}".` } };
  return { ...prof, gesture, walking: gesture === "walk" };
}
export function gestureForEvent(event) {
  return PROFESSOR_EVENTS[event] || "idle";
}

const ARM = {
  idle: '<line x1="0" y1="-52" x2="-16" y2="-28" stroke="#2b2118" stroke-width="7" stroke-linecap="round"/><line x1="0" y1="-52" x2="16" y2="-28" stroke="#2b2118" stroke-width="7" stroke-linecap="round"/>',
  walk: '<line x1="0" y1="-52" x2="-18" y2="-30" stroke="#2b2118" stroke-width="7" stroke-linecap="round"/><line x1="0" y1="-52" x2="18" y2="-34" stroke="#2b2118" stroke-width="7" stroke-linecap="round"/>',
  turn: '<line x1="0" y1="-52" x2="-16" y2="-28" stroke="#2b2118" stroke-width="7" stroke-linecap="round"/><line x1="0" y1="-52" x2="16" y2="-28" stroke="#2b2118" stroke-width="7" stroke-linecap="round"/>',
  point: '<line x1="0" y1="-52" x2="-14" y2="-28" stroke="#2b2118" stroke-width="7" stroke-linecap="round"/><line x1="0" y1="-52" x2="30" y2="-58" stroke="#2b2118" stroke-width="7" stroke-linecap="round"/><circle cx="33" cy="-59" r="3.5" fill="#e8c39a"/>',
  present: '<line x1="0" y1="-52" x2="-24" y2="-44" stroke="#2b2118" stroke-width="7" stroke-linecap="round"/><line x1="0" y1="-52" x2="24" y2="-44" stroke="#2b2118" stroke-width="7" stroke-linecap="round"/>',
  think: '<line x1="0" y1="-52" x2="-14" y2="-28" stroke="#2b2118" stroke-width="7" stroke-linecap="round"/><line x1="0" y1="-52" x2="12" y2="-72" stroke="#2b2118" stroke-width="7" stroke-linecap="round"/><circle cx="13" cy="-75" r="3.5" fill="#e8c39a"/>',
  listen: '<line x1="0" y1="-52" x2="-16" y2="-28" stroke="#2b2118" stroke-width="7" stroke-linecap="round"/><line x1="0" y1="-52" x2="16" y2="-28" stroke="#2b2118" stroke-width="7" stroke-linecap="round"/>',
  encourage: '<line x1="0" y1="-52" x2="-20" y2="-62" stroke="#2b2118" stroke-width="7" stroke-linecap="round"/><line x1="0" y1="-52" x2="20" y2="-62" stroke="#2b2118" stroke-width="7" stroke-linecap="round"/>',
  demonstrate: '<line x1="0" y1="-52" x2="-26" y2="-34" stroke="#2b2118" stroke-width="7" stroke-linecap="round"/><line x1="0" y1="-52" x2="26" y2="-50" stroke="#2b2118" stroke-width="7" stroke-linecap="round"/><rect x="22" y="-62" width="16" height="10" rx="2" fill="#c9b489" stroke="#7a6234"/>',
};

// Returns an SVG <g> for the professor at prof.x/prof.y. y is the ground line (feet).
export function professorSVG(prof, { reducedMotion = false } = {}) {
  const g = PROFESSOR_GESTURES.includes(prof?.gesture) ? prof.gesture : "idle";
  const facing = prof?.facing === -1 ? -1 : 1;
  const anim = reducedMotion ? "" : ` class="prof prof-${g}"`;
  return `<g${anim} transform="translate(${prof?.x ?? 80} ${prof?.y ?? 300}) scale(${facing} 1)" role="img" aria-label="Professor D, ${g}">
  <ellipse cx="0" cy="2" rx="22" ry="4" fill="#000" opacity="0.14"/>
  <path d="M -15 0 L -11 -58 Q 0 -64 11 -58 L 15 0 Q 0 5 -15 0 Z" fill="#233140" stroke="#141d29" stroke-width="1.5"/>
  <path d="M -11 -58 L 0 -30 L 11 -58 L 7 -58 L 0 -38 L -7 -58 Z" fill="#f3ead3"/>
  <circle cx="0" cy="-34" r="4" fill="#b9975b" stroke="#7a6234"/>
  <path d="M -15 -6 Q 0 -1 15 -6 L 15 0 Q 0 5 -15 0 Z" fill="#b3542e"/>
  ${ARM[g] || ARM.idle}
  <circle cx="0" cy="-72" r="13" fill="#e8c39a" stroke="#c79b6d"/>
  <path d="M -13 -74 Q -12 -88 0 -88 Q 12 -88 13 -74 Q 7 -80 0 -80 Q -7 -80 -13 -74 Z" fill="#6d6a63"/>
  <path d="M -12 -78 Q -6 -84 0 -82 M 12 -78 Q 6 -84 0 -82" stroke="#7a9a4e" stroke-width="2" fill="none" stroke-linecap="round"/>
  <circle cx="-4.5" cy="-72" r="1.6" fill="#1c2b33"/><circle cx="4.5" cy="-72" r="1.6" fill="#1c2b33"/>
  <path d="M -4 -64 Q 0 -62 4 -64" stroke="#8a5a3a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
</g>`;
}
