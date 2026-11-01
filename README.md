# Shelley Inject

Point at a web page and tell [Shelley](https://github.com/boldsoftware/shelley) what to change.

A standalone, experimental Nginx-injected toolbar for visual feedback. Select elements,
send text or voice comments with their current DOM context, and preview CSS/HTML edits
without reloading the page. The drawer embeds Shelley's real chat UI; no Shelley or
demo app source changes are required.

**A trusted-user development tool, not a production authentication layer.**
The default setup is loopback-only. Read [SECURITY.md](SECURITY.md) before exposing it.

## What it does

- **Select → comment → send.** Click again to expand to a parent; Shift-click adds
  another element. Escape exits selection. Ctrl/Cmd+Enter submits a typed comment.
- **A chat per page.** Chats are saved in localStorage by origin and pathname.
  **New chat** starts another conversation without deleting the old one.
- **Live overlays.** Temporary CSS/HTML changes arrive over SSE. **Reset preview**
  undoes them without editing source files or reloading the chat iframe.
- **Voice comments.** Record from the selection popup, then **Stop & send**.
  Audio uses Shelley's existing upload/transcription pipeline; there is no separate
  transcription service here. HTTPS or localhost and microphone permission are required.

Selection context includes URL, text, selectors, markup, geometry, computed styles,
and active preview CSS. It is refreshed immediately before sending. Replaced elements
are re-resolved; missing or ambiguous elements require re-selection.

## Requirements

- Linux with Python 3.10+ and Nginx built with `http_sub_module`.
  On Debian/Ubuntu: `sudo apt-get install nginx python3`.
- A running Shelley on loopback, normally port **9999**, with its conversation,
  upload, and chat APIs available. This uses Shelley's internal HTTP API and may
  need updates when Shelley changes. Voice requires a configured transcription route.
- Your actual Shelley user ID and the email asserted by your trusted upstream proxy.
  These are separate identities: do not assume the user ID is your email.
  Use the ID from your Shelley deployment's authentication configuration.

No npm packages, Python packages, or compiled assets are needed to run.

## Local setup

```sh
git clone https://github.com/minikomi/shelleyinject.git
cd shelleyinject
python3 configure.py \
  --owner-email you@example.com \
  --shelley-user-id YOUR_SHELLEY_USER_ID
nginx -t -p "$PWD/" -c "$PWD/run/nginx.conf"
```

`configure.py` writes local config and systemd units under ignored `run/`.
Run it as your normal service user, not root. Paths and identities must use only
letters, digits, or `_./@:+,-`. New chats work in `site/` unless you pass
`--cwd /absolute/path/to/your/project`.

For a persistent installation:

```sh
sudo install -m 0644 run/shelleyinject.service run/shelleyinject-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now shelleyinject-api shelleyinject
```

Open **http://localhost:8192/demo/** on the VM. When accessing remotely, tunnel
this loopback port rather than exposing the development bypass to the network.

| Port | Purpose | Default bind |
| --- | --- | --- |
| 8190 | Email-gated proxy entry | loopback |
| 8191 | Plain demo site | loopback |
| 8192 | Development identity bypass | loopback |
| 8195 | Preview state and SSE API | loopback |

Use `--port 8290` to move this group to 8290/8291/8292/8295.
Use `--shelley-port 9998` for a different Shelley upstream.
Reconfigure and reinstall the units if you move the checkout or change ports.
After config changes, restart both units. Stop with:

```sh
sudo systemctl stop shelleyinject shelleyinject-api
```

## Behind an authenticating proxy

The main entry checks `X-ExeDev-Email` against `--owner-email`. It forwards the
configured Shelley identity only after that check. This is an allowlist, **not**
automatic owner discovery and **not** verification of a client-supplied header.

On an exe.dev VM, `--listen 0.0.0.0` permits the authenticated proxy to reach
the main entry port. Do this only after verifying that the proxy overwrites
client identity headers and that untrusted clients cannot reach the listener directly.
The development bypass, demo upstream, and preview API still bind only to loopback.
Do not expose them through another public proxy.

Unauthenticated visitors to `/demo/` get the plain demo without injection.
Assets, preview routes, and Shelley routes return 403 without the allowed identity.
The local development entry intentionally bypasses this gate.

## Live preview API

The toolbar supplies the local preview base URL in its messages to Shelley.
For the standard port group:

```sh
curl -fsS -X POST --data-binary 'h1 { color: #577a43; }' \
  http://127.0.0.1:8192/__shelley_inject/preview/css

curl -fsS -H 'Content-Type: application/json' \
  -d '{"page":"/demo/","selector":".hero h1","html":"A new heading","mode":"inner"}' \
  http://127.0.0.1:8192/__shelley_inject/preview/html

curl -fsS -X POST http://127.0.0.1:8192/__shelley_inject/preview/reset
```

| Route | Request |
| --- | --- |
| `POST /css` | Raw CSS, or JSON `{page, css}`; replaces the stylesheet |
| `POST /html` | JSON `{page, selector, html, mode}`; `inner`, `append`, or `prepend` |
| `POST /reset` | Optional JSON `{page}`; restores original child nodes |
| `GET /state`, `GET /events` | Optional `?page=/demo/`; JSON or SSE |

The page defaults to `/demo/`. State is in memory, shared between tabs for that
pathname, replayed on reload, and cleared when the API service restarts.
Request bodies are capped at 512 KiB. Resetting a component can discard its app state.
HTML is trusted development input, **not sanitized**.

## Scope and limitations

- The included routing mounts only the demo at `/demo/`; all other non-addon routes
  belong to Shelley. Arbitrary apps with their own root routes need routing changes.
- No screenshots, browser extension, separate chat backend, or framework-aware HMR.
- CSP/frame restrictions may prevent injection or embedding. No CSP bypass is supplied.
- An unrelated unsent chat draft blocks submission rather than being sent implicitly.
- This repository is independent of Shelley and exe.dev; it does not modify either.

## Checks

```sh
python3 -m unittest -v test_preview test_configure
node --check assets/inject.js
```

The Python checks exercise the preview API and generated Nginx proxy with a stub
Shelley upstream. They use temporary files and local ports, not your running chat.
Node is only needed for the JavaScript syntax check.

## License

MIT. See [LICENSE](LICENSE).
