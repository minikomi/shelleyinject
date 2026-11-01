import contextlib
import http.client
import json
import selectors
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class StubShelley(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        data = json.dumps({
            "user": self.headers.get("X-ExeDev-UserID"),
            "email": self.headers.get("X-ExeDev-Email"),
        }).encode()
        self.send_response(200)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


class ConfigureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="shelleyinject-test-")
        cls.addClassCleanup(cls.temp.cleanup)
        cls.root = Path(cls.temp.name)
        source = Path(__file__).resolve().parent
        for name in ("configure.py", "nginx.conf.in", "adapter.conf.in"):
            shutil.copy(source / name, cls.root / name)
        for name in ("assets", "site"):
            shutil.copytree(source / name, cls.root / name)
        cls.stub = ThreadingHTTPServer(("127.0.0.1", 0), StubShelley)
        cls.addClassCleanup(cls.stub.server_close)
        cls.thread = threading.Thread(target=cls.stub.serve_forever, daemon=True)
        cls.thread.start()
        cls.addClassCleanup(cls.thread.join)
        cls.addClassCleanup(cls.stub.shutdown)
        with contextlib.ExitStack() as reservations:
            for _ in range(100):
                sockets = []
                reserved = False
                try:
                    first = socket.socket()
                    sockets.append(first)
                    first.bind(("127.0.0.1", 0))
                    cls.port = first.getsockname()[1]
                    if cls.port > 65530:
                        continue
                    for offset in (1, 2, 5):
                        sock = socket.socket()
                        sockets.append(sock)
                        sock.bind(("127.0.0.1", cls.port + offset))
                    for sock in sockets:
                        reservations.callback(sock.close)
                    reserved = True
                    break
                except OSError:
                    pass
                finally:
                    if not reserved:
                        for sock in sockets:
                            sock.close()
            else:
                raise RuntimeError("No free local port group")
            cls.command = [
                sys.executable, str(cls.root / "configure.py"),
                "--owner-email", "developer@example.com", "--shelley-user-id", "test-user-id",
                "--port", str(cls.port), "--shelley-port", str(cls.stub.server_port),
            ]
            subprocess.run(cls.command, check=True, capture_output=True, text=True)
            cls.nginx_command = ["nginx", "-p", str(cls.root) + "/", "-c", str(cls.root / "run/nginx.conf")]
            subprocess.run(cls.nginx_command + ["-t"], check=True, capture_output=True, text=True)
        cls.nginx = subprocess.Popen(
            cls.nginx_command + ["-g", "daemon off; error_log stderr notice;"],
            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
            bufsize=0,
        )
        cls.addClassCleanup(cls.stop_nginx)
        with selectors.DefaultSelector() as ready:
            ready.register(cls.nginx.stderr, selectors.EVENT_READ)
            # Nginx binds its sockets before announcing the worker process.
            while True:
                if not ready.select(timeout=5):
                    raise RuntimeError("Nginx did not start")
                line = cls.nginx.stderr.readline()
                if not line:
                    raise RuntimeError("Nginx exited during startup")
                if b"start worker processes" in line:
                    break

    @classmethod
    def stop_nginx(cls):
        cls.nginx.terminate()
        cls.nginx.communicate(timeout=5)

    def request(self, port, path, headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", port, timeout=3)
        try:
            connection.request("GET", path, headers=headers or {})
            response = connection.getresponse()
            return response.status, response.read().decode(), response.getheader("Cache-Control")
        finally:
            connection.close()

    def test_access_gate_and_script_configuration(self):
        status, body, cache = self.request(self.port, "/demo/")
        self.assertEqual(status, 200)
        self.assertNotIn('<script defer src="/__shelley_inject/', body)
        self.assertEqual(cache, "private, no-store")
        for route in ("/api/test", "/__shelley_inject/inject.js", "/__shelley_inject/preview/state"):
            with self.subTest(route=route):
                self.assertEqual(self.request(self.port, route)[0], 403)
                self.assertEqual(self.request(self.port, route, {"X-ExeDev-Email": "wrong@example.com"})[0], 403)
        headers = {"X-ExeDev-Email": "developer@example.com"}
        status, body, _ = self.request(self.port, "/demo/", headers)
        self.assertEqual(status, 200)
        self.assertIn(f'data-cwd="{self.root}/site"', body)
        self.assertIn(f'data-preview-base="http://127.0.0.1:{self.port + 2}/__shelley_inject/preview"', body)
        self.assertIn('src="/__shelley_inject/inject.js"', body)
        self.assertEqual(self.request(self.port, "/__shelley_inject/inject.js", headers)[0], 200)

    def test_development_bypass_uses_configured_identity(self):
        headers = {"X-ExeDev-UserID": "forged", "X-ExeDev-Email": "forged@example.com"}
        status, body, _ = self.request(self.port + 2, "/api/test", headers)
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), {"user": "test-user-id", "email": "developer@example.com"})
        self.assertIn('data-cwd=', self.request(self.port + 2, "/demo/")[1])
        self.assertNotIn('data-cwd=', self.request(self.port + 1, "/")[1])

    def test_public_gate_forwards_only_configured_identity(self):
        status, body, _ = self.request(self.port, "/api/test", {
            "X-ExeDev-Email": "developer@example.com", "X-ExeDev-UserID": "forged",
        })
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)["user"], "test-user-id")

    def test_setup_rejects_unsafe_input_and_overlapping_ports(self):
        for extra in (["--owner-email", "bad;identity"], ["--shelley-port", str(self.port)]):
            with self.subTest(extra=extra):
                result = subprocess.run(self.command + extra, capture_output=True, text=True)
                self.assertNotEqual(result.returncode, 0)

    def test_local_configuration_is_ignored(self):
        self.assertTrue((self.root / "run/shelleyinject.service").is_file())
        self.assertTrue((self.root / "run/shelleyinject-api.service").is_file())
        self.assertIn("/run/", (Path(__file__).resolve().parent / ".gitignore").read_text())


if __name__ == "__main__":
    unittest.main()
