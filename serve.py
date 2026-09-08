#!/usr/bin/env python3
"""Local preview server that never caches — python3 serve.py [port]"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_header(self, key, value):
        if key.lower() == "last-modified":   # drop it so browsers can't revalidate to 304
            return
        super().send_header(key, value)

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8899
print(f"http://localhost:{port}  (no-cache)   Ctrl+C to stop")
ThreadingHTTPServer(("", port), NoCache).serve_forever()
