"""Daily puzzles: "Character of the day" (attribute grid) and "Crest of the day" (crest reveal).

The answer lives only on the server. The client gets comparison results, hints it has unlocked
and the answer itself only once its game is finished.
"""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..content import Content
from ..game import daily as D
from ..game.calendar import day_number, next_day_ms
from ..models import DailyPlay, DailyPuzzle, DailyStats, User
from ..services import points as P
from ..services.users import now_ms
from ..tenant import Tenant
from .deps import ContentDep, Player, Session, TenantDep, today

router = APIRouter(prefix="/api/daily")

MODES = ("character", "crest")


async def puzzle_answer(s: AsyncSession, content: Content, tenant: Tenant, day: date, mode: str) -> str:
    """The answer of the day: picked deterministically once, then stored."""
    pool = content.daily_pool() if mode == "character" else content.crest_pool()
    known = content.characters if mode == "character" else content.houses
    row = await s.get(DailyPuzzle, (day.isoformat(), mode))
    if row is not None and row.answer in known:
        return row.answer
    answer = D.pick(pool, tenant.daily.seed, mode, (day - tenant.daily.epoch).days)
    if row is not None:  # the stored answer was removed from content
        row.answer = answer
        return answer
    try:
        async with s.begin_nested():
            s.add(DailyPuzzle(day=day.isoformat(), mode=mode, answer=answer))
            await s.flush()
    except IntegrityError:  # a parallel request stored it first
        row = await s.get(DailyPuzzle, (day.isoformat(), mode))
        assert row is not None
        return row.answer
    return answer


async def get_play(s: AsyncSession, user_id: int, day: date, mode: str, create: bool) -> DailyPlay | None:
    q = select(DailyPlay).where(DailyPlay.user_id == user_id, DailyPlay.day == day.isoformat(),
                                DailyPlay.mode == mode).with_for_update()
    play = (await s.execute(q)).scalar_one_or_none()
    if play is None and create:
        play = DailyPlay(user_id=user_id, day=day.isoformat(), mode=mode, guesses=[], created_ms=now_ms())
        s.add(play)
        await s.flush()
    return play


async def get_stats(s: AsyncSession, user_id: int, mode: str, create: bool = False) -> DailyStats | None:
    st = await s.get(DailyStats, (user_id, mode))
    if st is None and create:
        st = DailyStats(user_id=user_id, mode=mode, played=0, won=0, streak=0, best_streak=0, dist={})
        s.add(st)
    return st


def stats_out(st: DailyStats | None, day: date) -> dict:
    if st is None:
        return {"played": 0, "won": 0, "streak": 0, "best_streak": 0, "dist": {}}
    return {"played": st.played, "won": st.won, "streak": D.current_streak(st, day),
            "best_streak": st.best_streak, "dist": st.dist or {}}


def cell_value(content: Content, attr, value) -> str:
    vals = value if isinstance(value, list) else [value]
    return ", ".join(content.value_label(attr, v) for v in vals)


def character_out(content: Content, tenant: Tenant, play: DailyPlay | None, answer_id: str,
                  st: DailyStats | None, day: date) -> dict:
    cfg = tenant.daily
    target = content.characters[answer_id]
    guesses = []
    for gid in (play.guesses if play else []):
        g = content.characters.get(gid)
        if g is None:
            continue
        cells = D.compare(content.attributes, target, g)
        for c, a in zip(cells, content.attributes, strict=True):
            c["value"] = cell_value(content, a, g.attrs[a.key])
        guesses.append({"id": g.id, "name": g.name, "cells": cells, "correct": g.id == target.id})
    n = len(guesses)
    finished = bool(play and play.finished)
    hints: dict = {"quote": None, "crest": None}
    if n >= cfg.hint_quote_after or finished:
        hints["quote"] = target.quote or None
    house_id = target.attrs.get(content.crest_attr)
    if (n >= cfg.hint_crest_after or finished) and isinstance(house_id, str) and house_id in content.houses:
        hints["crest"] = content.houses[house_id].crest.model_dump()
    out = {
        "max_attempts": cfg.max_attempts,
        "guesses": guesses,
        "solved": bool(play and play.solved),
        "finished": finished,
        "hints": hints,
        "answer": None,
        "stats": stats_out(st, day),
    }
    if finished:
        out["answer"] = {"id": target.id, "name": target.name, "bio": target.bio,
                         "house": house_id if isinstance(house_id, str) else None}
        out["points"] = D.points(n, cfg.points_base, cfg.points_step) if play and play.solved else 0
    return out


def crest_out(content: Content, tenant: Tenant, play: DailyPlay | None, answer_id: str,
              st: DailyStats | None, day: date) -> dict:
    house = content.houses[answer_id]
    guesses = [{"house": h, "name": content.house_name(h), "correct": h == answer_id}
               for h in (play.guesses if play else [])]
    finished = bool(play and play.finished)
    wrong = sum(1 for g in guesses if not g["correct"])
    out = {
        "max_attempts": tenant.daily.crest_attempts,
        "guesses": guesses,
        "solved": bool(play and play.solved),
        "finished": finished,
        "stage": D.crest_stage(house.crest, wrong, house.words, finished),
        "answer": None,
        "stats": stats_out(st, day),
    }
    if finished:
        out["answer"] = {"house": house.id, "name": house.name, "words": house.words,
                         "crest": house.crest.model_dump()}
    return out


async def state(s: AsyncSession, request: Request, u: User) -> dict:
    content: Content = request.app.state.content
    tenant: Tenant = request.app.state.tenant
    day = today(request)
    out = {"day": day.isoformat(), "number": day_number(day, tenant.daily.epoch),
           "next_ms": next_day_ms(now_ms(), tenant.timezone)}
    ans = await puzzle_answer(s, content, tenant, day, "character")
    out["character"] = character_out(content, tenant, await get_play(s, u.id, day, "character", False), ans,
                                     await get_stats(s, u.id, "character"), day)
    ans = await puzzle_answer(s, content, tenant, day, "crest")
    out["crest"] = crest_out(content, tenant, await get_play(s, u.id, day, "crest", False), ans,
                             await get_stats(s, u.id, "crest"), day)
    return out


@router.get("")
async def daily_state(request: Request, u: Player, s: Session) -> dict:
    out = await state(s, request, u)
    await s.commit()
    return out


@router.get("/characters")
async def character_names(content: ContentDep, u: Player) -> list[dict]:
    """Names for autocomplete with the house for a small crest (other attributes stay on the server)."""
    return [{"id": c.id, "name": c.name, "aliases": c.aliases,
             "house": h if isinstance(h := c.attrs.get(content.crest_attr), str) and h in content.houses else None}
            for c in
            sorted(content.characters.values(), key=lambda c: c.name)]


class GuessIn(BaseModel):
    id: str


async def _finish(s: AsyncSession, u: User, play: DailyPlay, mode: str, day: date, won: bool,
                  pts: int, now: int, season: str) -> None:
    play.finished, play.solved, play.finished_ms = True, won, now
    st = await get_stats(s, u.id, mode, create=True)
    D.update_stats(st, day, won, len(play.guesses))
    if won:
        await P.award(s, u.id, f"daily_{mode}", day.isoformat(), pts, now, season)


@router.post("/character/guess")
async def guess_character(body: GuessIn, request: Request, u: Player, s: Session,
                          content: ContentDep, tenant: TenantDep) -> dict:
    day = today(request)
    if body.id not in content.characters:
        raise HTTPException(404, "unknown_character")
    answer = await puzzle_answer(s, content, tenant, day, "character")
    play = await get_play(s, u.id, day, "character", True)
    assert play is not None
    if play.finished:
        raise HTTPException(409, "finished")
    if body.id in play.guesses:
        raise HTTPException(409, "already_guessed")
    play.guesses = [*play.guesses, body.id]
    n = len(play.guesses)
    if body.id == answer:
        await _finish(s, u, play, "character", day, True,
                      D.points(n, tenant.daily.points_base, tenant.daily.points_step), now_ms(),
                      tenant.predictions.current_season)
    elif n >= tenant.daily.max_attempts:
        await _finish(s, u, play, "character", day, False, 0, now_ms(), "")
    out = await state(s, request, u)
    await s.commit()
    return out


class CrestGuessIn(BaseModel):
    house: str


@router.post("/crest/guess")
async def guess_crest(body: CrestGuessIn, request: Request, u: Player, s: Session,
                      content: ContentDep, tenant: TenantDep) -> dict:
    day = today(request)
    if body.house not in content.houses:
        raise HTTPException(404, "unknown_house")
    answer = await puzzle_answer(s, content, tenant, day, "crest")
    play = await get_play(s, u.id, day, "crest", True)
    assert play is not None
    if play.finished:
        raise HTTPException(409, "finished")
    if body.house in play.guesses:
        raise HTTPException(409, "already_guessed")
    play.guesses = [*play.guesses, body.house]
    n = len(play.guesses)
    if body.house == answer:
        await _finish(s, u, play, "crest", day, True, D.points(n, 60, 10), now_ms(),
                      tenant.predictions.current_season)
    elif n >= tenant.daily.crest_attempts:
        await _finish(s, u, play, "crest", day, False, 0, now_ms(), "")
    out = await state(s, request, u)
    await s.commit()
    return out


@router.get("/share/{mode}")
async def share_text(mode: str, request: Request, u: Player, s: Session, content: ContentDep,
                     tenant: TenantDep) -> dict:
    """Spoiler-free result: emoji grid and attempts, never the answer."""
    if mode not in MODES:
        raise HTTPException(404)
    day = today(request)
    play = await get_play(s, u.id, day, mode, False)
    if play is None or not play.finished:
        raise HTTPException(409, "not_finished")
    answer = await puzzle_answer(s, content, tenant, day, mode)
    num = day_number(day, tenant.daily.epoch)
    if mode == "character":
        target = content.characters[answer]
        rows = [D.emoji_row(D.compare(content.attributes, target, content.characters[g]))
                for g in play.guesses if g in content.characters]
        title = f"{tenant.app_name} · Персонаж дня #{num}"
        limit = tenant.daily.max_attempts
    else:
        rows = ["".join("🟩" if g == answer else "🟥" for g in play.guesses)]
        title = f"{tenant.app_name} · Герб дня #{num}"
        limit = tenant.daily.crest_attempts
    score = f"{len(play.guesses)}/{limit}" if play.solved else f"✗/{limit}"
    await s.commit()
    return {"text": f"{title} — {score}\n" + "\n".join(rows)}
