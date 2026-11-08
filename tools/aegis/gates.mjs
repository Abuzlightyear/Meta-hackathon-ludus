#!/usr/bin/env node
// AEGIS V2 gates: blueprint gate run + staging -> acceptance gate.
// Usage:
//   node tools/aegis/gates.mjs run --blueprint blueprints/professor-d.blueprint.json
//       [--registry registry/components.json] [--events registry/gate-events.jsonl]
//       [--report registry/gate-report.json]
//   node tools/aegis/gates.mjs accept --staged registry/staged/<id>.json
//       [--registry registry/components.json] [--events registry/gate-events.jsonl]
// Truthfulness: gates that were not executed report "not-run", never "passed".
// No performance results are computed and no formal proof is claimed.
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { validateBlueprint, validateStagedComponent, contractHash } from './lib.mjs';

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const registryPath = arg('--registry', 'registry/components.json');
const eventsPath = arg('--events', 'registry/gate-events.jsonl');

function recordEvent(event) {
  mkdirSync(dirname(eventsPath), { recursive: true });
  appendFileSync(eventsPath, `${JSON.stringify({ ts: new Date().toISOString(), ...event })}\n`);
}
function loadRegistry() {
  if (!existsSync(registryPath)) return { version: '1.0.0', components: [] };
  const parsed = JSON.parse(readFileSync(registryPath, 'utf8'));
  if (!Array.isArray(parsed.components)) parsed.components = [];
  return parsed;
}
function saveRegistry(reg) {
  mkdirSync(dirname(registryPath), { recursive: true });
  writeFileSync(registryPath, `${JSON.stringify(reg, null, 2)}\n`);
}

const cmd = process.argv[2];

if (cmd === 'run') {
  const blueprintPath = arg('--blueprint', 'blueprints/professor-d.blueprint.json');
  const reportPath = arg('--report', 'registry/gate-report.json');
  let blueprint = null;
  let parseError = null;
  try {
    blueprint = JSON.parse(readFileSync(blueprintPath, 'utf8'));
  } catch (e) {
    parseError = e.message;
  }
  const validation = blueprint ? validateBlueprint(blueprint) : { valid: false, errors: [{ path: '$', rule: 'schema', message: `Cannot parse blueprint: ${parseError}` }] };
  const gates = [
    { id: 'G0', name: 'schema', status: validation.valid ? 'passed' : 'failed', errors: validation.errors },
    { id: 'G1', name: 'contract', status: validation.valid ? 'passed' : 'failed', note: 'operations subset of typed contract + dependency contract versions, checked by the validator' },
    { id: 'G2', name: 'unit', status: 'not-run' },
    { id: 'G3', name: 'negative', status: 'not-run', note: 'negative fixtures are exercised via validate.mjs, see fixtures/invalid-*.json' },
    { id: 'G4', name: 'integration', status: 'not-run' },
    { id: 'G5', name: 'e2e', status: 'not-run' },
    { id: 'G6', name: 'typecheck+lint+build', status: 'not-run' },
  ];
  const report = {
    tool: 'aegis-gates', blueprint: blueprintPath, valid: validation.valid,
    componentCount: Array.isArray(blueprint?.components) ? blueprint.components.length : 0,
    gates, errors: validation.errors,
  };
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  recordEvent({ type: 'gate-run', blueprint: blueprintPath, valid: validation.valid, report: reportPath, gates: Object.fromEntries(gates.map((g) => [g.id, g.status])) });
  console.log(JSON.stringify(report, null, 2));
  process.exit(validation.valid ? 0 : 1);
}

if (cmd === 'accept') {
  const stagedPath = arg('--staged', null);
  if (!stagedPath) {
    console.log(JSON.stringify({ accepted: false, errors: [{ path: '$', rule: 'usage', message: 'Usage: gates.mjs accept --staged <staged-component.json>' }] }, null, 2));
    process.exit(1);
  }
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(stagedPath, 'utf8'));
  } catch (e) {
    console.log(JSON.stringify({ accepted: false, errors: [{ path: '$', rule: 'unreadable', message: `Cannot read staged manifest: ${e.message}` }] }, null, 2));
    process.exit(1);
  }
  const check = validateStagedComponent(manifest);
  if (!check.valid) {
    recordEvent({ type: 'acceptance', staged: stagedPath, id: manifest?.id ?? null, accepted: false, errors: check.errors });
    console.log(JSON.stringify({ accepted: false, staged: stagedPath, errors: check.errors }, null, 2));
    process.exit(1);
  }
  const registry = loadRegistry();
  const hash = contractHash(manifest.contract);
  const existing = registry.components.find((c) => c.id === manifest.id);
  if (existing && existing.version !== manifest.version) {
    const errors = [{ path: '$.version', rule: 'contract-version-mismatch', message: `Registry already has ${manifest.id}@${existing.version}; accepting ${manifest.version} would be a silent upgrade, refused.` }];
    recordEvent({ type: 'acceptance', staged: stagedPath, id: manifest.id, accepted: false, errors });
    console.log(JSON.stringify({ accepted: false, staged: stagedPath, errors }, null, 2));
    process.exit(1);
  }
  const entry = {
    id: manifest.id, version: manifest.version, contract: manifest.contract, contractHash: hash,
    dependencies: manifest.dependencies, sourceHash: manifest.sourceHash, provenance: manifest.provenance,
    testEvidence: manifest.testEvidence, limitations: manifest.limitations, status: 'verified',
  };
  if (existing) registry.components[registry.components.indexOf(existing)] = entry;
  else registry.components.push(entry);
  saveRegistry(registry);
  recordEvent({ type: 'acceptance', staged: stagedPath, id: manifest.id, version: manifest.version, accepted: true, contractHash: hash });
  console.log(JSON.stringify({ accepted: true, id: entry.id, version: entry.version, contractHash: hash, status: entry.status, registry: registryPath }, null, 2));
  process.exit(0);
}

console.log(JSON.stringify({ valid: false, errors: [{ path: '$', rule: 'usage', message: 'Usage: gates.mjs run --blueprint <file> | accept --staged <file>' }] }, null, 2));
process.exit(1);
