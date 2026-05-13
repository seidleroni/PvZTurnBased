from __future__ import annotations

import argparse
import json
import mimetypes
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

from .telemetry import TelemetryStore


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_STATIC_DIR = Path(__file__).parent / "static"
DEFAULT_TELEMETRY = ROOT / "data" / "telemetry.jsonl"


def make_handler(static_dir: Path, telemetry: TelemetryStore):
    static_root = static_dir.resolve()

    class GardenGuardHandler(BaseHTTPRequestHandler):
        server_version = "GardenGuard/0.1"

        def log_message(self, format: str, *args):  # noqa: A002
            return

        def do_GET(self) -> None:
            parsed = urlparse(self.path)
            if parsed.path == "/api/telemetry/summary":
                self._send_json(telemetry.summary())
                return
            self._serve_static(parsed.path, static_root)

        def do_POST(self) -> None:
            parsed = urlparse(self.path)
            if parsed.path != "/api/telemetry":
                self._send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)
                return

            try:
                length = int(self.headers.get("Content-Length", "0"))
                body = self.rfile.read(min(length, 20_000))
                event = json.loads(body.decode("utf-8"))
                stored = telemetry.append(event)
            except (ValueError, json.JSONDecodeError) as exc:
                self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return
            self._send_json({"ok": True, "event": stored}, HTTPStatus.CREATED)

        def _serve_static(self, request_path: str, root: Path) -> None:
            if request_path in {"", "/"}:
                relative = "index.html"
            else:
                relative = unquote(request_path).lstrip("/")
            candidate = (root / relative).resolve()
            try:
                candidate.relative_to(root)
            except ValueError:
                self._send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)
                return
            if not candidate.is_file():
                self._send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)
                return
            content_type, _ = mimetypes.guess_type(candidate.name)
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", content_type or "application/octet-stream")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(candidate.read_bytes())

        def _send_json(
            self, payload: dict, status: HTTPStatus = HTTPStatus.OK
        ) -> None:
            body = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    return GardenGuardHandler


def run(
    host: str = "127.0.0.1",
    port: int = 8000,
    static_dir: Path = DEFAULT_STATIC_DIR,
    telemetry_path: Path = DEFAULT_TELEMETRY,
) -> None:
    handler = make_handler(static_dir, TelemetryStore(telemetry_path))
    server = ThreadingHTTPServer((host, port), handler)
    print(f"Garden Guard running at http://{host}:{port}")
    print(f"Telemetry log: {telemetry_path}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nGarden Guard stopped.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Garden Guard locally.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8000, type=int)
    parser.add_argument("--telemetry", default=str(DEFAULT_TELEMETRY))
    args = parser.parse_args()
    run(host=args.host, port=args.port, telemetry_path=Path(args.telemetry))


if __name__ == "__main__":
    main()
