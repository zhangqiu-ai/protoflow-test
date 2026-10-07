# Local conversation acceptance specification

Add a standalone browser-local demonstration page at app/chat.html with app/chat.css and a navigation entry in app/index.html. Preserve the complete previously approved mock sign-in, validation, success and logout behavior and styling. Implement the exact frozen GitHub prototype assets; use the checkpoint directory from context, never the author worktree.

The conversation starts with one welcome message, accepts a nonempty message, renders text safely, appends the fixed demo reply, clears the input, rejects whitespace-only messages, tolerates repeated submissions, clears/restarts and starts fresh on reload. It uses no network, real AI service, cookies or browser storage. Both page navigation directions must work. Do not add authentication, accounts, dependencies or external services.

ACCEPTANCE.md remains the archived login criteria and still applies to that page. This additional specification extends the implementation to a separate conversation page. The new build-chat.mjs calls the unchanged login build then adds the two conversation assets.

The independent login and conversation suites under scripts/ and all verification configuration are protected. Maintain useful application-owned tests/ regressions. Codex only edits app/ and tests/. Preserve scripts/, ACCEPTANCE.md, AGENTS.md, protoflow.config.json, frozen prototype resources and prior architecture evidence.

The ordinary classification rules remain unchanged with no overrides. The previous human approval is exclusively bound to the login manifest and does not approve this new version. If the actual new manifest requires an additional approval, honor the policy rather than bypassing it.
