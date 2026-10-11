# Dual-platform acceptance specification (Web + Electron)

Reviewed operator specification for the `protoflow-dual-20261011` prototype stream. It applies to every version of the stream on both targets.

- The prototype is the design input. Each prototype page is one screen (`<body data-pf="<screen>">`); every `data-pf` anchor must exist in the application with the identical ID as `data-testid` on the implementing element, with the same text, order, visibility and styling. States in `<page>.pf.json` sidecars must be reachable with the listed steps.
- Web target (`app/`): one HTML page per screen; `scripts/build.mjs` publishes every file under `app/` (except `app/tests/`) to `.protoflow/site/<page>.html`. Regression tests live in `app/tests/`.
- Electron target (`desktop/`): the real desktop application starts from `desktop/main.cjs`; each screen is a page `desktop/renderer/<page>.html` loaded in its window. Regression tests live in `desktop/tests/` and drive the real Electron app through Playwright.
- Everything stays local: no network requests, accounts, cookies, browser storage or persistent session on either platform. Screens are static HTML/CSS with inline behaviour only where the prototype has it.
- Each target changes only its own root. Shared files (`scripts/`, `package.json`, configuration, specifications, `AGENTS.md`, `ACCEPTANCE.md`) and the frozen prototypes are operator-owned and must not be changed.
