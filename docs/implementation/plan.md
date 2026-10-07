# First-version implementation plan

Status: approved by Aidan on 7 October 2026; workstreams 1–3 are accepted.

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
| 2 | [Linear installation and event receipt](02-linear-installation.md) | 1 | Accepted |
| 3 | [Session execution and recovery](03-session-lifecycle.md) | 1, 2 | Accepted |
| 4 | [Host installation and live development PR](04-installation-validation.md) | 3 | Accepted |
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

### Workstream 2, accepted 7 October 2026

- Delivered local OAuth app-actor installation, PKCE/browser state, rotating
  Linear tokens, signed event validation, durable SQLite receipt and initial
  activity retry. Typed SDK activity and session-link operations are available
  to composition. HTTP receipt is independent of T3 and coding execution.
- Reviewed base is `b2103346b54369ee6f9e0651cb86244640a6c073` on
  `feat/linear-agent-v1`. Candidate files are attributable to workstream 2;
  accepted workstream 1 contracts remain unchanged. The accepted change contains
  implementation, handoff and plan updates in one workstream commit.
- Prior verification passed all 23 tests, typecheck, build and tracked/untracked
  whitespace checks on Node 24.19.0 and pnpm 11.20.0. Independent review's two
  required corrections, malformed-target crash and late-event delivery blocking,
  passed one remediation pass and fresh focused closure. No implementation
  correction was needed during subsequent gate recovery.
- Lasting owner decisions: Aidan registered T3, entered secrets privately and
  operates temporary bridge/Funnel himself. Agents verify read-only and must
  not start, stop, restart or change either. Private directory/file metadata
  passed 0700/0600 checks without exposing contents. Installed IDs and live
  evidence are retained below. No host services or coding tasks were started
  by agents, and no G2/G3 authorization follows.
- Resolved DNS diagnostics: Aidan confirmed enabled Agent session events, the
  expected webhook URL and matching private signing secret. The earlier AID-6
  session `4432dc26-e3b8-488a-a439-928cc04bb7a7` failed before HTTP because DNS
  lookup failed, and Linear did not retry. Aidan resolved public DNS; subsequent
  Google/Cloudflare answers and normal TLS-verified HTTPS pinned to each of the
  three public relay addresses proved public readiness without MagicDNS.
  The later fresh event/session on existing AID-6 supplies the live proof below.
- Aidan authorized exactly one call using the existing session and persisted
  initial-activity UUID. The call and follow-up API check passed without a second
  activity. No further activity call, issue/session creation, message or coding
  dispatch is authorized. "Working..." is expected because this candidate only
  acknowledges; workstream 3 owns final lifecycle reporting.
- Concrete schema and composition contracts are in the
  [workstream 2 handoff](02-linear-installation.md#implementation-handoff).
- Approved G1 evidence adjustment, 7 October 2026: Aidan accepts his observed
  prompt response plus the verified 1.772-second initial-activity timestamps as
  sufficient responsiveness evidence for G1. His exact approval was "Yeah do
  that and if I start seeing timeout errors I'll revisit it". Exact original
  HTTP response duration remains unverified. This adjusts the gate's evidence;
  the five-second HTTP and ten-second initial-activity runtime requirements
  remain unchanged. No response-timing logging, telemetry request or fresh
  delegation is required solely to close this evidence gap.
- Verified evidence retained from resolved `G1-LIVE-2026-10-07`, recorded at
  11:44 UTC on 7 October 2026: read-only SQLite has one
  durable `created` receipt, sequence 1, delivery
  `76a7ed6f-fc0d-4399-ad28-803aaadc7b08`, for AID-6 session
  `59f7671f-3e94-4474-ac86-62ab0b1ad95d`. Its signed timestamp is
  `2026-10-07T11:41:42.846Z`; the persisted initial intent's unchanged `next_at`
  is `2026-10-07T11:41:43.153Z`, 307 ms later. Receipt identity matches installed
  workspace `3afa0fa8-1d2b-42ae-97d6-4c78c0e04062`, app user
  `bce8f748-3b4b-462d-91c4-dba29d01fa84`, client
  `f9fb74f937104357c1922e3613101ea9`. Receipt provenance is the reviewed signature,
  timestamp and identity-validated HTTP path; raw signature/body are not retained.
  SQLite has one initial activity, UUID `13e5f555-1e22-4d0b-be66-864ac6625923`,
  status `sent`, attempts 0. Read-only Linear API confirms this exact session was
  created at `11:41:41.588Z`, started at `11:41:43.380Z`, and has exactly one
  activity with that UUID, created at `11:41:43.360Z`, containing the expected
  thought. The API connection has no next page. Activity creation was 1.772 s
  after session creation and 514 ms after the signed event timestamp, proving
  the initial activity was sent within ten seconds. The owner screenshot proves
  it is visible. API also confirms T3 app, assignable and mentionable flags.
  Linear remains active with no endedAt, as expected for this candidate.
- Scoped reconciliation evidence at 12:06 UTC: the lead made exactly one
  `Linear.initialActivity("59f7671f-3e94-4474-ac86-62ab0b1ad95d", "13e5f555-1e22-4d0b-be66-864ac6625923")`
  call. It resolved between `12:06:24.575Z` and `12:06:25.783Z`.
  Subsequent read-only API returned exactly one activity, the same UUID and fixed
  thought, with original creation time `11:41:43.360Z` and no next page. No second
  activity was created. This proves live existing-UUID reconciliation; the probe's
  1.208 s duration is not evidence of the original webhook response time.
- Final cleanup and acceptance at 12:19 UTC: Aidan reported "It's all stopped
  now". Read-only `tailscale funnel status --json` and `tailscale serve status
  --json` show only HTTPS 443, still proxying to `http://127.0.0.1:3773`.
  Public 8443 and all Funnel allow entries are absent. `ss -ltn 'sport = :8787'`
  returns no listener. Private directory/store/secret-file metadata remains
  0700/0600/0600. Agents made no host/process changes and preserved the private
  installation, store and secrets. Resolved `G1-CLEANUP-2026-10-07` is retained
  here as the lasting cleanup handoff; its escalation is removed.
- Recovery confirmed branch/base and ownership of every candidate change.
  Prior independent review, one remediation pass and fresh focused closure remain
  sound. Seven focused Linear tests and diff validation passed again; recorded
  23-test, typecheck and build results remain reusable for this documentation-only
  acceptance. No implementation correction, further review loop or additional
  account/issue dispatch was needed. No required or optional findings remain.
- Installed status: T3 is installed as an assignable/mentionable Linear app actor,
  with identity and credentials retained in the private SQLite store. The temporary
  validation bridge and public ingress are stopped. No persistent bridge service
  or coding integration is installed; private T3 on Serve 443 remains unchanged.
- Pending external checks: workstream 3 owns coding composition and recovery;
  workstream 4 owns permanent service/public endpoint installation under G2 and
  the development issue/draft PR under G3. External question answers and controlled
  isolated T3 restart remain whole-feature live checks. G1 Passed grants no host
  changes, coding dispatch, push or merge authorization. Exact HTTP response
  duration remains unverified under the approved evidence adjustment above.

### Workstream 3, accepted 7 October 2026

- Delivered a runnable Node 24 composition with exact Linear-project/T3-title
  routing, pinned project/thread identities, one global coding slot, a durable
  queue and ordered same-thread follow-ups. Missing/duplicate project selection
  asks for clarification; correcting it resumes the same session. Unavailable
  targets fail without rerouting. Saved thread bindings are checked before work.
- SQLite retains session/input state, outgoing mutation inputs, request keys and
  OAuth-session identities before sends, then returned IDs. Lost launch/send
  responses reconcile exact durable thread/message/run identities; ambiguous
  outcomes pause dispatch. Renewal uses that same reconciler. Restart restores
  known work before queued sessions. Reporting has stable UUIDs, ordered retries
  and a forwarding cursor, and never repeats coding work to recover a report.
- Native questions accept supported answers on the original thread. Permission
  approvals remain in T3. Linear's documented `agentActivity.signal: "stop"`
  and explicit stop requests cancel queued input/runs and interrupt the
  active run by pinned ID. Ordinary replies cannot restart stopped work; explicit
  `/resume` is required. Ten-minute public heartbeats and confirmed final outcomes
  exclude reasoning/activity/raw command items. Investigations can finish without
  a PR; PR URLs are reported and added to session links when present.
- Verification: 15 focused session tests, all 38 package tests, typecheck, build
  and tracked/untracked whitespace checks passed. Independent review found two
  required corrections, saved-thread binding before follow-ups and crash-safe
  continuation after a final-report commit. One remediation pass and fresh focused
  closure passed; the lead reran package tests/typecheck/build. No remaining
  required findings, optional observations or specification drift.
- Live isolated evidence used T3 `0.0.46-nightly.20261007.2761` on loopback 3973
  with disposable repositories under `/tmp/t3-linear-ws3-dev`, without Linear
  account calls. Native request `{test_word: "blue"}` returned sequence 25;
  thread `mcp:14b46127-e4ee-4ac0-89d0-34cea136a1b7` completed ordinal-1 run at
  `2026-10-07T12:35:34.815Z` with `QUESTION ANSWER RECEIVED blue`.
- Synthetic local receipts then drove the real service/client across two isolated
  projects serially. A deliberately discarded accepted send response retained
  session `ws3-rotation-2`, thread `mcp:b1f949c0-6194-4b08-be55-f16ed3562689`,
  its stable key and old OAuth namespace. Reconciliation adopted the exact durable
  message and ordinal-1 run with one send. Replacement credential read the same
  still-active harmless run. After isolated T3 restart and SQLite reopen, the same
  thread completed ordinal-2 follow-up with `RESTART FOLLOWUP OK`; replay preserved
  two launches and three sends. Exact IDs and non-secret evidence references are
  in the [workstream 3 handoff](03-session-lifecycle.md#implementation-handoff).
  Live probes precede the final formatting/report-order/binding/continuation
  guards, whose focused synthetic checks passed.
- Cleanup: seven isolated repository/worktree statuses remained clean. Isolated
  bearer sessions and pairing grants reached zero; saved bearer returned 401,
  then its file was removed. The isolated process stopped and its log was removed.
  Existing T3, private configuration, Linear app/store/secrets, existing issue,
  stopped owner bridge/Funnel and host services were untouched. No push or PR.
- Installed status: runnable local candidate only. `pnpm build` then explicitly
  configured `pnpm start` composes HTTP on loopback 8787; `node dist/main.js status`
  and `retry-reports` provide operator inspection and reporting recovery. Required
  files are private `linear-secrets.json`, `t3.json`, `bridge.sqlite`, and explicit
  provider/model/repository/base-branch configuration in `sessions.json`. SIGINT
  and SIGTERM drain service operations and preserve independent T3 coding work.
  No persistent bridge or coding integration is installed.
- Pending external checks and lasting workstream 4 handoff: G2 must authorize
  permanent host/public endpoint changes; use only the accepted edge listener
  during its ingress check. Before composed startup under G3, Aidan must authorize
  repository/base/test issue and dispatch scope and settle the retained unconsumed
  G1 AID-6 receipt. Its initial acknowledgement is not coding authorization.
  Preserve signed receipt/activity evidence and do not dispatch or post further
  activities to that old session without an explicit decision. G3 then proves
  unattended editing/checks/push/draft-PR permission and actual Linear-to-PR flow.
  No supported user-accessible T3 conversation URL was established. Native answer
  and controlled restart checks are complete; live Linear Stop UI was not
  generated, its shape is verified from official docs and SDK. G1 exact HTTP
  duration remains unverified under the approved evidence adjustment; five-second
  HTTP and ten-second initial-activity deadlines are unchanged.

### Workstream 4, installed G2/G3 evidence verified, 7 October 2026

- Recovery audited the complete diff, branch and recorded starting commit. HEAD
  was accepted workstream 3 `d35e6e4aae64827c286757e7f12cb494b3f00480`;
  the only interrupted change was row 4 Implementing. All subsequent changes are
  attributable to this workstream: deployment files, README operator instructions,
  packet implementation/review records and this plan. No overlapping work exists.
- Delivered candidate uses one edge-only systemd user unit, with a separate
  lifecycle drop-in reserved for G3. User lingering is already enabled, so the
  service can survive logout and start at boot. Secrets/state remain private in
  the retained directory; direct Node execution, existing SQLite and accepted CLI
  discovery avoid extra installation machinery.
- README covers OAuth, matching project names, private configuration, renewal,
  uncertain requests, reports, logs, bridge restart and exact scoped rollback.
  Candidate preserves private T3 Serve 443 and publishes only bridge 8443 after
  authorization. No source changes or new dependencies were needed.
- Verification: build, base and merged lifecycle systemd unit validation,
  tracked/untracked whitespace checks and compiled-entrypoint checks passed.
  Independent review and a different fresh closure found no Required, Optional
  or Question findings. Lead confirmed gate boundaries and repeated base-unit
  and diff verification. No remediation pass was needed.
- Lasting owner decision: Aidan chose owner-run installation of the reviewed
  candidate. Agents have read-only verification permission, with no authority to
  change, restart or roll back the bridge or Funnel. His supplied status reports
  enabled/active service since 17:05:06 BST, PID 795670. No agent host mutation,
  account call or coding startup occurred.
- Installed status verified independently at 16:07:10–16:07:20 UTC: installed
  unit exactly matches `deploy/t3-linear-agent.service`, is owner-held mode 0600,
  has no drop-in and runs
  `dist/linear/cli.js`. It is enabled/active, PID 795670, `NRestarts=0`, bound only
  to 127.0.0.1:8787. Lingering remains enabled. Private state directory and
  Linear secret/store modes are 0700/0600/0600. `t3.json`, `sessions.json`,
  `service.env` and installed `lifecycle.conf` are absent.
- Serve/Funnel retain private 443 to 127.0.0.1:3773. Only 8443 is public, proxying
  to 127.0.0.1:8787. `t3code.service` remains enabled/active, PID 1576, active
  since 30 September 2026 06:38:23 BST. Local T3 OAuth metadata returns 200.
- Public DNS queries to 1.1.1.1 and 8.8.8.8 return NOERROR with relay IPs
  176.58.88.82, 176.58.88.108 and 176.58.92.199. Normal TLS HTTPS pinned to each
  relay returns 401 for `/oauth/start`, 404 for `/mcp` and 404 for an unrelated
  path. All nine requests report TLS verification 0 and the expected remote IP.
  These probes use public relays directly, without MagicDNS or insecure TLS.
- Read-only commands included `cmp deploy/t3-linear-agent.service
  /home/aidanzealley/.config/systemd/user/t3-linear-agent.service`,
  `systemctl --user show t3-linear-agent.service`, `systemctl --user show
  t3code.service`, `loginctl show-user aidanzealley -p Linger`, socket `ss`,
  permission-only `stat`, and both Serve/Funnel JSON status commands. DNS used
  `dig @1.1.1.1` and `dig @8.8.8.8` for the registered hostname. Each public GET
  used `curl --noproxy '*' --resolve HOST:8443:RELAY_IP --connect-timeout 10
  --max-time 20`, the registered HTTPS hostname, and status/TLS/remote-IP output
  only. No webhook POST, callback, credentials or authenticated API was invoked.
- Private SQLite projections using Python `sqlite3`, URI `mode=ro` and
  `PRAGMA query_only=ON` at 16:06:59 UTC retain two unconsumed receipts. G1
  sequence 1 remains unchanged. Historical prompted sequence 2, delivery
  `b1053f02-dc94-4fcb-a173-7fdda446b5cd`, signed timestamp
  `2026-10-07T12:14:08.406Z`, belongs to the same AID-6 session
  `59f7671f-3e94-4474-ac86-62ab0b1ad95d` and matches all installed identities.
  Both precede this service installation and cannot prove delivery to it. The
  sole initial activity remains `13e5f555-1e22-4d0b-be66-864ac6625923`, sent,
  attempts 0, unchanged `next_at=1791373303153`. Sessions/intents/reports are
  all empty. No token, signing secret, raw body or activity call was exposed.
- Recovery verified complete diff attribution to this workstream and reused sound
  independent review/closure. Candidate and installed unit checks plus
  `git diff --check` pass; no code correction or further review loop is needed.
- Lasting signed-reply handoff: Aidan reported "I sent it" for the instructed
  existing-session reply. Read-only SQLite at `2026-10-07T16:13:26.431986Z`
  verifies sequence 3, delivery `1545e836-2e56-419b-aa86-634d7434871e`, type
  `AgentSessionEvent`, action `prompted`, signed timestamp
  `2026-10-07T16:11:30.312Z`, on existing AID-6 session
  `59f7671f-3e94-4474-ac86-62ab0b1ad95d`, issue
  `4fa68d65-fd0c-4184-aa63-352e00c027ee`. Prompt activity
  `aa18433d-79cd-4305-b971-54c13f370832` names that same session and contains
  exactly `Installation receipt check only. Do not start coding.`
  Signed time is after installed-service startup `2026-10-07T16:05:06Z`.
  Workspace `3afa0fa8-1d2b-42ae-97d6-4c78c0e04062`, app user
  `bce8f748-3b4b-462d-91c4-dba29d01fa84` and client
  `f9fb74f937104357c1922e3613101ea9` match the installed identity, including
  nested session workspace/app user. This proves fresh signed public delivery
  through the reviewed signature/timestamp/identity-validated HTTP path, with
  earlier public DNS/TLS evidence retained. Raw signature/body are not retained.
- Pre-restart baseline at 16:13 UTC: bridge enabled/active/running, PID 795670,
  `ExecMainStartTimestamp=Wed 2026-10-07 17:05:06 BST`,
  `ExecMainStartTimestampMonotonic=642425996413`, `NRestarts=0`, no drop-in,
  exact reviewed unit and edge entrypoint. Read-only SQLite uses URI `mode=ro`,
  `PRAGMA query_only=ON`, and a read transaction for identity/receipt/activity/
  lifecycle projections. All three receipt rows remain `consumed=0`.
  The table below records exact serialized-event SHA-256 baselines for restart
  comparison, preserving complete event equality without copying private context.

  | Sequence | Delivery UUID | Action | Signed timestamp | Event SHA-256 |
  |---|---|---|---|---|
  | 1 | `76a7ed6f-fc0d-4399-ad28-803aaadc7b08` | created | `2026-10-07T11:41:42.846Z` | `16411760944abd062595f80085d9a9fd444c09491d9034af5e8d197ac73d5d80` |
  | 2 | `b1053f02-dc94-4fcb-a173-7fdda446b5cd` | prompted | `2026-10-07T12:14:08.406Z` | `76ab9b7e91b101d6b7df3d5c7ced0310ebdf6e1924e998734d4803e26a02d167` |
  | 3 | `1545e836-2e56-419b-aa86-634d7434871e` | prompted | `2026-10-07T16:11:30.312Z` | `747e43546c39a4a2d3878455157edc6b1b73a8dda1b9dcae7df263ad94a26d2f` |

- Original initial activity row remains session
  `59f7671f-3e94-4474-ac86-62ab0b1ad95d`, UUID
  `13e5f555-1e22-4d0b-be66-864ac6625923`, status `sent`, attempts 0,
  `next_at=1791373303153`. There is exactly one activity row and zero rows in
  each of sessions/intents/reports. No new activity, session, T3 operation or
  receipt consumption occurred. State/secret modes remain 0700/0600/0600;
  sockets stay loopback-only. Private T3 remains active, PID 1576, since
  30 September 06:38:23 BST; unauthenticated metadata is 200. Serve/Funnel
  still publish only bridge 8443, with private T3 443 to loopback 3773 unchanged.
- Resolved owner restart decision from `G2-INSTALL-2026-10-07`: Aidan said
  "Ran those now" after the exact `systemctl --user restart
  t3-linear-agent.service`, service status and is-enabled commands. Read-only
  verification at 16:18:49 to 16:19:30 UTC passes. Bridge PID changed from
  795670 to 797348; start changed from `16:05:06Z` to `16:16:54Z`, monotonic
  from 642425996413 to 643133871158. It is enabled/active/running,
  `NRestarts=0`, no drop-in, with the exact reviewed edge-only unit. This
  preserves the owner-run boundary; agents cannot mutate host services or Funnel.
- Post-restart SQLite snapshot at `2026-10-07T16:19:18.732708Z`, using URI
  `mode=ro`, query-only and one read transaction, matches all three receipt
  sequences, UUIDs, timestamps, identities and exact hashes in the table above.
  All remain `consumed=0`. Exactly one initial activity remains with original
  UUID/session, `sent`, attempts 0 and `next_at=1791373303153`; sessions/intents/
  reports each have zero rows. No acknowledgement or coding was duplicated.
- State/secret/store permissions remain 0700/0600/0600; installed unit is 0600.
  T3 credential, session configuration, runtime file and lifecycle drop-in remain
  absent. T3 stays enabled/active, PID 1576, start 30 September 06:38:23 BST,
  monotonic 23221278, with OAuth metadata HTTP 200. Private 443 still proxies
  to loopback 3773; only public 8443 proxies to loopback 8787.
- Fresh delegated read-only verification independently confirms branch/base,
  complete diff ownership, exact installed unit, retained state and ingress.
  Unit validation and tracked/untracked whitespace checks pass. Prior candidate
  review/closure remain sound; no code or deployment correction was needed.
- A fresh focused handoff check found no G2/G3 boundary gap. Its observation
  that the workflow README still describes the original pre-implementation
  baseline is outside this gate recovery; the frozen workflow and historical
  review records remain intact. It does not affect gate evidence or authority.
- G2 Passed. Workstream 4 stays Blocked on `G3-DEVELOPMENT-2026-10-07` before
  pairing, configuration, retained-input mutation, composition or coding.
  G1's approved responsiveness evidence adjustment remains in force, with
  runtime deadlines unchanged. No drift. Work remains uncommitted.

- Approved G3 decision, resolved into this lasting handoff: Aidan said "do it"
  to the exact proposal and authorized the lead-run narrow transition. This
  supersedes the earlier G2 owner-run boundary only for private backup, exact
  receipts 1/2/3 disposition, T3 pairing, private configuration, reviewed lifecycle
  override and bridge-only stop/start/restart needed for readiness and recovery.
  Funnel and the existing T3 service remain outside that authority. The approved
  test permits one isolated worktree from `main`, only `docs/bridge-validation.md`,
  meaningful checks, one topic-branch push and one draft PR in
  `AidanZealley/t3-linear-agent`. Initial fresh Linear issue and delegation remain
  owner-run. AID-6 is never coding authorization.
- Fresh delegated baseline at `2026-10-07T16:28:59.575531Z` passed exact
  receipt hashes and identities above, original sent activity, empty lifecycle,
  reviewed edge service PID 797348 and absent G3 files. Main, origin/main and
  remote `refs/heads/main` all equal
  `b47c831c3c2ac8434758934fd860c60423025b58`. GitHub authenticated readiness
  confirms SSH protocol, repository scope, default main and push/admin permission.
  Actual push/PR permission remains subject to the approved end-to-end test.
- Lead named exact host/private items before touching them, stopped only the
  bridge and made private mode-0700 backup
  `/home/aidanzealley/.local/state/t3-linear-agent/backup-g3-20261007T162939Z`,
  with copied files mode 0600. Stopped-state compare passed the exact three
  UUID/hash/session baselines, original activity and empty lifecycle. Only
  `Store.consumeEvent(1)`, `(2)`, `(3)` ran in one transaction. Receipt rows,
  event hashes, installation and original activity were preserved.
- Private `T3_RUNTIME_MODE=full-access pnpm t3 pair` succeeded without printing
  pairing material or bearer. Live catalog returned exactly one title match
  `t3-linear-agent`, project `12d819d1-ac0b-46a7-8f03-23d44601ee04`, workspace
  `/home/aidanzealley/code/t3-linear-agent` and approved GitHub identity. Catalog
  contains provider `codex` and model `gpt-6.1-sol`; no substitute was used.
  Credential endpoint and full-access ceiling were checked without exposing secrets.
- Created mode-0600 `sessions.json` for only that project/root, `baseRef=main`,
  approved provider/model, plus mode-0600 `service.env` containing
  `T3_RUNTIME_MODE=full-access`. Installed only reviewed `deploy/lifecycle.conf`
  at `/home/aidanzealley/.config/systemd/user/t3-linear-agent.service.d/lifecycle.conf`,
  reloaded the user manager and started only the bridge. It reports active/running,
  PID 799376, start `2026-10-07T16:30:16Z`, `NRestarts=0`. Independent readiness
  verification is in progress. No fresh issue, T3 coding thread, push or PR has
  been created. G3 Testing, not Passed; owner delegation and actual PR/recovery
  proof remain required. No drift.

- Fresh independent readiness reviewer found no Required, Optional or Question
  findings. It independently confirmed deployed candidate equality, enabled/active
  composed service, full-access process runtime, restrictive private files,
  unchanged installation/activity and receipt bytes with only consumed 0 to 1
  for sequences 1/2/3, empty lifecycle, exact catalog target/model, authenticated
  GitHub SSH and main readiness. T3/private ingress remain unchanged. Available
  `list_thread_pull_requests` returned no links; no PR was worked on. No meaningful
  implementation correction or new review loop is needed. Prior candidate
  review/closure remains valid. `git diff --check` passes.
- Resolved `G3-DEVELOPMENT-2026-10-07` into the lasting approved authority and
  transition handoff above. Row 4 is Blocked only on the owner initial fresh issue
  and single delegation under `G3-OWNER-DELEGATION-2026-10-07`. No commit is made
  while blocked. G3 remains Testing until actual PR/link/recovery proof passes.

- Resolved owner delegation `G3-OWNER-DELEGATION-2026-10-07`: Aidan supplied
  https://linear.app/aidan-zealley/issue/AID-7/add-bridge-validation-note after
  once-only delegation instructions. Read-only SDK verified issue
  `b1b3c2fc-411e-499a-95fa-1c79ad304794`, exact project `t3-linear-agent`
  `9f92b9d0-df1b-41de-894f-c19828253a3f`, T3 delegate and approved one-file task.
  Fresh signed created sequence 4, delivery `dc8769b9-38cd-4ca9-aced-958ba7e98355`,
  timestamp `2026-10-07T16:35:57.824Z`, session
  `4d767411-1b94-4b59-8043-34e870a30b14`, matches installed identities; SHA-256
  `f0cc2b3a399aec4107ce6a3de1d181898e8c893bc2cb971f11eb9649516a8cb6`.
  Receipts 1/2/3 and original activity retain their exact evidence; no old coding.
- End-to-end: exactly one confirmed launch/send, matched T3 project
  `12d819d1-ac0b-46a7-8f03-23d44601ee04`, thread
  `mcp:605f3d54-4297-45a2-bc4f-4258b96303e5`, one completed ordinal-1 run at
  `16:37:01.379Z`, no questions/pending inputs/uncertain intents. Managed worktree
  `/home/aidanzealley/.t3/worktrees/t3-linear-agent/linear-aid-7-4d767411-1b94-4b59-8043-34e870a30b14`
  uses branch `linear/aid-7-4d767411-1b94-4b59-8043-34e870a30b14` from approved main.
  Supported [T3 conversation](t3-thread://v1/7ece0ca2-be22-4b03-bbf1-f8e4605a2b17/mcp%3A605f3d54-4297-45a2-bc4f-4258b96303e5).
- Exactly one repository PR: [draft #1](https://github.com/AidanZealley/t3-linear-agent/pull/1),
  open against `main`, only `docs/bridge-validation.md`, exact approved sentence,
  one addition, head `5c03e7dfea60d699520e1a7014cc3ea0f8ad4f18`. Worktree clean;
  actual diff inspected and `git diff --check main...HEAD` passed. Main is
  documentation-only with no CI checks configured. Only test branch was pushed;
  no integration push, merge, deployment, production access or extra dispatch.
- Linear session is complete with PR external URL and visible initial/progress/
  final activities. Initial UUID `e4a2ddeb-2b09-473d-8c5d-2d0c3227a6f1` at
  `16:35:58.433Z`, 0.609 s after signed receipt; progress
  `9841fd58-68c1-44fc-8dd7-81e3ed4bffac` at `16:35:59.610Z`; final
  `39c08136-1536-4a1e-ade9-347b367efbc3` at `16:37:02.555Z` includes checks/PR.
  PR registered immediately on observation with calling T3 thread
  `64423b31-d5b3-49a6-bfd4-423c7d12f939`, `alreadyLinked=false`; lead repeated
  with `alreadyLinked=true` and final list audit confirms exactly draft #1.
  Coding thread native PR metadata remains null; no claim of that separate link.
  The exposed link tool registers to the calling conversation.
- Lead-run authorized bridge-only restart at `2026-10-07T16:38:33Z` changed PID
  799376 to 800839, enabled/active/running, `NRestarts=0`. Read-only transactional
  before/after snapshots match all rows exactly: receipts 4, initial activities 2,
  sessions 1, intents 2, reports 2. No acknowledgement, coding or report duplicated.
  After a bounded ten-second wait, same completed thread/run/worktree and one
  linked draft PR remain. T3 stays PID 1576/start 30 September 06:38:23 BST;
  OAuth metadata 200; private 443/3773 and only public bridge 8443/8787 unchanged.
  No Funnel change or T3 restart. Temporary non-secret snapshot removed.
- Recovery attribution/base checks pass; prior deployment review/closure reusable.
  No application changes or implementation corrections. Fresh independent gate
  evidence closure passes with no Required, Optional or Question findings. G1
  approved timing adjustment remains unchanged. Workstream 4 Accepted; installed
  composition retained, no external gate remains. Final whole-feature review next.

## External validation gates

| Gate | Owner and placement | Status | Candidate/evidence | Resume condition |
|---|---|---|---|---|
| G1 Linear app setup | 2, after candidate checks, before live auth/event verification | Passed | OAuth actor, signed receipt, 1.772 s initial activity and existing-UUID reconciliation passed; owner cleanup verified at 12:19 UTC | Complete; private installation/store/secrets retained, temporary bridge/Funnel stopped |
| G2 Host/public endpoint | 4, after reviewed deployment candidate, before applying it | Passed | Owner-installed reviewed edge, fresh signed sequence 3 and owner bridge restart with exact retained-state comparison pass; private T3 unchanged | Complete; owner-run authority and evidence retained above; no G3 dispatch authority follows |
| G3 Development issue and PR | 4, after G2, before dispatching coding work | Passed | Fresh signed AID-7 delegation, one-file draft PR, Linear/calling-thread links, exact bridge restart equality and independent closure pass | Complete; installed composition retained, draft PR open for owner review |

G1 may use a temporary bridge-only public listener once its exact configuration
is authorized through the escalation. Record and remove temporary host changes
or explicitly hand them over to G2. A private OAuth callback may suffice for
installation, but signed Linear delivery still needs public ingress. Gates use
Pending, Testing, Troubleshooting, or Passed. Candidate details belong in the
owning packet; summaries and references belong here.

## Escalations

None.

## Decision and drift log

| Date | Decision or drift | Reason | Approved by | Affected workstreams |
|---|---|---|---|---|
| 2026-10-07 | Sequential first-version workflow; explicit account and installation gates | New service; no live Linear installation exists | Aidan, 7 October 2026 | 1–4 |
| 2026-10-07 | Workstream 1 accepted without specification drift | Standalone live proof and focused checks passed; failure cleanup and lifecycle races corrected before fresh closure | Workstream 1 lead under approved scope | 1–3 |
| 2026-10-07 | Workstream 2 reviewed local candidate; no specification drift; blocked on G1 | One remediation pass and fresh closure passed; owner registration, consent and temporary ingress are required for live proof | Workstream 2 lead under approved scope | 2–4 |
| 2026-10-07 | Aidan operates the temporary G1 bridge and Funnel himself; agents verify read-only; no specification drift | Owner's explicit answer; latest read-only check confirms ingress configuration and installation; signed delivery/activity and owner cleanup remain pending | Aidan, recorded by orchestrator; workstream 2 recovery lead | 2–4 |
| 2026-10-07 | G1 live delegation remains blocked without specification drift | Live API confirms AID-6 stale session with zero activities; SQLite has zero receipts despite the owner endpoint being reachable over the tailnet; owner delivery diagnostics are required | Workstream 2 live-verification lead under approved scope | 2–4 |
| 2026-10-07 | Resolve answered G1 diagnostics; G1 remains blocked on public DNS without specification drift | Owner reports attempted delivery failed DNS before HTTP; fresh public and authoritative DNS checks return NXDOMAIN; previous hostname HTTP check used private MagicDNS | Workstream 2 DNS recovery lead under approved scope | 2–4 |
| 2026-10-07 | Resolve answered DNS escalation; G1 public readiness passes without specification drift | Three public relays return expected HTTP 401 with normal TLS verification; signed receipt, timing, live UUID reconciliation and owner cleanup still need G1-LIVE-2026-10-07 | Workstream 2 public-readiness lead under approved scope | 2–4 |
| 2026-10-07 | Resolve fresh AID-6 acknowledgement evidence; G1 remains blocked without specification drift | New signed event/session, exact activity UUID and 1.772 s activity deadline verified; HTTP duration, authorized existing-ID reconciliation and owner cleanup remain in G1-LIVE-2026-10-07 | Workstream 2 acknowledgement-verification lead under approved scope | 2–4 |
| 2026-10-07 | Existing-UUID live reconciliation passes; G1 remains blocked without specification drift | One explicitly authorized call resolved and API retained exactly one original activity; successful HTTP telemetry unavailable through retained local state or installed-app API; owner evidence decision and cleanup remain | Aidan authorized scoped call; workstream 2 reconciliation lead | 2–4 |
| 2026-10-07 | Approved G1 evidence adjustment; runtime requirements unchanged; only owner cleanup blocks acceptance | Aidan accepts observed prompt response and verified 1.772 s activity timestamps; exact HTTP duration remains unverified; no timing logging or telemetry request required | Aidan, "Yeah do that and if I start seeing timeout errors I'll revisit it"; workstream 2 gate-closure lead | 2–4 |
| 2026-10-07 | Workstream 2 and G1 accepted; approved responsiveness evidence adjustment retained, runtime requirements unchanged | Owner cleanup verified read-only at 12:19 UTC; temporary 8443/8787 removed, private T3 443 unchanged and private store/secrets retained; prior reviewed candidate and live proof reused | Aidan supplied cleanup answer and evidence approval; workstream 2 acceptance lead | 2–4 |
| 2026-10-07 | Workstream 3 accepted without specification drift; retained G1 receipt disposition handed to G3 | Isolated native answer, lost-send handover and restart evidence passed; two required lifecycle corrections passed one remediation and fresh closure; permanent service/Linear-to-PR proof await G2/G3 | Workstream 3 lead under approved scope | 3–4 |
| 2026-10-07 | Workstream 4 recovery and reviewed deployment candidate; blocked on G2 without specification drift | Interrupted diff was only the attributable plan transition; independent review and fresh closure passed. Actual host/public changes and owner signed receipt action need explicit approval | Workstream 4 recovery lead under approved scope | 4 |
| 2026-10-07 | Owner-installed G2 edge verified; G2 Testing and workstream 4 Blocked without drift | Aidan chose owner-run installation. Exact unit, private metadata, active service, public DNS/TLS/routes and unchanged private T3 pass; fresh signed delivery and owner bridge restart remain | Aidan owner answer; workstream 4 installation-verification lead | 4 |
| 2026-10-07 | Owner fresh signed G2 reply verified; only owner bridge restart remains; no drift | Sequence 3 postdates installed startup and matches exact instructed reply/session/identities; exact retained receipt/activity/lifecycle and PID/start baseline recorded read-only | Aidan supplied "I sent it"; workstream 4 receipt-verification lead | 4 |
| 2026-10-07 | G2 Passed after owner bridge restart; workstream 4 Blocked on separate G3 proposal without drift | Changed PID/start and exact unchanged receipt/activity/lifecycle baseline verified read-only; private T3 and bridge-only public ingress unchanged; no coding authority follows | Aidan said "Ran those now"; workstream 4 restart-verification lead | 4 |
| 2026-10-07 | G3 approved exact test and narrow lead-run transition; readiness passed, owner delegation pending | Approved private/bridge actions complete; fresh issue and initial dispatch remain owner-run; no drift | Aidan "do it", verified by workstream 4 lead and independent reviewer | 4 |
| 2026-10-07 | Workstream 4 and G3 accepted without specification drift | Fresh AID-7 one-file draft PR linked in Linear/calling T3 thread, exact bridge restart state equality and fresh independent evidence closure pass; no extra dispatch, integration push, merge, deploy, T3 restart or Funnel change | Workstream 4 lead under approved owner scope | 4 |
