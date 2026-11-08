// world/adaptive — misconception-driven adaptive loop (headless-testable).
// wrong answer -> director rebuilds/simplifies/switches perspective -> new
// interaction -> new verify challenge. Mastery (>=0.8, no remaining
// misconception) is withheld otherwise. Never uses learning-style labels.
import { generateCheck, verifyMastery } from "../assessment.js";
import { struggleRebuild } from "./director.js";
import { syncInteraction, recordWorldAdaptation } from "../world-state.js";

export const MASTERY_THRESHOLD = 0.8;

// Full rebuild step after a wrong answer. Returns the rebuilt scene (director
// commands already applied), a fresh interaction prompt and a NEW verify
// challenge (verify items are distinct from practice by construction).
export function adaptAfterWrongAnswer({ scene, topic, misconception, store } = {}) {
  const m = misconception || "The underlying rule needs another look — see the adapted explanation.";
  const plan = struggleRebuild({ scene, misconception: m, topic });
  if (store) {
    syncInteraction(store, { objectId: null, correct: false, misconception: m, prompt: plan.newInteraction.prompt });
    recordWorldAdaptation(store, { strategy: plan.strategy, reason: plan.reason, misconception: m });
  }
  const verifyChallenge = generateCheck(topic || scene?.topic || "fractions", "verify");
  return {
    decision: plan.decision, strategy: plan.strategy, reason: plan.reason,
    commands: plan.commands, scene: plan.scene, newInteraction: plan.newInteraction,
    verifyChallenge, masteryThreshold: MASTERY_THRESHOLD,
    masteryNote: "Mastery needs >=0.8 on the new challenge with no critical misconception remaining; it is withheld otherwise.",
  };
}

// Score a verify attempt; mastery is honest (threshold + misconceptions).
export function checkMastery(topic, answers, remainingMisconceptions = []) {
  const items = generateCheck(topic, "verify");
  const result = verifyMastery(answers, items, remainingMisconceptions);
  return { ...result, items, threshold: MASTERY_THRESHOLD, mastered: result.score >= MASTERY_THRESHOLD && remainingMisconceptions.length === 0 && result.mastered };
}
