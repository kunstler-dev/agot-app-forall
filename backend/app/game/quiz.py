"""House quiz scoring: every answer adds weights to houses; the result is the best match in percent."""

from __future__ import annotations

from ..content.schema import Quiz


class QuizInputError(ValueError):
    pass


def score(quiz: Quiz, answers: list[int], houses: list[str]) -> list[dict]:
    """Ranking of houses, best first: [{house, score, pct}]. pct = score / best possible score for that house."""
    if len(answers) != len(quiz.questions):
        raise QuizInputError("answer every question")
    raw = dict.fromkeys(houses, 0)
    best = dict.fromkeys(houses, 0)
    for q, a in zip(quiz.questions, answers, strict=True):
        if not 0 <= a < len(q.answers):
            raise QuizInputError(f"bad answer for {q.id}")
        for h, w in q.answers[a].weights.items():
            if h in raw:
                raw[h] += w
        for h in houses:
            best[h] += max([0, *(ans.weights.get(h, 0) for ans in q.answers)])
    rows = [{"house": h, "score": raw[h], "pct": round(100 * max(raw[h], 0) / best[h]) if best[h] else 0}
            for h in houses]
    rows.sort(key=lambda r: (-r["pct"], -r["score"], r["house"]))
    return rows
