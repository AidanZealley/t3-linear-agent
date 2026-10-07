# First-version whole-feature review

Status: approved packet; whole-feature implementation Accepted on 7 October 2026 after independent review, documentation correction and fresh focused closure. Rows 1–4 are Accepted.

## Reviewer task packet

Read the workflow README, specification, research, accepted handoffs, and plan.
Review the complete implementation branch against the starting commit recorded
in the plan. Independently inspect the combined diff and surrounding code.

Audit every specification acceptance criterion and its actual evidence, shared
seams, lifecycle, dependency direction, durable delivery identity, credential
handover, duplicate prevention, and scope/permission boundaries. Verify that
the live installed candidate corresponds to the reviewed code. Review queue
cancellation as well as interruption, question answers, reporting recovery,
project renames, and unresolved sends across credential replacement.

Perform a deletion/simplification assessment. Look for duplicated credential or
conversation state, competing receipt paths, stale mocks, unused adapters,
speculative configuration, and tests tied only to implementation details.
Documentation must describe verified behaviour and expose remaining limits.

Run the actual package test, typecheck, and build scripts established in
workstream 1 and `git diff --check`. Inspect recorded live evidence for G1–G3,
active-run rotation, external question answers, and isolated T3 restart recovery.
Do not repeat live repository or host mutations merely to review them. Missing
required external evidence blocks acceptance; do not substitute mocked tests.

Classify findings as Required, Optional, or Question and attribute required
corrections to owners. Reviewers edit only their review sections. The final lead
owns triage, correction assignments, bounded remediation, fresh focused closure,
the Final plan row, and the acceptance commit. Follow the README's final-lead
prompt and normal escalation/recovery rules.

## Initial whole-feature review

- Reviewer: fresh independent whole-feature review agent, 7 October 2026.
- Branch: `feat/linear-agent-v1`. Base:
  `b47c831c3c2ac8434758934fd860c60423025b58`. Reviewed head:
  `09c7241b1ffe05cad23deedd086673c7f60017c6`. The lead's uncommitted
  Final-row transition is attributed separately; no uncommitted source changes.
- Verification: actual `pnpm test` passed all 38 tests. `pnpm typecheck`,
  `pnpm build`, `git diff --check` and `git diff --check b47c831..HEAD` passed.
  Reviewed the complete implementation and surrounding authentication, receipt,
  lifecycle, reporting, configuration, deployment and operator instructions.

### Acceptance criteria and evidence

The rows follow the specification's acceptance-criteria order. Recorded live
proof is reused; this review generated no new Linear activity, coding run, PR,
credential, host-service change or ingress change.

| Criterion | Evidence and assessment |
|---|---|
| 1. One managed thread and linked PR | G3 records fresh signed AID-7, one isolated managed worktree, one completed run and draft PR #1 with the approved one-file diff and checks. Linear response/external URL and calling T3 conversation registration passed. The coding thread's separate native PR metadata remains null, as disclosed. |
| 2. Two project routes | Workstream 3's isolated real T3 lifecycle probe completed two disposable projects serially. Local Linear receipts and issue fixtures supplied the project names. This proves the T3 routing seam, not two live Linear delegations. Focused routing tests also pass. |
| 3. Clarification and correction | Focused lifecycle tests cover absent selection, unmatched and duplicate names, no launch, and same-session correction. `select()` rereads current Linear issue data until selection succeeds. |
| 4. Renames and unavailable targets | Pinned project IDs, restart and unavailable-target tests pass. Isolated restart recovery also retained the original target with a deliberately changed Linear-name fixture. Every coding send checks retained thread binding. |
| 5. Acknowledgement deadlines | G1's approved evidence adjustment stands. Owner-observed prompt HTTP response and verified 1.772 s initial activity suffice; exact HTTP duration remains unverified. G3 records a 0.609 s initial activity. Independent receipt/initial workers and a four-second HTTP deadline preserve the unchanged runtime requirements. Queued/overlapping acknowledgement behavior has focused checks. |
| 6. Follow-ups and answers | Ordered same-thread input and native-answer tests pass. Retained isolated native-answer artifact confirms the supported flat answer map and sequence 25. Isolated restart follow-up completed on the original thread. No live Linear-to-native-question claim is made. |
| 7. Stop | Focused tests prove local input suppression, queue cancellation, active-run interruption and explicit resumption. Official signal shape is recorded in the accepted handoff. The initial standalone live probe exercised T3 queue cancellation and interruption; no new live Linear Stop UI check is claimed. |
| 8. Duplicate delivery and restart | Focused duplicate/lost-response/reopen checks pass. G1 reconciled the existing activity UUID. G3's authorized bridge-only restart retained the exact receipt/activity/session/intent/report rows, thread/run/worktree and single PR. |
| 9. Uncertain launch | Persisted intent plus exact title/project/branch/worktree reconciliation prevents blind retries. Focused accepted-response-loss and ambiguous-outcome tests pass. Lost launch response remains synthetic evidence. |
| 10. Active-run renewal | Workstream 1's standalone isolated live probe retained the same active run through replacement and completed a replacement-credential follow-up. Its retained artifacts are available. Later lifecycle coordination corrections have focused closure proof. |
| 11. Lost send during handover | Retained workstream 3 rotation artifact confirms the old OAuth namespace, exact durable message/run adoption, replacement session and one accepted send during the same harmless run. Ambiguous delivery and drain behavior also pass focused checks. |
| 12. Signature and installation boundary | SDK raw-body/timestamp verification and HTTP tests reject invalid signatures and unrelated workspace/app/session identities. Signed installed receipt evidence passed G1/G2/G3. Secrets remain private local files. |
| 13. Coding versus reporting failures | Separate durable run state and report UUIDs, bounded retry, ordered reports and retry without resending work pass focused checks. Completion requires the pinned completed run and readable provider final message. |
| 14. Human inspection and no merge | G3 records the accessible T3 conversation/worktree and open draft PR. The reviewed implementation delegates work through T3, instructs against merge/deploy/production, and contains no merge/deployment operation. |

### Installed candidate and simplification

Read-only checks confirm the installed unit and lifecycle override exactly match
`deploy/t3-linear-agent.service` and `deploy/lifecycle.conf`. The active composed
service runs this checkout's `dist/main.js`, PID 800839, with zero restarts.
A fresh successful build derives that entrypoint from the reviewed source.
The retained installed SQLite store, opened with `mode=ro`, query-only and a read
transaction, has four receipts, two sent initial activities, one completed AID-7
session, two confirmed intents and two sent reports. Its project/thread IDs match
the G3 record. Private store, secrets, credential, session configuration and runtime
file are all mode 0600. Private T3 remains active at PID 1576 with its original
30 September start. Serve/Funnel still has private 443 to loopback 3773 and only
public 8443 to loopback 8787. No host or account state was changed.

Retained non-secret question-answer, rotation and restart artifacts exist under
`/tmp/t3-linear-ws3-dev` and agree with the handoff identities. Workstream 1's
standalone probe artifacts are also present. The authorized PR was already linked
and independently audited by the lead; this reviewer did not repeat that action.

SQLite owns bridge delivery state; T3 owns conversation/run history. Credential
ownership stays in the T3 client. Initial acknowledgement has one owner and its
own retry identity, while lifecycle reports wait for it. The edge-only entrypoint
and deployment override remain useful installation/rollback boundaries. No dead
adapter, duplicate conversation store, generic scheduler, speculative extension
point or test-only production abstraction warrants deletion. Focused tests protect
product risks rather than helper implementations.

### Findings

- Required R1, documentation owners: current-status prose contradicts the accepted
  installed state. `docs/implementation/README.md:3,20` says implementation has
  not started and no package or tests exist. `docs/implementation/plan.md:3`
  omits accepted workstream 4. This packet's status says not started while its
  plan row is Review. `docs/research.md` says the persistent service remains
  uninstalled, G2/G3 still require completion and a user-accessible conversation
  URL remains unestablished. Root README's lifecycle introduction says the bridge
  and Funnel are stopped and historical receipt disposition still awaits G3.
  Mark earlier gate snapshots as historical and synchronize present-tense status
  and operator guidance with installed composition and Passed G1–G3. Preserve the
  approved frozen task text, historical proof and G1 timing limitation. Owners
  are the final lead for workflow/plan/packet status and source-document
  synchronization, and workstream 4 for root README operator guidance.
- Optional observations: none.
- Questions: none.
- Verdict: implementation checks and required external evidence pass. Correct
  R1 before final acceptance. No code defect, missing external gate, scope breach
  or unjustified implementation machinery was found in this bounded review.

## Lead triage

- Accepted R1: verified stale current-status claims against the Accepted rows, Passed gates and installed evidence. Delegate source/workflow synchronization to a fresh documentation agent, then root README operator guidance to a separate fresh workstream 4 documentation agent. The lead owns plan/packet status and final acceptance transitions. Documentation-only corrections preserve approved task requirements and historical proof. Both fresh owner correction passes completed; the lead inspected every changed hunk and `git diff --check` passed. No implementation or installed file changed. R1 passed fresh focused closure; no required finding remains.
- Rejected findings and reasons: none.
- Deferred optional observations: none.
- Drift requiring user decision: none. G1's approved evidence adjustment and unchanged runtime deadlines remain in force.

## Focused closure

- Reviewed head: `09c7241b1ffe05cad23deedd086673c7f60017c6`, plus the complete uncommitted documentation correction and lead-owned review record, by a fresh focused reviewer on 7 October 2026. Only six Markdown files changed; implementation and deployment files are unchanged.
- Finding outcomes: R1 closed. Current status consistently records Accepted workstreams 1–4, Passed G1–G3, installed composition and focused closure in progress. The lead corrected the research phase header during this pass. Earlier edge-only installation, cleanup, probes and receipt disposition are clearly historical. Installed evidence distinguishes the supported coding-thread URL from the calling conversation's PR registration and null native PR metadata. The approved G1 evidence adjustment, unverified exact HTTP duration and unchanged five-second HTTP and ten-second initial-activity requirements remain explicit.
- Verification: inspected every documentation hunk against the plan and accepted handoffs. Specification requirements from `Outcome` onward and all fenced command/example blocks are unchanged. `git diff --check` passed. Reused the independent review's actual 38-test, typecheck, build and base-diff results because these corrections change no executable behavior. No external action or live test was needed or performed.
- Final simplification assessment: the correction replaces stale claims and adds the historical context needed to use the operator instructions safely. It introduces no machinery, duplicate authority or compatibility path. The initial implementation simplification assessment remains valid.
- Remaining blockers: none. No required external gate remains; disclosed evidence limits are unchanged.
- Verdict: focused closure passes. R1 is resolved and the final lead can accept the feature.

## Completion record

- Final verification: independent whole-feature review passed all 38 package tests, typecheck, build and working-tree/base whitespace checks. Fresh documentation correction checks and focused closure passed.
- Installation and live development PR: read-only review confirmed exact deployed unit/drop-in equality, active composed PID 800839, private retained state and unchanged T3/ingress. G3 proves AID-7 produced exactly one managed-worktree run and one open one-file draft PR #1, linked in Linear and the calling T3 conversation. Bridge-only restart retained exact rows and identities without duplicate coding/reporting.
- External validation pending: no required gate remains. Exact HTTP duration remains unverified under approved G1 evidence adjustment. No live Linear Stop UI or Linear-to-native-question test was performed; those paths have focused checks and native question answers have isolated external proof. Two-project routing uses isolated T3 with Linear fixtures; lost-launch recovery is synthetic. Live T3 was not restarted; isolated T3 and installed bridge restarts have distinct proof.
- Specification drift: none. No deferred optional observations or escalation. G1's approved evidence adjustment remains in force.

Final lead acceptance: Accepted. The final PR list audit confirms exactly open
draft #1 linked to the calling conversation. All gates passed; no further host
action, account messaging, dispatch, push, merge or deployment was performed.
The completion report is recorded in [the plan](plan.md#final-acceptance-and-completion-report).
