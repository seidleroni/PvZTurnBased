from pathlib import Path

from src.garden_guard.server import run


if __name__ == "__main__":
    run(static_dir=Path(__file__).parent / "src" / "garden_guard" / "static")
