# Workstream 3: Session execution and recovery

Status: approved task packet; implementation accepted on 7 October 2026.
Workstreams 1 and 2 are accepted. The frozen task packet below is unchanged.

## Task packet

### Outcome

Durable Linear session events drive existing T3 orchestration. Project selection,
queueing, follow-ups, questions, stop, reporting, and recovery form one coherent
service lifecycle. It is ready for the live development-PR test.

### Scope

Compose the accepted T3 client, Linear edge, and SQLite store in a runnable
service entrypoint. Resolve each new session's exact Linear-project/T3-title match;
ask for clarification on absent, missing, or duplicate matches. Retain selected
T3 project IDs across renames/restarts and never reroute unavailable targets.

Maintain one active coding session globally and a durable queue for additional
sessions. Explicit provider/model settings and repository/base-branch configuration
must be validated. Create idle T3-managed worktree threads with session identity
in their title, persist IDs, then send context with stable request keys.

Persist outgoing delivery intent, request key, and OAuth session before sending,
then returned IDs. Reconcile lost launch responses using exact title/project and
workspace binding. Reconcile uncertain sends using durable thread messages and
known IDs. Ambiguity pauses the relevant dispatch rather than blind retry. Connect
this reconciliation to the accepted client's credential handover.

Map follow-ups in order, pending questions through supported answer submission,
and stop to both queue cancellation and active-run interruption. Permission
approvals remain in T3. Clarification replies resume the original Linear session.
Record the actual Linear stop signal and SDK event shapes, not guessed fixtures.

Report concise progress within the stale window and final response/PR links.
Use actual durable run outcomes, pinned run IDs, and pending-question state.
Keep a forwarding cursor and retryable reporting intent; never resend coding
work to recover a report. Exclude hidden reasoning, secrets, and raw command logs.
Recover existing sessions before launching new queued work after restart.

### Non-goals

Parallel coding sessions, label routing, a generic scheduler, whole conversation
replication, provider-specific agent loops, merging, or production access.

### Initial ownership

`src/sessions/**`, `src/main.ts`, `test/sessions/**`, lifecycle additions to
`src/store/**`, and service composition/configuration. Earlier authentication,
receipt, and SDK contracts remain owned by their accepted workstreams.
Own this record, row 3, and source-document synchronization.

### Required seams

Consume recorded Linear events and send all operations through the accepted T3
client. Store lifecycle state once in SQLite. Provide the deployment owner a
runnable command, validated configuration, graceful shutdown behaviour, required
state/secret paths, and an operator explanation for paused/ambiguous deliveries.
No automatic resumption may bypass a stopped session or unresolved send.

### Acceptance criteria

- Two matching projects route correctly. Missing/duplicate matches request input
  without launch; correcting them resumes the same session.
- Renames and service restarts retain selected project and thread identity;
  unavailable targets report failure without rerouting.
- Duplicate/replayed events, uncertain launches, and uncertain sends do not
  duplicate threads or work. Ambiguous outcomes remain visible and paused.
- A queued session waits behind active work; follow-ups and answers use the original
  thread in order. Native question answer submission is verified live in a
  controlled development instance, completing the research's unverified path.
- Stop cancels queued runs and interrupts the pinned active run; pending inputs
  cannot restart it without explicit resumption.
- Reporting retries preserve coding identity; final success requires a confirmed
  result. Investigation can finish with an answer and no PR.
- Service restart and an isolated T3 restart recover known sessions. Credential
  renewal while a harmless run executes and a send response is lost preserves
  delivery identity or pauses for reconciliation, never blind resend.
- No work touches Aidan's existing coding repositories before G3. Use isolated
  disposable development fixtures for lifecycle probes and no push or PR.

### Targeted verification

Run the real scripts established by workstream 1, scoped to lifecycle tests,
plus typecheck/build and `git diff --check`. Add behaviour-focused tests for name
selection, durable queue/order/stop, duplicate and lost-response recovery, and
report retries. Use the current SDK/tool shapes. Record live external question
answer and controlled T3 restart evidence; do not restart the user's T3 server.
The real Linear-to-PR proof belongs to workstream 4, not mocked tests here.

## Implementation handoff

- Base commit: `0265fd94d15f2777a72154f705449424fd4403e0` on
  `feat/linear-agent-v1`. Implementation accepted after independent review, one remediation pass and
  fresh focused closure.
- Outcome and files changed: `src/sessions/{types,config,service}.ts` implements
  project selection, a persisted session/input queue, idle managed-worktree
  launch, pinned runs, question answers, stop, reconciliation and report delivery.
  `src/store/index.ts` adds lifecycle tables and atomic updates without changing
  accepted receipt/authentication behavior. `src/main.ts` composes the accepted
  HTTP edge, initial-activity worker, Linear client and T3 client. `package.json`
  adds `pnpm start`; README documents configuration and operator commands.
  `test/sessions/{config,lifecycle}.test.ts` contains focused behavior checks.
- Durable contracts: session state lives in one SQLite row per Linear session.
  Inputs retain receipt order; repeated created events and repeated activity IDs
  cannot launch or send again. Each mutation's tool input and OAuth session are
  persisted before the call, then its returned thread/message/run/sequence IDs.
  Removing pending input and recording send intent share a transaction. Receipt
  consumption and session updates also share a transaction. Public reporting
  intents have stable UUIDs and remain separate from coding delivery.
- Routing and dispatch: exact case-sensitive project titles select one target;
  missing or duplicate names elicit clarification without launch. Project IDs
  stay pinned across subsequent renames and service restarts. Each allowed
  project has an explicit repository root and local base branch. Provider/model,
  Git roots and base branches are validated before dispatch. Thread titles contain
  issue and Linear session identity. Branches include both identities. One session
  holds the global coding slot; later sessions and follow-ups remain in SQLite.
  Every coding send rereads the retained thread's project, branch and ready
  worktree binding before consuming input. A mismatch pauses with input retained.
- Recovery: launch reconciliation requires one exact title/project match and its
  expected branch plus a ready worktree binding. Send reconciliation checks the
  exact durable T3 message ID, message text and returned run ID. T3 constructs
  that ID as `message:mcp:<encoded client:OAuthSession>:thread-send:<encoded key>`.
  The accepted client's renewal callback supplies reads while dispatch is paused.
  Unfinished sessions and saved intents reconcile before new queued work starts.
  Missing or conflicting evidence remains visible and paused, with no blind retry.
  Completion with pending input commits active continuation state, clears the
  finished run ID and advances its cursor in the same transaction as the final
  report. Restart continues that input while retaining the global coding slot.
- Native input and stop: official [Linear signals](https://linear.app/developers/agent-signals)
  and installed SDK 97.0.0 confirm a prompted event's `agentActivity.signal` is
  `stop`, and its prompt body is `agentActivity.content.body`. The SDK's
  `AgentSessionEventWebhookPayload` retains issue/session, context and guidance.
  Stop cancels local pending input, cancels all T3 queue entries, and interrupts
  the actual active run ID rather than `latestRunId`. Replies cannot restart it
  until `/resume` is explicit. Cancelled/interrupted T3 outcomes also stay stopped.
  Native questions use a question-ID-to-string answer map. Several questions
  require that JSON map; a single question accepts plain text. Permission approvals
  remain in T3.
- T3 wire details: public messages are `assistant_message`, sent task records are
  `user_message` with `creationSource: mcp`, including when `createdBy` is `agent`.
  Verified against the installed live server and
  [OrchestratorMcpService](https://github.com/pingdotgg/t3code/blob/main/apps/server/src/mcp/OrchestratorMcpService.ts).
  The service omits absent cursors and the initial `afterPosition`; it obeys
  `runLimit <= 50` and `maxCharsPerItem <= 50000`, as declared in
  [the primary tool contracts](https://github.com/pingdotgg/t3code/blob/main/packages/contracts/src/orchestratorMcp.ts).
  Installed tools reject `cursor: null` despite the advertised nullable schema.
  These are lifecycle caller corrections; accepted client/auth files are unchanged.
- Reporting: a confirmed pinned durable run must complete and have a readable
  provider response before a response is reported. Investigations need no PR.
  Public question/response text is filtered; reasoning, activity and raw command
  items are never forwarded. A ten-minute heartbeat covers working and
  unanswered-question states. Failed reports retry six times with bounded delay,
  retain UUIDs and hold later reports for the same session in order. Lifecycle
  reports wait for the initial acknowledgement so a delayed thought cannot follow
  a final response; coding remains independent of that delivery. PR links are
  also added to session external URLs. Retry never resends coding work.
- Operator paths: `pnpm build`, then explicit `T3_RUNTIME_MODE=<paired ceiling>
  pnpm start` runs `dist/main.js` on `127.0.0.1:8787`. Default private state is
  `~/.local/state/t3-linear-agent/{linear-secrets.json,t3.json,bridge.sqlite,sessions.json}`.
  Existing environment overrides remain, plus `SESSION_CONFIG_FILE`.
  `node dist/main.js status` prints identities, unresolved intents and failed
  report IDs without task bodies or credentials. `node dist/main.js retry-reports`
  restores failed report intent with original UUIDs. SIGINT/SIGTERM stop ingress,
  drain outstanding operations, close MCP and retain independently running T3 work.
- Verification: on Node 24.19.0 and pnpm 11.20.0, fifteen focused session tests,
  all 38 package tests, `pnpm typecheck`, `pnpm build`, `git diff --check` and untracked-file
  whitespace checks passed. Checks cover real local Git configuration, both routes,
  absent/missing/duplicate selection, correction, SQLite reopen, rename, unavailable
  targets, duplicate activity IDs, ordered follow-ups, lost launch/send responses,
  ambiguous-send pause, native answers, stop/cancel/interruption, public filtering
  ordered report retries and initial-before-lifecycle reporting. Synthetic fixtures
  also reproduce changed project/branch bindings after completion, a missing
  worktree during stopped-session resumption, and a crash after the final-report
  commit but before the next send intent. SQLite reopening confirms one follow-up,
  one original final-report UUID and no queued-session launch before continuation.
  Synthetic fixtures do not prove live Linear delivery. Live probes preceded the
  final branch-name formatting, reporting-order and binding guards, and completion
  continuation correction; focused checks cover those changes.
- Live native answer, 7 October 2026: isolated installed T3
  `0.0.46-nightly.20261007.2761` ran on `127.0.0.1:3973`, with state and disposable
  repositories under `/tmp/t3-linear-ws3-dev`. The standalone accepted client
  launched plan-mode thread `mcp:14b46127-e4ee-4ac0-89d0-34cea136a1b7` in project
  `12fdcf99-0b9e-4ac7-bfb1-f879fa57fae0`. Native pending request
  `runtime-request:provider:codex:provider-turn:provider-turn%3Aprovider%3Acodex%3Anative-turn%3A01a1165c-8e93-74f1-ba4f-ef951555baac:native-request:call_RDMgtT6o2OdwCyVOExMK1Qqw:16d785c0-e0da-46c3-bf4e-c9e73c6c830e`
  accepted `{ "test_word": "blue" }` and returned sequence 25. Ordinal-1 run
  `run:thread:mcp%3A14b46127-e4ee-4ac0-89d0-34cea136a1b7:ordinal:1`
  completed at `2026-10-07T12:35:34.815Z`, with no remaining question and final
  `QUESTION ANSWER RECEIVED blue`. Evidence is `question-answer.json` in that
  private fixture directory. No Linear account call was involved.
- Live service/renewal evidence: synthetic local receipts drove the real
  SessionService and accepted MCP client, with a fixture-only connection deliberately
  discarding one accepted send response. Session `ws3-rotation-2` selected project
  `12fdcf99-0b9e-4ac7-bfb1-f879fa57fae0` and thread
  `mcp:b1f949c0-6194-4b08-be55-f16ed3562689`. The unresolved intent retained
  OAuth session `50505e7e-e416-4dfd-a397-49a19381338c` and request key
  `ws3-rotation-2:created:ws3-rotation-2`. Renewal adopted durable message
  `message:mcp:client%3A50505e7e-e416-4dfd-a397-49a19381338c:thread-send:ws3-rotation-2%3Acreated%3Aws3-rotation-2`
  and ordinal-1 run `run:thread:mcp%3Ab1f949c0-6194-4b08-be55-f16ed3562689:ordinal:1`.
  Credential replacement to session `7ae4d51b-dccb-4aa1-bcc1-42cae583a05a` read
  that same active run, with one send. It completed the harmless `sleep 40 && pwd`
  investigation. Session `ws3-beta-2` waited, then selected project
  `mcp:da3483b4-bade-4f7d-a02c-acb98859aeb6` and thread
  `mcp:bffb3754-b9ca-4655-8d53-3e1c6d4129cc`. Both completed in their respective
  managed worktrees. Concrete IDs and local reports are in `rotation-evidence.json`.
- Controlled restart evidence: the isolated T3 process was stopped and restarted
  with its same data directory. A fresh client and reopened lifecycle SQLite store
  recovered both project/thread/worktree IDs. A follow-up for `ws3-rotation-2`
  returned `RESTART FOLLOWUP OK` from ordinal-2 run
  `run:thread:mcp%3Ab1f949c0-6194-4b08-be55-f16ed3562689:ordinal:2`, using the same
  thread even with a deliberately nonmatching current Linear-name fixture.
  Replaying the same receipt retained two launch intents and three send intents.
  Evidence is `restart-evidence.json`. These are isolated T3/service recovery
  checks with local Linear fixtures, not an installed end-to-end Linear service.
- Cleanup: all seven isolated repository/worktree statuses were clean. Remaining
  isolated bearer sessions and pairing grants both reached zero; the saved bearer
  received HTTP 401 before its file was deleted. The isolated process stopped and
  its server log was removed. Non-secret evidence and disposable stores/worktrees
  remain under `/tmp/t3-linear-ws3-dev`. Aidan's T3 server, private credentials,
  Linear installation, existing development issue, host services and Funnel were
  not changed. No push or PR occurred.
- Simplification/deletion pass: removed duplicated context/issue-name fields,
  an unused event type, and stale returned delivery/status fields from new intent
  records. Kept one session row and two purpose-specific delivery tables. There
  is no scheduler framework, provider loop or whole-conversation replica.
  R1/R2 remediation shares one binding validator between observation and send,
  and uses the existing active state for continuation. No new flags, lifecycle
  states, recovery wrapper or deployment gate machinery were added.
- Known limitations or external checks: G2 permanent installation and G3's
  authorized Linear-to-development-PR proof remain workstream 4. No supported
  user-accessible T3 conversation URL was established. A missing, conflicting or
  unreadable result stays paused for operator reconciliation; expired credentials
  can prevent startup until local authorization is repaired. Accepted credential
  retirement IDs remain process-local, and renewal failures print their IDs for
  local CLI inspection. Native answer submission was live; Linear's Stop UI event
  shape was verified from official documentation and the installed SDK without
  generating a new live account activity. Exact G1 HTTP duration remains unverified
  under Aidan's accepted evidence adjustment; runtime deadlines remain unchanged.
- Specification drift: none.

## Independent review

- Reviewer: independent fresh Codex subagent, 7 October 2026. Reviewed all
  tracked and untracked candidate changes against
  `0265fd94d15f2777a72154f705449424fd4403e0` on `feat/linear-agent-v1`, the frozen
  packet, product sources, user instructions and accepted dependency handoffs.
- Verdict: two required corrections. Recorded isolated live evidence satisfies
  this packet's native-answer, credential-reconciliation and T3-restart probes;
  this review did not repeat those live operations or claim Linear-to-PR proof.
- Required R1: saved-thread follow-ups bypass workspace validation before sending.
  `src/sessions/service.ts:107-109` observes only active sessions. A completed
  session becomes queued on a new reply, and `dispatch` at lines 157-172 checks
  the project but sends to an existing thread without reading its current binding.
  The binding check at line 225 therefore happens after work has started.
  A synthetic reproduction completed a session, changed its fake thread's
  project binding, and delivered an implementation follow-up. The service sent
  the second message and persisted `active` while the thread belonged to another
  project. A changed branch or missing worktree follows the same unchecked path,
  including explicit resumption of a stopped thread. Validate the retained thread
  against the pinned project, branch and ready worktree before sending new work;
  failed validation must retain input and pause without sending or rerouting.
- Required R2: completion persists a state that strands pending input after a
  crash. `src/sessions/service.ts:256-259` commits the final response and a
  `completed` session with its remaining inputs through `report`. Line 264 only
  then changes it to active and creates the next send intent. A crash between
  those commits leaves `completed` plus pending input. Restart observes only
  active sessions and dispatches only queued sessions, so that input never runs.
  A synthetic reproduction threw immediately after the final-report transaction
  committed, reopened SQLite and ran two fresh service passes. It retained one
  pending follow-up, `completed` status and one send rather than the expected two.
  Commit a recoverable continuation state with the final report, or recover this
  legitimate persisted state before new queued work, preserving message order
  and the single global coding slot. Do not recover by repeating the prior run.
- Optional observations: none.
- Question Q1: settle the retained G1 receipt before the deployment owner starts
  composed dispatch. `src/main.ts` uses the retained bridge store, and the service
  ingests every pending receipt. The workstream 2 handoff forbids further coding
  dispatch or account activity for its existing AID-6 validation session; its
  initial acknowledgement does not consume the coding receipt. There is no
  historical-session exclusion in this candidate. G2/G3 remain installation
  boundaries, so this is a deployment handoff question rather than a demand for
  new lifecycle gate machinery. Record edge-only operation during G2 and the
  authorized disposition of the old receipt before composed startup under G3.
  No retained receipt, account or live store was inspected or mutated here.
- Verification: `node --test test/sessions/*.test.ts` passed all thirteen focused
  tests. `pnpm typecheck`, `pnpm build` and `git diff --check` passed. Two temporary
  synthetic tests outside the checkout reproduced R1 and R2 as failing assertions;
  their SQLite fixtures were removed. Probes used the existing fake T3 fixture
  and no live endpoint, credential, Linear activity, coding repository, host
  service or Funnel changes. Only this Independent review section was edited.
  Exact G1 HTTP duration remains approved-unverified and does not add a gate.

## Resolution

- R1 accepted. Saved completed or stopped sessions pass selection but send before
  checking the saved thread binding. Check that binding before every coding send.
- R2 accepted. The final report transaction can save completed state with pending
  input before the next send commits. Persist the continuation as runnable in that
  same transition so restart recovers it without replaying the finished work.
- Q1 resolved as a workstream 4 installation handoff. G2 uses only the accepted
  edge listener. Before composed-service startup, G3 must explicitly authorize
  dispatch scope and settle the retained G1 AID-6 receipt. Do not dispatch or post
  another activity for that validation session merely because it is in the store.
  Retain its signed-receipt and initial-activity evidence; an owner decision about
  consuming or cancelling old input is required before starting against real state.
  This is an installation decision, not authorization to change private state here.
- Remediation shares one thread-binding validator across observation and sending.
  The send guard runs before removing input or persisting a send intent; project,
  branch and worktree mismatches pause without work. No duplicate recovery state
  or new routing mechanism was added.
- Completion commits the finished-run cursor, cleared run identity and active
  continuation state with the final report when input remains. Restart keeps the
  global slot and sends that input once without repeating the finished report.
- Simplification/deletion pass: reused the existing binding check and durable
  session transition, with two focused behavior tests rather than extra machinery.
- Remediation verification: fifteen focused session tests, all 38 package tests,
  typecheck, build and tracked/untracked whitespace checks passed. Native question,
  active-run lost-response handover and controlled restart live evidence predates
  these local guards; their failure cases are covered by focused synthetic checks.
  Fresh focused closure passed both corrections. The lead reran all 38 package
  tests, typecheck and build successfully; final whitespace validation passed.

## Closure review

- Reviewer: fresh focused Codex subagent, 7 October 2026. Reviewed the accepted
  R1/R2 corrections against base `0265fd94d15f2777a72154f705449424fd4403e0`,
  the frozen packet, product sources and accepted dependency contracts.
- Verdict: R1 and R2 are resolved. No remaining required findings or blocking
  defects in their fixes. General review was not reopened.
- R1: `sendNext` rereads the saved thread and uses the same binding validator as
  observation before removing input or saving send intent. Synthetic checks cover
  changed project and branch after completion and a missing worktree on explicit
  stopped-session resumption. Each pauses, retains the input and original target,
  and creates neither another thread nor another coding send intent.
- R2: the final-report transaction saves active continuation when input remains,
  clears the completed run ID and saves the forwarding cursor. A synthetic crash
  immediately after that commit, followed by SQLite reopening, sends the retained
  follow-up once on the original thread. The next session remains queued until
  continuation completes; the original final-report UUID is retained and delivered
  once. No recovery state or additional dispatch mechanism was introduced.
- Q1 remains resolved by the recorded deployment handoff. G2 uses the edge only;
  G3 must settle the retained G1 receipt and authorize dispatch scope before
  composed startup. This review did not inspect or change retained private state.
- Verification: all fifteen session tests passed, including both remediation
  checks. `pnpm typecheck`, `pnpm build` and `git diff --check` passed. These were
  synthetic checks only; no live T3, Linear account, host service, Funnel, push or
  PR operations occurred. Earlier live evidence was not repeated. The accepted
  G1 evidence adjustment remains, with runtime deadlines unchanged. Only this
  Closure review section was edited; changes remain uncommitted.


## Acceptance

Accepted on 7 October 2026 after independent review, one remediation pass and
fresh focused closure. Both required findings are resolved. Fifteen focused
lifecycle tests and all 38 package tests pass, with typecheck, build and whitespace
validation. Live isolated native answers, lost-response credential handover and
controlled server/service recovery are recorded in the handoff above. Their
later local guard corrections passed synthetic checks. No required or optional
findings remain, and there is no specification drift.

This is a runnable candidate, not an installed coding service. Existing T3, the
retained Linear app/store/secrets, owner validation bridge and Funnel were
untouched. G2 and G3 remain pending. The deployment owner must use the edge-only
listener for G2, then settle the retained G1 receipt and obtain explicit dispatch
scope at G3 before starting the composition against real state. The real
Linear-to-development-PR proof and unattended repository permissions remain
workstream 4 checks. G1's approved responsiveness evidence adjustment is preserved.
