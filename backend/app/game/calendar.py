"""Game calendar: a day, week and period boundaries in the tenant time zone. Pure functions."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo


def game_day(now_ms: int, tz: str) -> date:
    return datetime.fromtimestamp(now_ms / 1000, ZoneInfo(tz)).date()


def day_start_ms(d: date, tz: str) -> int:
    return int(datetime.combine(d, time.min, ZoneInfo(tz)).timestamp() * 1000)


def next_day_ms(now_ms: int, tz: str) -> int:
    return day_start_ms(game_day(now_ms, tz) + timedelta(days=1), tz)


def week_start(d: date) -> date:
    """Monday of the week."""
    return d - timedelta(days=d.weekday())


def local_hour(now_ms: int, tz: str) -> int:
    return datetime.fromtimestamp(now_ms / 1000, ZoneInfo(tz)).hour


def day_number(d: date, epoch: date) -> int:
    """1-based number of the daily puzzle ("#42")."""
    return (d - epoch).days + 1
