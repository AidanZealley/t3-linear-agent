# t3-linear-agent
Connect Linear agent delegation to a self-hosted T3 Code server.

Delegate an issue to T3 in Linear, run the work on your own server, and receive a
pull request for review. The standalone T3 client and Linear installation edge
are implemented and accepted. The lifecycle service is an accepted local candidate;
permanent installation and the development PR proof remain pending.

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

The owner must authorize temporary public ingress before either URL works.
Do not change host services or Funnel during local setup. The proposed temporary
listener is `tailscale funnel --bg --https=8443 http://127.0.0.1:8787`.
Remove it after validation with `tailscale funnel --https=8443 off`, stop the local
bridge, and confirm the existing private Serve listener on 443 is unchanged.

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

Delegate a test issue to T3 after installation. Confirm its initial thought appears
within ten seconds. This candidate only acknowledges receipt; it creates no T3
thread. Preserve live evidence separately from local tests. Completed cleanup and
G1 evidence are recorded in [the plan](docs/implementation/plan.md#acceptance-evidence).
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
