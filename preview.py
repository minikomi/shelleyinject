#!/usr/bin/env python3
import json
import argparse
import queue
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

pages = {}
clients = {}
lock = threading.Lock()


def empty():
    return {"epoch": str(uuid.uuid4()), "css": "", "patches": []}


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):
        pass

    def json(self, value, status=200):
        data = json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        url = urlsplit(self.path)
        page = parse_qs(url.query).get("page", ["/"])[0]
        if url.path.endswith("/state"):
            with lock:
                self.json(pages.setdefault(page, empty()))
            return
        if not url.path.endswith("/events"):
            self.json({"error": "Not found"}, 404)
            return
        stream = queue.Queue()
        with lock:
            clients.setdefault(page, set()).add(stream)
            stream.put(json.dumps(pages.setdefault(page, empty())))
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()
        try:
            while True:
                try:
                    data = "data: " + stream.get(timeout=15) + "\n\n"
                except queue.Empty:
                    data = ": keepalive\n\n"
                self.wfile.write(data.encode())
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            with lock:
                clients[page].discard(stream)

    def do_POST(self):
        url = urlsplit(self.path)
        action = url.path.rsplit("/", 1)[-1]
        if action not in ("css", "html", "reset"):
            self.json({"error": "Not found"}, 404)
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            if not 0 <= length <= 524288:
                raise ValueError("Payload must be at most 512 KiB")
            raw = self.rfile.read(length).decode()
            is_json = "application/json" in self.headers.get("Content-Type", "")
            if is_json:
                body = json.loads(raw or "{}")
            elif action == "css":
                body = {"css": raw}
            elif action == "reset":
                body = {}
            else:
                raise ValueError("HTML edits require a JSON body")
            page = body.get("page", parse_qs(url.query).get("page", ["/"])[0])
            if not isinstance(page, str) or not page.startswith("/"):
                raise ValueError("page must be a URL pathname")
            if action == "css" and not isinstance(body.get("css"), str):
                raise ValueError("css must be a string")
            if action == "html":
                if not isinstance(body.get("selector"), str) or not isinstance(body.get("html"), str):
                    raise ValueError("selector and html must be strings")
                if body.get("mode", "inner") not in ("inner", "append", "prepend"):
                    raise ValueError("mode must be inner, append, or prepend")
            with lock:
                state = pages.setdefault(page, empty())
                if action == "reset":
                    state = pages[page] = empty()
                elif action == "css":
                    state["css"] = body["css"]
                else:
                    state["patches"].append({"id": str(uuid.uuid4()), "selector": body["selector"], "html": body["html"], "mode": body.get("mode", "inner")})
                encoded = json.dumps(state)
                for stream in clients.get(page, ()):
                    stream.put(encoded)
            self.json({"ok": True, "page": page})
        except (ValueError, TypeError, AttributeError) as error:
            self.json({"error": str(error)}, 400)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Shelley Inject live preview API (loopback only)")
    parser.add_argument("--port", type=int, default=8195)
    args = parser.parse_args()
    ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()
