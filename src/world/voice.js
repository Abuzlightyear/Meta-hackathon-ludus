// Voice helpers (pure, unit-tested): British voice choice + sentence delivery.
// Browser speech itself varies by machine; selection and chunking must not.
export function chooseBritishVoice(voices) {
  const list = Array.isArray(voices) ? voices : [];
  return list.find((v) => /en[-_]GB/i.test(v.lang || "") && /\bmale\b|daniel|george|arthur|brian/i.test(v.name || ""))
    || list.find((v) => /en[-_]GB/i.test(v.lang || ""))
    || list.find((v) => /^en[-_]/i.test(v.lang || ""))
    || null;
}
export function splitSentences(text, maxLen = 300) {
  const parts = String(text || "").split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const p of parts) {
    if (p.length <= maxLen) { out.push(p); continue; }
    let rest = p;
    while (rest.length > maxLen) {
      let cut = rest.lastIndexOf(", ", maxLen);
      if (cut < 80) cut = rest.lastIndexOf(" ", maxLen);
      if (cut < 80) cut = maxLen;
      out.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) out.push(rest);
  }
  return out;
}
