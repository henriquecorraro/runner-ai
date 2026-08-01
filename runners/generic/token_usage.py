"""Dependency-free token estimates and usage telemetry.

The runner cannot know provider billing tokens for arbitrary agent CLIs, so all
values produced here are explicitly estimates. Provider-reported usage can be
added later without changing the stored schema.
"""
from __future__ import annotations

import math
from pathlib import Path

CHARS_PER_TOKEN = 4


def estimate_tokens(value: str | None) -> int:
    if not value:
        return 0
    return math.ceil(len(value) / CHARS_PER_TOKEN)


def truncate_to_token_budget(value: str, max_tokens: int) -> tuple[str, bool]:
    if not isinstance(max_tokens, int) or isinstance(max_tokens, bool) or max_tokens < 1:
        raise ValueError("max_tokens must be a positive integer")
    if estimate_tokens(value) <= max_tokens:
        return value, False
    maximum_characters = max_tokens * CHARS_PER_TOKEN
    cut = value[:maximum_characters]
    newline = cut.rfind("\n")
    if newline >= int(maximum_characters * 0.75):
        cut = cut[:newline + 1]
    return cut, True


def estimate_file_tokens(path: str) -> int:
    file_path = Path(path)
    if not file_path.is_file():
        return 0
    return estimate_tokens(file_path.read_text(errors="replace"))
