"""Background jobs (every minute): prediction reminders, the daily announcement, cleanup.

Broadcasts are idempotent: an event is marked `reminded` and each day's announcement has a
JobRun row before anything is sent, so a restart never messages people twice.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging

from fastapi import FastAPI
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError

from .game.calendar import game_day, local_hour
from .models import JobRun, PredictionEvent, PredictionVote, ShareCard, User
from .services.users import now_ms

log = logging.getLogger("fandom.jobs")

CARD_TTL_MS = 7 * 24 * 3600 * 1000


async def send_many(app: FastAPI, user_ids: list[int], text: str) -> int:
    bot = app.state.bot
    from .bot import app_keyboard
    kb = app_keyboard(app.state.settings, app.state.tenant)
    sent = 0
    for uid in user_ids:
        try:
            await bot.send_message(uid, text, reply_markup=kb)
            sent += 1
        except Exception as e:  # noqa: BLE001
            if "forbidden" in str(e).lower() or "blocked" in str(e).lower():
                async with app.state.db.sessions() as s:
                    u = await s.get(User, uid)
                    if u:
                        u.bot_started = False
                        await s.commit()
        await asyncio.sleep(0.05)  # stay far below Telegram's 30 messages/s
    return sent


async def remind_predictions(app: FastAPI, now: int) -> None:
    tenant = app.state.tenant
    window = tenant.predictions.remind_before_min * 60 * 1000
    async with app.state.db.sessions() as s:
        events = (await s.execute(select(PredictionEvent).where(
            PredictionEvent.status == "open", PredictionEvent.reminded.is_(False),
            PredictionEvent.deadline_ms > now, PredictionEvent.deadline_ms <= now + window))).scalars().all()
        jobs = []
        for e in events:
            e.reminded = True
            voted = select(PredictionVote.user_id).where(PredictionVote.event_id == e.id)
            ids = (await s.execute(select(User.id).where(User.bot_started, User.notify_predictions,
                                                         User.id.not_in(voted)))).scalars().all()
            jobs.append((list(ids), tenant.bot.remind_text.format(question=e.question)))
        await s.commit()
    for ids, text in jobs:
        n = await send_many(app, ids, text + "\n\nОтписаться: /stop")
        log.info("prediction reminder sent to %d players", n)


async def announce_daily(app: FastAPI, now: int) -> None:
    tenant = app.state.tenant
    hour = tenant.daily.announce_hour
    if hour is None or local_hour(now, tenant.timezone) < hour:
        return
    key = f"daily:{game_day(now, tenant.timezone).isoformat()}"
    async with app.state.db.sessions() as s:
        if await s.get(JobRun, key) is not None:
            return
        s.add(JobRun(key=key, ms=now))
        try:
            await s.commit()
        except IntegrityError:
            return
        ids = (await s.execute(select(User.id).where(User.bot_started, User.notify_daily))).scalars().all()
    n = await send_many(app, list(ids), tenant.bot.daily_text + "\n\nОтписаться: /stop")
    log.info("daily announcement sent to %d players", n)


async def cleanup(app: FastAPI, now: int) -> None:
    async with app.state.db.sessions() as s:
        await s.execute(delete(ShareCard).where(ShareCard.created_ms < now - CARD_TTL_MS))
        await s.commit()


async def seed_events(app: FastAPI) -> None:
    """Demo prediction events from content/events.json, only into an empty table."""
    content, tenant = app.state.content, app.state.tenant
    if not content.events:
        return
    async with app.state.db.sessions() as s:
        if (await s.execute(select(PredictionEvent.id).limit(1))).first() is not None:
            return
        now = now_ms()
        for e in content.events:
            s.add(PredictionEvent(question=e.question, options=e.options, tag=e.tag,
                                  season=e.season or tenant.predictions.current_season,
                                  deadline_ms=now + e.deadline_hours * 3600 * 1000, created_ms=now,
                                  base_points=tenant.predictions.base_points, status="open"))
        await s.commit()


async def loop(app: FastAPI, with_bot: bool) -> None:
    with contextlib.suppress(Exception):
        await seed_events(app)
    while True:
        now = now_ms()
        tasks = [cleanup] + ([remind_predictions, announce_daily] if with_bot else [])
        for job in tasks:
            try:
                await job(app, now)
            except Exception:  # noqa: BLE001 — one failing job must not stop the others
                log.exception("job %s failed", job.__name__)
        await asyncio.sleep(60)
