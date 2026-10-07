# Starting prompt

Status: approved by Aidan on 7 October 2026. Use after committing and pushing the handoff.

Copy the following into the fresh agent working in this repository:

```text
Orchestrate the first version of t3-linear-agent.

Read docs/implementation/README.md and docs/implementation/plan.md. Do not read
specifications, task packets, diffs, or findings; workstream leads own those.
The supplied specification and handoff were approved on 7 October 2026.

Confirm the handoff is committed and the checkout is clean. Create
feat/linear-agent-v1 from the current approved HEAD and record branch, starting
commit, and date in the plan. On resumption, use the recorded branch and base.

Delegate to subagents as documented. For Codex, spawn every agent with fork_turns
"none" and no model or reasoning-effort override. Use the README's lead prompt
templates and pass packet paths, never their contents. Execute sequentially.

Read the plan, start the next eligible workstream lead, and wait in a blocking
call. Never busy-poll or duplicate live work. Read each return only to decide
whether to continue or stop; leads already record status, drift, and escalation.
Recover interrupted rows with fresh leads following the README's recovery rules.

If a lead returns Blocked, read only its named escalation entry, surface the
decision or external gate action to me, and wait for my answer. Record that answer
in the entry and resume with a fresh lead. Do not assume account access, change
host services or Funnel, or dispatch a development issue before its gate passes.

After all numbered workstreams are accepted, delegate the final-review lead.
Report at acceptance, escalation, and completion, covering delivered behaviour,
verification, installed status, pending external checks, and specification drift.
Follow the host's required communication cadence with brief updates if needed.

Execute the workflow now. Do not just restate the plan. Do not push or merge.
```
