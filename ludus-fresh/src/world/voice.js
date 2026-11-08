// GOLD COPY of src/world/voice.js @ sha256:4490b578d5855357 — do not edit without re-syncing provenance. See public/assets provenance + docs/PLAN.md §2.2.
// Voice helpers (pure, unit-tested): British voice choice + sentence delivery.
// Browser speech itself varies by machine; selection and chunking must not.
export function chooseBritishVoice(voices) {
  const list = Array.isArray(voices) ? voices : [];
  const gb = (v) => /en[-_]GB/i.test(v.lang || "");
  const en = (v) => /^en[-_]/i.test(v.lang || "");
  const natural = (v) => /natural|neural|premium|enhanced/i.test(v.name || "");
  const professor = (v) => /\bmale\b|daniel|george|arthur|brian|ryan/i.test(v.name || "");
  return list.find((v) => gb(v) && natural(v) && professor(v))
    || list.find((v) => gb(v) && professor(v))
    || list.find((v) => gb(v) && natural(v))
    || list.find((v) => gb(v))
    || list.find((v) => en(v) && natural(v) && professor(v))
    || list.find((v) => en(v) && natural(v))
    || list.find((v) => en(v))
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
export function classifySpeechSentence(text) {
  const s = String(text || "").trim();
  if (/\?\s*$/.test(s)) return "question";
  if (/^(well done|exactly|yes|good|nice|brilliant|that'?s right|correct)\b/i.test(s)) return "encouragement";
  if (/\b(remember|key idea|watch|careful|important|but|however|instead)\b/i.test(s)) return "emphasis";
  return "explanation";
}
export function planSpeech(text) {
  const sentences = splitSentences(text, 190);
  return sentences.map((sentence, index) => {
    const kind = classifySpeechSentence(sentence);
    const hash = [...sentence].reduce((n, c) => n + c.charCodeAt(0), 0);
    const variation = ((hash % 5) - 2) * 0.012;
    const base = {
      question: { rate: 0.94, pitch: 1.04, pauseAfterMs: 340 },
      encouragement: { rate: 1.0, pitch: 1.09, pauseAfterMs: 260 },
      emphasis: { rate: 0.9, pitch: 0.95, pauseAfterMs: 320 },
      explanation: { rate: 0.96, pitch: 0.99, pauseAfterMs: 230 },
    }[kind];
    const lengthAdjustment = sentence.length > 130 ? -0.03 : sentence.length < 45 ? 0.02 : 0;
    return {
      text: sentence,
      kind,
      rate: Math.round((base.rate + lengthAdjustment + variation) * 100) / 100,
      pitch: Math.round((base.pitch + variation) * 100) / 100,
      pauseAfterMs: index === sentences.length - 1 ? 0 : base.pauseAfterMs,
    };
  });
}
