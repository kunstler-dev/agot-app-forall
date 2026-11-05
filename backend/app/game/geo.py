"""'Where is it?': distance-based scoring on the tenant map (map units, not kilometers)."""

from __future__ import annotations

import hashlib
import math
import random


def distance(x1: float, y1: float, x2: float, y2: float) -> float:
    return math.hypot(x1 - x2, y1 - y2)


def score(d: float, max_score: int, scale: float, perfect_radius: float) -> int:
    if d <= perfect_radius:
        return max_score
    return round(max_score * math.exp(-(d - perfect_radius) / scale))


def pick_clues(pool: list[str], k: int, seed: str) -> list[str]:
    """k distinct clues; deterministic for a seed (the daily round is the same for everyone)."""
    order = sorted(pool)
    rnd = random.Random(int.from_bytes(hashlib.sha256(seed.encode()).digest()[:8], "big"))
    return rnd.sample(order, min(k, len(order)))


def emoji(score_: int, max_score: int) -> str:
    r = score_ / max_score if max_score else 0
    return "🟩" if r >= 0.8 else "🟨" if r >= 0.4 else "🟧" if r >= 0.1 else "⬛"
