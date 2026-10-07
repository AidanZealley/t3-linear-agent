# First-version implementation plan

Status: approved by Aidan on 7 October 2026; workstream 1 is accepted.

## Orchestration record

- Integration branch: `feat/linear-agent-v1`.
- Starting commit: `b47c831c3c2ac8434758934fd860c60423025b58`.
- Started: 2026-10-07.
- Review mechanism: fresh lead subagents, inherited model and effort.
- Approval: specification and workflow approved by Aidan on 7 October 2026.
  The approved handoff was committed before execution began.
- Execution manual: [README](README.md). Recovery uses this plan, not chat history.

## Workstream order

| # | Workstream | Depends on | Status |
|---|---|---|---|
| 1 | [Standalone T3 connection](01-t3-connection.md) | Approved handoff | Accepted |
| 2 | [Linear installation and event receipt](02-linear-installation.md) | 1 | Not started |
| 3 | [Session execution and recovery](03-session-lifecycle.md) | 1, 2 | Not started |
| 4 | [Host installation and live development PR](04-installation-validation.md) | 3 | Not started |
| Final | [Whole-feature review](final-review.md) | 1–4 accepted | Not started |

Allowed statuses: Not started, Implementing, Review, Remediation, Closure review,
Blocked, Accepted. Only one row may be active. Leads own transitions and record
blocking decisions below. A non-terminal row without a live lead is interrupted;
a fresh lead audits and resumes it using the README. No accepted row may silently
skip its external gate.

## Why these boundaries

The T3 client is independently usable for local orchestration. The Linear edge
can install, receive, and acknowledge a session before coding is connected.
Composition owns the durable session lifecycle, keeping routing, queueing, and
recovery together. Deployment owns a different toolchain and the live proof.
Each unit is useful as delivered; no disposable adapters or placeholder model
loops are required between them.

## Cross-workstream contracts

- T3 is reached through external authenticated MCP. Idle launch is distinct from
  send. Caller-supplied stable send keys retain their OAuth-session identity;
  returned thread/message/run IDs are durable recovery references.
- T3 client renewal pauses new operations and retries, drains requests, and asks
  the lifecycle owner to reconcile uncertain mutations before credential switch.
  The client owns credential state and request tracking. The lifecycle owns
  persisted delivery intent and reconciliation. Until it is connected, an
  uncertain mutation leaves the client paused and reports the problem.
- The Linear edge validates raw-body signature, timestamp, installed workspace,
  and app identity, then records each event in SQLite before HTTP acknowledgement.
  No coding occurs inside the webhook request. It owns the initial activity and
  its durable retry; composition must not send a second acknowledgement.
- SQLite is the only bridge state store. Persist installation identity/tokens,
  received deliveries, outgoing delivery intent, session/project/thread mappings,
  and reporting cursor as needed. Do not mirror T3 conversation/run history.
- Composition consumes durable recorded events in order, selects an exact
  case-sensitive project title, retains the chosen T3 project ID, and permits one
  active coding session globally. Inputs attach to their original session.
- Permission approvals remain in T3. Linear messages do not broaden permission.
  Stop cancels queued runs as well as interrupting the active run.
- HTTP exposes webhook, OAuth start/callback routes, and only any minimal local
  health facility needed by deployment. Bind locally; Funnel publishes only the
  bridge. T3 remains private on Serve 443.
- Runtime uses explicit provider/model settings, T3-managed worktrees, and the
  repository's instructions. There is no bridge-owned coding-agent loop.

Concrete exports and schemas are recorded by their owning lead before acceptance.
Later leads consume them directly. An accepted contract defect is an escalation
with a proposed owner/correction, never a silent competing abstraction.

## Ownership handoffs

- 1 establishes `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `src/t3/**`,
  `src/config.ts`, and `test/t3/**`. It records actual scripts and client exports.
- 2 owns `src/linear/**`, `src/http.ts`, `src/store/**`, and `test/linear/**`.
  It records schema, event-consumption contract, and SDK behaviours verified live.
- 3 owns `src/sessions/**`, `src/main.ts`, and `test/sessions/**`. It receives
  composition ownership of configuration and may extend the shared store for
  lifecycle records, preserving accepted auth and receipt contracts.
- 4 owns `deploy/**` and operator installation documentation. It may make small
  deployment corrections to composition with evidence and focused verification;
  substantive changes to an accepted component return to its owner through an
  escalation. No host configuration changes before G2 passes.
- Each lead owns its numbered record and plan row/gates while active. All leads
  may synchronize README/spec/research with implemented evidence. Manifest/lock
  edits transfer sequentially to the active lead for necessary dependencies.

## Whole-feature acceptance

All [specification criteria](../spec.md#acceptance-criteria) must be covered by
recorded focused checks or live evidence. G1, G2, and G3 must pass. The live test
must demonstrate delegation, acknowledgement, local worktree execution, and a
draft PR linked in Linear. Credential rotation during a harmless active run,
external question answers, and a controlled T3 restart need recorded evidence.
Do not restart Aidan's live T3 server for that test; use an isolated development
instance. Final review runs the package's actual test, typecheck, and build scripts.

## Acceptance evidence

### Workstream 1, accepted 7 October 2026

- Delivered a built Node.js 24 standalone external MCP client with local PKCE
  pairing, private credential files, verified replacement, automatic renewal,
  bound idle launch, stable-key sends, durable reads, cancellation/interruption,
  pending-question operations, and same-token reconnect. Lifecycle callers persist
  send key plus credential session ID and provide uncertainty reconciliation.
- Handover pauses dispatch, drains requests, and retains uncertainty after a lost
  mutation response. Failed replacement keeps the valid old credential. Shutdown
  drains handover; incomplete auth cleanup reports non-secret operator references.
- Verification: frozen-lockfile install, 16 focused tests, `pnpm typecheck`,
  `pnpm build`, and `git diff --check` passed. Independent review's two required
  findings were corrected in one pass; fresh closure found no remaining defects.
- Live standalone built-client proof used isolated T3 on loopback 3873 and a
  disposable repository. Idle launch returned a confirmed worktree. Repeated send
  returned identical message/run IDs. The same active run survived replacement,
  follow-up completed in the same thread, and a fresh transport read it afterwards.
- Installed status: client candidate only. No Linear app, bridge HTTP listener,
  host service, or Funnel installed. Existing T3 and host configuration untouched.
  Isolated instance stopped; test credentials revoked and temporary secrets removed.
- Pending checks: workstream 3 owns SQLite intent and reconciliation integration;
  external question answers and controlled isolated-server restart remain live
  checks before whole-feature acceptance. Linear installation, public ingress,
  and development PR proof still require G1–G3. No optional observations or drift.
- Concrete exports, commands, and live references are in the accepted
  [workstream 1 handoff](01-t3-connection.md#implementation-handoff).

## External validation gates

| Gate | Owner and placement | Status | Candidate/evidence | Resume condition |
|---|---|---|---|---|
| G1 Linear app setup | 2, after candidate checks, before live auth/event verification | Pending | Lead records URLs, requested scopes, app settings, and private-secret setup instructions | Aidan registers/configures app and completes admin OAuth consent; lead verifies signed event and activity |
| G2 Host/public endpoint | 4, after reviewed deployment candidate, before applying it | Pending | Lead records exact service files, user, command, port, secret paths, Funnel changes, and rollback | Aidan authorizes these specific host changes; lead verifies public bridge and private T3 |
| G3 Development issue and PR | 4, after G2, before dispatching coding work | Pending | Lead records selected repository/base branch, matched projects, proposed harmless issue, and allowed push/draft-PR actions | Aidan confirms target and test; lead verifies end-to-end result and records PR URL |

G1 may use a temporary bridge-only public listener once its exact configuration
is authorized through the escalation. Record and remove temporary host changes
or explicitly hand them over to G2. A private OAuth callback may suffice for
installation, but signed Linear delivery still needs public ingress. Gates use
Pending, Testing, Troubleshooting, or Passed. Candidate details belong in the
owning packet; summaries and references belong here.

## Escalations

None. When blocked, add an entry with an ID, owning row, decision/action needed,
realistic options, recommendation, evidence, what it unblocks, and a user's-answer
field. The orchestrator records only the answer. The resuming lead preserves the
lasting decision in its handoff/log and removes the resolved entry.

## Decision and drift log

| Date | Decision or drift | Reason | Approved by | Affected workstreams |
|---|---|---|---|---|
| 2026-10-07 | Sequential first-version workflow; explicit account and installation gates | New service; no live Linear installation exists | Aidan, 7 October 2026 | 1–4 |
| 2026-10-07 | Workstream 1 accepted without specification drift | Standalone live proof and focused checks passed; failure cleanup and lifecycle races corrected before fresh closure | Workstream 1 lead under approved scope | 1–3 |
