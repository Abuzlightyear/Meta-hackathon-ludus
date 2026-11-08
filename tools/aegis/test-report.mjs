#!/usr/bin/env node
// Generates registry/test-report.json by EXECUTING the real test suite and
// recording its actual counts. Never hand-edit the output file; re-run this.
// Usage: npm run test:report   (exit code mirrors the test run)
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const TEST_CMD = ["--test", "tests/app.test.mjs", "tests/adapter.test.mjs", "tests/flow.test.mjs", "tests/world.test.mjs"];
const reportPath = "registry/test-report.json";
const run = spawnSync(process.execPath, TEST_CMD, { encoding: "utf8" });
const out = `${run.stdout || ""}\n${run.stderr || ""}`;
process.stdout.write(out);
function count(label) {
  const matches = [...out.matchAll(new RegExp(`(?:tests|pass|fail|skipped)\\b[^\\n]*`, "g"))];
  const line = [...out.matchAll(new RegExp(`^.*\\b${label} (\\d+)\\s*$`, "gm"))].at(-1);
  void matches;
  return line ? Number(line[1]) : null;
}
const report = {
  tool: "aegis-test-report",
  command: `node ${TEST_CMD.join(" ")}`,
  generatedAt: new Date().toISOString(),
  exitCode: run.status ?? 1,
  tests: count("tests"),
  pass: count("pass"),
  fail: count("fail"),
  skipped: count("skipped"),
  status: run.status === 0 ? "passed" : "failed",
};
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ wrote: reportPath, ...report }, null, 2));
process.exit(run.status ?? 1);
