#!/usr/bin/env node
// AEGIS V2 blueprint validator CLI.
// Usage: node tools/aegis/validate.mjs <blueprint.json>
// Prints a JSON report {file, valid, errors:[{path,rule,message}]} to stdout.
// Exit 0 when valid, 1 when invalid/unreadable. Deterministic, no dependencies.
import { readFileSync } from 'node:fs';
import { validateBlueprint } from './lib.mjs';

const file = process.argv[2];
if (!file) {
  console.log(JSON.stringify({ file: null, valid: false, errors: [{ path: '$', rule: 'usage', message: 'Usage: node tools/aegis/validate.mjs <blueprint.json>' }] }, null, 2));
  process.exit(1);
}

let raw;
try {
  raw = readFileSync(file, 'utf8');
} catch (e) {
  console.log(JSON.stringify({ file, valid: false, errors: [{ path: '$', rule: 'unreadable', message: `Cannot read file: ${e.message}` }] }, null, 2));
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(raw);
} catch (e) {
  console.log(JSON.stringify({ file, valid: false, errors: [{ path: '$', rule: 'schema', message: `Invalid JSON: ${e.message}` }] }, null, 2));
  process.exit(1);
}

const report = validateBlueprint(parsed);
console.log(JSON.stringify({ file, valid: report.valid, errors: report.errors }, null, 2));
process.exit(report.valid ? 0 : 1);
