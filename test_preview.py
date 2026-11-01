import http.client
import json
import threading
import unittest
from http.server import ThreadingHTTPServer

import preview


class PreviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), preview.Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def setUp(self):
        with preview.lock:
            preview.pages.clear()
        self.connection = http.client.HTTPConnection(*self.server.server_address, timeout=3)
        self.addCleanup(self.connection.close)

    def request(self, method, path, body=None, content_type="application/json"):
        if body is not None and content_type == "application/json":
            body = json.dumps(body)
        self.connection.request(method, "/__shelley_inject/preview" + path, body,
                                {"Content-Type": content_type})
        response = self.connection.getresponse()
        return response.status, json.loads(response.read())

    def test_css_html_reset_and_page_isolation(self):
        status, initial = self.request("GET", "/state")
        self.assertEqual(status, 200)
        self.assertEqual(self.request("POST", "/css", "h1 { color: red; }", "text/css")[0], 200)
        self.assertEqual(self.request("POST", "/html", {
            "selector": "h1", "html": "Changed", "mode": "inner",
        })[0], 200)
        _, state = self.request("GET", "/state")
        self.assertEqual(state["css"], "h1 { color: red; }")
        self.assertEqual(state["patches"][0]["html"], "Changed")
        self.assertEqual(self.request("GET", "/state?page=/other/")[1]["css"], "")
        self.assertEqual(self.request("POST", "/reset", {})[0], 200)
        _, state = self.request("GET", "/state")
        self.assertEqual(state["css"], "")
        self.assertEqual(state["patches"], [])
        self.assertNotEqual(state["epoch"], initial["epoch"])

    def test_invalid_bodies_and_unknown_routes(self):
        for path, body in (
            ("/css", {"css": 123}),
            ("/css", {"css": "", "page": "not-a-path"}),
            ("/html", {"selector": "h1", "html": "", "mode": "replace"}),
            ("/html", {}),
            ("/css", []),
        ):
            with self.subTest(path=path, body=body):
                self.assertEqual(self.request("POST", path, body)[0], 400)
        self.assertEqual(self.request("GET", "/missing")[0], 404)
        self.assertEqual(self.request("POST", "/missing", {})[0], 404)

    def test_body_limit(self):
        self.connection.request("POST", "/__shelley_inject/preview/css", headers={"Content-Length": "524289"})
        response = self.connection.getresponse()
        self.assertEqual(response.status, 400)
        response.read()

    def test_sse_replays_state_and_delivers_edits(self):
        self.request("POST", "/css", {"css": "h1 { color: blue; }"})
        events = http.client.HTTPConnection(*self.server.server_address, timeout=3)
        self.addCleanup(events.close)
        events.request("GET", "/__shelley_inject/preview/events")
        response = events.getresponse()
        self.assertEqual(response.status, 200)
        self.assertEqual(response.getheader("Content-Type"), "text/event-stream")
        self.assertEqual(json.loads(response.readline().decode()[6:])["css"], "h1 { color: blue; }")
        self.assertEqual(response.readline(), b"\n")
        self.request("POST", "/css", {"css": "h1 { color: green; }"})
        self.assertEqual(json.loads(response.readline().decode()[6:])["css"], "h1 { color: green; }")
        response.close()


if __name__ == "__main__":
    unittest.main()
