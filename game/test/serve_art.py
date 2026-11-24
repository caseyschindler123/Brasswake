"""Serve dist plus isolated localhost visual fixtures (no production changes).

Run from anywhere: python -I game/test/serve_art.py --port 8779
Open http://localhost:8779/__visual?scene=title at 390x720.
The fixture uses the same bundled sql.js as production and a fresh test
account on this dedicated localhost origin.
"""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from urllib.parse import urlsplit

GAME = Path(__file__).resolve().parents[1]
REQUEST_ERRORS = []


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(GAME / 'dist'), **kwargs)

    def do_GET(self):
        parsed = urlsplit(self.path)
        if parsed.path == '/__visual':
            return self.reply((GAME / 'test/visual_art.html').read_bytes(), 'text/html; charset=utf-8')
        if parsed.path == '/__sql.js':
            return self.reply((GAME / 'node_modules/sql.js/dist/sql-asm.js').read_bytes(), 'application/javascript')
        if parsed.path == '/__request_errors':
            return self.reply(json.dumps(REQUEST_ERRORS).encode(), 'application/json')
        super().do_GET()

    def reply(self, content, content_type):
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def send_error(self, code, message=None, explain=None):
        REQUEST_ERRORS.append({'path': self.path, 'status': code})
        super().send_error(code, message, explain)

    def log_message(self, format, *args):
        # Keep the terminal readable; errors remain available on the QA route.
        if args and str(args[0]).startswith(('4', '5')):
            super().log_message(format, *args)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8779)
    args = parser.parse_args()
    print(f'Serving {GAME / "dist"} at http://localhost:{args.port}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
