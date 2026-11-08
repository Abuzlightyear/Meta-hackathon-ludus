// world cut-out: dependency-free background removal for Doctore poses.
// Poses share a warm-stone backdrop; we sample it from the corners and fade
// near-background pixels to transparent. Anything far from the backdrop
// (face, vest, tie, boots) is preserved exactly. Honest fallback: on any
// failure the caller keeps the original framed image.
export function sampleBackground(data, width, height, patch = 8) {
  const sums = [0, 0, 0]; let n = 0;
  const sample = (x, y) => { const i = (y * width + x) * 4; sums[0] += data[i]; sums[1] += data[i + 1]; sums[2] += data[i + 2]; n++; };
  const p = Math.max(1, Math.min(patch, Math.floor(Math.min(width, height) / 2) || 1));
  for (let y = 0; y < p; y++) for (let x = 0; x < p; x++) { sample(x, y); sample(width - 1 - x, y); sample(x, height - 1 - y); sample(width - 1 - x, height - 1 - y); }
  return { r: Math.round(sums[0] / n), g: Math.round(sums[1] / n), b: Math.round(sums[2] / n) };
}
export function colorDistance(r, g, b, bg) {
  const dr = r - bg.r, dg = g - bg.g, db = b - bg.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}
export function alphaForDistance(dist, tolerance = 52, feather = 36) {
  if (dist <= tolerance) return 0;
  if (dist >= tolerance + feather) return 255;
  return Math.round(((dist - tolerance) / feather) * 255);
}
export function applyCutout(data, bg, { tolerance = 52, feather = 36 } = {}) {
  let transparent = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = alphaForDistance(colorDistance(data[i], data[i + 1], data[i + 2], bg), tolerance, feather);
    data[i + 3] = Math.min(data[i + 3], a);
    if (a === 0) transparent++;
  }
  return { transparent, total: data.length / 4, ratio: data.length ? transparent / (data.length / 4) : 0 };
}
