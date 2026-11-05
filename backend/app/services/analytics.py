from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from ..models import AnalyticsEvent

KINDS = {"share_daily", "share_crest", "share_quiz", "share_geo", "quiz_done", "geo_done", "open"}


async def track(s: AsyncSession, user_id: int | None, kind: str, day: str, now_ms: int, meta: str = "") -> None:
    s.add(AnalyticsEvent(user_id=user_id, kind=kind, day=day, ms=now_ms, meta=meta[:64]))
