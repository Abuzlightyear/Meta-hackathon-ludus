// tool-selector@1.0.0 — selectTool / listTools. Allowlist only; never executes arbitrary code.
export const ALLOWLIST = ["worked-example", "visual-steps", "knowledge-check", "code-playground-readonly", "flashcards", "socratic-hints"];
export function listTools() { return [...ALLOWLIST]; }
export function selectTool(step, state) {
  const hint = step?.toolHint;
  if (hint && ALLOWLIST.includes(hint)) return { toolId: hint, rationale: `Chosen for "${step.title}" because this stage matches the ${hint} tool.` };
  if (state?.level === "novice") return { toolId: "visual-steps", rationale: "Novice level diagnosed, so a visual step-by-step is the gentlest entry point." };
  return { toolId: "worked-example", rationale: "Fallback: worked-example is the safest default tool.", fallback: true };
}
