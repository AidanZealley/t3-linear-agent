# t3-linear-agent
Connect Linear agent delegation to a self-hosted T3 Code server.

Delegate an issue to T3 in Linear, run the work on your own server, and receive a
pull request for review. The standalone T3 client and Linear installation edge
are implemented and accepted. The supervised lifecycle service is installed.
The approved AID-7 test completed in an isolated worktree and produced one
[draft pull request](https://github.com/AidanZealley/t3-linear-agent/pull/1),
with progress and the result linked in Linear. Bridge restart preserved that work.
G1–G3 have passed and workstreams 1–4 are accepted. Whole-feature review is
accepted. The completed test grants no further dispatch, merge or deployment
authority.

- [Specification](docs/spec.md) defines the approved first version and its acceptance criteria.
- [Research](docs/research.md) records the decisions, implementation evidence and remaining limits.
- [Implementation workflow](docs/implementation/README.md) defines the approved workstreams, review loop, and installation gates.
- [Starting prompt](docs/implementation/starter-prompt.md) hands the workflow to a fresh agent after the approved documents are committed and pushed.

## Linear OAuth installation and receipt

The Linear edge installs an app actor, persists signed events in SQLite,
and sends an initial activity. The edge-only entrypoint does not start coding;
the installed lifecycle composition does. During G1, live installation,
signed receipt, initial activity within 1.772 seconds and existing-UUID
reconciliation passed. The temporary G1 bridge and ingress were stopped before
the permanent installation. The private installation, store and secrets were
retained. Aidan accepted his observed prompt response and verified activity
timestamps as sufficient gate evidence. Exact HTTP response duration remains
unverified; runtime deadlines
remain five seconds for HTTP and ten seconds for initial activity.

The following procedure records the completed OAuth setup. This host needs no
second registration, consent or edge-only startup.

Register an internal OAuth application named `T3` in Linear's API settings.
Enable webhooks with only **Agent session events** selected. Set these URLs:

- Callback: `https://aidanzealley-macbookpro10-1.tail8a28e5.ts.net:8443/oauth/callback`
- Webhook: `https://aidanzealley-macbookpro10-1.tail8a28e5.ts.net:8443/webhooks/linear`

These URLs use the permanent bridge and Funnel installed by Aidan on 7 October
2026. Fresh signed delivery and owner bridge restart passed G2. Public 8443
proxies only to the bridge on loopback 8787; private T3 Serve remains on 443.
The lifecycle transition and approved test subsequently passed G3. Exact authority
and evidence are in the plan.

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

The supervised lifecycle composition and permanent Funnel are installed, with
G2 and G3 Passed in the implementation plan. Aidan authorized consuming only
historical validation receipts 1–3 while preserving their signed receipt/activity
evidence; that transition is complete. They grant no coding or further activity
authority. The configuration and manual startup instructions below describe the
completed setup. Do not start a second process alongside the installed service.

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
not prove unattended GitHub authentication or PR permissions; G3 verified those
for the approved AID-7 test.
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

Installation commands below document the completed, reviewed setup; do not
reinstall it or repeat the validation actions. Aidan chose owner-run G2 host
actions, and
G3 separately authorized the narrow private/lifecycle transition and bridge-only
restart. Composition is now installed; the approved AID-7 test produced
[draft PR #1](https://github.com/AidanZealley/t3-linear-agent/pull/1). Run host commands as
`aidanzealley`, without sudo. Keep the existing `t3code.service` running.

The pre-installation baseline on 7 October 2026 found systemd 255, a running user manager
and `Linger=yes`. A user unit can therefore start at boot and survive logout;
no change to lingering was needed. Node was `/usr/bin/node`, version 24.19.0;
pnpm was `/usr/bin/pnpm`, version 11.20.0. The checkout was
`/home/aidanzealley/code/t3-linear-agent`. At that baseline, Serve/Funnel JSON
contained only private HTTPS 443 pointing to `http://127.0.0.1:3773`, with no
Funnel allow entries.
Port 8787 was unused. The retained state directory was 0700 and
`linear-secrets.json` and `bridge.sqlite` were 0600. `t3.json`, `sessions.json`
and a bridge unit were absent.

The base [unit](deploy/t3-linear-agent.service) runs the accepted edge command directly,
restarts failures after five seconds, limits restart attempts and gives shutdown
60 seconds to drain. It runs as the user manager's owner with umask 0077. Logs go
to the user journal; secrets and SQLite remain outside Git. The base unit never
starts T3 or consumes coding receipts. The installed
[lifecycle override](deploy/lifecycle.conf) selects `dist/main.js` to consume
coding receipts and use the existing private T3 server. Both modes refresh Linear
credentials and deliver pending initial acknowledgements, so any fresh validation
session also needs explicit authorization. An already sent acknowledgement is not
resent on startup.

The approved installation procedure began by checking and retaining the baseline
privately:

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
Linear reachability. Do not disable TLS checks. For signed delivery proof, Aidan
sent `Installation receipt check only. Do not start coding.` in the existing
G1 AID-6 session. It recorded input without another initial acknowledgement or
T3 thread. The chosen session, delivery UUID, receipt sequence, signed timestamp
and matching installed identity are retained in the plan. Agents created no
Linear input or repeated activity calls. This delivery check passed as retained
sequence 3 on 7 October 2026. G3's authorized disposition of receipts 1–3 is also
complete; no further reply or receipt change is needed.

The G2 recovery check used only
`systemctl --user restart t3-linear-agent.service`. The bridge became active again
with the same receipts and sent activity IDs, leaving T3 and private 443 unchanged.
The separate G3 coding recovery check also passed without repeating coding or
creating another PR.

## Completed G3 coding transition

The following procedure records the authorized transition and AID-7 validation,
which are complete. Keep the installed credential, configuration and lifecycle
override. These steps do not authorize another delegation, pairing or restart.

G3 recorded the exact Linear project name, T3 project ID/title, repository path,
local base branch, provider/model and runtime ceiling. Aidan selected the harmless
AID-7 task and authorized its one-file edit, relevant checks, branch push and
draft PR. Unattended GitHub authentication and T3's permission ceiling were
confirmed before dispatch. No merge or deployment was permitted.

The edge was stopped and its state backed up privately before changing historical
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

For an authorized new installation, after the approved receipt disposition,
pair through `pnpm t3 pair` using the approved `T3_RUNTIME_MODE` if `t3.json` is
absent. This creates an external-client grant and belongs to G3. Use
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

The approved G3 transition used these commands:

```sh
systemctl --user stop t3-linear-agent.service
install -d -m 0700 /home/aidanzealley/.config/systemd/user/t3-linear-agent.service.d
install -m 0600 deploy/lifecycle.conf /home/aidanzealley/.config/systemd/user/t3-linear-agent.service.d/lifecycle.conf
systemctl --user daemon-reload
systemctl --user start t3-linear-agent.service
systemctl --user is-active t3-linear-agent.service
node dist/main.js status
```

Aidan then delegated AID-7. One Linear session mapped to one T3 thread with the
chosen project, base branch and isolated managed worktree. The inspected result
was draft PR #1, with checks and its URL in Linear's final response and external
URLs. `link_pull_request` registered the PR with the calling T3 conversation;
the coding thread's separate native PR metadata remains null. The plan records
the issue/session/thread/run/worktree IDs and PR URL without credentials. The
authorized bridge restart retained the same thread and did not repeat coding or
create another PR. T3 remained running. Obsolete probe credentials were retired
through their exact local client session IDs; the installed bridge credential
was preserved.

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
