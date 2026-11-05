"""Database tables. All timestamps are Unix milliseconds (`*_ms`); game days are ISO dates in the tenant time zone."""

from __future__ import annotations

from sqlalchemy import JSON, BigInteger, Boolean, ForeignKey, Integer, LargeBinary, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=False)  # Telegram id
    first_name: Mapped[str] = mapped_column(String(128), default="")
    username: Mapped[str | None] = mapped_column(String(64))
    photo_url: Mapped[str | None] = mapped_column(String(512))
    language: Mapped[str | None] = mapped_column(String(16))
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False)
    created_ms: Mapped[int] = mapped_column(BigInteger, default=0)
    seen_ms: Mapped[int] = mapped_column(BigInteger, default=0)
    # subscription gate cache (see services/subscriptions.py)
    sub_ok: Mapped[bool] = mapped_column(Boolean, default=False)
    sub_checked_ms: Mapped[int] = mapped_column(BigInteger, default=0)
    # result of the house quiz
    house: Mapped[str | None] = mapped_column(String(64), index=True)
    # sum of point_awards, kept in sync under a row lock
    points: Mapped[int] = mapped_column(Integer, default=0)
    spoiler_level: Mapped[int | None] = mapped_column(Integer)
    notify_daily: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_predictions: Mapped[bool] = mapped_column(Boolean, default=True)
    # the bot may write to the user (they pressed /start); without it Telegram rejects messages
    bot_started: Mapped[bool] = mapped_column(Boolean, default=False)
    # an admin removed the right to write in the chat
    chat_banned: Mapped[bool] = mapped_column(Boolean, default=False)


class ActivityDay(Base):
    """One row per player per game day: DAU and retention."""

    __tablename__ = "activity_days"

    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    day: Mapped[str] = mapped_column(String(10), primary_key=True)


class DailyPuzzle(Base):
    """The answer of a game day, fixed on first request so later content edits don't change past days."""

    __tablename__ = "daily_puzzles"

    day: Mapped[str] = mapped_column(String(10), primary_key=True)
    mode: Mapped[str] = mapped_column(String(16), primary_key=True)  # character | crest
    answer: Mapped[str] = mapped_column(String(64))


class DailyPlay(Base):
    __tablename__ = "daily_plays"
    __table_args__ = (UniqueConstraint("user_id", "day", "mode"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    day: Mapped[str] = mapped_column(String(10), index=True)
    mode: Mapped[str] = mapped_column(String(16))
    guesses: Mapped[list] = mapped_column(JSON, default=list)
    solved: Mapped[bool] = mapped_column(Boolean, default=False)
    finished: Mapped[bool] = mapped_column(Boolean, default=False)
    created_ms: Mapped[int] = mapped_column(BigInteger, default=0)
    finished_ms: Mapped[int | None] = mapped_column(BigInteger)


class DailyStats(Base):
    """Streak and attempt distribution per player and mode."""

    __tablename__ = "daily_stats"

    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    mode: Mapped[str] = mapped_column(String(16), primary_key=True)
    played: Mapped[int] = mapped_column(Integer, default=0)
    won: Mapped[int] = mapped_column(Integer, default=0)
    streak: Mapped[int] = mapped_column(Integer, default=0)
    best_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_won_day: Mapped[str | None] = mapped_column(String(10))
    # {"1": 3, "2": 5, ...}: wins by number of attempts
    dist: Mapped[dict] = mapped_column(JSON, default=dict)


class QuizResult(Base):
    __tablename__ = "quiz_results"

    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    house: Mapped[str] = mapped_column(String(64))
    scores: Mapped[dict] = mapped_column(JSON, default=dict)
    answers: Mapped[list] = mapped_column(JSON, default=list)
    created_ms: Mapped[int] = mapped_column(BigInteger, default=0)
    updated_ms: Mapped[int] = mapped_column(BigInteger, default=0)


class PredictionEvent(Base):
    __tablename__ = "prediction_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question: Mapped[str] = mapped_column(Text)
    options: Mapped[list] = mapped_column(JSON)  # list of option texts; votes reference the index
    deadline_ms: Mapped[int] = mapped_column(BigInteger, index=True)
    tag: Mapped[str] = mapped_column(String(64), default="")
    season: Mapped[str] = mapped_column(String(32), default="")
    status: Mapped[str] = mapped_column(String(16), default="open")  # open | resolved | cancelled
    correct: Mapped[int | None] = mapped_column(Integer)
    base_points: Mapped[int] = mapped_column(Integer, default=100)
    created_ms: Mapped[int] = mapped_column(BigInteger, default=0)
    resolved_ms: Mapped[int | None] = mapped_column(BigInteger)
    reminded: Mapped[bool] = mapped_column(Boolean, default=False)


class PredictionVote(Base):
    __tablename__ = "prediction_votes"
    __table_args__ = (UniqueConstraint("event_id", "user_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("prediction_events.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    option: Mapped[int] = mapped_column(Integer)
    created_ms: Mapped[int] = mapped_column(BigInteger, default=0)


class PointAward(Base):
    """Every point a player gets. (source, ref, user) is unique, so a retry never pays twice."""

    __tablename__ = "point_awards"
    __table_args__ = (UniqueConstraint("source", "ref", "user_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    source: Mapped[str] = mapped_column(String(32))  # prediction | daily_character | daily_crest | geo_daily
    ref: Mapped[str] = mapped_column(String(64))
    season: Mapped[str] = mapped_column(String(32), default="", index=True)
    points: Mapped[int] = mapped_column(Integer)
    created_ms: Mapped[int] = mapped_column(BigInteger, index=True)


class GeoSession(Base):
    __tablename__ = "geo_sessions"
    __table_args__ = (UniqueConstraint("user_id", "mode", "day"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    mode: Mapped[str] = mapped_column(String(16))  # practice | daily
    day: Mapped[str | None] = mapped_column(String(10))  # daily only (NULLs don't collide in the constraint)
    clue_ids: Mapped[list] = mapped_column(JSON)
    guesses: Mapped[list] = mapped_column(JSON, default=list)
    total: Mapped[int] = mapped_column(Integer, default=0)
    finished: Mapped[bool] = mapped_column(Boolean, default=False)
    created_ms: Mapped[int] = mapped_column(BigInteger, default=0)


class ContentOverride(Base):
    """Admin edits of content items, applied over the JSON files on startup."""

    __tablename__ = "content_overrides"

    kind: Mapped[str] = mapped_column(String(32), primary_key=True)
    item_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON)
    updated_ms: Mapped[int] = mapped_column(BigInteger, default=0)
    updated_by: Mapped[int | None] = mapped_column(BigInteger)


class AnalyticsEvent(Base):
    """Product events for the admin stats (shares, quiz completions...)."""

    __tablename__ = "analytics_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(BigInteger, index=True)
    kind: Mapped[str] = mapped_column(String(32), index=True)
    day: Mapped[str] = mapped_column(String(10), index=True)
    ms: Mapped[int] = mapped_column(BigInteger)
    meta: Mapped[str] = mapped_column(String(64), default="")


class ChatMessage(Base):
    """The common chat of the channel's players."""

    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(Text)
    created_ms: Mapped[int] = mapped_column(BigInteger, index=True)
    deleted: Mapped[bool] = mapped_column(Boolean, default=False)


class JobRun(Base):
    """Idempotency key for broadcasts: one row per (job, period)."""

    __tablename__ = "job_runs"

    key: Mapped[str] = mapped_column(String(96), primary_key=True)
    ms: Mapped[int] = mapped_column(BigInteger)


class ShareCard(Base):
    """PNG result cards uploaded from the Mini App, so Telegram can show them in a shared message."""

    __tablename__ = "share_cards"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, index=True)
    png: Mapped[bytes] = mapped_column(LargeBinary)
    created_ms: Mapped[int] = mapped_column(BigInteger, index=True)


__all__ = ["User", "ActivityDay", "DailyPuzzle", "DailyPlay", "DailyStats", "QuizResult", "PredictionEvent",
           "PredictionVote", "PointAward", "GeoSession", "ContentOverride", "AnalyticsEvent", "JobRun",
           "ShareCard", "ChatMessage"]
