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

One coding session runs at a time. Follow-ups queue on their original thread;
queued sessions wait for the active session. Project names match case-sensitively,
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
Restart the bridge after configuration changes. New sessions use the configured
provider/model; existing threads retain their model.

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
