#!/usr/bin/env python3
"""Generate an Nginx include and a local preview API service."""
import argparse
import getpass
import html
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit


def nginx_string(value):
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"').replace("$", "\\$") + '"'


def configure():
    root = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--owner-email", required=True)
    parser.add_argument("--shelley-user-id", required=True, help="Actual Shelley user identity, not necessarily an email")
    parser.add_argument("--cwd", type=Path, required=True, help="Directory for new page chats")
    parser.add_argument("--shelley-url", required=True, help="Browser-facing Shelley URL (not a URL path)")
    parser.add_argument("--shelley-port", type=int, default=9999)
    parser.add_argument("--port", type=int, default=8195, help="Loopback preview API port")
    args = parser.parse_args()
    cwd = args.cwd.resolve(strict=True)
    if not cwd.is_dir():
        parser.error("--cwd must be a directory")
    if not 1024 <= args.port <= 65535 or not 1 <= args.shelley_port <= 65535:
        parser.error("ports are out of range")
    if args.shelley_port == args.port:
        parser.error("Shelley port must not overlap the preview API")
    if not args.owner_email.strip() or not args.shelley_user_id.strip():
        parser.error("owner email and Shelley user ID must not be empty")
    shelley_url = args.shelley_url.rstrip("/")
    parsed = urlsplit(shelley_url)
    if (parsed.scheme not in ("http", "https") or not parsed.hostname or
            parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment):
        parser.error("--shelley-url must be an HTTP(S) origin without a path")
    # These paths also appear in systemd ExecStart and the HTML script tag.
    for value in (str(root), str(cwd), sys.executable, args.owner_email, args.shelley_user_id):
        if not re.fullmatch(r"[A-Za-z0-9_./@:+,-]+", value):
            parser.error("paths and identities must use letters, digits, or _./@:+,- only")
    run = root / "run"
    run.mkdir(exist_ok=True, mode=0o700)
    script = (
        '<script defer src="/__shelley_inject/inject.js"'
        f' data-cwd="{html.escape(str(cwd), quote=True)}"'
        f' data-shelley-url="{html.escape(shelley_url, quote=True)}"'
        f' data-preview-base="http://127.0.0.1:{args.port}/__shelley_inject/preview"></script>'
    )
    values = {
        "ROOT": str(root), "EMAIL": nginx_string(args.owner_email),
        "USER_ID": nginx_string(args.shelley_user_id), "SCRIPT": nginx_string(script),
        "API_PORT": args.port, "SHELLEY_PORT": args.shelley_port,
    }
    text = (root / "inject.conf.in").read_text()
    for key, value in values.items():
        text = text.replace("@" + key + "@", str(value))
    (run / "inject.conf").write_text(text)
    (run / "shelleyinject-api.service").write_text(
        f"[Unit]\nDescription=Shelley Inject preview API\nAfter=network.target\n\n"
        f"[Service]\nType=simple\nUser={getpass.getuser()}\n"
        f"ExecStart={sys.executable} -u {root}/preview.py --port {args.port}\n"
        "Restart=on-failure\nUMask=0077\n\n[Install]\nWantedBy=multi-user.target\n"
    )
    print(f"Include {run}/inject.conf inside the Nginx server block for your site.")
    print("Only do so if the upstream proxy overwrites X-ExeDev-Email.")


if __name__ == "__main__":
    configure()
