#!/usr/bin/env node
// AEGIS V2 component registry CLI (backed by registry/components.json).
// Usage:
//   node tools/aegis/registry.mjs list [--registry registry/components.json]
//   node tools/aegis/registry.mjs resolve <id@version> [--contract-hash <sha256>] [--registry ...]
// Exit 0 on success, 1 on failure. A verified id@version + contract hash resolves
// with reused:true; a version or contract mismatch fails (never silently upgrades).
import { readFileSync, existsSync } from 'node:fs';

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const registryPath = arg('--registry', 'registry/components.json');

function loadRegistry() {
  if (!existsSync(registryPath)) return { version: '1.0.0', components: [] };
  return JSON.parse(readFileSync(registryPath, 'utf8'));
}

const cmd = process.argv[2];
const registry = loadRegistry();
const components = Array.isArray(registry.components) ? registry.components : [];

if (cmd === 'list') {
  console.log(JSON.stringify({
    registry: registryPath,
    count: components.length,
    components: components.map((c) => `${c.id}@${c.version} [${c.status}]`),
  }, null, 2));
  process.exit(0);
}

if (cmd === 'resolve') {
  const spec = process.argv[3] ?? '';
  const at = spec.lastIndexOf('@');
  const id = at > 0 ? spec.slice(0, at) : spec;
  const version = at > 0 ? spec.slice(at + 1) : null;
  const wantedHash = arg('--contract-hash', null);
  const entry = components.find((c) => c.id === id);
  if (!entry) {
    console.log(JSON.stringify({ id, version, resolved: false, reused: false, errors: [{ path: '$', rule: 'not-found', message: `No registry entry for "${id}".` }] }, null, 2));
    process.exit(1);
  }
  const errors = [];
  if (version !== null && entry.version !== version) {
    errors.push({ path: '$', rule: 'contract-version-mismatch', message: `Registry has ${id}@${entry.version}, requested ${id}@${version}; version mismatch is a gate failure (no silent upgrade).` });
  }
  if (wantedHash && entry.contractHash !== wantedHash) {
    errors.push({ path: '$', rule: 'contract-mismatch', message: `Contract hash mismatch for ${id}@${entry.version}.` });
  }
  if (entry.status !== 'verified') {
    errors.push({ path: '$', rule: 'not-verified', message: `${id}@${entry.version} has status "${entry.status}", only "verified" components are reusable.` });
  }
  const reused = errors.length === 0;
  console.log(JSON.stringify({ id: entry.id, version: entry.version, resolved: reused, reused, status: entry.status, contractHash: entry.contractHash ?? null, errors }, null, 2));
  process.exit(reused ? 0 : 1);
}

console.log(JSON.stringify({ valid: false, errors: [{ path: '$', rule: 'usage', message: 'Usage: registry.mjs list | resolve <id@version> [--contract-hash <sha256>]' }] }, null, 2));
process.exit(1);
