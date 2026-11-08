# Staged components

Drop one JSON manifest per candidate component here, then accept it with:

```bash
node tools/aegis/gates.mjs accept --staged registry/staged/<id>.json
```

A manifest is accepted only when it has: `id`, `version` (semver), typed
`contract` (`inputs`/`outputs`/`errors`), `dependencies`, `sourceHash`
(sha256 hex) + `provenance.source`, executed `testEvidence` (at least one
entry with `passed:true` or `exitCode:0`), and a `limitations` array.
Accepted entries are written to `registry/components.json` with status
`verified`; every attempt is appended to `registry/gate-events.jsonl`.
This directory starts empty by design.
