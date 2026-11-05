"""'Which house are you?': questions without weights, scoring on the server, channel-wide stats."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..content import Content
from ..game import quiz as Q
from ..models import QuizResult, User
from ..services.analytics import track
from ..services.users import now_ms
from .deps import ContentDep, Player, Session, today

router = APIRouter(prefix="/api/quiz")


def quiz_houses(content: Content) -> list[str]:
    return sorted(h.id for h in content.houses.values() if h.quiz)


@router.get("")
async def get_quiz(content: ContentDep, u: Player, s: Session) -> dict:
    q = content.quiz
    await s.commit()
    return {"title": q.title, "intro": q.intro,
            "questions": [{"id": x.id, "text": x.text, "answers": [a.text for a in x.answers]}
                          for x in q.questions]}


async def house_stats(s: AsyncSession) -> dict:
    rows = (await s.execute(select(User.house, func.count()).where(User.house.is_not(None))
                            .group_by(User.house))).all()
    total = sum(n for _, n in rows)
    return {"total": total, "houses": {h: round(100 * n / total, 1) for h, n in rows} if total else {}}


def result_out(content: Content, ranking: list[dict]) -> dict:
    best = content.houses[ranking[0]["house"]]
    return {
        "house": best.id,
        "name": best.name,
        "words": best.words,
        "text": best.quiz_text or best.description,
        "crest": best.crest.model_dump(),
        "ranking": [{**r, "name": content.house_name(r["house"])} for r in ranking[:4]],
    }


class QuizIn(BaseModel):
    answers: list[int] = Field(max_length=50)


@router.post("")
async def submit(body: QuizIn, request: Request, u: Player, s: Session, content: ContentDep) -> dict:
    try:
        ranking = Q.score(content.quiz, body.answers, quiz_houses(content))
    except Q.QuizInputError as e:
        raise HTTPException(422, str(e)) from e
    now = now_ms()
    res = await s.get(QuizResult, u.id)
    if res is None:
        res = QuizResult(user_id=u.id, created_ms=now)
        s.add(res)
    res.house, res.scores, res.answers, res.updated_ms = ranking[0]["house"], {"ranking": ranking}, body.answers, now
    u.house = res.house
    await track(s, u.id, "quiz_done", today(request).isoformat(), now, res.house)
    await s.flush()
    out = result_out(content, ranking) | {"stats": await house_stats(s)}
    await s.commit()
    return out


@router.get("/result")
async def my_result(u: Player, s: Session, content: ContentDep) -> dict:
    res = await s.get(QuizResult, u.id)
    if res is None or res.house not in content.houses:
        await s.commit()
        return {"result": None, "stats": await house_stats(s)}
    out = {"result": result_out(content, res.scores["ranking"]), "stats": await house_stats(s)}
    await s.commit()
    return out
