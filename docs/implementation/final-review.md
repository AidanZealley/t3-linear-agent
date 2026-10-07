# First-version whole-feature review

Status: approved packet; not started. Begin only after rows 1–4 are Accepted.

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

- Reviewer: pending fresh subagent.
- Branch, base, and reviewed head: pending.
- Verification run: pending.
- Acceptance-criteria audit and live evidence: pending.
- Required findings by owner: pending.
- Optional observations: pending.
- Questions: pending.
- Verdict: pending.

## Lead triage

- Accepted findings and owners: pending.
- Rejected findings and reasons: pending.
- Deferred optional observations: pending.
- Drift requiring user decision: pending.

## Focused closure

- Reviewed head: pending.
- Finding outcomes: pending.
- Final simplification assessment: pending.
- Remaining blockers: pending.
- Verdict: pending.

## Completion record

- Final verification: pending.
- Installation and live development PR: pending.
- External validation pending: pending.
- Specification drift: none recorded.
