#!/usr/bin/env python3
"""Generate local Nginx configuration and optional systemd units."""
import argparse
import getpass
import html

import re
import shutil
import sys
from pathlib import Path


def nginx_string(value):
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"').replace("$", "\\$") + '"'


def configure():
    root = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--owner-email", required=True)
    parser.add_argument("--shelley-user-id", required=True, help="Actual Shelley user identity, not necessarily an email")
    parser.add_argument("--cwd", type=Path, default=root / "site", help="Directory for new page chats")
    parser.add_argument("--shelley-port", type=int, default=9999)
    parser.add_argument("--port", type=int, default=8190, help="Also reserves port+1, port+2, and port+5")
    parser.add_argument("--listen", default="127.0.0.1", choices=["127.0.0.1", "0.0.0.0"],
                        help="Use 0.0.0.0 only behind a verified authenticating proxy")
    args = parser.parse_args()
    cwd = args.cwd.resolve(strict=True)
    if not cwd.is_dir():
        parser.error("--cwd must be a directory")
    if not 1024 <= args.port <= 65530 or not 1 <= args.shelley_port <= 65535:
        parser.error("ports are out of range")
    if args.shelley_port in (args.port, args.port + 1, args.port + 2, args.port + 5):
        parser.error("Shelley port must not overlap the Inject listeners")
    if not args.owner_email.strip() or not args.shelley_user_id.strip():
        parser.error("owner email and Shelley user ID must not be empty")
    # These paths also appear in systemd ExecStart and the HTML script tag.
    for value in (str(root), str(cwd), sys.executable, args.owner_email, args.shelley_user_id):
        if not re.fullmatch(r"[A-Za-z0-9_./@:+,-]+", value):
            parser.error("paths and identities must use letters, digits, or _./@:+,- only")
    nginx = shutil.which("nginx")
    if not nginx:
        parser.error("nginx is required (including the http_sub_module)")
    run = root / "run"
    run.mkdir(exist_ok=True, mode=0o700)
    for name in ("body", "fastcgi", "uwsgi", "scgi", "proxy"):
        (run / name).mkdir(exist_ok=True)
    script = (
        '<script defer src="/__shelley_inject/inject.js"'
        f' data-cwd="{html.escape(str(cwd), quote=True)}"'
        f' data-preview-base="http://127.0.0.1:{args.port + 2}/__shelley_inject/preview"></script>'
    )
    values = {
        "ROOT": str(root), "EMAIL": nginx_string(args.owner_email),
        "USER_ID": nginx_string(args.shelley_user_id), "SCRIPT": nginx_string(script),
        "LISTEN": args.listen, "PORT": args.port, "SITE_PORT": args.port + 1,
        "DEV_PORT": args.port + 2, "API_PORT": args.port + 5, "SHELLEY_PORT": args.shelley_port,
    }
    for name in ("nginx.conf", "adapter.conf"):
        text = (root / (name + ".in")).read_text()
        for key, value in values.items():
            text = text.replace("@" + key + "@", str(value))
        (run / name).write_text(text)
    commands = {
        "shelleyinject-api": f"{sys.executable} -u {root}/preview.py --port {args.port + 5}",
        "shelleyinject": f'{nginx} -p {root}/ -c {run}/nginx.conf -g "daemon off;"',
    }
    for name, command in commands.items():
        (run / (name + ".service")).write_text(
            f"[Unit]\nDescription={name}\nAfter=network.target\n\n"
            f"[Service]\nType=simple\nUser={getpass.getuser()}\nExecStart={command}\n"
            "Restart=on-failure\nUMask=0077\n\n[Install]\nWantedBy=multi-user.target\n"
        )
    print(f"Configuration: {run}/nginx.conf")
    print(f"Demo: http://127.0.0.1:{args.port + 2}/demo/ (local development bypass)")
    if args.listen == "0.0.0.0":
        print("WARNING: public listener trusts X-ExeDev-Email. Block direct untrusted access.")


if __name__ == "__main__":
    configure()
