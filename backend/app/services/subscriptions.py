"""Subscription gate: the app opens only for members of the tenant channel (Telegram getChatMember).

The bot must be an admin of the channel, otherwise Telegram does not return member status.
A Telegram outage or a misconfigured bot must not lock real subscribers out, so on any error
the gate lets the player in, logs the problem and shows it in the admin panel.
"""

from __future__ import annotations

import logging
import time

from fastapi import FastAPI

log = logging.getLogger("fandom.gate")

MEMBER = {"member", "administrator", "creator", "restricted"}
SUB_RECHECK_MS = 10 * 60 * 1000


class CheckUnavailable(Exception):
    """Telegram didn't answer or the bot can't see members: the result is unknown."""


def _problem(app: FastAPI, text: str) -> None:
    app.state.gate_problem = {"text": text, "ms": int(time.time() * 1000)}


async def check_member(app: FastAPI, channel: str, user_id: int) -> bool:
    custom = getattr(app.state, "sub_checker", None)
    if custom is not None:  # tests
        return await custom(channel, user_id)
    bot = getattr(app.state, "bot", None)
    if bot is None:
        if app.state.settings.dev_auth:  # local development without a bot: everyone is "subscribed"
            return True
        raise CheckUnavailable("bot is not running (BOT_TOKEN / BOT_MODE)")
    try:
        m = await bot.get_chat_member(channel, user_id)
    except Exception as e:  # noqa: BLE001
        raise CheckUnavailable(f"getChatMember({channel}) failed: {e}. "
                               f"Is the bot an admin of the channel?") from e
    return m.status in MEMBER


async def refresh(app: FastAPI, u, now_ms: int, force: bool = False) -> bool:
    """Whether the player may use the app. Telegram is asked at most every 10 minutes (or on a button press)."""
    channel = app.state.tenant.channel
    if not channel:
        return True
    if not force and u.sub_ok and now_ms - u.sub_checked_ms < SUB_RECHECK_MS:
        return True
    try:
        u.sub_ok = await check_member(app, channel, u.id)
    except CheckUnavailable as e:
        if not app.state.settings.dev_auth:
            log.error("subscription gate is failing open: %s", e)
        _problem(app, str(e))
        return True
    u.sub_checked_ms = now_ms
    app.state.gate_problem = None
    return bool(u.sub_ok)


async def bot_is_channel_admin(app: FastAPI) -> bool | None:
    """For the admin panel: None when it can't be determined (no bot / no channel)."""
    bot = getattr(app.state, "bot", None)
    channel = app.state.tenant.channel
    if bot is None or not channel:
        return None
    try:
        me = await bot.get_me()
        m = await bot.get_chat_member(channel, me.id)
    except Exception as e:  # noqa: BLE001
        _problem(app, f"bot can't read {channel}: {e}")
        return False
    return m.status in {"administrator", "creator"}
