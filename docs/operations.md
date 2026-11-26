# Operating t3-linear-agent

## Status and logs

```sh
systemctl --user status t3-linear-agent.service --no-pager
journalctl --user -u t3-linear-agent.service -n 50 --no-pager
node dist/main.js status
```

Run the Node command from the checkout. It lists session/thread/run IDs, unresolved
T3 delivery intents and failed reports without printing credentials or task bodies.
Review logs before sharing them.

If a service hits its restart limit, correct the configuration, permissions or
missing build first, then use `systemctl --user reset-failed t3-linear-agent.service`
and restart only the bridge.

## Using Linear

Up to `maxActiveSessions` coding sessions run at a time across all projects.
The setting defaults to 5 in `sessions.json`; use a positive integer and restart
the service to change it. Follow-ups queue on their original thread, and new
sessions wait when all slots are occupied. Paused sessions and pending
cancellations reserve a slot until reconciled. Project names match case-sensitively,
and each session retains its selected project ID.

Reply normally to a single native question. For multiple questions, reply with a
JSON object mapping question IDs to string answers. Permission approvals stay in T3.

Linear's Stop control, `/stop`, or a short explicit stop request cancels queued
inputs/runs and interrupts the active run. Once cancellation finishes, use
`/resume` or `/resume <instructions>` to continue the retained thread. Ordinary
replies do not restart stopped work.

The bridge forwards public questions, confirmed final responses and ten-minute
status heartbeats. It does not forward reasoning or raw command logs. A completed
investigation can return an answer without a PR. When a PR exists, its URL appears
in the final response and the Linear session's external links.

## Ticket model selection

In Linear, open Settings > Workspace > Labels, or your team's Settings > Labels.
Create two issue label groups with exactly these lowercase names:

- `harness`, containing labels named `claude-code` and `codex`.
- `difficulty`, containing labels named `low`, `medium` and `high`.

Use workspace labels if you want them available across teams. Groups allow only
one child label per group on a ticket. You can also create them from an issue's
Add label menu by entering `harness:claude-code`, `harness:codex`, `difficulty:low`,
`difficulty:medium` and `difficulty:high`. Linear interprets this syntax as
`group:child`. The bridge accepts both grouped labels and ordinary labels whose
full names match these strings. See [Linear's label documentation](https://linear.app/docs/issue-property#issue-labels).

Without routing labels, T3 chooses the model and reasoning using its current
new-thread settings. A harness label chooses the newest available model in its
default family, GPT Sol for Codex or Claude Opus for Claude Code, and uses the
model's default reasoning. The bridge reads the model catalog at dispatch.

With a difficulty label, the bridge uses these families and reasoning levels:

| Harness | Low | Medium | High |
| --- | --- | --- | --- |
| Codex | GPT Luna, low | GPT Sol, low | GPT Sol, high |
| Claude Code | Claude Sonnet, low | Claude Opus, medium | Claude Opus, high |

A difficulty label alone uses a supported project-level T3 model default if one
is set. Otherwise add a harness label. If the labels conflict or T3 offers no
matching model, the bridge asks for clarification. Update the labels or T3
settings and reply in the session. Existing threads keep their model.

## Configuration overrides

The defaults live under `~/.local/state/t3-linear-agent`. See the checked-in
[secrets](../examples/linear-secrets.json), [sessions](../examples/sessions.json) and
[runtime](../examples/service.env) examples.

| Variable | Default or purpose |
|---|---|
| `T3_RUNTIME_MODE` | Required explicitly for the coding service; use the paired credential's permission ceiling |
| `T3_MCP_ENDPOINT` | `http://127.0.0.1:3773/mcp` |
| `T3_CREDENTIAL_FILE` | `~/.local/state/t3-linear-agent/t3.json` |
| `T3_CLI` | Optional absolute T3 executable; otherwise discovered from PATH or active T3 runtime metadata |
| `T3_BASE_DIR` | Optional T3 data directory for local authorization |
| `LINEAR_SECRET_FILE` | `~/.local/state/t3-linear-agent/linear-secrets.json` |
| `LINEAR_STORE_FILE` | `~/.local/state/t3-linear-agent/bridge.sqlite` |
| `SESSION_CONFIG_FILE` | `~/.local/state/t3-linear-agent/sessions.json` |

Set overrides in your private `service.env`. Use absolute paths for file overrides;
that file does not perform shell expansion of `~` or `$HOME` when systemd reads it.
Restart the bridge after configuration changes. New sessions use the current T3 defaults and any Linear label overrides.

## Backups and updates

Stop only the bridge before copying the state directory:

```sh
systemctl --user stop t3-linear-agent.service
umask 077
agent_backup="$HOME/.local/state/t3-linear-agent-backup-$(date +%Y%m%dT%H%M%S)"
cp -a "$HOME/.local/state/t3-linear-agent" "$agent_backup"
systemctl --user start t3-linear-agent.service
```

Backups include Linear tokens and T3 credentials. Keep them private. Retain SQLite,
credentials and T3-managed worktrees across updates and restarts.

To update, stop the bridge, update your checkout to the release you intend to run,
then run `pnpm install --frozen-lockfile` and `pnpm build`. Start the bridge again.
Reload systemd if you changed the installed unit or override. Existing T3 coding
runs continue independently when the bridge stops; startup reconciles saved work
before dispatching queued sessions.

Use `T3_RUNTIME_MODE=auto` for unattended coding with the bridge's two
orchestration scopes. Current T3 versions require additional scopes for
`full-access`. Changing an existing bridge from `full-access` to `auto` lets
it renew the stored credential with the lower runtime ceiling. It keeps the
existing scopes and reconciles unresolved delivery intents before dispatch.

When T3 authorization is unavailable, the bridge can still accept webhooks
and report a safe error in affected Linear sessions. It retains queued work
and retries authorization. Delivery of those reports requires Linear access.

Linear tokens refresh automatically. T3 credentials renew five days before expiry
using local authorization and reconcile uncertain operations before switching.
Do not overwrite an existing credential with another pairing.

## Troubleshooting

If delivery fails, check the service and local `/oauth/start` HTTP 401 first,
then the public proxy, public DNS, TLS and Linear's registered webhook URL.
A successful MagicDNS request alone does not prove public reachability. Compare
the webhook signing secret locally if signature validation fails; do not print it.

The bridge targets HTTP acknowledgement within five seconds and initial activity
within ten seconds. Initial activity timing was verified live; exact HTTP delivery
duration was not independently measured. Investigate timing if Linear reports
timeouts. Live Linear Stop and Linear-to-native-question flows have focused tests,
but were not exercised end to end against Linear during initial validation.

Failed reports retain their UUIDs. To retry them without resending coding work:

```sh
node dist/main.js retry-reports
```

An ambiguous launch/send pauses new coding. Inspect the exact saved thread,
project, message and request IDs in T3 before reconciling. `/resume` does not
bypass uncertain delivery. Do not clear the problem by deleting intents, changing
repositories, deleting SQLite or resending the task under new credentials.

Inputs received during setup are durable and will be processed when coding starts.
For an existing setup-only installation with test inputs, review those pending
receipts before enabling composition. Preserve their evidence and decide which
inputs should run; do not bulk-delete or blindly mark them consumed.

## Removal

Stop and disable only this bridge and its public listener:

```sh
tailscale funnel --https=8443 off
systemctl --user disable --now t3-linear-agent.service
rm ~/.config/systemd/user/t3-linear-agent.service.d/lifecycle.conf
rmdir ~/.config/systemd/user/t3-linear-agent.service.d
rm ~/.config/systemd/user/t3-linear-agent.service
systemctl --user daemon-reload
```

These paths assume you installed the two templates from the setup guide. Keep
T3's service and private listener intact; never use Serve/Funnel reset to remove
this bridge. Retain state for recovery. Revoking T3 credentials, uninstalling the
Linear app and deleting private state are separate actions. Removing the bridge
does not cancel independent T3 runs, undo code or close PRs.
