# T3 Linear agent specification

Status: approved by Aidan on 7 October 2026 for first-version implementation. No integration has been tested end to end.

## Outcome

Aidan delegates a Linear issue to an agent named **T3**. A service on the same
machine as the T3 Code server starts a coding session in the local T3 project
whose name matches the issue's Linear project. The agent implements the issue,
runs appropriate checks, and opens a GitHub pull request. Linear shows progress,
requests for clarification, and the
result. Aidan can inspect and continue the same work through T3.

The repository is named `t3-linear-agent`. In Linear, the OAuth application's
agent identity represents the service. T3 manages the coding agent that actually
does the work. The service does not run its own model or coding-agent loop.

## First-version scope

Support one Linear workspace and multiple local T3 projects, selected by matching
project names. Run one active coding session at a time across all projects.
Additional sessions wait in a local queue.
Use an explicitly selected provider and model already configured in T3.

Start work only through an explicit delegation or mention that creates a Linear
agent session. A mention that asks a question should receive an answer; it should
not implicitly authorize code changes. Pass Linear's issue context and guidance
through to the agent so it can distinguish investigation from implementation.

Support follow-up messages, clarification requests, cancellation, service
restarts, and duplicate webhook deliveries. Finish implementation work with a PR
ready for human review. Merging, deployment, production access, automatic backlog
pickup, multiple trackers, and an additional dashboard are outside this version.

## Components

Run a small TypeScript service in `/home/aidanzealley/code/t3-linear-agent`,
supervised by the host's service manager. Use `@linear/sdk` for the Linear API and
its webhook helpers where they support the required agent events.

Linear reaches the service through a public HTTPS endpoint. Prefer Tailscale
Funnel on a separate HTTPS port, such as 8443, while the existing T3 endpoint
remains private through Tailscale Serve on 443. Funnel publishes the bridge's
HTTP listener, which exposes only webhook and OAuth installation routes.
The service reaches T3 through its authenticated local MCP endpoint at
`http://127.0.0.1:3773/mcp` on this installation. Make the endpoint configurable.
Keep T3 credentials, Linear tokens, and webhook signing secrets on the server.

Use a small local SQLite database for delivery records, pending messages, and the
mapping between Linear sessions and T3 threads. This state is necessary to avoid
duplicate work and resume reporting after a restart. Reuse T3's durable run
history rather than keeping a second copy of its conversation or execution state.

The external T3 MCP connection has been verified with a standalone probe on this
server. Use an ordinary MCP client library in the TypeScript implementation.
See [investigation results](research.md#standalone-t3-probe-results) for verified
behaviour and the remaining authentication and recovery constraints.

## Installation

1. Register a Linear OAuth application named T3. Enable Agent session events and
   request `actor=app`, the assignable and mentionable scopes, and the API access
   needed to report activities and session links.
2. Install the application into Aidan's workspace using an admin account. Store
   the workspace and app identity with its OAuth credentials, including the
   token lifecycle required by Linear's current OAuth flow.
3. Configure the local T3 endpoint, supported credential, provider, and model.
   Give each Linear project the same name as its intended local T3 project.
   Validate the selected provider and each project's repository, base branch,
   and permissions for unattended work.
4. Authorize the bridge as an external T3 MCP client using OAuth with PKCE and
   a one-time pairing code or owner approval. Select a runtime-mode ceiling that
   permits the intended work. Store the returned bearer token and its expiry.
   The tested version issues a thirty-day token with no refresh-token grant.
   Give the service access to the local pairing CLI for automatic renewal as
   described below. On expiry or revocation, pause dispatch and report that T3
   authorization is needed. Do not borrow a provider-session token.
5. Configure the public webhook URL and signing secret. Confirm that a signed
   event reaches the service and that a test activity appears in Linear.

### Renew the T3 credential

Renew automatically several days before expiry using a fresh local pairing code
and the same OAuth flow, scopes, and runtime ceiling. Verify the new credential
with an authenticated read before replacing the stored credential. If renewal
fails, retry with bounded backoff while the old credential remains valid.

For the handover, pause new T3 requests and automatic retries, then wait for
outstanding requests to settle. An empty in-flight count is insufficient if a
request timed out after T3 may have accepted it. Reconcile any uncertain launch
or send using the recovery rules below before proceeding. Persist each outgoing
send's request key and credential session with its delivery record before sending.
If an outcome remains ambiguous, keep dispatch paused and report it for operator
reconciliation. Never retry an uncertain send under the replacement credential.

Once requests are settled, securely persist the verified credential, reconnect
MCP, and resume dispatch. Revoke the old credential after the handover succeeds.
Continue accepting and recording Linear events during the pause. Running coding
agents continue independently; renewal does not wait for their implementation
to finish or interrupt their runs.

## Session flow

### Receive work

Verify the webhook signature against the raw request body and check its timestamp
using Linear's documented policy. Accept events only for the installed workspace
and app identity. Record each delivery once before acknowledging it. Return the
HTTP response within Linear's five-second limit; never hold the request open for
coding work.

For a new session, send an initial activity or session link within ten seconds,
including when work is queued. Persist an unsent acknowledgement for retry if
Linear's API is temporarily unavailable. Only the service sends this initial
acknowledgement, so model startup does not determine whether Linear shows the
agent as responsive.

### Select the T3 project

For a new session, read the issue's Linear project name and find an exact,
case-sensitive match among projects on the configured T3 server. Aidan maintains
matching names in both applications. Do not infer the repository from labels,
issue text, or similar names.

If the issue has no project, there is no matching T3 project, or several T3
projects match, ask for clarification in Linear and leave the session waiting.
Launch no coding thread until there is one confirmed target. After Aidan fixes
the project selection or names and replies, read the current project data again.

Persist the selected T3 project ID with the Linear session before launching work.
Use that ID for launch, recovery, and follow-ups, including if either project is
renamed later. If the selected T3 project becomes unavailable, report the problem
instead of choosing another repository. A new session resolves names afresh.

### Start a T3 thread

Create one normal T3 thread per Linear agent session in its selected T3 project,
bound to a new T3-managed Git worktree based on that project's base branch. Keep
the Linear issue identifier in the thread title and branch name where T3 supports
it, and include the Linear session ID in the title for launch reconciliation.
A repeated delivery uses the existing session mapping.

Create the thread idle, persist its returned ID, and then send the task with
`t3_thread_send` and a stable `clientRequestId`. This separates the launch operation,
which has no retry key, from starting work, which supports idempotent sends.

Supply Linear's `promptContext`, the issue and session identifiers, and the
requested outcome. Tell the agent to follow repository instructions, run
appropriate checks, and return the result with any PR URL. Use the existing T3
permissions and provider setup; confirm during installation that authorized
editing, checks, pushing, and PR creation can run unattended.

Persist the returned thread and run identifiers. If launch fails after T3 may
have accepted it, reconcile against T3's durable records before retrying. A lost
launch response must not create a second coding thread. Search the selected
project for the session's exact title and verify its workspace binding. Adopt
one confirmed thread; if the outcome is ambiguous, leave the session waiting for
operator reconciliation. Never blindly retry an uncertain launch.

Store outgoing message IDs and run IDs with their delivery records. T3 namespaces
send retry keys by OAuth session, so a replacement credential changes that
namespace. Reconcile an uncertain send against durable thread messages before
resending under a new credential.

### Report progress and handle input

Read T3's supported durable state or event stream and send concise, relevant
activities to Linear. Track the last forwarded event so reconnecting does not
replay all progress. Do not forward hidden reasoning, secrets, or complete command
logs. Keep an active session updated within Linear's documented stale window.

Map Linear's `prompted` events to messages in the existing T3 thread. Preserve
message order and use T3's supported delivery or queue behaviour while a run is
active. When the agent needs clarification, emit an elicitation in Linear and
route the answer through T3's supported pending-input mechanism. Permission
approvals stay in T3; a Linear comment is not an approval bypass.

Handle Linear's documented stop signal and explicit user requests to stop by
marking the session stopped, cancelling its queued T3 runs, and interrupting its
active run. Suppress further pending messages until explicitly resumed. The
interrupt tool alone is not a queue cancellation operation. Verify Linear's
exact signal shape during implementation.

### Finish and recover

For successful implementation work, publish a final Linear response containing
the summary, checks performed, material limitations, and PR URL. Add the PR to
the session's `externalUrls`. Link the T3 conversation when a supported,
user-accessible URL is available.

A completed investigation may return an answer without a PR. A failed or blocked
run reports the cause and required next action. Never report success merely
because T3 accepted a launch request or the provider process exited.

After a restart, reconcile known threads against T3 before launching queued work.
Resume progress and result delivery for existing sessions. Retry transient
delivery failures with bounded backoff; keep a failed report available to retry
without repeating the coding work. Retain interrupted worktrees for inspection.

## Implementation order

1. **Implement the verified T3 connection.** Build a small TypeScript client using
   the external MCP OAuth flow and tool shapes established in `research.md`.
   Cover automatic credential renewal, token expiry, idle launch followed by an
   idempotent send, and reconnecting to known threads. Completion means the service can repeat the standalone probe
   without relying on tools injected into this conversation.
2. **Prove Linear installation and delivery.** Complete OAuth installation,
   validate signed events, acknowledge a session, and post a final response.
   Completion means the T3 identity appears in Linear and receives delegation.
3. **Connect one session.** Launch T3 from a delegated test issue and return its
   result to Linear. Completion means a harmless change produces a real draft PR
   in a development repository, with no merge or deployment.
4. **Complete routing and lifecycle handling.** Verify name matching across two
   development projects. Add persisted queueing, duplicate prevention,
   follow-ups, clarification, interruption, and restart reconciliation.
   Completion means the acceptance criteria below pass.

## Acceptance criteria

- Delegating a scoped test issue starts exactly one T3 thread in its own managed
  worktree and produces a PR linked from Linear after appropriate checks.
- Issues in two differently named Linear projects route to their respective
  same-named T3 projects and repositories.
- Missing project selections, unmatched names, and duplicate T3 names request
  clarification without launching work. Correcting the names or selection and
  replying resumes the same Linear session in the confirmed project.
- Renaming a project after target selection does not change the session's target,
  including after a restart. An unavailable target does not trigger rerouting.
- Linear receives the HTTP acknowledgement and initial activity within its
  documented deadlines, including while another session is working.
- Follow-ups and clarification answers reach the original thread in order.
- A stop request interrupts the run and pending messages do not restart it.
- Repeated deliveries and a service restart do not duplicate threads or PRs.
- A connection failure after launch is reconciled or reported as unresolved;
  the service does not blindly launch again.
- Automatic credential renewal during an active coding run preserves the run,
  and subsequent reads and follow-ups work through the replacement credential.
- Credential handover waits for outstanding requests and reconciles an accepted
  send whose response was lost. An ambiguous outcome keeps dispatch paused;
  renewal does not duplicate the task message or coding run.
- Invalid signatures and events outside the configured workspace are rejected.
- Coding failures and reporting failures remain distinguishable, and retrying a
  report does not repeat implementation work.
- Aidan can inspect the work in T3 and review the PR without the service merging it.

Use focused tests for project selection, webhook verification, duplicate
prevention, message routing, and restart recovery. Verify the complete workflow with one live development
issue and PR. Tests of internal helpers alone are not evidence that the external
T3 connection works.
