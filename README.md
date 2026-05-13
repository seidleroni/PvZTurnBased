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
- Most bad guys move left one square after `End Turn`; Fast Sneakers move 2 squares.
- If a defender is in their path, they attack that defender instead of moving.
- Pea Cadets and Sprout Tanks shoot down their row. Tater Bunkers block. Sun Medics heal nearby helpers.
- The board shows each bad guy's next move: `MOVE`, `ATTACK`, or `GATE`.
- Seeds place new helpers. Stars buy upgrades and powers.
- Click a helper to upgrade it. Use `Shovel` to remove a helper and get 1 seed back.
- `Rally Shot` spends 3 stars so shooters fire immediately. `Sprinkler` spends 2 stars to splash and push bad guys.
- After `End Turn`, animations show shots, healing, enemy attacks, and enemy movement in order.
- The `Sound On` button toggles local synthesized sound effects. No audio files are downloaded.

## Test

```powershell
uv run python -m unittest discover -s tests
```

## GitHub Pages

The repository includes `.github/workflows/pages.yml`, which deploys the browser game from `src/garden_guard/static/` whenever `main` is pushed.

Required GitHub repository setting:

1. Open `Settings` -> `Pages`.
2. Under `Build and deployment`, set `Source` to `GitHub Actions`.
3. Save the setting, then push to `main` or run the `Deploy GitHub Pages` workflow manually.

The published game URL should be:

`https://seidleroni.github.io/PvZTurnBased/`

GitHub Pages is static hosting, so gameplay works there but local telemetry does not write to `data/telemetry.jsonl`. Use `uv run python main.py` locally when you want telemetry collection.

## Telemetry

Gameplay telemetry is local only and is written to `data/telemetry.jsonl`. The in-game Balance panel reads the same data through `/api/telemetry/summary` and shows recent level starts, wins, losses, hints, undo usage, upgrades, removals, powers, and turn results.

Delete `data/telemetry.jsonl` to reset playtest history.
