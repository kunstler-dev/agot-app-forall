"""Daily puzzles: the schedule, the comparison grid, crest reveal stages, points and streaks.

Pure functions: no database, no HTTP. The API layer stores state and never sends the answer
to the client before the game is over.
"""

from __future__ import annotations

import hashlib
import random
from datetime import date, timedelta

from ..content.schema import AttrDef, Character, Crest

# ---------------- schedule ----------------


def _shuffled(pool: list[str], seed: str, mode: str, cycle: int) -> list[str]:
    order = sorted(pool)
    # hashlib, not hash(): hash() of a str is salted per process
    rnd = random.Random(int.from_bytes(hashlib.sha256(f"{seed}:{mode}:{cycle}".encode()).digest()[:8], "big"))
    rnd.shuffle(order)
    return order


def cycle_order(pool: list[str], seed: str, mode: str, cycle: int) -> list[str]:
    """Permutation of the pool for one cycle. A new cycle never starts with the previous day's answer."""
    order = _shuffled(pool, seed, mode, cycle)
    if cycle > 0 and len(order) >= 3:
        prev_last = _shuffled(pool, seed, mode, cycle - 1)[-1]
        if order[0] == prev_last:
            order[0], order[1] = order[1], order[0]
    return order


def pick(pool: list[str], seed: str, mode: str, day_index: int) -> str:
    """Answer for the day with 0-based index `day_index` since the epoch: no repeats until the pool is used up."""
    if not pool:
        raise ValueError("empty pool")
    cycle, pos = divmod(day_index, len(pool))
    return cycle_order(pool, seed, mode, cycle)[pos]


# ---------------- character comparison ----------------

HIT, PARTIAL, MISS = "hit", "partial", "miss"


def _as_set(v) -> set[str]:
    return {str(x) for x in v} if isinstance(v, list) else {str(v)}


def compare_cell(attr: AttrDef, target: Character, guess: Character) -> dict:
    t, g = target.attrs[attr.key], guess.attrs[attr.key]
    arrow = None
    if attr.type == "ordinal":
        status = HIT if t == g else MISS
        if t != g:
            arrow = "up" if t > g else "down"  # the answer is later / earlier than the guess
    elif attr.type == "set":
        ts, gs = _as_set(t), _as_set(g)
        status = HIT if ts == gs else PARTIAL if ts & gs else MISS
    else:
        status = HIT if t == g else MISS
        if status == MISS and attr.partial_via:
            via_t = _as_set(target.attrs.get(attr.partial_via, []))
            via_g = _as_set(guess.attrs.get(attr.partial_via, []))
            if str(g) in via_t or str(t) in via_g:
                status = PARTIAL
    return {"key": attr.key, "status": status, "arrow": arrow}


def compare(attrs: list[AttrDef], target: Character, guess: Character) -> list[dict]:
    return [compare_cell(a, target, guess) for a in attrs]


def emoji_row(cells: list[dict]) -> str:
    return "".join({HIT: "🟩", PARTIAL: "🟨", MISS: "⬛"}[c["status"]] for c in cells)


# ---------------- crest of the day ----------------

# What a player sees after N wrong guesses: the blazon is revealed part by part (field, then
# ordinary, then charges), first as a faint engraving, then as a full engraving, then in colour.
_STAGES = [
    {"parts": ("field",), "engraved": True, "fade": 0.45},
    {"parts": ("field", "ordinary"), "engraved": True, "fade": 0.7},
    {"parts": ("field", "ordinary", "charges"), "engraved": True, "fade": 1.0},
    {"parts": ("field", "ordinary", "charges"), "engraved": False, "fade": 1.0},
    {"parts": ("field", "ordinary", "charges"), "engraved": False, "fade": 1.0, "words": True},
    {"parts": ("field", "ordinary", "charges"), "engraved": False, "fade": 1.0, "words": True},
]


def crest_stage(crest: Crest, wrong: int, words: str, finished: bool) -> dict:
    """The part of the crest a player may see now. The full crest only after the game ends."""
    st = _STAGES[-1] if finished else _STAGES[min(wrong, len(_STAGES) - 1)]
    out = {"field": crest.field.model_dump(), "ordinary": {"type": "none", "tincture": None}, "charges": [],
           "blazon": "", "canon_exception": crest.canon_exception}
    if "ordinary" in st["parts"]:
        out["ordinary"] = crest.ordinary.model_dump()
    if "charges" in st["parts"]:
        out["charges"] = [c.model_dump() for c in crest.charges]
    return {"crest": out, "engraved": st["engraved"], "fade": st["fade"], "words": words if st.get("words") else None}


# ---------------- points and streaks ----------------


def points(attempts_used: int, base: int, step: int, floor: int = 10) -> int:
    return max(base - (attempts_used - 1) * step, floor)


def update_stats(stats, today: date, won: bool, attempts: int) -> None:
    """`stats` is a DailyStats row (or anything with the same attributes)."""
    stats.played = (stats.played or 0) + 1
    if won:
        stats.won = (stats.won or 0) + 1
        dist = dict(stats.dist or {})
        dist[str(attempts)] = dist.get(str(attempts), 0) + 1
        stats.dist = dist
        yesterday = (today - timedelta(days=1)).isoformat()
        stats.streak = (stats.streak or 0) + 1 if stats.last_won_day == yesterday else 1
        stats.last_won_day = today.isoformat()
        stats.best_streak = max(stats.best_streak or 0, stats.streak)
    else:
        stats.streak = 0


def current_streak(stats, today: date) -> int:
    """A streak survives until the end of the day after the last win."""
    if stats is None or not stats.last_won_day:
        return 0
    if stats.last_won_day in (today.isoformat(), (today - timedelta(days=1)).isoformat()):
        return stats.streak or 0
    return 0
