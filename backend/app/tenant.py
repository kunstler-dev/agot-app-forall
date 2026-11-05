"""Tenant config: everything that makes one deployment different from another (channel, names, texts, colors).

A tenant is one fandom channel. The file is plain JSON, validated on startup, so a typo fails fast
instead of breaking a screen in production.
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from pydantic import BaseModel, Field, field_validator

from .config import Settings


class Link(BaseModel):
    label: str
    url: str


class Theme(BaseModel):
    # Defaults are the engine's sealing wax and gilt; a tenant may tint the two accents
    accent: str = "#B8322A"
    accent2: str = "#C9A24A"


class SpoilerLevel(BaseModel):
    level: int = Field(ge=1)
    label: str
    hint: str = ""


class DailyCfg(BaseModel):
    # Schedule seed and the first game day ("Character of the day #1")
    seed: str = "stella-nova"
    epoch: date = date(2026, 1, 1)
    max_attempts: int = 8
    hint_quote_after: int = 4
    hint_crest_after: int = 6
    crest_attempts: int = 6
    # Leaderboard points for a solved daily: points_base - attempts_used * points_step
    points_base: int = 90
    points_step: int = 10
    # Hour (game time zone) when the bot announces a new daily; None disables the broadcast
    announce_hour: int | None = 10


class PredictionsCfg(BaseModel):
    current_season: str = "s1"
    season_label: str = "Сезон 1"
    base_points: int = 100
    bold_threshold: float = 0.2
    bold_multiplier: float = 2.0
    remind_before_min: int = 60


class GeoCfg(BaseModel):
    rounds: int = 5
    max_score: int = 1000
    # Distance (map units) at which a guess still earns ~37% of max_score
    scale: float = 120.0
    # Guesses closer than this get the full score
    perfect_radius: float = 12.0
    # Daily round uses only clues up to this spoiler level (it is the same for everyone)
    daily_max_spoiler: int = 1
    # Distances are shown in leagues: map units × this factor
    leagues_per_unit: float = 1.0


class BotCfg(BaseModel):
    start_text: str = "Добро пожаловать! Жми кнопку, чтобы открыть приложение."
    button: str = "Открыть"
    daily_text: str = "Новый персонаж дня уже ждёт. Угадаешь с первой попытки?"
    remind_text: str = "Через час закрывается прогноз: «{question}». Успей проголосовать!"


class Tenant(BaseModel):
    id: str
    app_name: str = "Цитадель"
    app_tagline: str = ""
    welcome: str = ""
    channel: str = ""  # @username of the required channel; empty disables the gate
    channel_url: str = ""
    channel_title: str = ""
    channel_about: str = ""
    timezone: str = "Europe/Moscow"
    author_links: list[Link] = []
    theme: Theme = Theme()
    # Overrides for frontend strings, keyed like the engine's default text table
    texts: dict[str, str] = {}
    bot: BotCfg = BotCfg()
    spoiler_levels: list[SpoilerLevel]
    daily: DailyCfg = DailyCfg()
    predictions: PredictionsCfg = PredictionsCfg()
    geo: GeoCfg = GeoCfg()
    # Link that shares open, e.g. https://t.me/<bot>/<app>; empty = https://t.me/<bot>?startapp=share
    app_link: str = ""
    disclaimer: str = ""

    @field_validator("spoiler_levels")
    @classmethod
    def _ordered(cls, v: list[SpoilerLevel]) -> list[SpoilerLevel]:
        levels = [x.level for x in v]
        if not v or levels != sorted(set(levels)):
            raise ValueError("spoiler_levels must be non-empty and strictly increasing")
        return v

    @property
    def max_spoiler(self) -> int:
        return self.spoiler_levels[-1].level

    def public(self) -> dict:
        """Fields the Mini App may see (all of them are already public in the channel)."""
        return self.model_dump(mode="json", exclude={"bot", "daily"}) | {
            "daily": {k: getattr(self.daily, k) for k in
                      ("max_attempts", "hint_quote_after", "hint_crest_after", "crest_attempts")},
        }


def load_tenant(settings: Settings) -> Tenant:
    raw = json.loads(Path(settings.tenant_file).read_text(encoding="utf-8"))
    t = Tenant.model_validate(raw)
    # deployment env wins over the file for the channel and the clock
    if settings.required_channel is not None:
        t.channel = settings.required_channel
    if settings.channel_url is not None:
        t.channel_url = settings.channel_url
    if settings.timezone:
        t.timezone = settings.timezone
    if t.channel and not t.channel_url:
        t.channel_url = f"https://t.me/{t.channel.lstrip('@')}"
    return t
