"""The only way to give points: an idempotent award under a row lock on the player."""

from __future__ import annotations

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import PointAward
from .users import get_for_update


async def award(s: AsyncSession, user_id: int, source: str, ref: str, points: int, now_ms: int,
                season: str = "") -> bool:
    """Credit points once per (source, ref, user). Returns False if this award already exists."""
    u = await get_for_update(s, user_id)
    if u is None or points <= 0:
        return False
    try:
        async with s.begin_nested():
            s.add(PointAward(user_id=user_id, source=source, ref=ref, season=season, points=points,
                             created_ms=now_ms))
            await s.flush()
    except IntegrityError:
        return False
    u.points = (u.points or 0) + points
    return True
