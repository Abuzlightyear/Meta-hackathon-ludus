// safety-filter@1.0.0 — checkTopic / checkContent (specs/COMPONENT_CONTRACTS.md)
const BLOCKED = [
  { re: /\b(how to (make|build|create).*(bomb|weapon|explosive)|bomb making|make a bomb)\b/i, alt: "the chemistry of everyday reactions" },
  { re: /\b(hack(ing)? (into|someone|password)|steal passwords|malware|ransomware)\b/i, alt: "how cybersecurity defenders protect systems" },
  { re: /\b(self[- ]?harm|suicide methods|how to hurt)\b/i, alt: "how the brain handles stress and where to find support" },
  { re: /\b(illegal drugs.*(make|cook|synthesi)|cook meth)\b/i, alt: "how medicines are tested for safety" },
];
export function checkTopic(text) {
  if (!text || !String(text).trim()) return { allowed: false, reason: "Please enter a topic.", code: "EMPTY_INPUT" };
  const t = String(text).trim();
  if (t.length > 120) return { allowed: false, reason: "Topic is too long — try a shorter phrase.", safeAlternative: t.slice(0, 60) };
  for (const b of BLOCKED) if (b.re.test(t)) return { allowed: false, reason: "That request isn't safe to teach as asked.", safeAlternative: b.alt };
  return { allowed: true };
}
export function checkContent(text) { return checkTopic(text); }
