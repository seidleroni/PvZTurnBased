# Repository Guidelines

## Project Structure & Module Organization

This repository contains Garden Guard, a local browser-playable turn-based tactics game served by a small Python app.

- `main.py` starts the local server.
- `src/garden_guard/` contains Python server and telemetry code.
- `src/garden_guard/static/` contains the HTML, CSS, and JavaScript game client.
- `tests/` contains automated tests.
- `data/telemetry.jsonl` is generated during local play and should stay uncommitted if Git is initialized.

Prefer small, focused modules over large catch-all files. For example, put turn sequencing in `src/turns/`, combat rules in `src/combat/`, and shared domain types in `src/core/`.

## Build, Test, and Development Commands

Run commands from the repository root:

- `uv sync`: create/update the uv-managed environment from `pyproject.toml` and `uv.lock`.
- `uv run python main.py`: start the game at `http://127.0.0.1:8000`.
- `uv run python -m unittest discover -s tests`: run the test suite.

Avoid requiring global tools when a project-local script can wrap them.

## Coding Style & Naming Conventions

Use 4-space indentation for Python and 2-space indentation for HTML, CSS, and JavaScript. Keep Python modules small and dependency-free unless a new dependency is clearly justified.

Use `PascalCase` for classes, `camelCase` for JavaScript functions and variables, and `snake_case` for Python functions and variables. Name files by responsibility, such as `telemetry.py` or `game.js`.

## Testing Guidelines

Tests use Python `unittest`. Keep tests deterministic: turn resolution, random outcomes, and telemetry behavior should avoid uncontrolled randomness.

Mirror source paths where practical. Test names should describe behavior, such as `test_append_writes_jsonl_and_summary`.

## Commit & Pull Request Guidelines

This directory is not currently a Git repository, so no project-specific commit history is available. Use short, imperative commit messages, for example `Add turn order resolver` or `Fix invalid move validation`.

Pull requests should include a concise summary, test results, linked issues when available, and screenshots or recordings for visible gameplay or UI changes.

## Agent-Specific Instructions

Keep generated changes scoped to the request. Do not introduce frameworks, build systems, or broad architecture without a clear need from the task or surrounding code.
