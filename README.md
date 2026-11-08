# Meta-hackathon-ludus

## Current application: LUDUS FRESH

The latest existing Professor D application is in [ludus-fresh/](ludus-fresh/).
Start there for the interface, interactive educational environments, AI adapter,
subject kernels, character artwork, and tests.

Run from a clone of this whole repository with Node.js 20 or newer:

```sh
cd ludus-fresh
PORT=4174 npm start
```

Open http://localhost:4174. The Node application has no npm runtime dependencies.
Live AI requires a server-side Meta API credential; without one, it uses its
labelled offline demo. Optional server speech uses edge-tts or espeak-ng, with
browser speech fallback. Local credentials and Python environments are not included.

Keep the repository structure intact: FRESH imports shared computation from the
root src/ directory and uses tools/aegis/ for validation. The original root app
and supporting assets are preserved alongside FRESH; they are not the current
entry point. Use the FRESH start command above.

Verification on November 8, 2026: FRESH 71 tests passed, 0 failed, 0 skipped;
79 JavaScript files passed syntax checks; the FRESH blueprint validated; the
root structural build check found all 24 required files. This was source
publication, not a hosting deployment or competition submission update.
See [publication verification](ludus-fresh/docs/PUBLICATION_CHECK.md) for limits.
