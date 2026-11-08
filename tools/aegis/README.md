# AEGIS V2 gate tools

Standalone Node (ESM, no dependencies). Schema: `schemas/blueprint.schema.json`
(mirrored by `tools/aegis/lib.mjs`; semantic rules — unknown/circular
dependencies, contract version pins, operations ⊆ contract — live in the
validator, not the JSON Schema).

```bash
node tools/aegis/validate.mjs blueprints/professor-d.blueprint.json   # exit 0 valid / 1 invalid, JSON report
node tools/aegis/validate.mjs fixtures/invalid-missing-dep.json       # exit 1, structured {path,rule,message}
node tools/aegis/registry.mjs list                                    # registry starts empty
node tools/aegis/gates.mjs run --blueprint blueprints/professor-d.blueprint.json  # writes registry/gate-report.json + gate event
node tools/aegis/gates.mjs accept --staged registry/staged/<id>.json  # staging -> acceptance gate
```

Unrun gates report `not-run`, never `passed`. No performance results are
produced and no formal proof is claimed. Negative fixtures live in
`fixtures/invalid-*.json` (plus `tests/fixtures/blueprint.invalid.json`).
