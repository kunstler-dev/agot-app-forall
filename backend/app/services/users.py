from __future__ import annotations

import time

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import ActivityDay, User
from ..telegram_auth import TgUser


def now_ms() -> int:
    return int(time.time() * 1000)


async def get_for_update(s: AsyncSession, user_id: int) -> User | None:
    # FOR UPDATE in Postgres serializes parallel requests of one player; SQLite ignores it
    return (await s.execute(select(User).where(User.id == user_id).with_for_update())).scalar_one_or_none()


async def get_or_create(s: AsyncSession, tg: TgUser) -> User:
    """Finds a player (with a row lock) or creates one, and refreshes the Telegram profile fields."""
    u = await get_for_update(s, tg.id)
    if u is None:
        u = User(id=tg.id, created_ms=now_ms())
        s.add(u)
        try:
            await s.flush()
        except IntegrityError:  # parallel first login: another request already created the row
            await s.rollback()
            u = await get_for_update(s, tg.id)
            assert u is not None
    u.first_name = tg.first_name or u.first_name or ""
    u.username = tg.username
    u.is_premium = tg.is_premium
    u.language = tg.language
    if tg.photo_url:
        u.photo_url = tg.photo_url
    u.seen_ms = now_ms()
    return u


async def mark_active(s: AsyncSession, user_id: int, day: str) -> None:
    if await s.get(ActivityDay, (user_id, day)) is None:
        s.add(ActivityDay(user_id=user_id, day=day))
        try:
            async with s.begin_nested():
                await s.flush()
        except IntegrityError:
            pass
