# Security boundaries

Shelley Inject is experimental developer tooling with access to a real coding
agent. Do not deploy it as a public multi-user service.

- **Headers are not authentication.** Anyone who can directly reach the
  instrumented site can forge `X-ExeDev-Email`. Include the snippet only behind
  a trusted proxy that overwrites the header and prevents direct untrusted
  access. This project does not establish that upstream guarantee.
- **Loopback is trusted.** The preview API has no authentication. Other processes
  and users on the same machine can access it. Never publish its port.
- **The site can call Shelley's API.** Its scripts and injected preview HTML
  can call the same-origin `/__shelley_inject/shelley-api/` routes with your
  identity. Instrument only pages whose content and scripts you trust.
  The preview API is not an HTML sanitizer.
- **Context can be private.** Sending a selection passes its text, markup,
  styles, and URL to Shelley and its configured model provider. Audio uploads
  use Shelley's storage and transcription pipeline. Avoid selecting secrets or
  private form content. No extra screenshot collection is performed.
- **Generated config is local.** Keep `run/` out of version control. It contains
  local paths and identity settings. Do not commit credentials, transcripts,
  production page captures, or chat databases.
- **Not a production origin.** Review the existing site's cache rules before
  adding personalized HTML injection. The HTTP/SSE server is a small local
  helper, not a hardened internet service.

There is no security response SLA. For sensitive issues, use a private channel
to the repository maintainer rather than posting secrets or exploit details in
a public issue.
