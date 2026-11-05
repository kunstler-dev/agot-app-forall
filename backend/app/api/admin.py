"""Admin panel inside the Mini App (ADMIN_IDS): prediction events, content edits, product stats."""

from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import func, select

from ..content import Content, ContentError
from ..game.calendar import day_start_ms
from ..models import (ActivityDay, AnalyticsEvent, ContentOverride, DailyPlay, PredictionEvent, PredictionVote,
                      QuizResult, User)
from ..services import content as content_svc
from ..services import subscriptions
from ..services.users import now_ms
from .deps import AdminTg, ContentDep, Session, TenantDep, today
from .predictions import counts, event_out, resolve

router = APIRouter(prefix="/api/admin")


# ---------------- status and stats ----------------


@router.get("/status")
async def status(request: Request, admin: AdminTg, tenant: TenantDep) -> dict:
    return {
        "channel": tenant.channel,
        "bot_running": getattr(request.app.state, "bot", None) is not None,
        "bot_username": getattr(request.app.state, "bot_username", None),
        "bot_is_admin": await subscriptions.bot_is_channel_admin(request.app),
        "gate_problem": getattr(request.app.state, "gate_problem", None),
        "dev_auth": request.app.state.settings.dev_auth,
    }


@router.get("/stats")
async def stats(request: Request, admin: AdminTg, s: Session, tenant: TenantDep, days: int = 14) -> dict:
    days = max(1, min(days, 90))
    end = today(request)
    labels = [(end - timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]
    first = labels[0]

    async def by_day(q) -> dict[str, int]:
        return {d: int(n) for d, n in (await s.execute(q)).all()}

    dau = await by_day(select(ActivityDay.day, func.count()).where(ActivityDay.day >= first)
                       .group_by(ActivityDay.day))
    plays = await by_day(select(DailyPlay.day, func.count()).where(DailyPlay.day >= first, DailyPlay.mode == "character")
                         .group_by(DailyPlay.day))
    solved = await by_day(select(DailyPlay.day, func.count()).where(DailyPlay.day >= first, DailyPlay.solved,
                                                                    DailyPlay.mode == "character")
                          .group_by(DailyPlay.day))
    shares = await by_day(select(AnalyticsEvent.day, func.count()).where(AnalyticsEvent.day >= first,
                                                                         AnalyticsEvent.kind.like("share_%"))
                          .group_by(AnalyticsEvent.day))
    # new players: created_ms bucketed by game day
    start_ms = day_start_ms(end - timedelta(days=days - 1), tenant.timezone)
    new_rows = (await s.execute(select(User.created_ms).where(User.created_ms >= start_ms))).scalars().all()
    from ..game.calendar import game_day
    new: dict[str, int] = {}
    for ms in new_rows:
        d = game_day(ms, tenant.timezone).isoformat()
        new[d] = new.get(d, 0) + 1
    share_kinds = {k: int(n) for k, n in (await s.execute(
        select(AnalyticsEvent.kind, func.count()).where(AnalyticsEvent.kind.like("share_%"))
        .group_by(AnalyticsEvent.kind))).all()}
    houses = {h: int(n) for h, n in (await s.execute(select(QuizResult.house, func.count())
                                                     .group_by(QuizResult.house))).all()}
    totals = {
        "players": (await s.execute(select(func.count()).select_from(User))).scalar_one(),
        "quiz_done": sum(houses.values()),
        "votes": (await s.execute(select(func.count()).select_from(PredictionVote))).scalar_one(),
        "shares": sum(share_kinds.values()),
        "notify_daily": (await s.execute(select(func.count()).select_from(User)
                                         .where(User.notify_daily, User.bot_started))).scalar_one(),
    }
    await s.commit()
    return {
        "days": [{"day": d, "dau": dau.get(d, 0), "new": new.get(d, 0), "daily_played": plays.get(d, 0),
                  "daily_solved": solved.get(d, 0), "shares": shares.get(d, 0)} for d in labels],
        "totals": totals,
        "share_kinds": share_kinds,
        "houses": houses,
    }


# ---------------- prediction events ----------------


class EventIn(BaseModel):
    question: str = Field(min_length=3, max_length=300)
    options: list[str] = Field(min_length=2, max_length=8)
    deadline_ms: int
    tag: str = Field("", max_length=64)
    season: str | None = None
    base_points: int = Field(100, ge=1, le=10000)


@router.get("/events")
async def list_events(admin: AdminTg, s: Session, tenant: TenantDep) -> list[dict]:
    now = now_ms()
    events = (await s.execute(select(PredictionEvent).order_by(PredictionEvent.id.desc()))).scalars().all()
    out = [event_out(e, None, await counts(s, e.id), now, tenant, admin=True) for e in events]
    await s.commit()
    return out


@router.post("/events")
async def create_event(body: EventIn, admin: AdminTg, s: Session, tenant: TenantDep) -> dict:
    opts = [o.strip() for o in body.options if o.strip()]
    if len(opts) < 2:
        raise HTTPException(422, "need_two_options")
    now = now_ms()
    if body.deadline_ms <= now:
        raise HTTPException(422, "deadline_in_past")
    e = PredictionEvent(question=body.question.strip(), options=opts, deadline_ms=body.deadline_ms, tag=body.tag,
                        season=body.season or tenant.predictions.current_season, base_points=body.base_points,
                        created_ms=now, status="open")
    s.add(e)
    await s.flush()
    out = event_out(e, None, {}, now, tenant, admin=True)
    await s.commit()
    return out


async def _event(s, event_id: int) -> PredictionEvent:
    e = (await s.execute(select(PredictionEvent).where(PredictionEvent.id == event_id).with_for_update())) \
        .scalar_one_or_none()
    if e is None:
        raise HTTPException(404, "not_found")
    return e


@router.post("/events/{event_id}/close")
async def close_event(event_id: int, admin: AdminTg, s: Session, tenant: TenantDep) -> dict:
    e = await _event(s, event_id)
    now = now_ms()
    if e.status == "open" and e.deadline_ms > now:
        e.deadline_ms = now
    out = event_out(e, None, await counts(s, e.id), now, tenant, admin=True)
    await s.commit()
    return out


class ResolveIn(BaseModel):
    correct: int


@router.post("/events/{event_id}/resolve")
async def resolve_event(event_id: int, body: ResolveIn, admin: AdminTg, s: Session, tenant: TenantDep) -> dict:
    e = await _event(s, event_id)
    if e.status == "cancelled":
        raise HTTPException(409, "cancelled")
    now = now_ms()
    result = await resolve(s, e, body.correct, tenant, now)
    out = event_out(e, None, await counts(s, e.id), now, tenant, admin=True) | {"payout": result}
    await s.commit()
    return out


@router.post("/events/{event_id}/cancel")
async def cancel_event(event_id: int, admin: AdminTg, s: Session, tenant: TenantDep) -> dict:
    e = await _event(s, event_id)
    if e.status == "resolved":
        raise HTTPException(409, "already_resolved")
    e.status = "cancelled"
    out = event_out(e, None, await counts(s, e.id), now_ms(), tenant, admin=True)
    await s.commit()
    return out


# ---------------- content ----------------


def _kind(kind: str) -> str:
    if kind not in Content.EDITABLE:
        raise HTTPException(404, "unknown_kind")
    return kind


@router.get("/content/{kind}")
async def list_content(kind: str, admin: AdminTg, s: Session, content: ContentDep) -> dict:
    _kind(kind)
    edited = set((await s.execute(select(ContentOverride.item_id).where(ContentOverride.kind == kind))).scalars())
    await s.commit()
    items = [it.model_dump(mode="json") | {"_edited": it.id in edited} for it in content.items(kind).values()]
    return {"kind": kind, "items": sorted(items, key=lambda x: x.get("name", x["id"]))}


@router.put("/content/{kind}/{item_id}")
async def edit_content(kind: str, item_id: str, data: dict, request: Request, admin: AdminTg, s: Session) -> dict:
    _kind(kind)
    data = {k: v for k, v in data.items() if not k.startswith("_")} | {"id": item_id}
    try:
        item = Content.model_for(kind).model_validate(data)
    except ValidationError as e:
        raise HTTPException(422, e.errors(include_url=False, include_context=False)) from None
    # validate the whole content with this edit (cross references) before storing it
    current = await content_svc.overrides(s)
    current.setdefault(kind, {})[item_id] = item.model_dump(mode="json")
    try:
        Content.load(request.app.state.settings.content_dir, current)
    except ContentError as e:
        raise HTTPException(422, str(e)) from None
    row = await s.get(ContentOverride, (kind, item_id))
    if row is None:
        row = ContentOverride(kind=kind, item_id=item_id)
        s.add(row)
    row.data, row.updated_ms, row.updated_by = item.model_dump(mode="json"), now_ms(), admin.id
    await s.flush()
    await content_svc.reload(request.app, s)
    await s.commit()
    return {"ok": True, "item": item.model_dump(mode="json")}


@router.delete("/content/{kind}/{item_id}")
async def revert_content(kind: str, item_id: str, request: Request, admin: AdminTg, s: Session) -> dict:
    _kind(kind)
    row = await s.get(ContentOverride, (kind, item_id))
    if row is not None:
        await s.delete(row)
        await s.flush()
        try:
            await content_svc.reload(request.app, s)
        except ContentError as e:
            await s.rollback()
            raise HTTPException(422, str(e)) from None
    await s.commit()
    return {"ok": True}
