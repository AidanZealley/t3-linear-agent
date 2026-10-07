# Workstream 2: Linear installation and event receipt

Status: approved task packet; accepted on 7 October 2026. G1 passed.
Aidan's approved responsiveness evidence adjustment is retained; exact HTTP
response duration remains unverified and runtime deadlines are unchanged.
Workstream 1 is accepted. The frozen task packet below is unchanged.

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
- Status: Passed.
- Candidate and instructions: local candidate built on `b2103346b54369ee6f9e0651cb86244640a6c073`.
  Register an internal OAuth app named `T3`; enable only Agent session events.
  Callback is `https://aidanzealley-macbookpro10-1.tail8a28e5.ts.net:8443/oauth/callback`;
  webhook is `https://aidanzealley-macbookpro10-1.tail8a28e5.ts.net:8443/webhooks/linear`.
  Start installation at `https://aidanzealley-macbookpro10-1.tail8a28e5.ts.net:8443/oauth/start`,
  using browser Basic authentication with username `aidan` and the private setup
  password. It redirects to
  `https://linear.app/oauth/authorize?client_id=CLIENT_ID&redirect_uri=https%3A%2F%2Faidanzealley-macbookpro10-1.tail8a28e5.ts.net%3A8443%2Foauth%2Fcallback&response_type=code&actor=app&scope=read%2Cwrite%2Capp%3Aassignable%2Capp%3Amentionable&state=GENERATED_STATE&code_challenge=GENERATED_CHALLENGE&code_challenge_method=S256`.
  The real client ID, state and PKCE challenge come from local setup and the start
  route. A workspace admin must consent. Keep `clientId`, `clientSecret`,
  `webhookSecret`, `setupPassword` and `publicUrl` in an owner-managed mode-0600
  `~/.local/state/t3-linear-agent/linear-secrets.json`, with its directory mode
  0700. Enter secrets in a local editor, never chat or Git. The setup password
  must have at least 24 characters. Set `publicUrl` to the HTTPS origin above.
  Run `pnpm build` then `node dist/linear/cli.js`; it binds only `127.0.0.1:8787`.
  Proposed temporary ingress, requiring explicit owner authorization, is
  `tailscale funnel --bg --https=8443 http://127.0.0.1:8787`. Roll back with
  `tailscale funnel --https=8443 off`, stop the bridge with Ctrl-C, and verify the
  existing private Serve listener on 443 remains unchanged. Aidan owns these
  temporary commands; agents have made no host changes. The completed cleanup
  and live evidence are in plan.md acceptance evidence.
- Required evidence: admin OAuth consent, installed identity read, signed session
  delivery, and initial activity visible in Linear. No secret values in records.
- Attempts and lasting decisions: Aidan registered T3 and entered secrets privately.
  He chose to run the bridge and Funnel himself. Private file metadata and
  persisted installation identity passed read-only checks; Linear confirms T3
  app, assignable and mentionable flags. Earlier AID-6 delivery failed public
  DNS before HTTP. Aidan resolved DNS; public resolver and TLS-verified relay
  checks passed. A later fresh AID-6 session supplied the signed receipt and
  initial activity, and one authorized existing-UUID reconciliation passed.
  Exact live evidence and approval are preserved in plan acceptance evidence
  and this handoff. Owner cleanup passed read-only verification at 12:19 UTC.
  Temporary ingress and the validation bridge are stopped; private installation,
  store and secrets are retained. G2 must authorize any later host installation.
- Completion evidence: read-only Funnel/Serve JSON contains only HTTPS 443,
  proxying to private T3 on `http://127.0.0.1:3773`, with no 8443 or Funnel allow
  entries. Loopback 8787 has no listener. Aidan's cleanup answer, exact live IDs,
  timestamps and approved evidence adjustment are preserved in plan.md.

## Implementation handoff

- Base commit: `b2103346b54369ee6f9e0651cb86244640a6c073` on `feat/linear-agent-v1`.
- Outcome and files changed: local installation and receipt candidate implemented
  in `src/linear/{events,client,worker,cli}.ts`, `src/http.ts`, `src/store/index.ts`,
  and `test/linear/edge.test.ts`. Added official `@linear/sdk` 97.0.0 to package
  dependencies and lockfile, and operator setup to README. No T3/config changes.
- Concrete contracts and decisions:
  - `Store` owns one private SQLite file, defaulting to
    `~/.local/state/t3-linear-agent/bridge.sqlite`. Node 24's built-in SQLite
    avoids another database dependency. DELETE journaling and FULL synchronous
    writes protect the receipt transaction. The private directory is mode 0700;
    database and secret files are mode 0600, outside the checkout. Symlinks and
    group/world permissions on those files are rejected. Tokens are protected
    by filesystem access, not encrypted with a key stored beside them.
  - Tables are `installation(id=1,value JSON)`,
    `oauth_state(hash,verifier,expires_at)`,
    `receipts(sequence,delivery_id UNIQUE,event JSON,consumed)`, and
    `initial_activities(session_id PRIMARY KEY,activity_id UNIQUE,attempts,next_at,status)`.
    The receipt and initial activity UUID are committed in one transaction before
    HTTP 200. A session gets one logical initial activity even across distinct
    created deliveries. The receiver never calls T3 or waits for the Linear API.
  - `Store.installation/saveInstallation` provide the workspace, OAuth client and
    app-user IDs plus rotating access/refresh token, expiry and granted scopes.
    The installed identity cannot be silently replaced. Composition reuses this
    store. `pendingEvents()` returns unconsumed `{sequence,deliveryId,event}` in
    receipt order; `consumeEvent(sequence)` marks progress after durable dispatch
    intent is persisted by composition. Created prompt context, issue data and
    guidance, prompted content and signal are retained. Previous comment arrays
    and execution/conversation history are not copied.
  - `Linear.start/callback` implement owner-authorized installation, browser-bound
    one-time state, ten-minute state expiry, PKCE S256, form-encoded exchange and
    app actor identity read. A callback verifies app status, T3 name, assignable
    and mentionable access before saving credentials. Client ID comes from the
    registered app; SDK viewer and organization supply app-user/workspace IDs.
    `Linear.client()` refreshes within five minutes of expiry, serializes refresh
    rotation and saves both replacement tokens before returning the SDK client.
    API clients have a four-second abort signal and should be requested immediately
    before each operation. Linear renewal is independent of T3 pairing renewal.
  - `Linear.activity(input)` derives input from the installed SDK's
    `createAgentActivity` method. `Linear.links(sessionId,input)` uses typed
    `addedExternalUrls/removedExternalUrls` through `updateAgentSession`; it does
    not replace unrelated links. `initialActivity` reuses its persisted UUID and
    reconciles a failed create by reading that activity and verifying its session.
    The SDK exposes a caller-provided UUID activity ID, which is the duplicate
    boundary for uncertain API responses. Live existing-UUID reconciliation passed G1.
  - `InitialActivityWorker` delivers due activities independently in parallel so
    one session's API timeout does not delay another session's initial activity.
    Each poll reads newly due records even while earlier sends remain active;
    an activity-ID map prevents overlapping polls from sending the same activity.
    It polls every 250 ms, retries six times with bounded exponential delay, then
    keeps `failed` records. `retryFailedActivities()` resumes them with their same
    IDs. `stop()` waits for all in-flight deliveries; restart resumes pending records.
  - HTTP exposes only GET `/oauth/start`, GET `/oauth/callback`, and POST
    `/webhooks/linear`. The CLI binds loopback 8787. Webhook bodies are bounded to
    1 MiB; request/header deadlines are four seconds. The SDK helper verifies raw
    HMAC and the signed body's timestamp within sixty seconds, including future
    timestamps. Workspace/client/app-user IDs, nested session identity and any
    activity's session ID must match the installation. The unsigned timestamp
    header is never trusted. Unknown actions are rejected rather than invented.
    Request targets are parsed inside the handler's error boundary; malformed
    URLs receive HTTP 400 and leave the listener available for subsequent requests.
  - Verified official documentation on 7 October 2026:
    [OAuth](https://linear.app/developers/oauth-2-0-authentication),
    [agents](https://linear.app/developers/agents),
    [interaction](https://linear.app/developers/agent-interaction),
    [webhooks](https://linear.app/developers/webhooks), and
    [SDK helpers](https://linear.app/developers/sdk-webhooks).
    SDK 97.0.0 includes AgentSessionEvent types and `LinearWebhookClient.verify`,
    which verifies signature before parsing and reads only the signed timestamp.
    OAuth refresh uses the documented token endpoint; SDK supplies API operations.
- Verification commands and results: `pnpm test` passed all 23 tests, including
  seven Linear tests and all 16 accepted T3 tests. `pnpm typecheck`, `pnpm build`,
  and `git diff --check` passed. Focused invocation is
  `node --test test/linear/edge.test.ts`. Tests protect raw bytes/timestamps,
  browser-bound state and state replay/expiry, durable duplicate receipt/order,
  HTTP response before API delivery, identity rejection, restart/retry, token
  rotation, malformed-target rejection followed by signed-webhook receipt, and
  independent delivery of a late-arriving session while an earlier send is blocked.
  Overlapping flushes send each activity once, and shutdown waits for every active
  send. These are synthetic local checks, not evidence of Linear delivery.
- Simplification/deletion pass: used Node's built-in SQLite, the SDK signature
  helper and API method-derived types. Removed a redundant event parsing helper
  and cast; retained separate receipt-consumption and initial-reporting state
  because composition must resume each responsibility independently.
  Remediation replaced the shared batch promise with one map of active delivery
  promises. Polling and shutdown use that same map; no queue or scheduler was added.
- Recovery verification: sequential fresh independent audits confirmed recorded
  base, branch and ownership of every candidate file, with prior R1/R2 closure
  remaining sound. Focused and all 23 package tests, typecheck, build and
  tracked/untracked whitespace checks passed on Node 24.19.0 and pnpm 11.20.0.
  This gate-closure recovery changes documentation only; its fresh focused
  reviewer passed seven Linear tests and whitespace checks. No implementation
  correction or further remediation loop was needed.
- Lasting G1 handoff: Aidan registered the app and operates temporary bridge/Funnel
  himself; agents verify read-only. Private secret-file metadata and SQLite
  installation identity passed checks. The first AID-6 delivery failed public
  DNS before HTTP and was not retried. Aidan confirmed app settings and matching
  signing secret, then resolved public DNS. Google/Cloudflare answers and normal
  TLS-verified HTTPS pinned to each of three public relays proved public readiness.
- Fresh AID-6 receipt/acknowledgement passed: one signed receipt, one sent initial
  intent with zero failed attempts, and exactly one matching persisted activity
  UUID. API timestamps prove activity creation 1.772 seconds after session
  creation and 514 ms after signed event time; the owner screenshot proves
  visibility. Aidan authorized one exact existing-session/persisted-UUID call,
  which resolved at 12:06 UTC. Read-only API retained exactly one matching
  activity with its original creation timestamp and no next page. No new issue,
  session or coding thread was created. Plan acceptance evidence retains exact
  IDs and timestamps from resolved `G1-LIVE-2026-10-07`.
- Approved evidence adjustment, 7 October 2026: Aidan accepts his observed prompt
  response and verified 1.772-second initial-activity timestamps as sufficient G1
  responsiveness evidence. He said, "Yeah do that and if I start seeing timeout
  errors I'll revisit it". Exact HTTP response duration remains unverified.
  Five-second HTTP and ten-second initial-activity runtime requirements remain
  unchanged. Do not add timing logging, request telemetry or repeat delegation
  solely for this gate. Exact live IDs, timestamps and one-call reconciliation
  evidence are preserved in plan.md's workstream 2 handoff.
- Final acceptance recovery: branch/base and candidate ownership match prior
  records. Sound independent review, one remediation pass and focused closure
  remain reusable. Seven focused Linear tests and diff checks passed again.
  Prior 23-test, typecheck and build results remain sound for this documentation-only
  acceptance. No implementation change or further review loop was needed.
- Lasting cleanup handoff, 12:19 UTC: Aidan said "It's all stopped now".
  Read-only Funnel/Serve JSON shows only HTTPS 443 to `http://127.0.0.1:3773`;
  public 8443 and Funnel allow entries are absent. `ss -ltn 'sport = :8787'`
  shows no listener. Private directory/store/secret-file modes remain
  0700/0600/0600. Installation, store and secrets were preserved. No agent changed
  host/process state. Resolved cleanup escalation was removed after this handoff.
- Installed status and external checks: the Linear T3 app actor and private
  installation are retained. Temporary validation bridge and ingress are stopped.
  Permanent bridge installation, coding composition and end-to-end PR proof remain
  workstreams 3 and 4 under G2/G3. G1 acceptance grants no services, coding dispatch,
  push or merge authorization. API outage can prevent the visible activity
  deadline; persisted intent retries afterward using the same UUID.
- Specification drift: approved G1 evidence adjustment only; runtime requirements
  unchanged. Exact HTTP response duration remains unverified. Workstream 2 is
  accepted with no required findings or deferred optional observations.

## Independent review

- Reviewer: independent fresh Codex subagent, 7 October 2026. Reviewed the
  complete uncommitted candidate against base
  `b2103346b54369ee6f9e0651cb86244640a6c073`, including untracked implementation
  and tests, repository instructions, product sources and the accepted T3 handoff.
- Verdict: two required corrections before the candidate is ready for G1.
  Registration, consent, ingress authorization and live evidence remain external
  gate requirements; their absence is not an implementation finding.
- Required R1: malformed request targets terminate the bridge. `src/http.ts:22`
  constructs the URL before entering the handler's `try`. An isolated loopback
  reproduction sending `GET //[ HTTP/1.1` to `bridgeServer` exited Node 24.19.0
  with an uncaught `TypeError: Invalid URL` at that line. Node accepts this request
  target, and the async listener's rejection is unhandled. Parse untrusted request
  targets inside the error boundary and return an error without stopping receipt
  of subsequent webhooks. Verify the process remains available after this input.
- Required R2: a new session waits behind an earlier activity batch.
  `src/linear/worker.ts:9-17` caches one promise for the whole `Promise.all` batch,
  so polling never reads newly due records until every older send finishes.
  An isolated Store/worker reproduction began a blocked send for `first`, then
  persisted `later` and called `flush` again. Both calls returned the same promise;
  only `first` had been invoked after 100 ms, and `later` started only after
  releasing the first send and flushing again. The existing slow-session test
  inserts both records before the first flush and therefore misses this case.
  The production send can spend four seconds creating an activity and four more
  reconciling its failed response, or also four seconds refreshing credentials.
  A later healthy send can consequently miss the ten-second initial-activity
  deadline because of another session. Dispatch new due records while older
  records are in flight, preserving one concurrent send per activity and shutdown
  waiting. Verify a session arriving after a flush starts is sent independently.
- Optional observations: none.
- Questions: none.
- Verification: `node --test test/linear/*.test.ts` passed all seven Linear tests;
  `pnpm test` passed all 23 tests; `pnpm typecheck`, `pnpm build`, and
  `git diff --check` passed. The two isolated reproductions above used synthetic
  local data and no accounts, host configuration or T3 coding work.
- SDK and documentation checks: installed SDK 97.0.0 declares the session's
  organization/app IDs and optional issue, the event's OAuth client/app/workspace
  IDs, guidance and prompt context, and activity `content`, session ID and signal
  with shapes compatible with the retained schema. Its raw-body helper checks
  HMAC before parsing and enforces the signed timestamp's sixty-second window.
  API activity input accepts a UUID and session updates accept added/removed URLs.
  Current official [OAuth documentation](https://linear.app/developers/oauth-2-0-authentication)
  supports the implemented form exchange, PKCE and refresh-token rotation,
  including a thirty-minute grace period for retrying an uncertain refresh.
  The [interaction documentation](https://linear.app/developers/agent-interaction)
  confirms the five-second HTTP and ten-second initial-activity deadlines.
  G1 instructions name concrete URLs, app actor/scopes, private secret entry,
  loopback listener and exact proposed ingress/cleanup. Live UUID reconciliation
  and visible timing remain checks for G1; synthetic fixtures do not prove them.

## Resolution

- R1 accepted. An untrusted request target could reject outside the HTTP error
  boundary and terminate receipt. URL parsing now returns HTTP 400 inside that
  boundary. The focused test sends the malformed target and then successfully
  delivers a signed webhook to the same server.
- R2 accepted. A global batch promise held later receipts behind older activity
  delivery. A single activity-ID map now tracks concurrent sends; each poll starts
  newly due records, skips already active IDs and lets shutdown await all sends.
  The focused test inserts a second session after the first send blocks and
  proves independent delivery without duplicate concurrent sends.
- Simplification/deletion pass: replaced the batch promise with one in-flight
  map. No queue, scheduler abstraction or additional persistent state was added.
- Final verification: remediation passed seven focused Linear tests, all 23
  package tests, typecheck, build and diff validation. Fresh closure passed both corrections; the lead reran all 23 tests,
  typecheck and build successfully. Subsequent G1 evidence and acceptance are
  recorded in the implementation handoff and plan; the original review did not
  claim live proof.

## Closure review

- Reviewer: fresh focused Codex subagent, 7 October 2026. Checked accepted R1
  and R2 and their direct corrections against the uncommitted candidate on
  `feat/linear-agent-v1`, based on `b2103346b54369ee6f9e0651cb86244640a6c073`.
  Inspected the HTTP handler, worker, focused tests, SQLite activity transitions
  and CLI shutdown path against the packet and product sources.
- Verdict: both corrections passed focused closure. No remaining required
  implementation findings in these corrections. G1 remains pending.
- R1 passed: `src/http.ts` parses the request target inside the handler's error
  boundary with `URL.parse`; an invalid target returns HTTP 400. The focused test
  sends `GET //[`, receives 400, then posts a valid signed webhook to the same
  listener and verifies HTTP 200 and durable receipt. The process stays available.
- R2 passed: each `flush` reads newly due activities and starts sends before
  awaiting active promises. The activity-ID map prevents concurrent duplicate
  sends, and `stop` waits for the active deliveries. The focused test blocks the
  first send, inserts a second session, and verifies that the second starts
  before the first finishes. Another overlapping flush starts neither twice;
  shutdown remains pending until both sends finish. Retry/restart checks also
  pass with the same durable activity ID.
- Verification: on Node.js 24.19.0, `node --test test/linear/edge.test.ts`
  passed all seven tests. `pnpm typecheck`, `pnpm build`, and `git diff --check`
  passed. These checks used synthetic data, temporary SQLite files and loopback
  HTTP only. They do not prove live OAuth, signed Linear delivery, UUID
  reconciliation or visible activity within ten seconds; those remain G1 checks.
- Remaining required findings: none within the focused closure scope.

### Approved gate evidence recovery, 7 October 2026

- Fresh focused reviewer confirmed `feat/linear-agent-v1` and base
  `b2103346b54369ee6f9e0651cb86244640a6c073`. Every tracked and untracked change
  belongs to the recorded workstream 2 ownership, including its dependency and
  evidence documentation updates. The accepted workstream 1 remains untouched.
  Prior independent review, one remediation pass and R1/R2 closure remain sound;
  this recovery introduces no implementation change or general review loop.
- R1 and R2 still pass. Invalid request targets return 400 before a subsequent
  signed webhook succeeds. Later sessions start while an earlier send remains
  blocked; overlapping polls preserve one send per activity, and shutdown drains
  active sends. Durable retry continues to reuse the same activity UUID.
- The handoff, plan, specification, research and operator README preserve Aidan's
  approved responsiveness evidence adjustment and the unverified exact HTTP
  duration. The five-second HTTP and ten-second activity requirements remain
  unchanged. Signed receipt and the authorized single-call existing-UUID proof
  remain recorded in the plan; neither required another live mutation.
- Verification on Node.js 24.19.0: `node --test test/linear/edge.test.ts` passed
  all seven tests. Tracked `git diff --check` and untracked-file whitespace checks
  passed. Prior 23-test, typecheck and build results remain reusable for this
  documentation-only adjustment.
- Read-only Funnel/Serve and listener checks at 12:16 UTC still show public 8443
  to `127.0.0.1:8787`, bridge 8787 listening, and private Serve 443 to
  `127.0.0.1:3773`. `G1-CLEANUP-2026-10-07` is the sole remaining gate blocker.
  Aidan owns cleanup; no bridge, Funnel, service or account mutation was made.
- Required implementation findings: none. Optional findings: none. Questions:
  none. Workstream 2 remains blocked and uncommitted pending owner cleanup;
  this review grants no G2/G3, coding dispatch, push or merge authorization.

## Acceptance

Accepted on 7 October 2026 after read-only verification of Aidan's temporary
bridge/Funnel cleanup. The original independent review, one remediation pass and
fresh focused closure remain sound. No new implementation change was needed.
G1 is Passed; the lasting handoff and exact live evidence are recorded above and
in plan.md. Exact HTTP response duration remains unverified under Aidan's approved
evidence adjustment. Runtime deadlines remain unchanged. Private installation,
store and secrets are retained; persistent hosting and coding execution await
later workstreams and gates. No required findings or optional observations remain.
