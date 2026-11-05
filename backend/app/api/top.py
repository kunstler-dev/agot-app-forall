"""Leaderboards over point_awards: this week, the current season and all time; all points or predictions only."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..game.calendar import day_start_ms, week_start
from ..models import PointAward, User
from .deps import Player, Session, TenantDep, today

router = APIRouter(prefix="/api")

Scope = Literal["all", "predictions"]
Period = Literal["week", "season", "all"]


def _filters(scope: str, season: str | None, since_ms: int | None) -> list:
    f = []
    if scope == "predictions":
        f.append(PointAward.source == "prediction")
    if season is not None:
        f.append(PointAward.season == season)
    if since_ms is not None:
        f.append(PointAward.created_ms >= since_ms)
    return f


async def rank_of(s: AsyncSession, user_id: int, scope: str, season: str | None, since_ms: int | None) -> dict:
    f = _filters(scope, season, since_ms)
    mine = (await s.execute(select(func.coalesce(func.sum(PointAward.points), 0))
                            .where(PointAward.user_id == user_id, *f))).scalar_one()
    if not mine:
        return {"rank": None, "points": 0}
    sums = select(PointAward.user_id, func.sum(PointAward.points).label("p")).where(*f) \
        .group_by(PointAward.user_id).subquery()
    above = (await s.execute(select(func.count()).select_from(sums).where(sums.c.p > mine))).scalar_one()
    return {"rank": above + 1, "points": int(mine)}


def period_args(period: str, request: Request) -> tuple[str | None, int | None]:
    tenant = request.app.state.tenant
    if period == "season":
        return tenant.predictions.current_season, None
    if period == "week":
        return None, day_start_ms(week_start(today(request)), tenant.timezone)
    return None, None


@router.get("/top")
async def top(request: Request, u: Player, s: Session, tenant: TenantDep,
              period: Period = "week", scope: Scope = "all", limit: int = 50) -> dict:
    season, since = period_args(period, request)
    f = _filters(scope, season, since)
    total = func.sum(PointAward.points).label("p")
    rows = (await s.execute(
        select(User.id, User.first_name, User.username, User.photo_url, User.house, total)
        .join(PointAward, PointAward.user_id == User.id).where(*f)
        .group_by(User.id, User.first_name, User.username, User.photo_url, User.house)
        .order_by(total.desc(), User.id).limit(min(limit, 100)))).all()
    top_rows, rank, prev = [], 0, None
    for i, r in enumerate(rows, start=1):
        if r.p != prev:
            rank, prev = i, r.p
        top_rows.append({"rank": rank, "id": r.id, "name": r.first_name or r.username or "Игрок",
                         "photo_url": r.photo_url, "house": r.house, "points": int(r.p), "me": r.id == u.id})
    me = await rank_of(s, u.id, scope, season, since)
    await s.commit()
    return {"period": period, "scope": scope,
            "season_label": tenant.predictions.season_label, "top": top_rows, "me": me}
