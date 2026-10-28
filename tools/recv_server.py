"""Chromeのページから大きなデータ（JSON）を受け取るための小さなサーバー。使い方: python3 tools/recv_server.py <保存先.json> [port=8788]
Chrome側は http://127.0.0.1:8788/save.html#<base64のJSON> を開くと、そのJSONが保存先に書かれる。"""
import http.server, json, sys, os
OUT = sys.argv[1]; PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8788
HERE = os.path.dirname(os.path.abspath(__file__))
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=HERE, **k)
    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0)); body = self.rfile.read(n)
        data = json.loads(body.decode("utf-8"))
        with open(OUT, "w", encoding="utf-8") as f: json.dump(data, f, ensure_ascii=False, indent=1)
        self.send_response(200); self.send_header("Content-Type", "text/plain"); self.end_headers(); self.wfile.write(f"ok {len(data)}".encode())
    def log_message(self, *a): pass
http.server.HTTPServer(("127.0.0.1", PORT), H).serve_forever()
