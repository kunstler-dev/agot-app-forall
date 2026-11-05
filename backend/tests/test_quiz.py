import pytest

from app.content.schema import Quiz
from app.game import quiz as Q

from .conftest import auth

QUIZ = Quiz.model_validate({"questions": [
    {"id": "a", "text": "?", "answers": [{"text": "1", "weights": {"x": 3}}, {"text": "2", "weights": {"y": 3}}]},
    {"id": "b", "text": "?", "answers": [{"text": "1", "weights": {"x": 2, "z": 1}}, {"text": "2", "weights": {"y": 2}}]},
    {"id": "c", "text": "?", "answers": [{"text": "1", "weights": {"z": 3}}, {"text": "2", "weights": {"x": 1}}]},
]})


def test_scoring_and_percentages():
    rows = Q.score(QUIZ, [0, 0, 1], ["x", "y", "z"])
    assert rows[0] == {"house": "x", "score": 6, "pct": 100}
    assert {r["house"]: r["pct"] for r in rows} == {"x": 100, "y": 0, "z": 25}


def test_bad_answers():
    with pytest.raises(Q.QuizInputError):
        Q.score(QUIZ, [0, 0], ["x"])
    with pytest.raises(Q.QuizInputError):
        Q.score(QUIZ, [0, 0, 5], ["x"])


async def test_quiz_api_sets_house_and_stats(app, client):
    q = (await client.get("/api/quiz", headers=auth(20))).json()
    assert "weights" not in str(q)
    answers = [0] * len(q["questions"])
    r = (await client.post("/api/quiz", json={"answers": answers}, headers=auth(20))).json()
    assert r["house"] in app.state.content.houses and len(r["ranking"]) == 4
    assert r["stats"]["houses"][r["house"]] == 100.0
    await client.post("/api/quiz", json={"answers": [1] * len(answers)}, headers=auth(21))
    stats = (await client.get("/api/quiz/result", headers=auth(20))).json()["stats"]
    assert stats["total"] == 2
    me = (await client.get("/api/me", headers=auth(20))).json()["user"]
    assert me["house"] == r["house"]
    bad = await client.post("/api/quiz", json={"answers": [0]}, headers=auth(20))
    assert bad.status_code == 422
