# Security boundaries

Shelley Inject is experimental developer tooling with access to a real coding
agent. Do not deploy it as a public multi-user service.

- **Headers are not authentication.** Anyone who can directly reach the main
  listener can forge `X-ExeDev-Email`. Its gate is meaningful only behind a trusted
  proxy that overwrites client identity headers and prevents direct untrusted
  access. This project does not establish that upstream guarantee.
- **Loopback is trusted.** The development entry and preview API have no
  authentication. Other processes and users on the same machine can access them.
  Never publish their ports. Run only on a machine you control.
- **The page shares Shelley's origin.** Inject only your own trusted pages.
  Page scripts, HTML event handlers, embedded frames, and preview HTML can act
  with the same origin's access to Shelley. Blocking document replacement does
  not make untrusted HTML safe. The preview API is not an HTML sanitizer.
- **Context can be private.** Sending a selection passes its text, markup,
  styles, and URL to Shelley and its configured model provider. Audio uploads
  use Shelley's storage and transcription pipeline. Avoid selecting secrets or
  private form content. No extra screenshot collection is performed.
- **Generated config is local.** Keep `run/` out of version control. It contains
  local paths and identity settings. Do not commit credentials, transcripts,
  production page captures, or chat databases.
- **Not a production origin.** Personalized responses use `private, no-store`;
  do not put a shared cache in front without reviewing all routing and cache rules.
  The HTTP/SSE server is a small local helper, not a hardened internet service.

There is no security response SLA. For sensitive issues, use a private channel
to the repository maintainer rather than posting secrets or exploit details in
a public issue.
