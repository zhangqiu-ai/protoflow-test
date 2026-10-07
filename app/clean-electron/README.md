# Clean Electron module

The module configuration is `app/clean-electron/protoflow.config.json`, interpreted relative to the repository root. It binds the clean prototype branch at SHA `719997246c6939fe70da308ea08b0170f3060aac`, maps `#screen` to the React renderer, and verifies six login scenes. The legacy root configuration and npm scripts remain available.

Use an installed shared ProtoFlow acceptance SDK with `src/index.js`, its dependencies, and Playwright Chromium prepared. Node must satisfy the locked Electron/Vite dependencies. From the repository root:

```sh
export PROTOFLOW_ENGINE_ENTRY=/absolute/path/to/shared/protoflow/src/index.js
npm install
npm --prefix app/clean-electron ci
npm run test:electron
npm run verify:electron
```

`npm test` inside this module also builds the legacy application and React renderer, then launches a real supervised Electron instance for the existing 24 legacy tests, two native seed tests, eight adapter regressions, and 11 fresh login tests. The seven conversation tests skip for v1. `test:playwright` is the internal command and requires the adapter-provided CDP environment.

`verify:electron` copies the application into a fresh temporary project, loads the original manifest and frozen prototype from `verification-input`, checks their source binding and hashes through the SDK, creates context with verbatim original planning inputs, and runs build, functional and visual verification. It prints the new evidence path and preserves that temporary project for inspection. The original recorded ADR applies only to its bound manifest; this command records no new human approval. It keeps the repository's existing ProtoFlow control state intact.

Both public commands accept `-- --engine /absolute/path/to/shared/protoflow/src/index.js` instead of the environment variable. The shared SDK's generic `runAcceptanceAdapter` may be exported by its entry or its adjacent `src/acceptance.js`; engine code is not vendored here.

Native teardown keeps a bounded 15-second budget and requires exit code 0, no termination signal and no surviving owned process group. On macOS the adapter disables AppKit PersistentUI only in this fresh test instance using volatile argument-domain preferences, and records their actual runtime values. It never changes persistent user defaults. A timeout remains FAIL and triggers cleanup; closing the Playwright connection alone never establishes PASS.
