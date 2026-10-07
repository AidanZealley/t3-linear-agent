# Workstream 3: Session execution and recovery

Status: approved task packet; not started. Depends on accepted workstreams 1 and 2.

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
