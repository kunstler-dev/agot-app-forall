"""Prediction league: players vote before the deadline; an admin resolves; points are paid idempotently."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..game import predictions as G
from ..models import PredictionEvent, PredictionVote
from ..services import points as P
from ..services.users import now_ms
from ..tenant import Tenant
from .deps import Player, Session, TenantDep

router = APIRouter(prefix="/api/predictions")


async def counts(s: AsyncSession, event_id: int) -> dict[int, int]:
    rows = (await s.execute(select(PredictionVote.option, func.count()).where(PredictionVote.event_id == event_id)
                            .group_by(PredictionVote.option))).all()
    return {int(o): int(n) for o, n in rows}


def event_out(e: PredictionEvent, mine: int | None, cnt: dict[int, int], now: int, tenant: Tenant,
              admin: bool = False) -> dict:
    open_ = G.can_vote(e.status, e.deadline_ms, now)
    total = sum(cnt.values())
    out = {
        "id": e.id, "question": e.question, "options": e.options, "deadline_ms": e.deadline_ms, "tag": e.tag,
        "season": e.season, "status": e.status, "open": open_, "my_vote": mine, "votes": total,
        "correct": e.correct if e.status == "resolved" else None, "base_points": e.base_points,
        "bold_threshold": tenant.predictions.bold_threshold, "bold_multiplier": tenant.predictions.bold_multiplier,
        # the vote split is hidden until the deadline so it doesn't steer the crowd
        "distribution": G.distribution(cnt, len(e.options)) if (not open_ or admin) else None,
        "my_points": None,
    }
    if e.status == "resolved" and mine is not None and e.correct is not None:
        out["my_points"] = G.award(e.base_points, cnt.get(e.correct, 0), total, tenant.predictions.bold_threshold,
                                   tenant.predictions.bold_multiplier)[0] if mine == e.correct else 0
    return out


@router.get("")
async def list_events(u: Player, s: Session, tenant: TenantDep) -> dict:
    now = now_ms()
    events = (await s.execute(select(PredictionEvent).where(PredictionEvent.status != "cancelled")
                              .order_by(PredictionEvent.deadline_ms.desc()))).scalars().all()
    votes = {v.event_id: v.option for v in (await s.execute(
        select(PredictionVote).where(PredictionVote.user_id == u.id))).scalars()}
    items = [event_out(e, votes.get(e.id), await counts(s, e.id), now, tenant) for e in events]
    # open first (nearest deadline first), then closed and resolved
    items.sort(key=lambda x: (not x["open"], x["deadline_ms"] if x["open"] else -x["deadline_ms"]))
    await s.commit()
    return {"events": items, "season_label": tenant.predictions.season_label}


class VoteIn(BaseModel):
    option: int


@router.post("/{event_id}/vote")
async def vote(event_id: int, body: VoteIn, u: Player, s: Session, tenant: TenantDep) -> dict:
    now = now_ms()
    e = await s.get(PredictionEvent, event_id)
    if e is None or e.status == "cancelled":
        raise HTTPException(404, "not_found")
    if not G.can_vote(e.status, e.deadline_ms, now):
        raise HTTPException(409, "deadline_passed")
    if not 0 <= body.option < len(e.options):
        raise HTTPException(422, "bad_option")
    v = (await s.execute(select(PredictionVote).where(PredictionVote.event_id == e.id,
                                                      PredictionVote.user_id == u.id))).scalar_one_or_none()
    if v is None:
        try:
            async with s.begin_nested():
                s.add(PredictionVote(event_id=e.id, user_id=u.id, option=body.option, created_ms=now))
                await s.flush()
        except IntegrityError:
            raise HTTPException(409, "already_voted") from None
    else:  # changing your mind is allowed until the deadline
        v.option, v.created_ms = body.option, now
    out = event_out(e, body.option, await counts(s, e.id), now, tenant)
    await s.commit()
    return out


async def resolve(s: AsyncSession, e: PredictionEvent, correct: int, tenant: Tenant, now: int) -> dict:
    """Mark the outcome and pay everyone who guessed it. Safe to call again: awards are unique."""
    if not 0 <= correct < len(e.options):
        raise HTTPException(422, "bad_option")
    if e.status == "resolved" and e.correct != correct:
        raise HTTPException(409, "already_resolved")
    e.status, e.correct, e.resolved_ms = "resolved", correct, e.resolved_ms or now
    if e.deadline_ms > now:  # resolving early also closes voting
        e.deadline_ms = now
    cnt = await counts(s, e.id)
    pts, bold = G.award(e.base_points, cnt.get(correct, 0), sum(cnt.values()), tenant.predictions.bold_threshold,
                        tenant.predictions.bold_multiplier)
    winners = (await s.execute(select(PredictionVote.user_id).where(PredictionVote.event_id == e.id,
                                                                    PredictionVote.option == correct)
                               .order_by(PredictionVote.user_id))).scalars().all()
    paid = 0
    for uid in winners:
        if await P.award(s, uid, "prediction", str(e.id), pts, now, e.season):
            paid += 1
    return {"winners": len(winners), "paid": paid, "points": pts, "bold": bold}
