# t3-linear-agent

Connect Linear to a self-hosted T3 Code server. Delegate an issue to T3 in Linear,
run the work in an isolated worktree on your server, and receive progress, answers
and pull request links in the same Linear session.

One coding session runs at a time. Follow-ups stay on their original T3 thread.
SQLite preserves delivery and reporting state across bridge restarts; T3 owns
coding execution and conversation history.

## Requirements

Install on the Linux machine running T3, as the same user who owns T3:

- Node.js 24 and pnpm 11.
- A running T3 server with external authenticated MCP, local authorization CLI,
  and an authenticated coding provider. The default MCP endpoint is
  `http://127.0.0.1:3773/mcp`.
- Git repositories registered as T3 projects, with local base branches available.
- Linear workspace admin access to register and install an OAuth app.
- A public HTTPS endpoint for this bridge. The steps below use
  [Tailscale Funnel](https://tailscale.com/docs/features/tailscale-funnel).
- For pull requests, GitHub authentication available to the T3 coding process
  with permission to push branches and open PRs.

The service instructions use systemd user services and a checkout at
`~/code/t3-linear-agent`. The checked-in units use `/usr/bin/node`; adjust their
`ExecStart` paths if `command -v node` returns another location. Keep T3's own
service and private endpoint separate from the public bridge.

## 1. Download and build

```sh
mkdir -p ~/code
cd ~/code
git clone https://github.com/AidanZealley/t3-linear-agent.git
cd t3-linear-agent
pnpm install --frozen-lockfile
pnpm build
```

If you choose another checkout location, update `WorkingDirectory` and
`ExecStart` in both [service templates](deploy/).

## 2. Register the Linear app and prepare configuration

Choose your bridge's public URL, such as
`https://your-host.your-tailnet.ts.net:8443`. Use your machine's actual Tailscale
DNS name, available in the Tailscale admin console. Set up Funnel permissions
according to [Tailscale's instructions](https://tailscale.com/docs/features/tailscale-funnel).

In [Linear API settings](https://linear.app/settings/api), create an internal OAuth
application named `T3`. Enable webhooks and select only **Agent session events**.
Use your public URL with these paths:

- Redirect URL: `/oauth/callback`.
- Webhook URL: `/webhooks/linear`.

The bridge requests `read,write,app:assignable,app:mentionable` and `actor=app`
during consent. You do not enter scopes in the app settings. See
[Linear's agent setup guide](https://linear.app/developers/agents).

For a fresh installation, copy these examples into a private directory outside
this checkout. If that directory already contains an installation, keep its files
and follow [the operating guide](docs/operations.md) instead of replacing them.

```sh
agent_state="$HOME/.local/state/t3-linear-agent"
install -d -m 0700 "$agent_state"
install -m 0600 examples/linear-secrets.json "$agent_state/linear-secrets.json"
install -m 0600 examples/sessions.json "$agent_state/sessions.json"
install -m 0600 examples/service.env "$agent_state/service.env"
```

Edit the private copies:

- [linear-secrets.json](examples/linear-secrets.json): fill in the app's client ID,
  client secret and webhook signing secret. Choose a random `setupPassword` of
  at least 24 characters, and set `publicUrl` to your public HTTPS origin without
  a route. The setup password protects the installation route and is separate
  from your Linear password.
- [service.env](examples/service.env): choose `T3_RUNTIME_MODE` before pairing.
  The example uses `approval-required`. Supported values are `approval-required`,
  `auto-accept-edits`, `auto` and `full-access`. Approvals stay in T3; Linear
  messages do not grant more permissions. Use `full-access` only when you want
  unattended commands, including authorized Git pushes and PR creation.
- [sessions.json](examples/sessions.json): fill this in after discovering the
  project and model IDs in step 4.

Keep credentials, the SQLite store and backups private. The state directory must
be mode 0700 and its files mode 0600. Edit only the private copies, never put
real secrets into the repository examples.

## 3. Install the app in Linear

Start the setup-only bridge in one terminal:

```sh
node dist/linear/cli.js
```

It listens on `127.0.0.1:8787`. In another terminal on the same machine, publish
only that listener:

```sh
tailscale funnel --bg --https=8443 http://127.0.0.1:8787
```

Check your existing Serve/Funnel configuration before and after this command.
Port 8443 must target the bridge on 8787. Keep T3 private; do not publish its MCP
endpoint or reset unrelated Serve/Funnel configuration.

Open your public URL followed by `/oauth/start`. Sign in with the current
installation username **`aidan`** and your chosen setup password. This username
is fixed in the current implementation, including installations by other users.
Complete consent as a Linear workspace admin. The callback confirms installation
and persists app identity and tokens in `bridge.sqlite`.

If the URL does not work, check the local bridge first. An unauthenticated request
to `/oauth/start` should return HTTP 401. Public DNS can take up to ten minutes
to propagate. Test HTTPS from outside your tailnet too; MagicDNS can make a private
request succeed while Linear still cannot reach it. `/mcp` on the public bridge
must return 404.

Stop the setup bridge with Ctrl-C after consent. Leave Funnel configured for the
service. **Wait until step 5 before delegating any issues.** The setup bridge only
acknowledges sessions, and stored inputs will be processed when coding is enabled.

## 4. Pair T3 and choose projects

Load the runtime configuration in your terminal, then pair and inspect T3:

```sh
set -a
. "$HOME/.local/state/t3-linear-agent/service.env"
set +a
pnpm t3 pair
pnpm t3 inspect
```

Pairing securely creates `t3.json`; do not write that generated credential by hand
or pair again over an existing credential. Inspection returns available project
IDs, provider instance IDs and model IDs.

Edit your private `sessions.json` using those values. Each project entry needs
its absolute Git repository root and an existing local base branch. Add only
repositories you want this bridge to use. A Linear issue's project name must
exactly match the T3 project's title, including case. A missing or ambiguous match
asks for clarification instead of choosing another repository.

`maxActiveSessions` sets the global limit for concurrent Linear sessions and
defaults to 5. Set it to a positive integer in `sessions.json` and restart the
service to change it. Extra sessions wait in the durable queue. Paused sessions
and pending cancellations reserve a slot until reconciled.

The provider setting supplies the default harness independently of T3's default.
For `codex` and `claudeAgent`, ticket labels select the model and reasoning level
using the mapping in [the operating guide](docs/operations.md#ticket-model-selection).
Without labels, these providers use their medium difficulty mapping. Other provider
IDs retain their configured model unless a supported harness label overrides them.

The defaults assume T3 uses its normal local endpoint and data directory. For
another endpoint or installation, add the relevant variables to `service.env`
before pairing; see [configuration overrides](docs/operations.md#configuration-overrides).
Keep the runtime mode the same for pairing and service startup.

## 5. Install the coding service

Run these commands as your T3 user, without sudo. Start with no existing bridge
unit or drop-in; inspect an existing installation before changing it.

```sh
systemd-analyze --user verify deploy/t3-linear-agent.service
install -d -m 0700 ~/.config/systemd/user/t3-linear-agent.service.d
install -m 0600 deploy/t3-linear-agent.service ~/.config/systemd/user/t3-linear-agent.service
install -m 0600 deploy/lifecycle.conf ~/.config/systemd/user/t3-linear-agent.service.d/lifecycle.conf
systemctl --user daemon-reload
systemctl --user enable --now t3-linear-agent.service
systemctl --user status t3-linear-agent.service --no-pager
```

The [base unit](deploy/t3-linear-agent.service) provides the setup-only entrypoint;
the [lifecycle override](deploy/lifecycle.conf) enables coding. Install both for
normal use. The service requires the private `service.env` file and starts on
loopback 8787. Never run the setup bridge alongside it against the same port/store.

For startup at boot and operation after logout, check
`loginctl show-user "$USER" -p Linger`. If it is disabled, ask the host administrator
to enable lingering for your user with `loginctl enable-linger USERNAME`.

Create an issue in a matching Linear project and delegate it to T3. Describe the
work, constraints and expected checks normally. For a first test, choose a small
change in a development repository. The bridge acknowledges, creates a T3-managed
worktree, reports progress and returns the final answer and any PR URL. Permission
prompts appear in T3 when the selected runtime requires them.

## Operation and development

See [the operating guide](docs/operations.md) for logs, backups, updates, stop/resume,
report recovery and removal. Configuration examples are in [examples/](examples/).

Repository checks:

```sh
pnpm test
pnpm typecheck
pnpm build
```
