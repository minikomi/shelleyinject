# Shelley Inject demo site

This is an exploration. The first message supplies the task; do not infer one. Do not run tests, builds, lint, or commits unless requested. Do not edit other projects.

Prefer temporary live injections for visual feedback. The demo subscribes to the addon preview API; changes appear immediately without reloading the real chat iframe. Source edits are not required to preview a change. The selection message includes the configured preview base URL; use that if it differs from the standard port below.

## Live CSS

POST the full overlay stylesheet (this replaces the previous overlay):

```sh
curl -fsS -X POST --data-binary 'h1 { color: #577a43; }' http://localhost:8192/__shelley_inject/preview/css
```

For another page or a JSON body, use `{ "page": "/demo/", "css": "..." }` with `Content-Type: application/json`.

## Live HTML

Replace the inner contents of a target, or append/prepend new components:

```sh
curl -fsS -H 'Content-Type: application/json' -d '{"page":"/demo/","selector":".hero h1","html":"A new heading","mode":"inner"}' http://localhost:8192/__shelley_inject/preview/html
```

Modes: `inner`, `append`, `prepend`. Scripts in HTML fragments are not executed. Target the app, not the injected addon. Selector matches apply to every matching element.

## Reset or inspect

```sh
curl -fsS -X POST http://localhost:8192/__shelley_inject/preview/reset
curl -fsS http://localhost:8192/__shelley_inject/preview/state
```

State is shared among owner tabs for this page and lasts until reset or the preview API service restarts. Browser reloads replay overlays. These are previews, not changes to index.html. Only move accepted changes into source when the user asks to keep them.
