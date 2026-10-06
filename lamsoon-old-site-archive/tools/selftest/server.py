"""Tiny mock of an old site for the self-test (serves .aspx as HTML, one redirect)."""
import http.server, sys, functools
class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".aspx": "text/html; charset=utf-8", ".html": "text/html; charset=utf-8"}
    def do_GET(self):
        if self.path.startswith("/old-about"):
            self.send_response(301); self.send_header("Location", "/about.aspx"); self.end_headers(); return
        return super().do_GET()
    def log_message(self, *a): pass
root = sys.argv[1]; port = int(sys.argv[2]) if len(sys.argv) > 2 else 8765
http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(H, directory=root)).serve_forever()
