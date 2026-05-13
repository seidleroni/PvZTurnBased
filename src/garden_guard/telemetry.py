from __future__ import annotations

import json
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


VALID_EVENT_TYPES = {
    "session_start",
    "level_start",
    "unit_placed",
    "unit_upgraded",
    "unit_removed",
    "power_used",
    "turn_resolved",
    "undo_used",
    "hint_used",
    "level_complete",
    "level_failed",
    "restart_level",
}


@dataclass(frozen=True)
class TelemetryStore:
    path: Path

    def append(self, event: dict[str, Any]) -> dict[str, Any]:
        cleaned = validate_event(event)
        cleaned["received_at"] = datetime.now(timezone.utc).isoformat()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(cleaned, sort_keys=True) + "\n")
        return cleaned

    def read_events(self) -> list[dict[str, Any]]:
        if not self.path.exists():
            return []
        events: list[dict[str, Any]] = []
        with self.path.open("r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        return events

    def summary(self) -> dict[str, Any]:
        events = self.read_events()
        by_type = Counter(event.get("type", "unknown") for event in events)
        levels: dict[str, dict[str, Any]] = defaultdict(
            lambda: {"starts": 0, "wins": 0, "losses": 0, "turns": []}
        )
        for event in events:
            payload = event.get("payload", {})
            level_id = payload.get("levelId")
            if not level_id:
                continue
            item = levels[level_id]
            match event.get("type"):
                case "level_start":
                    item["starts"] += 1
                case "level_complete":
                    item["wins"] += 1
                    if isinstance(payload.get("turns"), int):
                        item["turns"].append(payload["turns"])
                case "level_failed":
                    item["losses"] += 1
                    if isinstance(payload.get("turns"), int):
                        item["turns"].append(payload["turns"])

        level_summary = {}
        for level_id, item in levels.items():
            turns = item.pop("turns")
            item["averageTurns"] = round(sum(turns) / len(turns), 1) if turns else None
            level_summary[level_id] = item

        return {
            "eventCount": len(events),
            "byType": dict(by_type),
            "levels": level_summary,
            "recent": events[-30:],
        }


def validate_event(event: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(event, dict):
        raise ValueError("event must be an object")
    event_type = event.get("type")
    if event_type not in VALID_EVENT_TYPES:
        raise ValueError("unknown event type")
    payload = event.get("payload", {})
    if not isinstance(payload, dict):
        raise ValueError("payload must be an object")
    return {
        "type": event_type,
        "session_id": str(event.get("session_id", "unknown"))[:80],
        "payload": payload,
    }
