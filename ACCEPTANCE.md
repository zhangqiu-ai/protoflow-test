# Mock login acceptance specification

Only a browser-local demonstration is allowed. There is no authentication server, account lookup, credential transmission, persistent session, registration or password recovery. The displayed demo@protoflow.test / FlowDemo!42 values are fictional public test fixtures.

Email and password fields, explicit empty/invalid email/empty/short password errors, wrong demo credentials, success screen, repeated submissions, keyboard submit, logout, second sign-in and reload resetting the session must work. Password input is cleared on success and logout. No cookies or browser storage may be written and no HTTP request may occur.

Implement the exact frozen prototype in app/index.html and app/styles.css. The existing build copies those two files, so keep behavior inline. Update the application-owned tests/ suite for this version. Preserve scripts/, config, this specification and frozen resources. The protected login-verification.spec.js suite provides independent criteria and must remain unchanged.

The prototype is the design input; application files must only be changed by configured real Codex after GitHub fetch/checkpoint. A password-related prototype is conservatively L3 under the existing classifier. Architecture approval must bind the published manifest hash; this specification does not approve architecture.
