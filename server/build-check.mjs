import { existsSync } from "node:fs";
const required = ["public/index.html","public/app.js","public/styles.css","public/aegis.html","public/aegis.js","public/world.js","server/server.mjs","server/ai-adapter.mjs","src/student-state.js","src/diagnosis.js","src/planning.js","src/teaching.js","src/assessment.js","src/tool-selector.js","src/safety-filter.js","src/scene-spec.js","src/world-objects.js","src/world-renderer.js","src/scene-director.js","src/professor.js","src/simulations.js","src/asset-manager.js","src/world-state.js","docs/DYNAMIC_WORLD_BUILD.md"];
const missing = required.filter((f) => !existsSync(f));
if (missing.length) { console.error("BUILD FAILED missing:", missing.join(", ")); process.exit(1); }
console.log(`BUILD OK — ${required.length} required files present (zero-dependency static build, no bundler needed)`);
