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
            "path": self.path,
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
        cls.root.chmod(0o755)
        source = Path(__file__).resolve().parent
        for name in ("configure.py", "inject.conf.in"):
            shutil.copy(source / name, cls.root / name)
        shutil.copytree(source / "assets", cls.root / "assets")
        app = cls.root / "app"
        (app / "products").mkdir(parents=True)
        (app / "products" / "index.html").write_text('<html><body>Real app</body></html>')
        cls.stub = ThreadingHTTPServer(("127.0.0.1", 0), StubShelley)
        cls.addClassCleanup(cls.stub.server_close)
        cls.thread = threading.Thread(target=cls.stub.serve_forever, daemon=True)
        cls.thread.start()
        cls.addClassCleanup(cls.thread.join)
        cls.addClassCleanup(cls.stub.shutdown)
        with contextlib.ExitStack() as reservations:
            sock = socket.socket()
            sock.bind(("127.0.0.1", 0))
            cls.port = sock.getsockname()[1]
            reservations.callback(sock.close)
            cls.command = [
                sys.executable, str(cls.root / "configure.py"),
                "--owner-email", "developer@example.com", "--shelley-user-id", "test-user-id",
                "--shelley-url", "https://shelley.example", "--cwd", str(app),
                "--port", str(cls.port + 1), "--shelley-port", str(cls.stub.server_port),
            ]
            subprocess.run(cls.command, check=True, capture_output=True, text=True)
            cls.nginx_config = cls.root / "nginx.conf"
            cls.nginx_config.write_text(f'''worker_processes 1;
pid {cls.root}/nginx.pid;
error_log stderr;
events {{ worker_connections 128; }}
http {{
  include /etc/nginx/mime.types;
  access_log off;
  server {{
    listen 127.0.0.1:{cls.port};
    root {app};
    include {cls.root}/run/inject.conf;
    location / {{ try_files $uri $uri/ =404; }}
  }}
}}
''')
            cls.nginx_command = ["nginx", "-p", str(cls.root) + "/", "-c", str(cls.nginx_config)]
            subprocess.run(cls.nginx_command + ["-t"], check=True, capture_output=True, text=True)
        cls.nginx = subprocess.Popen(
            cls.nginx_command + ["-g", "daemon off; error_log stderr notice;"],
            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, bufsize=0,
        )
        cls.addClassCleanup(cls.stop_nginx)
        with selectors.DefaultSelector() as ready:
            ready.register(cls.nginx.stderr, selectors.EVENT_READ)
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

    def request(self, path, headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=3)
        try:
            connection.request("GET", path, headers=headers or {})
            response = connection.getresponse()
            return response.status, response.read().decode()
        finally:
            connection.close()

    def test_existing_site_is_unchanged_for_other_visitors(self):
        status, body = self.request("/products/")
        self.assertEqual((status, body), (200, '<html><body>Real app</body></html>'))
        self.assertEqual(self.request("/demo/")[0], 404)
        self.assertEqual(self.request("/api/test")[0], 404)
        for path in ("/__shelley_inject/inject.js", "/__shelley_inject/shelley-api/test",
                     "/__shelley_inject/preview/state"):
            with self.subTest(path=path):
                self.assertEqual(self.request(path)[0], 403)
                self.assertEqual(self.request(path, {"X-ExeDev-Email": "wrong@example.com"})[0], 403)

    def test_owner_gets_toolbar_and_isolated_shelley_api(self):
        headers = {"X-ExeDev-Email": "developer@example.com", "X-ExeDev-UserID": "forged"}
        status, body = self.request("/products/", headers)
        self.assertEqual(status, 200)
        self.assertIn('data-cwd="' + str(self.root / "app") + '"', body)
        self.assertIn('data-shelley-url="https://shelley.example"', body)
        self.assertIn('src="/__shelley_inject/inject.js"', body)
        self.assertEqual(self.request("/__shelley_inject/inject.js", headers)[0], 200)
        status, body = self.request("/__shelley_inject/shelley-api/test", headers)
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), {"path": "/api/test", "user": "test-user-id",
                                            "email": "developer@example.com"})

    def test_setup_rejects_unsafe_input_and_overlapping_ports(self):
        for extra in (["--owner-email", "bad;identity"],
                      ["--shelley-port", str(self.port + 1)],
                      ["--shelley-url", "https://shelley.example/c/other"]):
            with self.subTest(extra=extra):
                result = subprocess.run(self.command + extra, capture_output=True, text=True)
                self.assertNotEqual(result.returncode, 0)

    def test_generated_files_are_local(self):
        self.assertTrue((self.root / "run/inject.conf").is_file())
        self.assertTrue((self.root / "run/shelleyinject-api.service").is_file())
        self.assertFalse((self.root / "run/shelleyinject.service").exists())
        self.assertIn("/run/", (Path(__file__).resolve().parent / ".gitignore").read_text())


if __name__ == "__main__":
    unittest.main()
