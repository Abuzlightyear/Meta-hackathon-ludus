// world-state-sync@1.0.0 — syncs world interaction back into StudentStateStore.
// The world never keeps a private copy of mastery: answers, misconceptions and
// adaptations are recorded through the same store the quiz flow uses.
export function syncInteraction(store, { objectId, correct, misconception, prompt } = {}) {
  if (!store || typeof store.getState !== "function") return { error: { code: "INVALID_STORE", message: "A StudentStateStore is required." } };
  const state = store.getState();
  if (!Array.isArray(state.worldInteractions)) state.worldInteractions = [];
  state.worldInteractions.push({ objectId: objectId || null, correct: correct === true, misconception: misconception || null, prompt: prompt || null, at: new Date().toISOString() });
  if (correct === false && misconception && !state.misconceptions.includes(misconception)) {
    state.misconceptions = [...state.misconceptions, misconception];
  }
  return { synced: true, interactions: state.worldInteractions.length };
}
export function recordWorldAdaptation(store, { strategy, reason, misconception } = {}) {
  if (!store || typeof store.getState !== "function") return { error: { code: "INVALID_STORE", message: "A StudentStateStore is required." } };
  const entry = { strategy: strategy || "rebuild-on-struggle", reason: reason || "World rebuilt after struggle.", misconception: misconception || null, source: "world", at: new Date().toISOString() };
  store.getState().adaptations.push(entry);
  return entry;
}
