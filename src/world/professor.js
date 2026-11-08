// world/professor — Animated Professor D, Scholar-Commander (in-scene sprite).
// One consistent reusable SVG character (src/professor.js) driven by lesson
// events. States: walk/turn/point/present/think/listen/encourage/demonstrate
// (+ idle rest). Browser motion is CSS transform/animation on .prof-<state>
// (public/styles.css); prefers-reduced-motion freezes every state to a pose.
import { createProfessor, moveProfessor, setProfessorGesture, gestureForEvent, professorSVG, PROFESSOR_GESTURES } from "../professor.js";

export { createProfessor, moveProfessor, professorSVG, PROFESSOR_GESTURES };
export const PROFESSOR_STATES = ["walk", "turn", "point", "present", "think", "listen", "encourage", "demonstrate"];
// Lesson event -> professor state (state-command mapping; every change is event-driven, never random).
export const EVENT_TO_STATE = {
  welcome: "present", diagnose: "listen", teach: "present", demonstrate: "demonstrate",
  practice: "listen", struggle: "encourage", verify: "think", summary: "present",
  highlight: "point", move: "walk", turn: "turn",
};
export function professorStateForEvent(event) { return EVENT_TO_STATE[event] || gestureForEvent(event) || "idle"; }
export function transitionProfessor(prof, eventOrState) {
  const state = PROFESSOR_STATES.includes(eventOrState) ? eventOrState : professorStateForEvent(eventOrState);
  const r = setProfessorGesture(prof, state);
  return r.error ? r : r;
}
export function walkProfessorTo(prof, x, y) { return moveProfessor(prof, { x, y }); }
// SVG string with the state class the CSS animates; reducedMotion strips animation (static pose).
export function professorSVGForState(prof, { reducedMotion = false } = {}) {
  const state = PROFESSOR_STATES.includes(prof?.gesture) || prof?.gesture === "idle" ? prof.gesture : "idle";
  return professorSVG({ ...prof, gesture: state }, { reducedMotion });
}
