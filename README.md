# t3-linear-agent
Connect Linear agent delegation to a self-hosted T3 Code server.

Delegate an issue to T3 in Linear, run the work on your own server, and receive a
pull request for review. The standalone T3 client and Linear installation edge
are implemented and accepted. The supervised lifecycle service is installed.
The approved AID-7 test completed in an isolated worktree and produced one
[draft pull request](https://github.com/AidanZealley/t3-linear-agent/pull/1),
with progress and the result linked in Linear. Bridge restart preserved that work.

- [Specification](docs/spec.md) defines the proposed first version and its acceptance criteria.
- [Research](docs/research.md) records the evidence, alternatives, and questions to resolve before implementation.
- [Implementation workflow](docs/implementation/README.md) defines the approved workstreams, review loop, and installation gates.
- [Starting prompt](docs/implementation/starter-prompt.md) hands the workflow to a fresh agent after the approved documents are committed and pushed.

## Linear OAuth installation and receipt

The local Linear edge can install an app actor, persist signed events in SQLite,
and send an initial activity. It does not start coding work yet. Live installation,
signed receipt, initial activity within 1.772 seconds and existing-UUID
reconciliation passed G1. Temporary ingress and the validation bridge are stopped;
the private installation, store and secrets are retained. Aidan accepted his
observed prompt response and verified activity timestamps as sufficient gate
evidence. Exact HTTP response duration remains unverified; runtime deadlines
remain five seconds for HTTP and ten seconds for initial activity.

Register an internal OAuth application named `T3` in Linear's API settings.
Enable webhooks with only **Agent session events** selected. Set these URLs:

- Callback: `https://aidanzealley-macbookpro10-1.tail8a28e5.ts.net:8443/oauth/callback`
- Webhook: `https://aidanzealley-macbookpro10-1.tail8a28e5.ts.net:8443/webhooks/linear`

These URLs work after G2 authorizes the permanent bridge installation below.
Aidan installed the reviewed edge service and Funnel on 7 October 2026. Fresh
signed delivery and owner bridge restart pass G2. Preserve
private T3 Serve on 443. Current authority and remaining owner steps are in the plan.

Create `~/.local/state/t3-linear-agent` with mode 0700. Using a local editor,
create `linear-secrets.json` there with mode 0600. Never paste credentials into
chat or save this file in the repository. Its JSON keys are `clientId`,
`clientSecret`, `webhookSecret`, `setupPassword`, and `publicUrl`. Use the values
from the registered application, a random setup password of at least 24 characters,
and `https://aidanzealley-macbookpro10-1.tail8a28e5.ts.net:8443` for `publicUrl`.
The default store is `bridge.sqlite` in that same private directory. Tokens are
protected by filesystem permissions, so backups of this directory are secrets too.
`LINEAR_SECRET_FILE` and `LINEAR_STORE_FILE` can select other private paths outside
the checkout.

Run `pnpm build`, then `node dist/linear/cli.js` in a terminal. It binds to
`127.0.0.1:8787`. After ingress authorization, open
`https://aidanzealley-macbookpro10-1.tail8a28e5.ts.net:8443/oauth/start` in a browser.
Use username `aidan` and the private `setupPassword` when prompted. Complete Linear
consent as a workspace admin in that browser. Start redirects to Linear with
`actor=app`, scopes `read,write,app:assignable,app:mentionable`, random one-time
state, and PKCE S256. The callback verifies the browser cookie and persisted state
before exchanging the code and reading the installed app/workspace identity.
The installation route refuses to replace an existing installation.

G1 installation and acknowledgement are complete. Further owner-generated
validation input needs explicit gate authorization. The edge only acknowledges
receipt; it creates no T3 thread. Preserve live evidence separately from local
tests. Completed cleanup and G1 evidence are recorded in
[the plan](docs/implementation/plan.md#acceptance-evidence).
Stop with Ctrl-C. Failed initial activities retry with exponential delay for six
attempts and remain in SQLite afterward. An operator can call
`Store.retryFailedActivities()` before starting the worker to resume delivery
with the original activity IDs.

The implementation follows Linear's current [OAuth lifecycle](https://linear.app/developers/oauth-2-0-authentication),
[app actor setup](https://linear.app/developers/agents),
[agent interaction protocol](https://linear.app/developers/agent-interaction),
and [webhook helper](https://linear.app/developers/sdk-webhooks).

## Run the lifecycle service

Permanent hosting and coding in a selected development repository require G2 and
G3 in the implementation plan. The accepted validation bridge and Funnel are
stopped. The commands below do not install a host service or configure ingress.
Use the edge-only listener for G2. Before composed startup under G3, settle the
retained G1 validation receipt with Aidan and record authorized dispatch scope.
Preserve its signed receipt/activity evidence. Pending historical input grants
no permission to code or post further activities on that validation session.

The composition uses the same private `linear-secrets.json`, `bridge.sqlite`,
and T3 bearer credential `t3.json` under `~/.local/state/t3-linear-agent`.
Keep the directory at 0700 and secret/database files at 0600. SQLite now also
stores the session queue, outgoing T3 intents and reporting intents. Back up this
directory as private state. Preserve it across service and T3 restarts.

Create `sessions.json` in that directory with explicit provider/model IDs and
each permitted T3 project ID, repository root and local base branch:

```json
{
  "providerInstanceId": "codex",
  "model": "gpt-6.1-sol",
  "projects": {
    "replace-with-the-T3-project-ID": {
      "repository": "/absolute/path/to/the/authorized/repository",
      "baseRef": "main"
    }
  }
}
```

`pnpm t3 inspect` reads project and provider/model IDs. Routing still uses the
issue's exact, case-sensitive Linear project name. Configuration validates the
provider/model catalog, Git repository roots and local base branches. It does
not prove unattended GitHub authentication or PR permissions; G3 verifies those.
Restart the service after changing `sessions.json`.

Select `T3_RUNTIME_MODE` explicitly, matching the paired credential's ceiling.
Set `T3_CLI` to the installed executable and `T3_BASE_DIR` when using a separate
T3 data directory. `T3_MCP_ENDPOINT`, `T3_CREDENTIAL_FILE`, `LINEAR_SECRET_FILE`,
`LINEAR_STORE_FILE` and `SESSION_CONFIG_FILE` override their documented defaults.
After the installation gates permit dispatch, run `pnpm build`, then
`T3_RUNTIME_MODE=full-access pnpm start`, or choose the approved lower ceiling.
The service binds only `127.0.0.1:8787`, using the existing OAuth/webhook routes.
Do not run the validation CLI and lifecycle service against the same listener or
database at the same time.

One Linear session works at a time. Follow-ups wait in durable receipt order on
the same T3 thread. Missing or duplicate project names cause a Linear question;
fix the names or issue project and reply to resume that same session. Selection
pins the project ID, so later renames do not change its repository. Questions
from T3 accept a normal reply when there is one question, or a JSON object mapping
question IDs to string answers when there are several. Permission approvals stay
in T3.

Linear's Stop control, `/stop`, or an explicit short stop request cancels pending
input and T3 queue entries and interrupts the active run by ID. Later ordinary
replies cannot restart a stopped session. After cancellation has finished,
`/resume` or `/resume <instructions>` explicitly continues its retained thread.
An interrupted or cancelled T3 run also remains stopped.

Ctrl-C or SIGTERM closes ingress, drains outstanding service/API operations and
closes MCP. A running T3 coding agent continues independently. On startup the
service reconciles saved delivery intents and existing active threads before it
starts another queued session. Automatic credential renewal uses the same
reconciler and retains the exact outgoing request key and OAuth session.

Run `node dist/main.js status` with the same `LINEAR_STORE_FILE` to inspect session,
thread, run, unresolved-intent and failed-report IDs without printing credentials
or task bodies. An ambiguous launch or send stays paused and blocks new coding
dispatch. Inspect that exact project/thread and its durable message IDs in T3.
The service adopts one verified launch binding or the exact message ID derived
from the stored OAuth session and request key. If evidence is absent or
conflicting, keep it paused for operator reconciliation. `/resume` does not
bypass an ambiguous delivery. Never delete its intent, reroute it, or resend the
task under a replacement credential to clear the pause.

Reports retry six times with bounded delay and retain their UUIDs. Reports for
one session wait for its initial acknowledgement and stay in order; a failed
report holds later reports for that session. Coding proceeds independently of
reporting availability.
`node dist/main.js retry-reports` resets failed reporting intents for the next
poll without resending coding work. Reporting uses public questions and confirmed
final responses, plus a ten-minute status heartbeat. Reasoning, activity items and
raw command logs are excluded. A completed investigation may return an answer
without a PR. A PR URL is also added to the Linear session's external URLs.


## Install on this host

The reviewed edge service, fresh G2 signed delivery and owner bridge restart pass
read-only verification. Installation commands below document
the reviewed setup; do not reinstall it. Aidan chose owner-run host actions, and
G3 separately authorized the narrow private/lifecycle transition and bridge-only
restart. Composition is now installed; the approved AID-7 test produced
[draft PR #1](https://github.com/AidanZealley/t3-linear-agent/pull/1). Run host commands as
`aidanzealley`, without sudo. Keep the existing `t3code.service` running.

The pre-installation baseline on 7 October 2026 found systemd 255, a running user manager
and `Linger=yes`. A user unit can therefore start at boot and survive logout;
no change to lingering is needed. Node is `/usr/bin/node`, version 24.19.0;
pnpm is `/usr/bin/pnpm`, version 11.20.0. The checkout is
`/home/aidanzealley/code/t3-linear-agent`. Serve/Funnel JSON contains only private
HTTPS 443 pointing to `http://127.0.0.1:3773`, with no Funnel allow entries.
Port 8787 is unused. The retained state directory is 0700 and
`linear-secrets.json` and `bridge.sqlite` are 0600. `t3.json`, `sessions.json`
and a bridge unit are absent.

The [unit](deploy/t3-linear-agent.service) runs the accepted edge command directly,
restarts failures after five seconds, limits restart attempts and gives shutdown
60 seconds to drain. It runs as the user manager's owner with umask 0077. Logs go
to the user journal; secrets and SQLite remain outside Git. It never starts T3
or consumes coding receipts. It can refresh Linear credentials and deliver
pending initial acknowledgements, so any fresh validation session also needs
explicit authorization. An already sent acknowledgement is not resent on startup.

Before approved installation, recheck and retain the baseline privately:

```sh
cd /home/aidanzealley/code/t3-linear-agent
loginctl show-user aidanzealley -p Linger -p State -p RuntimePath
systemctl --user is-system-running
systemctl --user list-unit-files 't3*'
tailscale serve status --json
tailscale funnel status --json
ss -ltn '( sport = :3773 or sport = :8787 )'
stat -c '%a %U %n' /home/aidanzealley/.local/state/t3-linear-agent /home/aidanzealley/.local/state/t3-linear-agent/linear-secrets.json /home/aidanzealley/.local/state/t3-linear-agent/bridge.sqlite
```

Stop if an existing bridge unit, drop-in or 8443 listener appears, or private 443
changes. Resolve ownership before overwriting anything. The approved commands
create one unit and one public listener:

```sh
pnpm build
systemd-analyze --user verify deploy/t3-linear-agent.service
install -d -m 0700 /home/aidanzealley/.config/systemd/user
install -m 0600 deploy/t3-linear-agent.service /home/aidanzealley/.config/systemd/user/t3-linear-agent.service
systemctl --user daemon-reload
systemctl --user enable --now t3-linear-agent.service
systemctl --user is-active t3-linear-agent.service
curl --silent --output /dev/null --write-out '%{http_code}\n' http://127.0.0.1:8787/oauth/start
tailscale funnel --bg --https=8443 http://127.0.0.1:8787
```

Expect local `/oauth/start` to return 401. Funnel publishes only this loopback
bridge. Its three routes are `/oauth/start`, `/oauth/callback` and
`/webhooks/linear`; all other paths return 404. OAuth start requires the private
setup password, and callback verifies browser state. Use the registered callback
and webhook URLs above; the retained installation needs no second OAuth consent.

After installation, inspect both Serve and Funnel JSON. Require private 443 to
retain its original proxy and no public allow entry for 443. Require public 8443
to proxy only to 8787. Check T3 locally without touching its credential:

```sh
curl --silent --output /dev/null --write-out '%{http_code}\n' http://127.0.0.1:3773/.well-known/oauth-authorization-server
curl --silent --output /dev/null --write-out '%{http_code}\n' https://aidanzealley-macbookpro10-1.tail8a28e5.ts.net:8443/oauth/start
curl --silent --output /dev/null --write-out '%{http_code}\n' https://aidanzealley-macbookpro10-1.tail8a28e5.ts.net:8443/mcp
```

Expect 200, 401 and 404 respectively. Verify public DNS and normal TLS HTTPS from
outside the tailnet as well. A host request may use MagicDNS and does not prove
Linear reachability. Do not disable TLS checks. For signed delivery proof, ask
Aidan to send a fresh prompted reply in the existing G1 AID-6 session, if that
session is still accessible, saying `Installation receipt check only. Do not
start coding.` This records input without another initial acknowledgement. If
it is unavailable, G2 can instead explicitly authorize Aidan to create one fresh
acknowledgement-only delegation on existing AID-6. Record the chosen session,
delivery UUID, receipt sequence and signed timestamp, matching installed identity,
and any new acknowledgement UUID/time. Confirm no T3 thread was created. Preserve
both old and new pending receipts until G3 decides their disposition. Agents do
not create Linear input or repeat activity calls for this check. This delivery
check passed as retained sequence 3 on 7 October 2026; no further reply is needed.

Restart only the bridge with `systemctl --user restart t3-linear-agent.service`.
Require it to become active again, retain the same receipts and sent activity IDs,
and leave T3 and private 443 unchanged. This checks supervised edge recovery.
Coding recovery is a separate G3 check.

## Enable coding after G3

Record the exact Linear project name, T3 project ID/title, repository path, local
base branch, provider/model and runtime ceiling. Aidan must select one harmless
issue and authorize edits, relevant checks, branch push and a draft PR. No merge
or deployment is permitted. Confirm unattended GitHub authentication and T3's
permission ceiling in that repository before dispatch.

Stop the edge and make a private backup of its state before changing historical
input or enabling composition.
The retained G1 receipt is sequence 1, delivery
`76a7ed6f-fc0d-4399-ad28-803aaadc7b08`, session
`59f7671f-3e94-4474-ac86-62ab0b1ad95d`, on AID-6. Recovery also found historical
prompted sequence 2, delivery `b1053f02-dc94-4fcb-a173-7fdda446b5cd`, on that
same session, signed at `2026-10-07T12:14:08.406Z`. G2 prompted sequence 3,
delivery `1545e836-2e56-419b-aa86-634d7434871e`, records the installation-only
reply at `2026-10-07T16:11:30.312Z`. Aidan authorized marking only these three consumed, preserving their rows,
installation and sent activity evidence. That transition is complete. For a new
installation, G3 must explicitly authorize historical receipt disposition. Verify
exact identities against the stopped store before using `Store.consumeEvent`
for only the approved sequences. Do not delete the database or mark all pending
receipts consumed. The completed host transition and exact authority are recorded in the plan.

After that decision and the approved receipt disposition, pair through `pnpm t3 pair` using the approved `T3_RUNTIME_MODE` if `t3.json` is
still absent. This creates an external-client grant and belongs to G3. Use
`pnpm t3 inspect` to confirm real catalog IDs and configure `sessions.json` as
above. The accepted client discovers the executable from active T3 metadata;
inspection currently resolves
`/home/aidanzealley/.t3/runtime/versions/0.0.46-nightly.20261007.2774/t3`.
Keep discovery rather than pinning that nightly. The unit's PATH includes system
Node and pnpm; T3 keeps its own provider environment.

Create private `service.env` with mode 0600 in the state directory, containing
`T3_RUNTIME_MODE=` followed by the approved ceiling. Use only values allowed by
this service: `approval-required`, `auto-accept-edits`, `auto`, or `full-access`.
The required file prevents composition starting without an explicit choice.
The endpoint and credential/session-file defaults match this host.

Once G3 authorizes the configured transition, run:

```sh
systemctl --user stop t3-linear-agent.service
install -d -m 0700 /home/aidanzealley/.config/systemd/user/t3-linear-agent.service.d
install -m 0600 deploy/lifecycle.conf /home/aidanzealley/.config/systemd/user/t3-linear-agent.service.d/lifecycle.conf
systemctl --user daemon-reload
systemctl --user start t3-linear-agent.service
systemctl --user is-active t3-linear-agent.service
node dist/main.js status
```

Only then have Aidan delegate the selected issue. Verify one Linear session maps
to one T3 thread with the chosen project, base branch and isolated managed
worktree. Inspect the result and checks; confirm the PR is a draft, appears in
Linear's final response and external URLs, and is linked to this T3 thread through
`link_pull_request` when available. Record the issue/session/thread/run/worktree
IDs and PR URL without credentials. Restart the bridge during the authorized
check and verify it retains the same thread and does not repeat coding or create
another PR. Keep the user's T3 running. Retire obsolete probe credentials through
their exact local client session IDs; preserve the installed bridge credential.

## Operate and remove

Use `systemctl --user status t3-linear-agent.service` and
`journalctl --user -u t3-linear-agent.service -n 50 --no-pager` for local diagnostics.
Review logs before sharing them. `systemctl --user reset-failed
t3-linear-agent.service` clears the start limit after correcting private file
permissions, missing build files or configuration. Restart only the bridge.
Linear tokens refresh automatically. T3 credentials renew five days before
expiry using local pairing; the same run continues during handover. Renewal
failures and ambiguous requests need the status/reconciliation procedure above.
Keep persisted intent and worktrees for inspection.

If public delivery fails, check service activity and loopback 401 first, then
8443 proxy/allow configuration, public DNS, TLS and the registered webhook URL.
If signature validation fails, compare the owner-managed signing secret and app
identity locally. Do not print secrets or retry delegation merely to diagnose
DNS. Correct delivery failures and repeat the specifically authorized receipt
check; changes to public contracts or privileges need focused review.

To roll composition back to the G2 edge, stop the bridge, remove only the
installed `t3-linear-agent.service.d/lifecycle.conf`, reload the user manager and
start the bridge. Retained T3 runs continue independently; inspect and stop those
through T3 only when explicitly authorized. Rollback does not undo code or PRs.

To remove this installation after authorization, disable only its public listener
and service:

```sh
tailscale funnel --https=8443 off
systemctl --user disable --now t3-linear-agent.service
rm -f /home/aidanzealley/.config/systemd/user/t3-linear-agent.service.d/lifecycle.conf
rmdir --ignore-fail-on-non-empty /home/aidanzealley/.config/systemd/user/t3-linear-agent.service.d
rm /home/aidanzealley/.config/systemd/user/t3-linear-agent.service
systemctl --user daemon-reload
tailscale serve status --json
tailscale funnel status --json
ss -ltn '( sport = :3773 or sport = :8787 )'
```

For a failed G2 install before any lifecycle override exists, skip the drop-in
removal commands. Require 8787 and public 8443 to be absent, with private T3 443
unchanged. Never use Serve/Funnel reset or disable `t3code.service`. Retain private
state, backups and credentials for inspection. Revoking the installed T3 grant,
uninstalling the Linear app or deleting private state are separate owner decisions.
