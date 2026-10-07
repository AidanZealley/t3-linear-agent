# Workstream 4: Host installation and live development PR

Status: approved task packet; implementation and installed G2/G3 validation accepted on 7 October 2026.
Depends on accepted workstream 3. The frozen task packet below is unchanged.

## Task packet

### Outcome

The bridge runs as a supervised local service, receives public Linear webhooks,
and completes one harmless delegated issue with a draft PR. T3 remains private
and Aidan has concrete installation, troubleshooting, and removal instructions.

### Scope

Prepare a minimal service-manager unit, environment/secret/state layout, and
installation instructions for the verified host. Prefer a user service if its
boot/logout behaviour satisfies unattended operation; inspect rather than assume.
Specify the selected user, Node/pnpm command, working directory, restart behaviour,
and restrictive secret permissions. Use no container platform or dashboard.

Inspect existing Serve/Funnel configuration read-only. Propose bridge-only public
Funnel on 8443 while preserving private T3 Serve on 443. Verify OAuth redirects
and webhook reachability using the chosen hostname. Inventory existing state
before changes and provide exact rollback instructions.

After G2 authorization, install only the reviewed service/ingress candidate. After
G3 selection, delegate the proposed harmless development issue, inspect the T3
worktree binding and result, and confirm Linear receives progress and the draft
PR link. Capture IDs/URLs and concise verification evidence, never credentials.
Confirm service restart/recovery with the bridge, keeping the user's T3 running.
Retire temporary probe credentials and obsolete setup artifacts. Leave approved
service and integration installed, or explain a concrete blocker.

### Non-goals

Changing existing T3 public visibility, restarting the user's T3, production or
live database access, broad repository changes, merging/deployment of the test PR,
or credentials entered into chat.

### Initial ownership

`deploy/**`, installation/operator sections in README, and this record/row/gates.
Small deployment corrections in composition are allowed with evidence and checks.
Accepted-component defects that change contracts need an owner escalation.

### Required seams

Use the runnable command/configuration from workstream 3 and existing T3 endpoint.
Do not replace its credential manager, lifecycle, SQLite schema, or HTTP receiver.
G2 controls actual host writes; G3 controls repository coding/push/PR actions.

### Acceptance criteria

- G2 passes with authorized concrete host changes; service starts reliably and
  uses persistent state and private secret storage.
- Linear can reach and deliver to the bridge public endpoint. T3's existing
  endpoint remains private. Only intended bridge routes are exposed.
- G3 passes; the matched project launches exactly one isolated worktree thread
  for the issue and returns a draft PR with appropriate checks, linked in Linear.
- The test PR is registered with this T3 thread through the linking tool when
  available. No merge or deployment occurs.
- Bridge restart preserves the session and does not duplicate coding work or PRs.
- Operator instructions cover OAuth installation, project naming, secret renewal,
  paused uncertain requests, logs/state locations, restart, and rollback/removal.

### Targeted verification

Run established typecheck/build and relevant tests if code changes. Check the
unit/configuration with host tooling actually present, record those commands,
and run `git diff --check`. Verify service-manager state, public signed delivery,
private T3 reachability, and the live issue/thread/worktree/PR correspondence.
A locally successful HTTP request alone is insufficient public-delivery evidence.

## External validation

- Gate and placement: G2 after deployment review/closure, before applying host
  changes; G3 after G2, before coding in the selected development repository.
- Status: G2 Passed after owner installation, fresh signed delivery and restart
  verification. G3 Passed after fresh AID-7 end-to-end, bridge restart and independent evidence closure.
- Candidate and instructions: exact edge-only unit, Funnel 8443, scoped rollback
  and owner signed-delivery choice are retained in plan workstream 4 acceptance evidence. Lifecycle override remains separately gated by G3.
- Required evidence: explicit authorization of host changes and selected target,
  followed by signed delivery, T3 worktree execution, checks, and linked draft PR.
- Attempts and lasting decisions: Aidan chose owner-run installation; read-only
  unit/service/private metadata/public DNS/TLS/route checks pass. Fresh signed
  sequence 3 delivery and owner bridge restart pass. G3 then authorized the narrow
  private/lifecycle transition and lead bridge-only restart; fresh AID-7 proof and
  independent evidence closure pass. Authority and exact evidence follow below. No drift.
  Agent-resolvable delivery failures use
  the README troubleshooting rule; substantive corrections receive focused review.
- Resume condition: complete. Owner delegation answer is resolved into lasting
  AID-7 evidence in this handoff and the plan; no further dispatch is needed.

## Implementation handoff

- Base commit: `d35e6e4aae64827c286757e7f12cb494b3f00480`, branch
  `feat/linear-agent-v1`. Installed supervised composition, G2/G3 evidence and
  acceptance closure passed. The approved draft PR remains open for owner review.
- Files changed: `deploy/t3-linear-agent.service`, `deploy/lifecycle.conf` and
  installation/operator sections of README. No source changes. The frozen task and historical reviews remain unchanged;
  external gate status and recovery evidence advance below.
- Pre-installation baseline, read-only on 7 October 2026: systemd 255 user manager running,
  `Linger=yes`, user `aidanzealley`, runtime `/run/user/1000`; existing
  `t3code.service` enabled and active. `/usr/bin/node` is 24.19.0,
  `/usr/bin/pnpm` is 11.20.0. Serve and Funnel JSON contain only private HTTPS
  443 to `http://127.0.0.1:3773`, with no Funnel allow entries. Socket inspection
  finds loopback 3773 and no 8787. Local T3 OAuth metadata returns HTTP 200.
  Private state directory is 0700; retained SQLite and Linear secrets are 0600.
  No bridge unit, `t3.json`, `sessions.json` or `service.env` exists.
- Installation recovery evidence, 7 October 2026: Aidan chose owner-run
  installation. Read-only checks at 16:07 UTC confirm the installed unit exactly
  matches this reviewed candidate, enabled/active since 17:05:06 BST with PID
  795670, no drop-in, `NRestarts=0` and only loopback 8787. Private directory/store/
  secret modes remain 0700/0600/0600; G3 configuration/credentials are absent.
  Only Funnel 8443 is public; private T3 443/3773 and its long-running service
  are unchanged. Public resolvers plus normal TLS to all three public relay IPs
  return 401 for OAuth start and 404 for MCP/unrelated paths. Exact commands and
  evidence live in the plan's workstream 4 acceptance evidence.
- Retained-state recovery at 16:06:59 UTC used SQLite URI `mode=ro` with query-only
  projections. G1 sequence 1 is unchanged. Historical prompted sequence 2,
  delivery `b1053f02-dc94-4fcb-a173-7fdda446b5cd`, signed timestamp
  `2026-10-07T12:14:08.406Z`, belongs to the same AID-6 session and installed
  identities. Both receipts remain unconsumed and predate service installation;
  neither proves fresh G2 delivery. The sole original activity remains sent,
  attempts 0, with its original UUID and `next_at`. Lifecycle tables are empty.
  Preserve both receipts and any new G2 reply for explicit G3 disposition.
- Fresh G2 signed reply verified read-only at 16:13 UTC: Aidan reported "I sent
  it". Sequence 3, delivery `1545e836-2e56-419b-aa86-634d7434871e`, is
  `AgentSessionEvent`/`prompted`, signed at `2026-10-07T16:11:30.312Z`, after
  installed startup at `16:05:06Z`. It belongs to the existing AID-6 session
  `59f7671f-3e94-4474-ac86-62ab0b1ad95d`, matches installed and nested
  workspace/app identities plus client ID, and carries prompt activity
  `aa18433d-79cd-4305-b971-54c13f370832` with the exact instructed reply.
  Plan acceptance evidence retains all identities, event hashes and the complete
  non-secret restart baseline. At that snapshot, bridge was PID 795670, enabled/active with
  its original start time, no drop-in and `NRestarts=0`. Sequences 1/2/3 remain
  unconsumed; the sole original activity remains sent, attempts 0, original UUID
  and `next_at`; lifecycle tables remain empty. Private T3 and ingress unchanged.
  No further owner reply is needed. Owner restart is now verified below.
- Lasting G2 owner authority and evidence are in the plan acceptance record.
  Agents cannot restart/change/rollback the bridge or Funnel under the owner
  answer. No new Linear input, activity call, T3 operation or store mutation was
  made. Existing candidate review/closure remain valid; no correction is needed.
- G2 restart accepted after Aidan's "Ran those now" answer. Fresh delegated
  read-only checks at 16:18:49 to 16:19:30 UTC confirm PID 797348 and start
  `16:16:54Z`, replacing PID 795670/start `16:05:06Z`; monotonic start is
  643133871158. Bridge stays enabled/active, exact edge-only unit, no drop-in,
  `NRestarts=0`. The snapshot at `16:19:18.732708Z` exactly matches all three
  receipt UUIDs/hashes/timestamps/identities and `consumed=0`, plus the sole
  original sent activity/attempts/next_at; lifecycle tables remain empty. Private
  modes, T3 PID/start and private 443/3773 remain unchanged; only bridge 8443 is
  public. Exact evidence and resolved owner commands are retained in the plan.
  Agents made no host/account/state changes. Prior review/closure remain valid.
- Separate G3 proposal is in `G3-DEVELOPMENT-2026-10-07`: proposed existing
  repository/main, exact matched project, Codex model/full-access ceiling, one
  documentation-only fresh issue and draft PR, explicit consume-only-1/2/3
  disposition preserving receipt/activity evidence, and owner-run private
  configuration/pairing/lifecycle/restart steps. All remain pending owner choice.
- Installed G2 candidate, recorded for recovery: the user unit is at
  `/home/aidanzealley/.config/systemd/user/t3-linear-agent.service`. It runs `/usr/bin/node
  /home/aidanzealley/code/t3-linear-agent/dist/linear/cli.js` from the checkout,
  with explicit private Linear secret/store paths, umask 0077, failure restart
  after five seconds, five-attempt start limit per minute and 60-second shutdown.
  Owner enabled only `tailscale funnel --bg --https=8443 http://127.0.0.1:8787`.
  Existing private T3 Serve 443 and `t3code.service` remain untouched. User
  lingering already supports boot/logout operation; no root service or new
  lingering setting is needed. README contains exact installation commands,
  baseline checks, verification and rollback.
- G2 delivery action is complete. The owner sent the instructed receipt-only
  reply in existing G1 AID-6, verified as sequence 3 above. It created no new
  initial activity. Preserve all three receipts pending explicit G3 disposition;
  no further reply, new session, or activity call is needed for G2.
- G3 transition: authorize repository/base/project/provider/model/runtime ceiling,
  harmless issue, push and draft PR before configuring coding. Stop edge, back up
  private state and obtain explicit owner disposition for G1 sequence 1, delivery
  `76a7ed6f-fc0d-4399-ad28-803aaadc7b08`, session
  `59f7671f-3e94-4474-ac86-62ab0b1ad95d`, retained prompted sequence 2 above,
  and G2 sequence 3, delivery `1545e836-2e56-419b-aa86-634d7434871e`.
  Recommend marking only verified validation sequences consumed locally while
  retaining receipt/activity rows. No mutation is performed or authorized here.
  Pair the absent T3 credential only after G3 permission. Configure private
  `sessions.json` and mode-0600 `service.env` with the approved runtime ceiling.
  Install `deploy/lifecycle.conf` as the unit's `lifecycle.conf` drop-in, reload
  and start. Required EnvironmentFile prevents accidental unconfigured startup.
  Same unit, listener and SQLite are reused; no new lifecycle/gate machinery.
- T3 CLI discovery remains the accepted metadata-based implementation. Read-only
  executable check currently resolves nightly `0.0.46-nightly.20261007.2774`.
  No nightly is pinned and no bearer credential, API mutation, pairing or T3
  catalog/coding call was made. Secret values were not read or printed. Store
  projections are limited to the non-secret recovery evidence above.
- Rollback: disable only Funnel 8443, disable/stop only the bridge, remove only
  its installed unit and optional lifecycle drop-in, reload the user manager and
  verify private 443/3773 unchanged with 8443/8787 absent. Keep private state and
  credentials. Lifecycle-to-edge rollback removes only its drop-in after stopping
  the bridge. T3 work continues independently; cancellation, app uninstall,
  credential revocation and state deletion require separate authorization.
- Verification: `pnpm build`, `systemd-analyze --user verify
  deploy/t3-linear-agent.service`, merged lifecycle-unit verification in a removed
  temporary directory, `git diff --check` and untracked deploy whitespace checks
  passed. No application changes, so accepted tests/typecheck were not repeated.
  Host inspection used `loginctl show-user`, user manager/unit queries,
  Serve/Funnel JSON, `ss`, permission-only `stat`, selected non-secret activeVersion
  metadata and unauthenticated loopback OAuth metadata. No host writes occurred.
- Simplification pass: one user service plus one G3 override, direct Node commands,
  existing private state and credential discovery. No container, setup script,
  root service, second database, copied secrets or speculative hardening added.
- Pre-G3 limitations, resolved by the evidence below: G3 target
  and retained sequences 1/2/3 disposition, unattended GitHub
  permissions and actual linked draft PR remain pending. No supported accessible
  T3 conversation URL is established. Preserve G1's approved responsiveness
  evidence adjustment, with five-second HTTP and ten-second activity deadlines
  unchanged. This candidate does not repeat G1 timing or account actions.
- Specification drift: none.

- Approved G3 recovery, 7 October 2026: Aidan's "do it" authorizes the exact
  documentation test and narrow lead-run private/bridge transition. Earlier
  owner-only G2 restrictions remain for Funnel and T3. The lasting decision and
  complete transition evidence are in the plan. Lead verified unchanged baseline,
  stopped only bridge, made private backup `backup-g3-20261007T162939Z`, consumed
  only validation sequences 1/2/3 retaining all evidence, paired privately at
  full-access, verified the exact unique project/root and codex/gpt-6.1-sol catalog,
  created private configuration and installed the reviewed lifecycle override.
  Composed bridge starts active/running at `2026-10-07T16:30:16Z`, PID 799376.
  Fresh independent read-only readiness review passed without findings, including
  exact deployed/config/catalog/state comparisons, GitHub/main readiness and
  empty thread PR-link audit. `git diff --check` passes. Current blocker is
  `G3-OWNER-DELEGATION-2026-10-07`; completed approval/transition authority
  persists in the plan. Prior candidate review/closure remains valid.
  Initial fresh Linear issue/delegation remains owner-run. Actual issue/thread/
  worktree/checks/draft-PR/Linear-link/restart proof remains pending; approval and
  startup are not G3 Passed. No drift.


- Fresh G3 observation, 7 October 2026: read-only Linear SDK confirms AID-7
  `b1b3c2fc-411e-499a-95fa-1c79ad304794`, title "Add bridge validation note",
  exact project `t3-linear-agent` / `9f92b9d0-df1b-41de-894f-c19828253a3f`,
  and delegate T3 / installed app user. Its description authorizes only the
  approved single sentence, isolated worktree, topic push and one draft PR.
  Fresh signed created receipt sequence 4, delivery
  `dc8769b9-38cd-4ca9-aced-958ba7e98355`, timestamp
  `2026-10-07T16:35:57.824Z`, session
  `4d767411-1b94-4b59-8043-34e870a30b14`, matches all installed and nested
  identities. Stored event SHA-256 is
  `f0cc2b3a399aec4107ce6a3de1d181898e8c893bc2cb971f11eb9649516a8cb6`.
  SQLite was opened with `DatabaseSync` readOnly, never through writable Store.
  Comparison with private G3 backup proves receipt 1/2/3 bytes/IDs and the
  original initial activity remain unchanged; old receipts stay consumed.
- Exactly one confirmed launch and one confirmed send map that fresh session to
  project `12d819d1-ac0b-46a7-8f03-23d44601ee04`, thread
  `mcp:605f3d54-4297-45a2-bc4f-4258b96303e5` and ordinal-1 run
  `run:thread:mcp%3A605f3d54-4297-45a2-bc4f-4258b96303e5:ordinal:1`.
  Exact-title listing has one match. Project read confirms approved repository
  root and GitHub identity. The run completed at `16:37:01.379Z`, with no active
  run or pending requests. The T3-managed worktree is
  `/home/aidanzealley/.t3/worktrees/t3-linear-agent/linear-aid-7-4d767411-1b94-4b59-8043-34e870a30b14`,
  separate from the integration checkout, on branch
  `linear/aid-7-4d767411-1b94-4b59-8043-34e870a30b14`.
  [T3 conversation](t3-thread://v1/7ece0ca2-be22-4b03-bbf1-f8e4605a2b17/mcp%3A605f3d54-4297-45a2-bc4f-4258b96303e5)
  is supported by the thread-read tool. Work had already completed when observed;
  no waiting, dispatch, message, new thread or account mutation was needed.
- GitHub read-only inspection confirms exactly one repository PR,
  [draft PR #1](https://github.com/AidanZealley/t3-linear-agent/pull/1), OPEN,
  targeting `main`, created `16:36:47Z`, with only `docs/bridge-validation.md`,
  one addition and commit `5c03e7dfea60d699520e1a7014cc3ea0f8ad4f18`.
  Local worktree HEAD matches PR head; worktree status is clean. Independent
  `git diff main...HEAD` contains exactly the approved sentence and
  `git diff --check main...HEAD` passes. No GitHub checks are configured for this
  documentation-only base. The integration branch remains at reviewed base.
  No merge, deployment, integration push, host change or production access occurred.
- Registered PR #1 immediately with calling T3 thread
  `64423b31-d5b3-49a6-bfd4-423c7d12f939` through `link_pull_request`,
  returning `alreadyLinked=false`; subsequent list audit has exactly that PR.
  The issue's coding thread has no native PR metadata, but the required calling
  conversation registration is verified. Linear SDK confirms session `complete`,
  PR present in `externalUrls`, and the exact initial/progress/final UUIDs.
  Initial activity `e4a2ddeb-2b09-473d-8c5d-2d0c3227a6f1` appeared at
  `16:35:58.433Z`, 0.609 seconds after receipt timestamp. Progress
  `9841fd58-68c1-44fc-8dd7-81e3ed4bffac` appeared at `16:35:59.610Z`; final
  `39c08136-1536-4a1e-ade9-347b367efbc3` at `16:37:02.555Z` includes summary,
  checks and PR URL. Local reporting intents are all sent, attempts 0; session
  completed with no pending inputs or uncertain intents. Lead-owned installed
  bridge restart/recovery proof remains outstanding at this observation.

- Recovery proof: lead restarted only the authorized bridge at `16:38:33Z`,
  PID 799376 to 800839. After a bounded ten-second wait, transactional read-only
  snapshots match every receipt/activity/session/intent/report row exactly. Same
  completed thread, worktree, one run and draft PR remain; no extra dispatch or
  report. Private T3 PID/start and 443/3773, public bridge 8443/8787 remain unchanged.
  Temporary snapshot removed. Full evidence is in the plan.

## Independent review

- Reviewer: fresh independent workstream 4 reviewer, 7 October 2026. Reviewed
  the complete tracked and untracked candidate against base
  `d35e6e4aae64827c286757e7f12cb494b3f00480` on `feat/linear-agent-v1`,
  the frozen packet, specification, research and accepted dependency handoffs.
- Verdict: candidate ready for closure and owner approval. No blocking defect
  found. Full workstream acceptance remains pending G2 host authorization and
  installed public-delivery/restart evidence, then G3 target/receipt disposition
  and the actual linked draft PR. Those external gates are not candidate defects.
  The G2 unit runs only the accepted edge; the G3 drop-in changes the command to
  composition and requires the private runtime environment file. Instructions
  preserve private T3 443, retained validation evidence and explicit coding scope.
- Required findings: none. Inspected both deployment files, README operator
  changes, packet handoff and plan transition, plus CLI, HTTP receiver, initial
  activity worker, composition, configuration and credential-discovery seams.
  Base and merged lifecycle units passed `systemd-analyze --user verify`.
  `git diff --check` and separate untracked deployment whitespace checks passed;
  both compiled entry points exist. Read-only host queries confirmed lingering,
  active `t3code.service`, private Serve 443 to loopback 3773 with no Funnel allow
  entries, no listener on 8787, Node 24.19.0, pnpm 11.20.0, private state mode 0700
  and secret/database mode 0600. Unauthenticated T3 OAuth metadata returned 200.
  No application code changed, so package tests and typecheck were not repeated.
  No host service/configuration change, account call, composition startup, secret
  read or receipt consumption occurred. Temporary unit-check files were removed.
- Optional observations: none.
- Questions: none. G2 delivery choice and G3 repository, runtime ceiling and
  validation-receipt disposition remain explicit owner decisions in the handoff.

## Resolution

- Finding dispositions and reasons: independent review found no Required, Optional or Question findings. The lead checked the complete tracked/untracked candidate against the accepted entrypoints and gate boundaries; no remediation is needed. G2/G3 remain external acceptance conditions.
- Simplification/deletion pass: retained one direct-Node user unit and one separately gated lifecycle override. Existing state, listener and CLI discovery are reused; no setup framework or new source abstractions.
- Final verification: build, base/merged systemd units and whitespace checks passed. Prior deployment review/closure remain sound. Fresh G3 evidence closure independently verifies signed delegation, actual one-file draft PR, Linear/calling-thread links and installed recovery aftermath. No required findings remain.

## Closure review

- Reviewer: fresh focused Codex subagent, 7 October 2026. Checked the complete
  tracked and untracked candidate on `feat/linear-agent-v1` against base
  `d35e6e4aae64827c286757e7f12cb494b3f00480`, the frozen packet, product sources
  and accepted dependency handoffs. The lead's no-remediation disposition holds.
- Verdict: candidate ready for G2 owner authorization. No blocking defect found
  within closure scope. Full installed acceptance remains pending G2 public
  signed delivery and bridge restart evidence, then G3 target, historical receipt
  disposition and the actual linked draft PR.
- Evidence: the unit runs the accepted edge entry point without consuming coding
  receipts. The separately gated override selects composition and requires
  `service.env`; its runtime values and private paths match accepted configuration.
  README installation and rollback commands preserve private T3 443 and its
  running service. G3 explicitly settles validation input before pairing and
  composed startup. Independent review had no findings; general review was not
  reopened and no remediation was needed.
- Verification: base and merged lifecycle units passed `systemd-analyze --user
  verify`. Both compiled entry points exist. `git diff --check` and separate
  untracked deployment whitespace checks passed. No application code changed,
  so accepted tests/typecheck/build evidence remains reusable. Temporary merged
  unit files were removed. No host service, Funnel or configuration change,
  account call, composition startup, secret read or receipt consumption occurred.
  Only this closure section was edited; changes remain uncommitted.
- Remaining required findings: none within closure scope. G2/G3 remain external
  acceptance conditions and grant no authorization through this review.


### G3 acceptance evidence closure

- Reviewer: fresh focused Codex subagent, 7 October 2026. Checked the complete
  tracked and untracked workstream 4 diff against
  `d35e6e4aae64827c286757e7f12cb494b3f00480`, the frozen packet, specification,
  research, README recovery instructions and plan's G3 evidence. This review
  closes the external gate and documentation evidence. Prior candidate review
  and closure remain valid; no application change or general review was needed.
- Verdict: G3 evidence passes. Workstream 4 is ready for acceptance. The separate
  whole-feature review remains required by the plan. No Required, Optional or
  Question findings remain in this focused closure.
- Independently verified live evidence: read-only Linear GraphQL queries confirm
  [AID-7](https://linear.app/aidan-zealley/issue/AID-7/add-bridge-validation-note),
  the exact approved one-file task, matched project and installed T3 delegate.
  Session `4d767411-1b94-4b59-8043-34e870a30b14` is complete; its external URL
  is [draft PR #1](https://github.com/AidanZealley/t3-linear-agent/pull/1).
  Initial, progress and final UUIDs/timestamps match the handoff. Actual final
  activity includes the check result and PR URL. The initial activity followed
  the signed receipt by 0.609 seconds. Installed credentials were used privately
  for reads; no credential or token was printed and no refresh was requested.
- Read-only SQLite transaction confirms four consumed receipts with the recorded
  delivery IDs and SHA-256 values, two sent initial activities, one completed
  session without inputs, one confirmed launch and one confirmed send, and two
  sent reports with zero attempts. Sequence 4's signed timestamp, session and
  workspace match the handoff and installed identity. Historical receipts and
  the original acknowledgement retain their recorded identities and values.
  No uncertain intent or pending work remains.
- Independent T3 list/read returns exactly one AID-7 thread in the matched
  project. Its supported
  [conversation](t3-thread://v1/7ece0ca2-be22-4b03-bbf1-f8e4605a2b17/mcp%3A605f3d54-4297-45a2-bc4f-4258b96303e5)
  has one completed ordinal-1 run, no active run or pending requests, and the
  recorded managed worktree, branch, codex model and full-access ceiling.
  Calling-thread PR listing independently returns exactly draft #1. Coding
  thread native PR metadata is null, as explicitly recorded; the available link
  tool registered the required PR on the calling conversation.
- GitHub read-only inspection confirms exactly one repository PR, open and draft
  against `main`, one commit `5c03e7dfea60d699520e1a7014cc3ea0f8ad4f18`, and
  only `docs/bridge-validation.md` with one addition. The actual local worktree
  diff contains exactly the approved sentence, status is clean, and
  `git diff --check main...HEAD` passes. GitHub reports no configured checks for
  this documentation-only base. No merge or deployment is claimed.
- Recovery: the lead's recorded transactional before/after equality covers every
  receipt/activity/session/intent/report row across its authorized bridge-only
  restart and bounded ten-second observation. This reviewer did not repeat the
  restart. Fresh service/state/thread/PR reads corroborate the retained result:
  bridge PID 800839, start `16:38:33Z`, active/running, `NRestarts=0`, and the
  same completed session, sole run, clean worktree and draft PR. T3 remains PID
  1576 with its original 30 September start; unauthenticated OAuth metadata is
  200. Serve/Funnel JSON preserves private 443 to loopback 3773 and permits only
  bridge 8443 to loopback 8787 publicly.
- Deployment and documentation: installed unit and lifecycle drop-in match the
  reviewed files byte for byte. All five private secret/state/config files are
  0600, and private session configuration matches the exact project/root, main
  and codex/gpt-6.1-sol selection. README covers installation, completed receipt
  disposition, renewal, paused uncertainty, logs/state, bridge recovery and
  scoped rollback/removal. Its stale opening and the plan's current workstream
  heading were corrected by the lead during review. Historical pre-installation
  and earlier gate observations remain evidence, not current instructions.
- Verification: `systemd-analyze --user verify deploy/t3-linear-agent.service`,
  worktree whitespace checks and integration `git diff --check` pass. Prior
  build and merged-unit evidence remain reusable because no source or deployment
  correction was made. Only this appended subsection was edited by the reviewer;
  it remains uncommitted. No dispatch, Linear message, state mutation, service or
  ingress change, push or commit occurred. Specification drift: none.

## Acceptance

Accepted on 7 October 2026 after the approved owner-run G2 installation and
fresh signed delivery, narrow authorized G3 transition, AID-7 end-to-end proof
and bridge-only restart. Exactly one T3-managed worktree/run produced the one-file
[draft PR #1](https://github.com/AidanZealley/t3-linear-agent/pull/1), with checks,
Linear progress/result/external URL and calling-thread registration. Restart
preserved every receipt/activity/session/intent/report row and the same worktree,
thread and PR without dispatch. Private T3 and ingress remain unchanged.

Independent deployment review, focused closure and fresh G3 evidence closure
found no remaining required or optional findings. No source correction or extra
review loop was needed. Simplification retains one direct-Node user unit and
one lifecycle override using existing state and credentials. G1's approved
timing-evidence adjustment remains unchanged. No specification drift. Final
whole-feature review is the next workflow phase; PR merge/deploy/integration push
remain unauthorized.
