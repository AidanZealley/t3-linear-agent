# Workstream 2: Linear installation and event receipt

Status: approved task packet; not started. Depends on accepted workstream 1.

## Task packet

### Outcome

The T3 app can be installed in Aidan's Linear workspace. A signed agent event is
recorded once and acknowledged promptly, and Linear shows an initial activity.
The HTTP edge runs independently of coding execution.

### Scope

Implement the OAuth start/callback path with state verification and appropriate
app actor/scopes. Use the current official OAuth lifecycle, including refresh
support, and verify SDK coverage against actual installed types. Keep Linear's
credential lifecycle distinct from T3's thirty-day pairing renewal.

Use the official SDK and webhook helper where suitable. Verify raw-body signature
and timestamp before processing. Restrict events to the installed workspace and
app. Enable only necessary webhook categories. Persist app/workspace identity
and protected OAuth credentials through the single SQLite store.

Persist duplicate-resistant delivery receipt and pending initial activity before
HTTP acknowledgement. Return HTTP within five seconds and send the initial
activity or session URL within ten seconds. A background worker may deliver the
activity; model startup must not control responsiveness. Retain failures for
bounded retry. Preserve useful event context for composition without mirroring
conversation history. Bind the bridge listener locally.

### Non-goals

Coding dispatch, project mapping, final-result formatting, T3 runtime changes,
public product dashboard, directory publication, or invented agent-session events.
The live test at this stage acknowledges work; it does not launch a coding task.

### Initial ownership

`src/linear/**`, `src/http.ts`, `src/store/**`, `test/linear/**`, needed dependency
changes, and operator OAuth setup instructions in the repository README.
Own this record, row 2, and G1 in the plan. Preserve workstream 1's client contract.

### Required seams

Record the concrete SQLite schema and interface for consuming recorded events in
order and marking delivery progress. The Linear edge owns initial activity delivery.
Composition consumes the same store, installed identity, and SDK client without
another webhook receiver or acknowledgement path. Provide activity/session-link
operations needed for progress and results, using actual SDK types.

### Acceptance criteria

- G1 passes: OAuth installs an app actor named T3 with assignable/mentionable
  access, and installed app/workspace IDs are persisted.
- OAuth callback state validation and credential renewal follow current Linear
  requirements. Secrets and callback authorization codes never enter logs/Git.
- Invalid signatures, stale events, and unrelated workspace/app events are rejected.
- Duplicate signed deliveries have one durable receipt and one logical initial
  acknowledgement. HTTP acknowledgement survives temporary API failure.
- A live test delegation reaches the bridge and shows the initial activity within
  the documented deadline. No coding thread is launched by this workstream.
- Store state survives process restart; pending activity delivery resumes.

### Targeted verification

Read workstream 1's accepted tooling handoff and run its actual focused-test,
typecheck, and build commands plus `git diff --check`. Add focused tests for raw
signature validation, timestamp policy, OAuth state, durable duplicate receipt,
and acknowledgement retry. Record live OAuth and signed-event evidence separately.
Do not claim synthetic SDK fixtures prove Linear delivery.

## External validation

- Gate and placement: G1, once the setup candidate and local checks are ready,
  before live OAuth and webhook verification complete.
- Status: Pending.
- Candidate and instructions: lead records exact callback/webhook URLs, app
  settings/scopes, installation URL, and private credential setup method.
- Required evidence: admin OAuth consent, installed identity read, signed session
  delivery, and initial activity visible in Linear. No secret values in records.
- Attempts and lasting decisions: pending. Any temporary public bridge listener
  requires explicit authorization of its exact host change and cleanup plan.
- Resume condition: Aidan completes registration/consent and authorizes necessary
  temporary ingress; a fresh lead verifies live receipt before acceptance.

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
