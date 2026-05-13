# Garden Guard

Garden Guard is a calm, turn-based garden tactics game for kids ages 7-9. It mixes backyard defense, toy-soldier energy, and Plants-vs-Zombies-style lane tactics without timers or twitch pressure.

## Run

```powershell
uv sync
uv run python main.py
```

Open `http://127.0.0.1:8000` in a browser.

## How to Play

Your goal is to stop every wave before the garden gate is hit 3 times.

- Bad guys start on the blue `START` squares on the right side.
- They move left one square after you press `End Turn`.
- If a defender is directly to their left, they attack that defender instead of moving.
- Pea Cadets and Sprout Tanks shoot down their row. Tater Bunkers block. Sun Medics heal nearby helpers.
- The board shows each bad guy's next move: `MOVE`, `ATTACK`, or `GATE`.
- After `End Turn`, animations show shots, healing, enemy attacks, and enemy movement in order.
- The `Sound On` button toggles local synthesized sound effects. No audio files are downloaded.

## Test

```powershell
uv run python -m unittest discover -s tests
```

## Telemetry

Gameplay telemetry is local only and is written to `data/telemetry.jsonl`. The in-game Balance panel reads the same data through `/api/telemetry/summary` and shows recent level starts, wins, losses, hints, undo usage, and turn results.

Delete `data/telemetry.jsonl` to reset playtest history.
