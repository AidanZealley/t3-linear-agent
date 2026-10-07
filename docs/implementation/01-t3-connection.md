# Workstream 1: Standalone T3 connection

Status: task packet approved by Aidan on 7 October 2026; implementation accepted on 7 October 2026.

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

- Base commit: `b47c831c3c2ac8434758934fd860c60423025b58` on `feat/linear-agent-v1`.
- Outcome: standalone Node.js 24 client, secure local PKCE authorization,
  credential renewal, request handover, and focused tests implemented. Changes
  passed independent review, one remediation pass, and fresh closure review.
- Files: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`,
  `tsconfig.build.json`, `.gitignore`, `src/config.ts`, `src/t3/{auth,cli,client,contracts,credentials}.ts`,
  `test/t3/{auth,client,transport}.test.ts`, and this handoff.

### Concrete contracts and decisions

- `t3Config()` reads `T3_MCP_ENDPOINT`, `T3_CREDENTIAL_FILE`, `T3_RUNTIME_MODE`,
  optional `T3_CLI`, and optional `T3_BASE_DIR`. Defaults are the specified local
  endpoint, `~/.local/state/t3-linear-agent/t3.json`, and `approval-required`.
  Installation must explicitly select the intended ceiling. CLI discovery checks
  PATH, then `.t3/runtime/service-state.json` for the active version. No nightly
  path is hardcoded.
- `LocalAuthorization.issue(previous?)` discovers protected-resource and OAuth
  metadata, registers a public loopback client, obtains a five-minute local
  pairing code, approves PKCE S256 through T3's decision route, verifies callback
  state and issuer, and exchanges a form-encoded authorization code. Pairing
  material stays in memory. Renewal retains the previous scopes and ceiling.
  CLI session listing identifies the new server session for later revocation.
  `revoke(credential)` retires that exact session through the local CLI.
  Failed authorization keeps ownership of its unique client label and pairing
  ID, rediscovers any issued sessions, and attempts to revoke those sessions and
  the temporary pairing grant. `AuthorizationCleanupError` exposes only
  `clientLabel`, `pairingId`, and `sessionIds` when cleanup is incomplete.
  Its message tells the operator to list and revoke grants through the configured
  local CLI/base directory. Renewal and the pairing CLI preserve this error;
  transport and credential secrets never enter it.
- `CredentialFile.read/write` use the versioned `Credential` contract. It contains
  endpoint, bearer token, server session ID, expiry in Unix milliseconds, scopes,
  and runtime ceiling. The file must be outside this repository, its directory
  must be private, and reads reject symlinks or group/world permissions. Writes
  use a private temporary file, fsync, and atomic rename. Credential files use
  mode 0600 and their directory mode 0700. No credential enters application logs.
- `pnpm build` emits runnable ESM to `dist`. `pnpm t3 pair` performs initial
  authorization and authenticated-read verification before saving it. An existing
  credential cannot be overwritten by pairing. `pnpm t3 inspect` lists projects
  and capabilities. The running client owns renewal; there is no separate CLI
  command that can revoke its credential behind its request tracker.
- `T3Client.create(config, restoredUncertain?)` loads the credential, opens a
  fresh standard MCP transport, initializes MCP, and installs advertised tool
  output validators. `connectMcp` uses `@modelcontextprotocol/sdk`, not a custom
  JSON-RPC transport. `T3Tools` records the observed external inputs and outputs;
  public methods derive their argument/result types from that single contract.
- Read methods are `projects`, `project`, `capabilities`, `threads`, `readThread`,
  `waitRun`, `queue`, `pendingRequests`, and `pendingRequest`. Projects expose
  exact `id`, `title`, and `workspaceRoot`. Capabilities expose providers,
  `providerInstanceId`, models, and runtime ceiling. Thread reads expose binding,
  active/latest run IDs, recent runs, and paginated timeline items with durable
  `messageId`, `runId`, positions, text offsets, and status. No history is copied
  into the credential manager.
- `launch` requires an explicit project ID, managed worktree with base ref and
  branch, and model selection with instance ID and model. It strips task and
  attachment fields even for untyped callers. T3 prepares worktrees asynchronously,
  so the client checks the selected project/branch and waits for `worktreePath`
  before returning the original launch IDs. Preparation is an outstanding client
  request. A failure after accepted launch retains `acceptedThreadId` in the
  uncertain operation. Launch has no retry key and is never retried automatically.
  The installed server rejects `message:null`, despite its advertised nullable
  schema, so idle launch omits that field.
- `send(input, credentialSessionId)` requires a non-empty stable `clientRequestId`
  and the credential session identity persisted with that delivery. Obtain the
  identity from `client.credentialSessionId`, persist it with the key before
  dispatch, then pass it back. A handover between persistence and dispatch rejects
  the stale identity before sending. Results preserve `threadId`, `messageId`,
  `runId`, status, and delivery mode. Keys are scoped to the OAuth session;
  callers must never treat a new token as permission to retry uncertain delivery.
- Mutations also include `cancelQueued({threadId, queuedRunId})`,
  `interrupt({threadId, runId, clientRequestId?, reason?})`, and
  `answer({threadId, requestId, answers})`. Answers are a flat question-ID-to-string
  map. Queue cancellation and active interruption remain separate operations.
- `renew(reconcile?)` pauses dispatch, drains outstanding requests, and reconciles
  uncertain mutations through the old connection before requesting replacement
  credentials. The callback receives uncertain operation IDs, exact inputs,
  credential session IDs, optional accepted launch IDs, and read-only methods.
  It returns only operation IDs whose outcomes it has durably reconciled.
  Unresolved operations leave dispatch paused and issue no replacement.
- Replacement connects and passes an authenticated project read before atomic
  persistence and switching. Failures retain and recheck the old credential while
  valid. Successful handover closes the old transport and retires its credential.
  Retirement failures expose `status.pendingRetirementSessionIds` and an
  actionable error for retry. `status` also exposes pause reason and uncertainty.
  Raw transport/auth errors are not forwarded to logs.
- `startRenewal(reconcile, onFailure)` schedules renewal five days before expiry
  and retries failures with bounded exponential backoff up to one hour. The
  lifecycle owner calls it once and persists/reconciles delivery intent in SQLite.
  It owns recovery after process restart, including supplying restored uncertainty.
  `reconnect()` drains requests and opens a fresh transport with the same token;
  it neither launches a thread nor clears uncertainty. Opening, renewal, and
  reconnect share one tracked exclusive operation; competing operations reject.
  `close()` stops scheduling and dispatch immediately, waits for that operation
  and outstanding requests, then closes the resulting connection. In-progress
  handover may complete while close waits, but no transport opens after close
  returns. Closed clients reject open, renewal, reconnect, and scheduling, and
  expose a paused closed status.

### Verification commands and results

- `pnpm install --frozen-lockfile`: passed on Node.js `v24.19.0`, pnpm `11.20.0`.
- `pnpm test`: 16 tests passed. Native Node TypeScript stripping runs tests without
  a transpiler dependency. Focused commands are
  `node --test test/t3/auth.test.ts`,
  `node --test test/t3/client.test.ts`, and
  `node --test test/t3/transport.test.ts`.
- Tests cover draining/blocking during handover, accepted send with a lost
  response, ambiguous launch, failed replacement with valid old credential,
  expiry/revocation pause, reconnect uncertainty, credential-file permissions,
  asynchronous binding, and a persisted send crossing a credential handover.
  A controlled HTTP MCP server separately proves initialization, schema-validated
  reads/sends, stable IDs for repeated sends, and same-token reconnect.
- Remediation adds fake HTTP/CLI authorization tests for failed session discovery
  after successful token exchange, unavailable discovery, scope mismatch, and
  failed session retirement. Client tests preserve the cleanup error while the
  old valid credential remains usable, reproduce shutdown during blocked renewal,
  and prove reconnect/renewal exclusion and shutdown during reconnect.
  `pnpm test`, `pnpm typecheck`, `pnpm build`, and `git diff --check` passed after
  these corrections. No live T3, host service, or Funnel state was touched;
  the successful authorization and active-run handover sequence is unchanged.
- Simplification pass removed the temporary tsx/esbuild dependency and its
  generated workspace configuration, a separate manual renewal command, duplicate
  project result types, and redundant nullable unions. There are no provider
  adapters, additional state store, or public generic tool dispatcher.
  Remediation replaces the renewal-only flag with the actual pending lifecycle
  promise, covers retirement within its ownership, and removes duplicated
  session-list parsing with one helper that selects exact client-label matches.
  No operation queue, cancellation framework, or additional persistent store
  was added.

### Standalone live evidence

- On 7 October 2026, ran installed T3 `0.0.46-nightly.20261007.2761` as a separate
  process on `127.0.0.1:3873`, with isolated data under
  `/tmp/t3-linear-ws1-dev/state` and a disposable Git repository under
  `/tmp/t3-linear-ws1-dev/repo`. The user's server, service manager, and Tailscale
  settings were untouched. `serve` required service-launcher IPC; the isolated
  process used `start --mode web --no-browser` instead.
- The built standalone client paired with its own token, listed the isolated
  project and live provider/model catalog, and created confirmed idle managed
  worktrees. The final probe thread was
  `mcp:95dcff15-9ec4-4be7-9cef-7caba9e58a1d` in project
  `a4fe104e-00db-4072-8c3f-886aca017172`, bound to
  `/tmp/t3-linear-ws1-dev/state/worktrees/repo/probe-final-rotation`.
- Sent only `sleep 25 && pwd`, with explicit instructions against editing,
  pushing, or opening a PR. Repeating `isolated-rotation-task` under the same
  credential returned the identical message and run IDs. Run
  `run:thread:mcp%3A95dcff15-9ec4-4be7-9cef-7caba9e58a1d:ordinal:1`
  was active immediately before and after verified credential replacement.
  The replacement connection read that same thread and queued a follow-up.
- Both ordinal 1 and ordinal 2 ended `completed`. The first reported the exact
  isolated worktree directory; the second returned `ROTATION FOLLOW-UP OK`.
  A fresh same-token transport read the same thread afterwards. Repository and
  worktree Git statuses were clean. No push, commit in a T3 worktree, or PR occurred.
- Old credentials were retired during handover. After verification, all remaining
  isolated bearer sessions were revoked, the saved token returned HTTP 401, and
  no unused pairing grants remained. Isolated process PID 738257 was stopped.
  Temporary token, pairing, session-list, inspection, and server-log files were
  removed. Non-secret probe results remain outside the repo in
  `/tmp/t3-linear-ws1-dev/probe-output.jsonl` and `probe.json`.

### Known limitations and external checks

- SQLite delivery intent and lifecycle reconciliation belong to workstream 3.
  Until that owner connects the callback and restores pending intent at startup,
  ambiguous mutations remain paused. Uncertain operations and failed-retirement
  IDs are held in process memory; they are exposed for lifecycle/operator handling.
- External pending-question answer submission and recovery after an isolated
  server restart remain separate later live checks. This workstream provides
  their concrete operations but does not claim those scenarios were tested here.
- This proves an isolated standalone client, not an installed Linear service.
  No Linear app, bridge listener, host service, or Funnel configuration was created.
- Specification drift: none. Async idle-worktree preparation and nullable-schema
  mismatch are handled within the approved binding and idle-launch requirements.

## Independent review

- Reviewer: independent fresh review agent, 7 October 2026. Reviewed the complete
  uncommitted candidate against base `b47c831c3c2ac8434758934fd860c60423025b58`,
  the packet, specification, research, and surrounding implementation.
- Verdict: required fixes before acceptance.
- Required findings:
  - R1: failed authorization can leave an untracked bearer session.
    `src/t3/auth.ts:196-237` exchanges the code before checking scopes and listing
    sessions. If those later steps fail, `issue()` throws without retiring the
    issued session or exposing its identity for cleanup. `renew()` cannot clean
    it up because its candidate assignment never completes. A controlled fake
    returned a successful thirty-day token exchange and failed the session-list
    CLI command. The only CLI calls were pairing creation and session listing;
    there was no cleanup. Keep ownership of pairing/session artifacts through
    failures, attempt retirement, and expose a non-secret cleanup reference and
    actionable failure if retirement itself cannot complete. Protect this path
    with a focused authorization test using fake HTTP/CLI boundaries.
  - R2: shutdown does not wait for credential handover.
    `src/t3/client.ts:358-435,494-499` tracks tool requests but not the renewal
    operation. With `issue()` blocked, `close()` closes the old transport and
    returns. Releasing `issue()` then opens and persists the replacement, revokes
    the old credential, and leaves the new transport open with an unpaused
    status. This was reproduced with a temporary fake connection and credential
    file. Coordinate renewal, reconnect, and close so shutdown waits for or
    safely cancels handover and no transport opens after it completes. Reconnect
    also needs exclusion in both directions; it currently rejects an existing
    renewal but does not prevent renewal from starting during reconnect. Add a
    focused lifecycle test for the reproduced shutdown race.
- Verification: `pnpm test` passed all 10 tests; `pnpm typecheck`, `pnpm build`,
  and `git diff --check` passed. Controlled probes used synthetic credentials and
  temporary files outside the checkout, then removed them. No live T3, host
  service, repository worktree, or Funnel configuration was changed. The recorded
  isolated active-run proof and its non-secret artifacts were available; this
  review did not rerun that live scenario.
- Optional observations: none.
- Questions: none. External pending-question submission and isolated-server
  restart remain later live checks as recorded in the handoff and whole-feature
  plan. The default credential repository path resolves correctly in both source
  and compiled builds.

## Resolution

- R1 accepted. Token exchange can create a session before follow-up validation
  fails. Authorization now tracks the unique client label and pairing ID, retries
  session discovery, retires discovered grants, and preserves actionable non-secret
  cleanup references if CLI cleanup fails. Focused fake HTTP/CLI tests reproduce
  the reviewed failure and verify retirement and incomplete-cleanup reporting.
- R2 accepted. Shutdown must cover the complete credential handover, not only
  tool requests. Open, renewal, and reconnect now share one exclusive tracked
  lifecycle operation; close blocks dispatch, drains it, and closes the resulting
  connection. Tests cover shutdown during issuance and mutual reconnect exclusion.
- Simplification/deletion pass: replaced the renewal-only flag with the single
  lifecycle operation and reused session discovery. No lifecycle queue, generic
  cancellation framework, provider adapter, or extra state store was added.
- Final verification: all 16 focused tests, typecheck, build, and diff validation
  passed in remediation and fresh closure review. Closure also verified shutdown
  during initial opening and credential retirement. Successful authorization and
  active-run replacement retain the live-proven sequence; remediation adds
  failure cleanup and lifecycle exclusion. No required findings remain.

## Closure review

- Reviewer: fresh focused closure review agent, 7 October 2026. Reviewed the
  accepted R1/R2 findings, their resolution, affected authorization, CLI and
  client code, and the six new focused tests against the packet and product docs.
- Verdict: accepted corrections. R1 retains ownership after token exchange,
  retries session discovery, attempts session and pairing retirement, and exposes
  actionable non-secret cleanup references when cleanup fails. Renewal preserves
  that error while retaining the verified valid old credential; the CLI reports
  its safe message. R2 excludes competing open, renewal and reconnect operations
  and tracks handover through credential retirement. Close blocks dispatch,
  waits for that operation and outstanding requests, then closes its resulting
  transport. Closed status stays paused and rejects subsequent lifecycle calls.
- Remaining required findings: none.
- Verification: `pnpm test` passed all 16 tests, including the six remediation
  tests. `pnpm typecheck`, `pnpm build`, and `git diff --check` passed. Additional
  in-memory probes proved shutdown waits for a blocked initial open and for
  blocked old-credential retirement; every created connection was closed before
  shutdown returned. Initial open also rejected concurrent renewal and reconnect.
  Probes used synthetic credentials and no persisted files or live endpoints.
- The recorded isolated active-run replacement proof predates remediation.
  Successful authorization and handover retain that sequence; this closure
  verifies the added failure cleanup and lifecycle coordination with controlled
  tests. No live T3, host service, worktree, or Funnel state was touched. Pending
  external question submission and isolated-server restart remain the later
  checks already recorded in the handoff.
