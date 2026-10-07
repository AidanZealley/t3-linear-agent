# Workstream 1: Standalone T3 connection

Status: approved task packet; not started.

## Task packet

### Outcome

A small TypeScript client can authenticate to external T3 MCP, create an idle
worktree-bound thread, send work idempotently, and reconnect to durable state.
It renews credentials locally without interrupting accepted coding runs.

Read the specification, research, and workflow README. Establish package tooling
and record real commands and exports for subsequent owners.

### Scope

Use Node.js 24 and pnpm. Add package scripts for `test`, `typecheck`, and `build`
with meaningful focused tests and a usable TypeScript build. Use a standard MCP
client rather than reproducing the probe's hand-written transport.

Implement local pairing/PKCE authorization, secure credential persistence,
metadata-based initialization, and renewal from the spec. The pairing CLI path
must be discovered/configured rather than tied to the researched nightly path.
Keep the original scopes and runtime ceiling during renewal. Verify replacement
before switching; retain the valid old credential on failure. All credentials
and temporary pairing material stay outside the repository.

Support only T3 operations needed by the spec: project/catalog reads, idle thread
launch with explicit project/worktree/model, stable-key send, thread/run reads,
queue cancellation, active-run interruption, and pending question operations.
Use actual tool schemas and inferred types; do not build a generic tool facade.
Record concrete inputs/outputs for the lifecycle owner.

Expose a small coordination point for the lifecycle owner to reconcile uncertain
mutations during renewal. Track outstanding client requests; block dispatch and
retries during handover. A timed-out mutation remains uncertain after the HTTP
request ends. Until lifecycle reconciliation is connected, uncertainty keeps the
client paused with an actionable error. Reconnection uses a fresh MCP transport
with the same credential; it does not create a new coding thread.

### Non-goals

Linear, HTTP hosting, session scheduling, a second agent loop, direct T3 database
access, speculative provider adapters, or automatic retry of uncertain launches.
Do not restart the user's T3 server or widen its permissions.

### Initial ownership

`package.json`, `pnpm-lock.yaml`, `tsconfig.json`, necessary minimal tooling,
`src/t3/**`, `src/config.ts`, `test/t3/**`, and the local credential-file format.
Own this record, workstream 1's plan row, and source-document synchronization.

### Required seams

Deliver the T3 client and credential/request lifecycle from the plan. Record how
callers supply stable send keys and reconcile uncertain operations, and how
renewal waits on that result. Preserve returned IDs. Later streams own delivery
intent in SQLite, not a duplicate credential manager.

### Acceptance criteria

- A standalone built TypeScript process connects with its own credential and
  lists projects and provider/model capabilities.
- Idle launch returns a bound thread before sending; same-credential repeated
  sends return the same message/run without duplicate work.
- A replacement credential is verified before use; renewal failures retain the
  old credential while valid. Expiry/revocation produces a paused, actionable state.
- Handover blocks new requests/retries, waits for outstanding requests, and stays
  paused for unresolved mutation outcomes. It never waits for coding to finish.
- A harmless active run survives replacement, and the new connection reads the
  same thread and can send a follow-up. Verify this in an isolated development
  instance using a disposable repository and no push or PR.
- Secrets are excluded from logs, test fixtures, Git, and records; local files
  have restrictive permissions. Retire test credentials after verification.

### Targeted verification

`git diff --check` exists now. Create and run `pnpm test`, `pnpm typecheck`, and
`pnpm build`, then record exact focused test invocations for later leads.
Tests should protect idempotent sends and renewal handover, including an accepted
send with a lost response. Deterministic boundary tests may use a fake MCP server;
record a separate live standalone-client probe and active-run rotation result.
Use controlled development T3 state so tests do not alter the user's server.

## Implementation handoff

- Base commit: pending.
- Outcome and files changed: pending.
- Concrete contracts and decisions: pending.
- Verification commands and results: pending.
- Known limitations or external checks: pending.
- Specification drift: none recorded.

## Independent review

- Reviewer: pending fresh subagent.
- Verdict: pending.
- Required findings: pending.
- Optional observations: pending.
- Questions: pending.

## Resolution

- Finding dispositions and reasons: pending.
- Simplification/deletion pass: pending.
- Final verification: pending.

## Closure review

- Verdict: pending.
- Remaining required findings: pending.
