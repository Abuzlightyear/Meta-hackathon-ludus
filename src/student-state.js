// student-state-store@1.0.0 — getState/updateState/resetSession/recordTransition
let _id = 0;
export function createStudentState(topic = "") {
  return { sessionId: `s-${Date.now()}-${++_id}`, topic, phase: "intake", level: null,
    prerequisitesKnown: [], prerequisitesMissing: [], misconceptions: [], mastery: {},
    history: [{ phase: "intake", at: new Date().toISOString() }], adaptations: [], practiceScore: null, verifyScore: null };
}
export class StudentStateStore {
  constructor() { this.state = createStudentState(); }
  getState() { return this.state; }
  updateState(patch) {
    if (!patch || typeof patch !== "object") return { error: { code: "INVALID_PATCH", message: "patch must be an object" } };
    Object.assign(this.state, patch); return this.state;
  }
  resetSession(topic = "") { this.state = createStudentState(topic); return this.state; }
  recordTransition(phase) { this.state.phase = phase; this.state.history.push({ phase, at: new Date().toISOString() }); return this.state; }
}
