// teaching-engine@1.0.0 — explain / visualSteps / workedExample. Truthful on unsupported simulation.
import { contentFor, simulationSupported } from "./content.js";
export function explain(topic, state) {
  const c = contentFor(topic); const sim = simulationSupported(topic);
  return { markdown: c.principles, visualSteps: c.steps, example: c.example, simulationSupported: sim,
    simulationNote: sim ? null : "Simulation not supported for this topic in Professor D. No interactive simulation is available, so a worked example and step-by-step visual are used instead — nothing here is a fake simulation." };
}
export function visualSteps(topic) { return contentFor(topic).steps; }
export function workedExample(topic) { return contentFor(topic).example; }
