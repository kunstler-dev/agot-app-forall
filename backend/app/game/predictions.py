"""Prediction league rules: who may vote, how many points a correct prediction earns."""

from __future__ import annotations


def can_vote(status: str, deadline_ms: int, now_ms: int) -> bool:
    return status == "open" and now_ms < deadline_ms


def distribution(counts: dict[int, int], n_options: int) -> list[dict]:
    total = sum(counts.values())
    return [{"option": i, "votes": counts.get(i, 0),
             "share": round(counts.get(i, 0) / total, 4) if total else 0.0} for i in range(n_options)]


def award(base: int, correct_votes: int, total_votes: int, threshold: float, multiplier: float) -> tuple[int, bool]:
    """Points for one correct voter and whether the "bold call" bonus applies
    (fewer than `threshold` of all voters picked the right option)."""
    bold = total_votes > 0 and correct_votes / total_votes < threshold
    return round(base * (multiplier if bold else 1)), bold
