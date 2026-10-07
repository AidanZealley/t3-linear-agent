# Workstream 4: Host installation and live development PR

Status: approved task packet; not started. Depends on accepted workstream 3.

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
- Status: Pending.
- Candidate and instructions: lead records exact host changes and rollback for
  G2; matched projects, repository/base branch, proposed issue and permitted
  push/draft-PR actions for G3.
- Required evidence: explicit authorization of host changes and selected target,
  followed by signed delivery, T3 worktree execution, checks, and linked draft PR.
- Attempts and lasting decisions: pending. Agent-resolvable delivery failures use
  the README troubleshooting rule; substantive corrections receive focused review.
- Resume condition: Aidan authorizes the concrete installation and development
  test; a fresh lead verifies results and records gate evidence before acceptance.

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
