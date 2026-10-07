# t3-linear-agent
Connect Linear agent delegation to a self-hosted T3 Code server.

Delegate an issue to T3 in Linear, run the work on your own server, and receive a
pull request for review. The standalone T3 client and Linear installation edge
are implemented and accepted. Coding composition and service installation remain
pending.

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
