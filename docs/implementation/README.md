# First-version implementation workflow

Status: approved by Aidan on 7 October 2026. Workstreams 1–4 are Accepted; G1, G2
and G3 are Passed. The composed bridge is installed and the approved AID-7 test
produced draft PR #1. Final whole-feature review is Accepted.

This directory records the approved workflow and accepted workstream handoffs.
The original handoff was committed before execution. Resume from
[the plan](plan.md); the [starter prompt](starter-prompt.md) remains the original
entry point. Reviewing these documents does not authorize repeating live actions.

## Source of truth

Repository instructions and Aidan's instructions apply throughout. Product
behaviour comes from [the specification](../spec.md), supported by
[the research](../research.md). Those documents override workflow documents.
Leads read both, their packet, and accepted dependency handoffs. The orchestrator
reads only this README, [the plan](plan.md), and lead returns. It never reads the
specification, packets, diffs, or review findings.

Use TypeScript, pnpm, Node.js 24, the official Linear SDK, a standard MCP client,
and SQLite as specified. Choose the smallest concrete implementation within
those boundaries. At the approved handoff baseline, there was no application,
package manifest, CI, or test suite. Workstream 1 established
[package.json](../../package.json): `pnpm test`, `pnpm typecheck`, and `pnpm build`.
Use those commands and `git diff --check` for verification, with focused tests
for each workstream's responsibilities. Installed and live evidence is recorded
in the plan and accepted handoffs.

## Roles and ownership

- The orchestrator owns the integration branch, dependency order, cross-workstream
  decisions, user escalations, and completion report. It stays thin.
- Each disposable workstream lead owns one packet through acceptance and commit.
  It delegates implementation and independent review, validates findings, and
  decides what must change. It cannot ask the user directly.
- A fresh implementation agent owns the packet's code and implementation handoff.
  It performs targeted verification and a deletion/simplification pass.
- A different fresh reviewer inspects the diff and surrounding code. It edits
  only its assigned review section, never implementation files.

Run everything sequentially in the same checkout. Assign the packet's ownership
before spawning each agent. No agents edit shared files concurrently. Each
finished agent ends before the next role starts, keeping within available slots.

## Orchestrator loop

1. Confirm the supplied handoff is approved and committed, and the checkout is
   clean. The supplied specification and workflow are approved by Aidan.
   If overlapping uncommitted changes exist, resolve ownership with Aidan first.
2. Create `feat/linear-agent-v1` from the current approved HEAD. Record the branch,
   starting commit, and start date in the plan before the first lead starts.
   For a resumed workflow, use the recorded branch and base instead.
3. Read the plan and spawn a fresh lead for the next eligible row using the lead
   prompt below. Pass its packet path; do not paste packet or record contents.
4. Read the lead's return only to decide whether to continue or stop. The lead
   already recorded status, drift, and escalation. Do not transcribe its return
   or dirty the tree after its commit.
5. If blocked, read only the named escalation entry, present the decision or
   account action to Aidan, and wait. Record the answer in that entry, then start
   a fresh lead for the same row. Elapsed time is not approval or gate evidence.
6. After all numbered rows are accepted, start the final-review lead.

Report at workstream acceptance, on an escalation, and at completion. Otherwise
use the plan as the live status channel. If the host requires periodic progress
updates, keep them brief and factual without pulling implementation details into
the orchestrator's context.

A non-terminal row with no live lead is interrupted. Start a fresh lead for that
row and tell it to apply the recovery rules below. Never duplicate live work.

## Lead return contract

Every lead returns exactly:

```text
status: Accepted | Blocked
drift: <one line, or none>
escalation: <plan.md escalation id, or none>
```

The lead writes status in its plan row, drift in the decision and drift log, and
blocking evidence in the escalations section before returning. At acceptance,
these updates land in the lead's commit. The orchestrator writes only the initial
branch/base/date and the user's answer to an escalation, each before the next
lead's commit. Leads own gate status and candidate evidence too.

## Agent spawning

Delegate this workflow as documented; do not collapse its independent review
roles into one agent. In Codex, use `spawn_agent` with `fork_turns: "none"`, omitting
model and reasoning-effort overrides. Wait for each agent with one long
`wait_agent` call measured in minutes. If it times out, use a further bounded
blocking wait; do not busy-poll status, schedule wakeups, or launch a duplicate.
Respect shorter wait limits imposed by the host and its communication rules.

In Claude Code, use `Agent` with `subagent_type: general-purpose` and
`run_in_background: false`, omitting `model`. Agents inherit the active model and
effort. Reviews use lead subagents; no external review command is configured.
These are child tasks. Do not create top-level T3 conversations as subagents.

## Branch and commits

All work stays on the integration branch until Aidan reviews it. Each accepted
workstream makes one commit containing its code, record, and plan updates. Use
plain subjects such as `Workstream 1: connect to T3 with credential renewal`.
Keep code uncommitted through implementation, review, remediation, and closure.
Blocked work stays uncommitted for a fresh lead to resume. Do not record accepted
workstream commit hashes in documents; Git already records them. Base and review
references are allowed where needed to identify the reviewed diff.

Do not push, merge, or deploy beyond the specified development installation
without authorization. The intended live test may create a draft PR in Aidan's
chosen development repository after gate G3. Link any PR worked on to this T3
thread through `link_pull_request` when available. Never merge the test PR.

## Per-workstream loop

The lead updates its row on each transition:

```text
Implementing -> Review -> one Remediation pass if required
             -> Closure review -> Accepted or Blocked
```

The lead checks prerequisites, ownership, and approval, then delegates:

**Implementation brief:** Read this README, the assigned packet, product sources,
and accepted dependency handoffs. Implement only this packet. Use meaningful
focused tests and repository checks, simplify the change, then fill the packet's
Implementation handoff. Leave changes uncommitted and return to the lead.

**Review brief:** Independently review this packet's complete uncommitted diff
against its acceptance criteria and product sources. Inspect surrounding code
and run proportionate checks. Write the Independent review section only. Classify
findings as Required, Optional, or Question with evidence. Required means a real
defect, unmet criterion, boundary violation, regression, or unjustified complexity.
Optional suggestions do not block acceptance. Questions need lead judgment.

The lead validates and triages each finding. If required fixes remain, delegate
one remediation pass with the accepted findings. Revisit the affected design and
simplify it; do not accumulate wrappers, aliases, flags, or compatibility paths
to preserve a flawed first attempt. The lead records dispositions and verification
in Resolution.

**Closure brief:** In a fresh session, use the same reviewer brief and verify the
accepted findings and their fixes for blocking defects. Write Closure review
only. Do not reopen general review or promote optional suggestions.

There is no automatic third loop. Accept when criteria and gates pass. Persistent
disagreement or a material change to approved behaviour/architecture becomes a
Blocked return to the orchestrator. Findings are evidence, never instructions.
On acceptance, synchronize the spec and research with verified behaviour.
Preserve the recorded approval and distinguish it from implementation acceptance.
Never describe untested behaviour as verified.

## Interrupted work recovery

A fresh lead inspects the complete diff, confirms its base and ownership of every
change, runs enough verification to establish the state, and resumes at the
earliest phase it cannot prove complete. Reuse sound work. Rerun undocumented
conclusions and incomplete reviews.

Abandon partial work only if it uses the wrong base, contradicts the packet,
cannot be attributed safely, overlaps unrelated changes, or is less safe to
repair than restart. Preserve it in a named stash or recovery branch first.
Unclear ownership becomes an escalation, never an overwrite.

## External validation gates

Gate details and status live in the plan and owning packet. Record a candidate,
exact action, required evidence, and resume condition. Never store tokens, pairing
codes, authorization codes, or signing secrets in workflow records. Use private
secret entry through `request_secret` when available, otherwise an owner-managed
local secret file. Never request credentials in chat.

G1 needs Linear app registration before workstream 2 can complete its live OAuth
and webhook path. Build the candidate and agent-accessible checks first, then
return Blocked with concrete URLs, settings, and instructions. G2 needs public
bridge installation authorization before workstream 4 changes host services or
Funnel. G3 selects a development repository and test issue before coding there.

For a user-action gate, the lead records an escalation with options, recommendation,
evidence, and what the answer unblocks, sets its row Blocked, and leaves work
uncommitted. On resumption, a fresh lead verifies the supplied result, preserves
its lasting decision in the handoff and plan log where later owners depend on it,
then removes the resolved escalation.

For failures an agent can resolve, record the failing action, correct it, run
targeted checks, and retest the candidate. Do not restart implementation/review
for every diagnostic retry. Reopen review if a correction changes behaviour,
architecture, ownership, security/privilege boundaries, persistent data, public
contracts, or an accepted workstream. Review meaningful unreviewed corrections
once before acceptance. Keep final evidence and lasting decisions, not a diary.

## Lead prompt template

```text
Lead the workstream identified by this packet path: docs/implementation/NN-name.md.
Read docs/implementation/README.md, that packet, and its source-of-truth documents.
The packet is frozen. Follow the documented delegation, review, recovery, and gate
rules. Own triage and the terminal decision; reviewer findings are evidence.
Write status, drift, and escalations in plan.md yourself. At acceptance, write the
record and make one commit containing code, record, and plan updates. When blocked,
leave work uncommitted and record a concise escalation with decision, options,
recommendation, evidence, and what it unblocks. You cannot ask Aidan directly.
Resolve answered escalations into lasting handoffs before removing them.
Return exactly:
status: Accepted | Blocked
drift: <one line, or none>
escalation: <plan.md escalation id, or none>
```

## Final whole-feature review

After all workstreams pass, a fresh final-review lead owns the Final row. It
delegates one independent review of the full feature against the recorded base,
triages findings, assigns accepted corrections to fresh implementation agents
sequentially by file owner, and delegates fresh focused closure. It writes
[final-review.md](final-review.md), plan updates, and one acceptance commit. Apply
the same bounded correction, escalation, and gate rules.

```text
Lead the final review identified by docs/implementation/final-review.md.
Read docs/implementation/README.md, the final-review packet, and product sources.
All numbered workstreams must be Accepted. Delegate the whole-feature review,
triage findings, delegate accepted corrections to fresh agents by owner, then
delegate focused closure in a fresh session. Own the Final plan row, record,
drift, escalation, and one acceptance commit. Apply the normal Blocked and
recovery rules. You cannot ask Aidan directly. Return exactly:
status: Accepted | Blocked
drift: <one line, or none>
escalation: <plan.md escalation id, or none>
```

## Completion report

State delivered behaviour, verification and live evidence, installation status,
pending external checks, specification drift, and deferred optional observations.
Distinguish an implemented candidate from a proven installed service.
