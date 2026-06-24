"""AYRA Python runtime — HTTP sidecar used by the Node worker and Next.js API.

Exposes cron blueprint catalog, fill/validate, and cron-next so Python is the
source of truth for automation blueprints (Hermes-compatible logic in ayra.cron).
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import sys
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from ayra.cron.blueprint_catalog import (
    CATALOG,
    BlueprintFillError,
    blueprint_catalog_entry,
    fill_blueprint,
    get_blueprint,
)
from ayra.cron.suggestion_catalog import CATALOG as SUGGESTION_CATALOG

try:
    from ayra.skills.loader import get_skill_bundle, list_skill_bundles
except ImportError:
    list_skill_bundles = None  # type: ignore
    get_skill_bundle = None  # type: ignore

logger = logging.getLogger("ayra.runtime")

_EVERY_MIN = re.compile(r"^every\s+(\d+)\s*m(in(ute)?s?)?$", re.IGNORECASE)
_EVERY_HOUR = re.compile(r"^every\s+(\d+)\s*h(our(s)?)?$", re.IGNORECASE)


def _json_response(handler: BaseHTTPRequestHandler, status: int, payload: Any) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _read_json(handler: BaseHTTPRequestHandler) -> Any:
    length = int(handler.headers.get("Content-Length", "0") or "0")
    raw = handler.rfile.read(length) if length else b"{}"
    return json.loads(raw.decode("utf-8") or "{}")


def parse_schedule_expression(schedule: str) -> str:
    trimmed = schedule.strip()
    m = _EVERY_MIN.match(trimmed)
    if m:
        return f"*/{m.group(1)} * * * *"
    m = _EVERY_HOUR.match(trimmed)
    if m:
        return f"0 */{m.group(1)} * * *"
    return trimmed


def cron_next_run(cron_expr: str, after: Optional[datetime] = None) -> datetime:
    try:
        from croniter import croniter
    except ImportError as exc:
        raise RuntimeError(
            "croniter is required for cron scheduling. Run: pip install -e python/"
        ) from exc

    expr = parse_schedule_expression(cron_expr)
    base = after or datetime.now(timezone.utc)
    if base.tzinfo is None:
        base = base.replace(tzinfo=timezone.utc)
    cursor = base.replace(second=0, microsecond=0) + timedelta(minutes=1)
    it = croniter(expr, cursor)
    nxt = it.get_next(datetime)
    if isinstance(nxt, datetime):
        return nxt if nxt.tzinfo else nxt.replace(tzinfo=timezone.utc)
    return datetime.fromtimestamp(float(nxt), tz=timezone.utc)


def blueprint_catalog_payload() -> Dict[str, Any]:
    blueprints = [blueprint_catalog_entry(bp) for bp in CATALOG]
    suggestions = [
        {
            "key": entry.key,
            "title": entry.title,
            "description": entry.description,
            "jobSpec": dict(entry.job_spec),
        }
        for entry in SUGGESTION_CATALOG
    ]
    categories = sorted({bp.category for bp in CATALOG})
    return {
        "blueprints": blueprints,
        "suggestions": suggestions,
        "categories": categories,
    }


class AyraRuntimeHandler(BaseHTTPRequestHandler):
    server_version = "AYRAPythonRuntime/0.1"

    def log_message(self, fmt: str, *args: Any) -> None:
        logger.info("%s - %s", self.address_string(), fmt % args)

    def do_GET(self) -> None:
        path = urlparse(self.path).path.rstrip("/") or "/"

        if path == "/health":
            _json_response(self, 200, {"ok": True, "service": "ayra-python-runtime"})
            return

        if path == "/v1/blueprints":
            _json_response(self, 200, blueprint_catalog_payload())
            return

        if path == "/v1/skills" and list_skill_bundles is not None:
            category = urlparse(self.path).query  # optional filter via ?category=
            bundles = list_skill_bundles()
            _json_response(self, 200, {"count": len(bundles), "bundles": bundles})
            return

        if path.startswith("/v1/skills/") and get_skill_bundle is not None:
            slug = path[len("/v1/skills/") :]
            bundle = get_skill_bundle(slug)
            if not bundle:
                _json_response(self, 404, {"error": f"Unknown skill bundle: {slug}"})
                return
            _json_response(self, 200, bundle)
            return

        if path.startswith("/v1/blueprints/"):
            key = path[len("/v1/blueprints/") :]
            bp = get_blueprint(key)
            if not bp:
                _json_response(self, 404, {"error": f"Unknown blueprint: {key}"})
                return
            _json_response(self, 200, blueprint_catalog_entry(bp))
            return

        _json_response(self, 404, {"error": "Not found"})

    def do_POST(self) -> None:
        path = urlparse(self.path).path.rstrip("/") or "/"

        if path == "/v1/blueprints/fill":
            try:
                body = _read_json(self)
            except json.JSONDecodeError:
                _json_response(self, 400, {"error": "Invalid JSON body"})
                return

            key = str(body.get("blueprintKey") or body.get("key") or "").strip()
            values = body.get("values") or {}
            if not key:
                _json_response(self, 400, {"error": "blueprintKey is required"})
                return
            if not isinstance(values, dict):
                _json_response(self, 400, {"error": "values must be an object"})
                return

            bp = get_blueprint(key)
            if not bp:
                _json_response(self, 404, {"error": f"Unknown blueprint: {key}"})
                return

            try:
                spec = fill_blueprint(bp, values)
            except BlueprintFillError as exc:
                _json_response(self, 400, {"error": str(exc)})
                return

            _json_response(
                self,
                200,
                {
                    "blueprintKey": key,
                    "slotValues": values,
                    "prompt": spec["prompt"],
                    "schedule": spec["schedule"],
                    "name": spec["name"],
                    "deliver": spec.get("deliver", bp.deliver_default or "local"),
                    "skills": list(spec.get("skills") or bp.skills or []),
                },
            )
            return

        if path == "/v1/cron/next":
            try:
                body = _read_json(self)
            except json.JSONDecodeError:
                _json_response(self, 400, {"error": "Invalid JSON body"})
                return

            schedule = str(body.get("schedule") or "").strip()
            if not schedule:
                _json_response(self, 400, {"error": "schedule is required"})
                return

            after_raw = body.get("after")
            after: Optional[datetime] = None
            if isinstance(after_raw, str) and after_raw.strip():
                after = datetime.fromisoformat(after_raw.replace("Z", "+00:00"))

            try:
                nxt = cron_next_run(schedule, after)
            except Exception as exc:
                _json_response(self, 400, {"error": str(exc)})
                return

            _json_response(
                self,
                200,
                {"schedule": schedule, "nextRun": nxt.isoformat()},
            )
            return

        _json_response(self, 404, {"error": "Not found"})


def run_server(host: str, port: int) -> None:
    httpd = ThreadingHTTPServer((host, port), AyraRuntimeHandler)
    logger.info("AYRA Python runtime listening on http://%s:%d", host, port)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down")
    finally:
        httpd.server_close()


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="AYRA Python runtime sidecar")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=getattr(logging, args.log_level.upper(), logging.INFO),
        format="[%(name)s] %(message)s",
    )

    try:
        run_server(args.host, args.port)
    except OSError as exc:
        logger.error("Failed to bind %s:%d — %s", args.host, args.port, exc)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
