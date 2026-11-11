# Shelley Inject

https://github.com/user-attachments/assets/2d73af7a-387f-495c-988b-5c1ea4cec147


Point at a page served by Nginx and tell [Shelley](https://github.com/boldsoftware/shelley) what to change.

An experimental Nginx-injected toolbar for selecting elements, sending text or
voice comments, and previewing CSS/HTML changes without a reload. Include its
config in **one Nginx server block** to enable it on that site. It does not
serve a demo site or take over your app's routes.

**Trusted-user development tool, not an authentication layer.**
Read [SECURITY.md](SECURITY.md) before exposing it.

## What it does

- Select an element, click again for its parent, or Shift-click to add another.
- Keep a separate Shelley chat per page, with **New chat** and voice comments.
- Receive temporary CSS/HTML overlays over SSE; **Reset preview** undoes them.

Selection context includes URL, text, selectors, markup, geometry, computed styles,
and active preview CSS. The preview API keeps state in memory per URL pathname.

## Requirements

- Linux with Python 3.10+ and Nginx built with `http_sub_module`.
- An existing Nginx-hosted site behind a trusted proxy that **overwrites**
  `X-ExeDev-Email`. Do not use this snippet on a publicly reachable server
  where clients can send that header themselves.
- Shelley running on loopback (default port **9999**), and a browser-accessible
  URL for its chat UI. The chat iframe must be allowed by Shelley's frame policy.
- Voice comments require a Shelley transcription route, HTTPS or localhost,
  and microphone permission.
- Your actual Shelley user ID, your proxy-asserted email, and the working
  directory for new page chats.

No npm packages, Python packages, or compiled assets are needed to run.

## Setup

```sh
git clone https://github.com/minikomi/shelleyinject.git
cd shelleyinject
python3 configure.py \
  --owner-email you@example.com \
  --shelley-user-id YOUR_SHELLEY_USER_ID \
  --shelley-url https://your-shelley-host.example \
  --cwd /absolute/path/to/your/project
```

`configure.py` writes `run/inject.conf` and a preview API systemd unit.
Include the generated config **inside the Nginx `server { ... }` block** for the
site you want to instrument:

```nginx
server {
    # Keep your existing listen, root, proxy locations, and authentication.
    include /absolute/path/to/shelleyinject/run/inject.conf;
}
```

The snippet adds only `/__shelley_inject/` endpoints. Your Nginx site continues
to serve all its other routes. It appends the toolbar script before `</body>`
in HTML responses for the configured email; other visitors' pages are unchanged.
The Nginx worker must be able to read `assets/inject.js`. If a location already
configures `sub_filter` or response compression, adjust that location to let
the HTML substitution run. For an upstream that serves gzip, disable upstream
compression for the HTML route (for example, `proxy_set_header Accept-Encoding "";`).

Start the loopback preview API and reload your existing Nginx:

```sh
sudo install -m 0644 run/shelleyinject-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now shelleyinject-api
sudo nginx -t && sudo systemctl reload nginx
```

Do not configure an additional Shelley Inject Nginx service. To remove Inject,
remove the include and reload Nginx; stop the preview API if no other site uses it.
If upgrading from the bundled demo setup, disable the old `shelleyinject`
Nginx service; it is no longer generated.
If the checkout moves or the port/identity changes, rerun `configure.py`,
reinstall the unit if needed, and reload Nginx. Use `--port 8295` to move the
loopback preview API; use `--shelley-port 9998` for a different loopback
Shelley upstream.

## How routing and identity work

The snippet proxies `/__shelley_inject/shelley-api/` to Shelley's `/api/`,
with the configured identity. The drawer opens Shelley's chat at
`--shelley-url`; it does not claim the host site's `/api/` or `/c/` routes.
The proxy must authenticate the browser at the Shelley URL separately.
Because the iframe is on a separate origin, Inject can check saved drafts via
the API but cannot detect unsent text still in the iframe's input. Send or
clear that text before submitting a selection comment.

The preview API binds only to loopback. Shelley receives its loopback URL in
the selection context so it can post temporary edits from the VM. On the site,
the browser uses the gated `/__shelley_inject/preview/` proxy for SSE and reset.

## Live preview API

For the default port, from the VM:

```sh
curl -fsS -X POST --data-binary 'h1 { color: #577a43; }' \
  http://127.0.0.1:8195/__shelley_inject/preview/css

curl -fsS -H 'Content-Type: application/json' \
  -d '{"page":"/","selector":"h1","html":"A new heading","mode":"inner"}' \
  http://127.0.0.1:8195/__shelley_inject/preview/html

curl -fsS -X POST http://127.0.0.1:8195/__shelley_inject/preview/reset
```

| Route | Request |
| --- | --- |
| `POST /css` | Raw CSS or JSON `{page, css}`; replaces the stylesheet |
| `POST /html` | JSON `{page, selector, html, mode}`; `inner`, `append`, or `prepend` |
| `POST /reset` | Optional JSON `{page}`; restores original child nodes |
| `GET /state`, `GET /events` | Optional `?page=/`; JSON or SSE |

The page defaults to `/`. State is shared between tabs for a pathname,
replayed on reload, and cleared when the API service restarts. Request bodies
are capped at 512 KiB. Resetting a component can discard its app state.
HTML is trusted development input, **not sanitized**.

## Scope and limitations

- HTML injection uses Nginx's `sub_filter`; CSP, frame restrictions, compression,
  or site-specific Nginx locations may prevent it from working.
- Separate sites sharing one preview service share state by pathname; give each
  site a separate preview API port if that matters.
- No screenshots, browser extension, separate chat backend, or framework-aware HMR.
- This repository does not modify Shelley or the app you instrument.

## Checks

```sh
python3 -m unittest -v test_configure test_preview
node --check assets/inject.js
```

## License

MIT. See [LICENSE](LICENSE).
