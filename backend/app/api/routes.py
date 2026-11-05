"""Session, config, profile and settings."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from ..game.calendar import day_start_ms, week_start
from ..models import DailyStats, PointAward, QuizResult, User
from ..services import subscriptions
from ..services.users import get_or_create, mark_active, now_ms
from .daily import stats_out
from .deps import ContentDep, CurrentTg, Player, Session, TenantDep, today
from .top import rank_of

router = APIRouter(prefix="/api")


@router.get("/health")
async def health() -> dict:
    return {"ok": True}


def share_link(request: Request) -> str | None:
    tenant = request.app.state.tenant
    if tenant.app_link:
        return tenant.app_link
    bot = getattr(request.app.state, "bot_username", None)
    return f"https://t.me/{bot}?startapp=share" if bot else None


@router.get("/config")
async def config(request: Request, tenant: TenantDep, content: ContentDep) -> dict:
    """Public tenant config and reference data the screens need (no answers, no attributes)."""
    return {
        "tenant": tenant.public(),
        "share_link": share_link(request),
        "attributes": [a.model_dump(include={"key", "label", "type"}) for a in content.attributes],
        "houses": [{"id": h.id, "name": h.name, "words": h.words, "region": h.region, "seat": h.seat,
                    "great": h.great, "crest": h.crest.model_dump()}
                   for h in sorted(content.houses.values(), key=lambda h: (not h.great, h.name))],
        "map": content.map.model_dump(),
    }


@router.get("/content/map.svg", include_in_schema=False)
async def map_svg(content: ContentDep) -> Response:
    f = (content.directory / content.map.file).resolve()
    return Response(f.read_bytes(), media_type="image/svg+xml",
                    headers={"Cache-Control": "public, max-age=3600"})


def user_out(request: Request, u: User) -> dict:
    return {"id": u.id, "first_name": u.first_name, "username": u.username, "photo_url": u.photo_url,
            "is_admin": u.id in request.app.state.settings.admin_id_set, "house": u.house,
            "points": u.points, "spoiler_level": u.spoiler_level, "notify_daily": u.notify_daily,
            "notify_predictions": u.notify_predictions}


@router.get("/me")
async def me(request: Request, tg: CurrentTg, s: Session, tenant: TenantDep) -> dict:
    u = await get_or_create(s, tg)
    ok = await subscriptions.refresh(request.app, u, now_ms())
    if ok:
        await mark_active(s, u.id, today(request).isoformat())
    await s.commit()
    return {
        "user": user_out(request, u),
        "subscription": {"channel": tenant.channel, "url": tenant.channel_url, "title": tenant.channel_title,
                         "ok": ok},
        "server_ms": now_ms(),
    }


@router.post("/subscription/check")
async def check_subscription(request: Request, tg: CurrentTg, s: Session) -> dict:
    """"I've subscribed" button: ask Telegram right now, bypassing the 10-minute cache."""
    u = await get_or_create(s, tg)
    ok = await subscriptions.refresh(request.app, u, now_ms(), force=True)
    await s.commit()
    return {"ok": ok}


class SettingsIn(BaseModel):
    spoiler_level: int | None = Field(None, ge=1)
    notify_daily: bool | None = None
    notify_predictions: bool | None = None


@router.post("/me/settings")
async def update_settings(body: SettingsIn, request: Request, u: Player, s: Session, tenant: TenantDep) -> dict:
    if body.spoiler_level is not None:
        if body.spoiler_level > tenant.max_spoiler:
            raise HTTPException(422, "bad_spoiler_level")
        u.spoiler_level = body.spoiler_level
    if body.notify_daily is not None:
        u.notify_daily = body.notify_daily
    if body.notify_predictions is not None:
        u.notify_predictions = body.notify_predictions
    out = user_out(request, u)
    await s.commit()
    return out


@router.get("/profile")
async def profile(request: Request, u: Player, s: Session, tenant: TenantDep) -> dict:
    day = today(request)
    stats = {m: stats_out(await s.get(DailyStats, (u.id, m)), day) for m in ("character", "crest")}
    quiz = await s.get(QuizResult, u.id)
    week_ms = day_start_ms(week_start(day), tenant.timezone)
    preds = (await s.execute(select(func.count()).select_from(PointAward).where(
        PointAward.user_id == u.id, PointAward.source == "prediction"))).scalar_one()
    out = {
        "user": user_out(request, u),
        "since_ms": u.created_ms,
        "daily": stats,
        "quiz": {"house": quiz.house, "scores": quiz.scores.get("ranking", [])[:4]} if quiz else None,
        "ranks": {
            "all": await rank_of(s, u.id, "all", None, None),
            "season": await rank_of(s, u.id, "all", tenant.predictions.current_season, None),
            "week": await rank_of(s, u.id, "all", None, week_ms),
        },
        "predictions_won": preds,
    }
    await s.commit()
    return out
