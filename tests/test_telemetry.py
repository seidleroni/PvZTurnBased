import json
from pathlib import Path

import unittest

from src.garden_guard.telemetry import TelemetryStore, validate_event


class TelemetryTests(unittest.TestCase):
    def test_validate_event_rejects_unknown_type(self):
        with self.assertRaises(ValueError):
            validate_event({"type": "mystery", "payload": {}})

    def test_append_writes_jsonl_and_summary(self):
        path = Path("build/test-telemetry.jsonl")
        if path.exists():
            path.unlink()
        store = TelemetryStore(path)

        store.append(
            {
                "type": "level_start",
                "session_id": "test-session",
                "payload": {"levelId": "training-patch"},
            }
        )
        store.append(
            {
                "type": "level_complete",
                "session_id": "test-session",
                "payload": {"levelId": "training-patch", "turns": 4},
            }
        )

        lines = path.read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(lines), 2)
        self.assertEqual(json.loads(lines[0])["type"], "level_start")
        summary = store.summary()
        self.assertEqual(summary["eventCount"], 2)
        self.assertEqual(summary["levels"]["training-patch"]["wins"], 1)
        self.assertEqual(summary["levels"]["training-patch"]["averageTurns"], 4.0)

    def test_new_gameplay_events_are_valid(self):
        for event_type in ["unit_upgraded", "unit_removed", "power_used"]:
            event = validate_event(
                {
                    "type": event_type,
                    "session_id": "test-session",
                    "payload": {"levelId": "training-patch"},
                }
            )
            self.assertEqual(event["type"], event_type)


if __name__ == "__main__":
    unittest.main()
