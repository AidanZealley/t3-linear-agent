# Integration research

Researched on 7 October 2026. This document records evidence and unresolved
questions. Proposed product behaviour belongs in [the specification](spec.md).

## What has been verified

### Installed bridge and development PR

On 7 October 2026, the approved AID-7 delegation reached the installed bridge
through a fresh signed public webhook and completed one T3-managed worktree run.
Exactly one documentation-only [draft PR #1](https://github.com/AidanZealley/t3-linear-agent/pull/1)
targets main. Actual diff and whitespace checks pass. Linear carries progress,
final response and external PR URL; the calling T3 conversation registers the PR.
Bridge-only restart retained all receipt/activity/session/intent/report rows and
the same thread/worktree/run/PR without dispatch. Private T3 stayed running.
Exact identities, permissions and evidence are in the
[workstream 4 handoff](implementation/04-installation-validation.md#implementation-handoff).


### Linear supports self-hosted custom agents

Linear documents agents installed as OAuth app users with `actor=app`,
`app:assignable`, and `app:mentionable`. Agents can be built for a single internal
workspace. Delegation sets the app as the issue's delegate while a human can
remain its assignee.

Source: [Getting started with agents](https://linear.app/developers/agents).

New work arrives as a `created` AgentSessionEvent, with `promptContext` containing
issue context and guidance. Follow-up messages arrive as `prompted` events.
Agent activities represent progress, questions, errors, and final responses.
The webhook receiver must respond within five seconds; the initial activity or
session URL must be sent within ten seconds. Session `externalUrls` can include
the PR and a link to the execution environment.

Source: [Developing the agent interaction](https://linear.app/developers/agent-interaction).

Linear's best practices cover workflow status changes, frozen activity records
for user input, and the thirty-minute stale window. Its interaction guidelines
also require agents to respect requests to disengage.

Sources: [Best practices](https://linear.app/developers/agent-best-practices),
[Agent Interaction Guidelines](https://linear.app/developers/aig).

### Accepted Linear installation validation

Accepted workstream 2 passed live app-actor installation, a signed
session receipt, initial activity within 1.772 seconds of session creation, and
one explicitly authorized existing-UUID reconciliation without a second activity.
Exact IDs and timestamps are retained in the [implementation plan](implementation/plan.md#acceptance-evidence).
Aidan accepted his observed prompt response and verified activity timestamps as
sufficient G1 responsiveness evidence. Exact webhook HTTP response duration
remains unverified. The five-second HTTP and ten-second initial-activity runtime
requirements remain unchanged. Read-only cleanup verification confirms temporary
8443 ingress and bridge 8787 are stopped, while private T3 on Serve 443 is unchanged.
Private installation/store/secrets are retained. A persistent coding service remains
uninstalled.

### Linear supplies implementation building blocks

`@linear/sdk` provides typed API operations. Its `LinearWebhookClient` supports
typed, signature-verified event handlers on ordinary HTTP frameworks. Verify
agent-event coverage in the installed SDK before choosing its handler API.

Sources: [TypeScript SDK](https://linear.app/developers/sdk),
[Webhook helpers](https://linear.app/developers/sdk-webhooks).

Linear's MIT-licensed Weather Bot demonstrates OAuth app installation, agent
webhooks, and activity reporting. It is a Cloudflare-hosted demo with its own
model loop. Reuse its Linear integration patterns; T3 will supply our execution.

Source: [Official Weather Bot](https://github.com/linear/weather-bot).

### This installed T3 environment supports orchestration

Read-only inspection of the running environment reported Linux x64 and T3
version `0.0.46-nightly.20261007.2761`. Its live catalog reported thread management,
scheduled tasks, agent delegation, and available Codex and Claude providers.

The tools exposed inside this conversation can launch threads with explicit
T3-managed worktree bindings, read durable state, send messages, and interrupt
runs. A subsequent standalone probe verified the external MCP connection too;
its evidence is recorded below. The webhook task tool also supports signed
requests, but the bridge can connect directly to MCP without a scheduled task.

T3's documentation describes webhook-triggered tasks running on the selected
environment. A public task URL needs a T3 Connect managed tunnel. A maintainer
comment confirms that orchestration V2 has shipped.

Sources: [T3 webhook automation](https://github.com/pingdotgg/t3code/blob/main/docs/user/project-settings.md#webhook-automations),
[Orchestration discussion](https://github.com/pingdotgg/t3code/discussions/8433).

## Standalone T3 probe results

Completed on this host on 7 October 2026 against
`0.0.46-nightly.20261007.2761`. A Python process connected to
`http://127.0.0.1:3773/mcp` without using the current agent's injected credential.
It used the installed CLI at
`/home/aidanzealley/.t3/runtime/versions/0.0.46-nightly.20261007.2761/t3`.
The CLI was not available as `t3` on this shell's PATH.

### Authentication and transport

The server publishes OAuth resource and authorization metadata at
`/.well-known/oauth-protected-resource/mcp` and
`/.well-known/oauth-authorization-server`. The probe registered a public client
with a loopback callback, used PKCE S256, and authorized it with a locally issued
five-minute, one-time pairing code. Only `orchestration:read` and
`orchestration:operate` were requested. The chosen runtime ceiling was full access.

The actual flow used `/oauth/mcp/register`, `/oauth/mcp/decision`, and
`/oauth/mcp/token`. The token exchange requires form encoding, not JSON. These
are T3's external MCP authorization routes; a production MCP client should use
the advertised flow and metadata rather than borrow a provider-session token.

The returned bearer session lasts thirty days. The advertised grants and source
provide no refresh-token flow. The five-minute pairing TTL does not shorten the
resulting bearer session. The probe demonstrated that an authorized local
process can bootstrap access through the CLI. The specification requires
[automatic renewal](spec.md#renew-the-t3-credential) with a pause for outstanding
requests during handover. The subsequent workstream 1 implementation verified renewal during an active
run in an isolated development instance, as recorded below.

MCP initialization negotiated `2025-06-18`. Subsequent requests required the
returned `Mcp-Session-Id` and protocol-version header. Standard MCP libraries
should handle initialization, notification, and transport session management.

Source: [Environment authentication](https://github.com/pingdotgg/t3code/blob/main/docs/internals/environment-auth.md).

### Verified operations

- `t3_project_list` returned registered project IDs, exact titles, and workspace
  roots. Project-name routing can use the `title` field and retain the `id`.
- `orchestrator_capabilities` worked without a parent thread and exposed the
  granted runtime ceiling and the available providers and models.
- `t3_thread_launch` created an idle thread in this repository's registered T3
  project with an explicit managed worktree and selected Codex model. The checkout
  was bound before the first task ran.
- `t3_thread_send` started a harmless `pwd` task. The final response reported the
  expected worktree path. `t3_thread_wait` returned `completed`, and
  `t3_thread_read` exposed the final message and durable run state.
- Repeating that send with the same `clientRequestId` returned the original
  message and run IDs. It did not start another run.
- A follow-up ran on the same thread. A separate message sent with `mode: queue`
  appeared in `t3_queue_list`, and `t3_queue_cancel` cancelled it.
- `t3_thread_interrupt` stopped the active follow-up. Waiting on its explicit run
  ID returned `interrupted`, and the cancelled queue remained empty.
- A fresh MCP transport connection using the same OAuth token could read the
  existing thread and its history.
- `t3_pending_request_list` and `t3_pending_request_read` exposed a live agent
  question with its ID and choices. This initial probe rejected a nested answer
  payload. Workstream 3 later verified the supported flat question-ID-to-string
  map externally in an isolated instance, as recorded below.
- Revoking the investigation's OAuth sessions caused the saved token to receive
  HTTP 401 on `/mcp`.

Evidence remains in the archived T3 thread titled
`T3 Linear investigation 2026-10-07`, ID
`mcp:dc404361-a81e-4bc4-9a5e-cebe834983d4`. Its worktree is
`/home/aidanzealley/.t3/worktrees/t3-linear-agent/t3-linear-integration-probe`,
branch `t3/linear-integration-probe`. Its Git status was clean after the probe.
No files were edited there, and no commit, push, or PR was made. All investigation
bearer credentials were revoked and the temporary credential files were removed.

### Standalone implementation validation

Workstream 1 was accepted on 7 October 2026 after independent review, one
remediation pass, and fresh closure. A built TypeScript process using the standard
MCP SDK paired to an isolated T3 instance on loopback 3873. It listed projects and
provider/model capabilities, waited for an idle launch's managed worktree binding,
proved repeated-send IDs, rotated credentials while the same harmless run remained
active, completed a follow-up in the same thread, and reconnected to its durable
state. Test credentials were revoked and the isolated instance stopped. The user's
T3 server and host services were unchanged.

T3 prepares idle worktrees asynchronously; a launch ID alone does not prove that
binding is ready. The installed server also rejects `message:null` despite its
advertised nullable schema; omitting the field creates the idle thread. The client
handles both observations within the approved behaviour. Sixteen focused tests
cover standard MCP transport, uncertain mutations, credential handover and failure
cleanup, and lifecycle shutdown. The live success proof predates the reviewed
cleanup/shutdown corrections, whose focused closure checks passed.

Concrete contracts and live references are in the
[accepted workstream 1 handoff](implementation/01-t3-connection.md#implementation-handoff).
Workstream 3 subsequently verified external question answers, lifecycle
reconciliation, and controlled server restart below. The workstream 1 evidence
does not establish an installed Linear service.

### Accepted session lifecycle validation

Workstream 3 was accepted on 7 October 2026 after independent review, one
remediation pass and focused closure. Fifteen lifecycle tests and all 38 package
tests passed, with typecheck and build. Saved bindings are checked before coding
sends, and final-report commits retain runnable pending follow-ups across crashes.

An isolated T3 instance on loopback 3973 accepted a native external question answer
as `{ "test_word": "blue" }`, returned sequence 25 and completed with
`QUESTION ANSWER RECEIVED blue`. Local receipts drove the real lifecycle/client
across two disposable projects serially. Deliberately losing an accepted send
response reconciled its exact durable message ID before credential replacement,
keeping the same active run and one task message. Stopping and restarting that
isolated instance, then reopening SQLite and reconnecting, recovered the original
project/thread/worktree and completed a same-thread follow-up. Exact IDs and
evidence references are in the [workstream 3 handoff](implementation/03-session-lifecycle.md#implementation-handoff).

The installed server requires omitted absent cursors, limits `runLimit` to 50
and `maxCharsPerItem` to 50000, and exposes `assistant_message` public output.
Its durable MCP message ID encodes the OAuth session and caller request key,
allowing exact uncertain-send reconciliation. Official
[Linear signals](https://linear.app/developers/agent-signals) and SDK 97.0.0 confirm
a prompted event carries `agentActivity.signal: "stop"` and prompt
`agentActivity.content.body`. No new live Linear Stop UI activity was generated.

Isolated credentials and grants were revoked, the process stopped and all fixture
worktrees remained clean. Existing T3 and private Linear installation were
untouched; no push or PR occurred. Later local guards passed focused checks.
Permanent installation and real Linear-to-development-PR evidence still require
G2 and G3. The retained G1 receipt needs explicit owner disposition before
composed-service startup; it is not new coding authorization.

### Constraints that affect implementation

Thread launch has no retry key. Create the thread idle, store its ID, and only
then send work with a stable request key. Include the Linear session ID in the
thread title to help reconcile an uncertain launch. If reconciliation cannot
identify one thread, require operator intervention rather than launching again.

Send retry keys are namespaced by OAuth session. Reconnecting with the same token
retains that namespace; obtaining a replacement token changes it. Store returned
message and run IDs, and reconcile uncertain sends before retrying under a new
credential. The probe tested same-token retries, not credential replacement during
an uncertain send.

Cancellation needs queued-run cancellation as well as active-run interruption.
Use an explicit run ID when waiting for interruption: the latest run may be a
queued or cancelled follow-up rather than the interrupted run.

The question probe also showed that a run can report `running` while a pending
question exists. Check pending requests separately when reporting waiting for
input in Linear.

The user's live T3 server was not restarted. Workstream 3 later proved recovery
across an isolated T3 restart, uncertain-send handover and external question
answers. Lost launch responses passed focused synthetic lifecycle checks.
A supported user-accessible conversation URL remains unestablished.

Sources: [External invocation context](https://github.com/pingdotgg/t3code/blob/main/apps/server/src/mcp/McpInvocationContext.ts),
[Question fixture](https://github.com/pingdotgg/t3code/blob/main/apps/server/src/orchestration-v2/testkit/fixtures/plan_questions/input.ts).

## Tailscale webhook endpoint

Read-only inspection found Tailscale `1.102.2` running and T3 listening on
`127.0.0.1:3773`. Tailscale Serve proxies the machine's private HTTPS endpoint on
443 to T3. Funnel is allowed by the node's capabilities but is not enabled.

Linear's servers cannot reach a private tailnet endpoint. Tailscale Funnel
provides public HTTPS access on the same machine, so it can receive Linear's
webhooks without another tunnel provider. Funnel supports HTTPS ports 443, 8443,
and 10000. Serve and Funnel cannot share the same port with different visibility.

Prefer a separate Funnel listener on 8443 pointing only to the bridge, preserving
T3's private Serve listener on 443. The bridge's HTTP listener should expose only
its webhook and OAuth routes and verify Linear signatures itself. Funnel does not
make a request trusted merely because it reaches the server.

At this pre-installation snapshot no Funnel listener was enabled. Workstream 4
later verified public DNS/TLS and fresh signed Linear delivery on bridge 8443,
with private T3 443 unchanged; exact installation details are in the plan.

Sources: [Tailscale Funnel](https://tailscale.com/docs/features/tailscale-funnel),
[Webhook example](https://tailscale.com/docs/reference/examples/funnel).

## Related work and lessons

### Community Linear import proposal

The proposal in T3's repository asks for issue search and import into a selected
workspace, with issue details and acceptance criteria included in the prompt.
It is a community feature request, not an official delivery commitment or an
implementation of autonomous delegation.

Lesson: choose the repository explicitly and preserve useful issue context. Our
chosen approach matches the issue's Linear project name to a local T3 project;
it does not require an issue browser or multi-issue UI. Matching and clarification
behaviour are defined in [project selection](spec.md#select-the-t3-project).

Source: [Linear import proposal](https://github.com/pingdotgg/t3code/discussions/6752).

### Linear local scripts

Linear's desktop workflow can run a local executable and pass `LINEAR_PROMPT`,
the issue identifier, suggested branch, and selected working directory. The T3
orchestration discussion suggests this as a consumer of thread creation.

This is a useful manual experiment, but it depends on an action in the local
Linear client. It does not establish the always-running, server-side delegation
and activity reporting requested here.

Source: [Open issues with custom scripts](https://linear.app/docs/open-issues-with-custom-scripts).

### Neokod's Symphony mode

Neokod is a T3 fork whose autonomous mode polls Linear's GraphQL API for issues
within a configured project and active states, optionally filtered by assignee.
Its adapter also considers blockers. This is issue polling, not Linear's native
AgentSession webhook protocol.

Sources: [Linear tracker documentation](https://github.com/kamo62/neokod/blob/main/docs/integrations/symphony-linear.md),
[Linear adapter implementation](https://github.com/kamo62/neokod/blob/main/apps/server/src/symphony/Trackers/LinearAdapter.ts).

Its architecture records work claims, creates isolated worktrees, reuses them for
retries, and collects validation results before opening a PR. Execution currently
uses its own Codex runtime. The documentation says some configuration fields are
not enforced and the full workflow has not been exercised against a production
tracker and real PR.

Lessons: retain session identity across restarts, prevent duplicate execution,
isolate changes, and report actual checks. Keep those behaviours small and use
T3's existing thread lifecycle. Adopting the fork's scheduler and execution
system would expand this project's scope.

Source: [Symphony architecture and maturity](https://github.com/kamo62/neokod/blob/main/docs/architecture/symphony.md).

## Decisions still requiring evidence

1. Permanent installation and actual Linear-to-development-PR flow passed the
   approved AID-7 test. Workstream 3 completed lifecycle reconciliation checks, external
   native answers, active-run lost-send credential handover and isolated T3 restart.
2. Current Linear SDK event types, OAuth refresh and documented stop shapes are
   checked. The actual Stop UI webhook was not generated; a supported
   user-accessible T3 conversation URL remains unestablished.
3. Public signed delivery and bridge restart passed on separate Funnel 8443;
   private T3 443 remains unchanged.
4. The approved development test proves unattended topic push and draft PR
   creation. No merge, deployment or integration-branch push was authorized.

No existing turnkey bridge to this T3 server was found in the public searches.
That is a search result, not proof that none exists. Model inference remains with
the configured provider; hosting the service and coding workspace locally does
not make inference local.
