// AEGIS V2 shared validation + registry helpers (no external dependencies).
// Mirrors schemas/blueprint.schema.json and the rules in specs/AEGIS_V2.md.
import { createHash } from 'node:crypto';

export const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
export const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const OP_RE = /^[A-Za-z][A-Za-z0-9]*$/;
export const SHA256_RE = /^[0-9a-f]{64}$/i;

// Operations that are never approved, even if a contract lists them.
export const BLOCKED_OPERATIONS = new Set([
  'exec', 'eval', 'execute', 'executeCode', 'runCode', 'runArbitraryCode',
  'executeArbitraryCode', 'shell', 'spawn', 'system',
]);

export function isSemver(v) {
  return typeof v === 'string' && SEMVER_RE.test(v);
}

export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

export function contractHash(contract) {
  return createHash('sha256').update(stableStringify(contract)).digest('hex');
}

export function sourceHash(text) {
  return createHash('sha256').update(text).digest('hex');
}

// Dependency entry -> { id, version|null }. Entries are "id", "id@semver" or {id, version}.
export function parseDependency(dep) {
  if (typeof dep === 'string') {
    const at = dep.lastIndexOf('@');
    if (at > 0) return { id: dep.slice(0, at), version: dep.slice(at + 1) };
    return { id: dep, version: null };
  }
  if (dep && typeof dep === 'object' && typeof dep.id === 'string') {
    return { id: dep.id, version: typeof dep.version === 'string' ? dep.version : null };
  }
  return null;
}

// Operation names declared by a typed contract, e.g. "checkTopic(text:string)" -> "checkTopic".
export function contractOperations(contract) {
  if (!contract || !Array.isArray(contract.inputs)) return [];
  const ops = [];
  for (const input of contract.inputs) {
    if (typeof input !== 'string') continue;
    const m = input.match(/^([A-Za-z][A-Za-z0-9]*)\s*\(/);
    if (m) ops.push(m[1]);
    else if (OP_RE.test(input.trim())) ops.push(input.trim());
  }
  return ops;
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Validate a parsed blueprint object.
 * @returns {{valid: boolean, errors: Array<{path: string, rule: string, message: string}>}}
 * Rules: schema (shape/types/required), invalid-semver, duplicate-id,
 * unknown-dependency (missing deps), circular-dependency,
 * contract-version-mismatch (incompatible contracts), unapproved-operation,
 * missing-tests (missing/empty tests), missing-operations.
 * Deterministic: errors are produced in a fixed traversal order.
 */
export function validateBlueprint(bp) {
  const errors = [];
  const err = (path, rule, message) => errors.push({ path, rule, message });

  if (!isPlainObject(bp)) {
    err('$', 'schema', 'Blueprint must be a JSON object.');
    return { valid: false, errors };
  }

  // Top level (schemas/blueprint.schema.json).
  if (typeof bp.id !== 'string' || !ID_RE.test(bp.id)) {
    err('$.id', 'schema', 'Top-level "id" is required and must be a kebab-case string.');
  }
  if (typeof bp.version !== 'string') {
    err('$.version', 'schema', 'Top-level "version" is required and must be a semver string.');
  } else if (!isSemver(bp.version)) {
    err('$.version', 'invalid-semver', `Top-level version "${bp.version}" is not valid semver.`);
  }
  if (!isPlainObject(bp.metadata)) {
    err('$.metadata', 'schema', 'Top-level "metadata" object is required.');
  } else {
    for (const key of ['name', 'description', 'aegisVersion', 'target', 'createdFor']) {
      if (typeof bp.metadata[key] !== 'string' || bp.metadata[key].length === 0) {
        err(`$.metadata.${key}`, 'schema', `metadata.${key} is required and must be a non-empty string.`);
      }
    }
    if (typeof bp.metadata.aegisVersion === 'string' && !isSemver(bp.metadata.aegisVersion)) {
      err('$.metadata.aegisVersion', 'invalid-semver', `metadata.aegisVersion "${bp.metadata.aegisVersion}" is not valid semver.`);
    }
  }
  if (!Array.isArray(bp.components)) {
    err('$.components', 'schema', 'Top-level "components" is required and must be an array.');
    return { valid: false, errors };
  }
  if (bp.components.length === 0) {
    err('$.components', 'schema', '"components" must contain at least one component.');
  }

  // Per-component shape.
  const byId = new Map();
  bp.components.forEach((c, i) => {
    const base = `$.components[${i}]`;
    if (!isPlainObject(c)) {
      err(base, 'schema', 'Component must be an object.');
      return;
    }
    if (typeof c.id !== 'string' || !ID_RE.test(c.id)) {
      err(`${base}.id`, 'schema', 'Component "id" is required and must be kebab-case.');
    } else if (byId.has(c.id)) {
      err(`${base}.id`, 'duplicate-id', `Duplicate component id "${c.id}" (first at ${byId.get(c.id)}).`);
    } else {
      byId.set(c.id, base);
    }
    if (typeof c.version !== 'string') {
      err(`${base}.version`, 'schema', 'Component "version" is required and must be a semver string.');
    } else if (!isSemver(c.version)) {
      err(`${base}.version`, 'invalid-semver', `Component version "${c.version}" is not valid semver.`);
    }
    if (!isPlainObject(c.contract)) {
      err(`${base}.contract`, 'schema', 'Component "contract" object with inputs/outputs/errors is required.');
    } else {
      for (const key of ['inputs', 'outputs']) {
        if (!Array.isArray(c.contract[key]) || c.contract[key].length === 0 ||
            !c.contract[key].every((v) => typeof v === 'string' && v.length > 0)) {
          err(`${base}.contract.${key}`, 'schema', `contract.${key} must be a non-empty array of strings (typed contract).`);
        }
      }
      if (!Array.isArray(c.contract.errors) ||
          !c.contract.errors.every((v) => typeof v === 'string')) {
        err(`${base}.contract.errors`, 'schema', 'contract.errors must be an array of error-code strings.');
      }
    }
    if (!Array.isArray(c.dependencies)) {
      err(`${base}.dependencies`, 'schema', 'Component "dependencies" is required and must be an array.');
    } else {
      c.dependencies.forEach((d, j) => {
        if (parseDependency(d) === null) {
          err(`${base}.dependencies[${j}]`, 'schema', 'Dependency must be an "id", "id@semver" string or {id, version} object.');
        }
      });
    }
    if (!Array.isArray(c.tests) || c.tests.length === 0 ||
        !c.tests.every((t) => typeof t === 'string' && t.length > 0)) {
      err(`${base}.tests`, 'missing-tests', 'Component "tests" is required and must be a non-empty array of test ids/paths (missing tests).');
    }
    if (!Array.isArray(c.operations) || c.operations.length === 0) {
      err(`${base}.operations`, 'missing-operations', 'Component "operations" is required and must be a non-empty array.');
    } else {
      c.operations.forEach((op, j) => {
        if (typeof op !== 'string' || !OP_RE.test(op)) {
          err(`${base}.operations[${j}]`, 'schema', `Operation "${String(op)}" must be a valid operation name.`);
        }
      });
    }
  });

  // Dependency existence + contract version compatibility.
  const versionById = new Map();
  for (const c of bp.components) {
    if (isPlainObject(c) && typeof c.id === 'string' && !versionById.has(c.id)) {
      versionById.set(c.id, c.version);
    }
  }
  bp.components.forEach((c, i) => {
    if (!isPlainObject(c) || !Array.isArray(c.dependencies)) return;
    c.dependencies.forEach((d, j) => {
      const dep = parseDependency(d);
      if (!dep) return;
      const path = `$.components[${i}].dependencies[${j}]`;
      if (!versionById.has(dep.id)) {
        err(path, 'unknown-dependency', `Dependency "${dep.id}" does not match any component id (missing dependency).`);
      } else if (dep.version !== null) {
        if (!isSemver(dep.version)) {
          err(path, 'contract-version-mismatch', `Dependency "${dep.id}@${dep.version}" has an invalid version pin.`);
        } else if (dep.version !== versionById.get(dep.id)) {
          err(path, 'contract-version-mismatch',
            `Incompatible contract: dependency requires ${dep.id}@${dep.version} but blueprint provides ${dep.id}@${versionById.get(dep.id)} (version mismatch).`);
        }
      }
    });
  });

  // Operations must be approved by the component's typed contract.
  bp.components.forEach((c, i) => {
    if (!isPlainObject(c) || !Array.isArray(c.operations) || !isPlainObject(c.contract)) return;
    const allowed = new Set(contractOperations(c.contract));
    c.operations.forEach((op, j) => {
      const path = `$.components[${i}].operations[${j}]`;
      if (typeof op !== 'string') return;
      if (BLOCKED_OPERATIONS.has(op)) {
        err(path, 'unapproved-operation', `Operation "${op}" is never approved (blocked operation).`);
      } else if (allowed.size > 0 && !allowed.has(op)) {
        err(path, 'unapproved-operation',
          `Operation "${op}" is not declared in the typed contract of "${c.id}" (allowed: ${[...allowed].join(', ') || 'none'}).`);
      }
    });
  });

  // Acyclicity (iterative DFS, deterministic component order).
  const graph = new Map();
  for (const c of bp.components) {
    if (!isPlainObject(c) || typeof c.id !== 'string' || graph.has(c.id)) continue;
    const deps = Array.isArray(c.dependencies)
      ? c.dependencies.map(parseDependency).filter(Boolean).map((d) => d.id).filter((id) => versionById.has(id))
      : [];
    graph.set(c.id, deps);
  }
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map([...graph.keys()].map((k) => [k, WHITE]));
  const stack = [];
  const visit = (id) => {
    color.set(id, GRAY);
    stack.push(id);
    for (const dep of graph.get(id) ?? []) {
      if (color.get(dep) === GRAY) {
        const cycle = [...stack.slice(stack.indexOf(dep)), dep].join(' -> ');
        err(`$.components[id=${id}].dependencies`, 'circular-dependency', `Circular dependency detected: ${cycle}.`);
      } else if (color.get(dep) === WHITE) {
        visit(dep);
      }
    }
    stack.pop();
    color.set(id, BLACK);
  };
  for (const id of graph.keys()) if (color.get(id) === WHITE) visit(id);

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a staged component manifest for registry acceptance.
 * Required: id, version, typed contract, dependencies, sourceHash + provenance,
 * executed test evidence, limitations. See registry/staged/README.md.
 */
export function validateStagedComponent(m) {
  const errors = [];
  const err = (path, rule, message) => errors.push({ path, rule, message });
  if (!isPlainObject(m)) {
    err('$', 'schema', 'Staged component manifest must be a JSON object.');
    return { valid: false, errors };
  }
  if (typeof m.id !== 'string' || !ID_RE.test(m.id)) err('$.id', 'schema', 'Staged component "id" is required (kebab-case).');
  if (typeof m.version !== 'string' || !isSemver(m.version)) err('$.version', 'invalid-semver', 'Staged component "version" must be valid semver.');
  if (!isPlainObject(m.contract) || !Array.isArray(m.contract.inputs) || m.contract.inputs.length === 0 ||
      !Array.isArray(m.contract.outputs) || m.contract.outputs.length === 0 || !Array.isArray(m.contract.errors)) {
    err('$.contract', 'schema', 'Typed "contract" with non-empty inputs/outputs and errors is required.');
  }
  if (!Array.isArray(m.dependencies) || !m.dependencies.every((d) => parseDependency(d) !== null)) {
    err('$.dependencies', 'schema', '"dependencies" must be an array of component ids (possibly empty).');
  }
  if (typeof m.sourceHash !== 'string' || !SHA256_RE.test(m.sourceHash)) {
    err('$.sourceHash', 'missing-provenance', '"sourceHash" (sha256 hex of the source) is required for acceptance.');
  }
  if (!isPlainObject(m.provenance) || typeof m.provenance.source !== 'string' || m.provenance.source.length === 0) {
    err('$.provenance', 'missing-provenance', '"provenance" with a non-empty "source" is required for acceptance.');
  }
  if (!Array.isArray(m.testEvidence) || m.testEvidence.length === 0) {
    err('$.testEvidence', 'missing-test-evidence', 'Executed "testEvidence" (at least one run) is required for acceptance.');
  } else {
    m.testEvidence.forEach((t, i) => {
      if (!isPlainObject(t) || typeof t.test !== 'string' || t.test.length === 0) {
        err(`$.testEvidence[${i}].test`, 'missing-test-evidence', 'Each testEvidence entry needs a "test" id/path.');
      } else if (t.passed !== true && t.exitCode !== 0) {
        err(`$.testEvidence[${i}]`, 'test-evidence-failed', `Test evidence "${t.test}" does not show a pass (need passed:true or exitCode:0).`);
      }
    });
  }
  if (!Array.isArray(m.limitations)) {
    err('$.limitations', 'schema', '"limitations" array is required for acceptance (use [] only when none are known).');
  }
  return { valid: errors.length === 0, errors };
}
