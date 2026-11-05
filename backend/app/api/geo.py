"""World map (spoiler-filtered) and the 'Where is it?' game."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..content import Content
from ..game import geo as G
from ..models import GeoSession, User
from ..services import points as P
from ..services.analytics import track
from ..services.users import now_ms
from ..tenant import Tenant
from .deps import ContentDep, Player, Session, TenantDep, today

router = APIRouter(prefix="/api")


def level_for(u: User, tenant: Tenant, level: int | None) -> int:
    lv = level or u.spoiler_level or tenant.max_spoiler
    return max(1, min(lv, tenant.max_spoiler))


@router.get("/map")
async def world_map(u: Player, s: Session, content: ContentDep, tenant: TenantDep, level: int | None = None) -> dict:
    lv = level_for(u, tenant, level)
    locs = [x for x in content.locations.values() if x.spoiler <= lv]
    visible = {x.id for x in locs}
    paths = []
    for p in content.paths.values():
        stops = [st for st in p.stops if st.spoiler <= lv and st.location in visible]
        if len(stops) >= 2 and p.character in content.characters:
            paths.append({"character": p.character, "name": content.characters[p.character].name,
                          "stops": [{"location": st.location, "note": st.note} for st in stops]})
    await s.commit()
    return {
        "level": lv,
        "map": content.map.model_dump(),
        "locations": [{
            "id": x.id, "name": x.name, "x": x.x, "y": x.y, "kind": x.kind, "region": x.region, "rank": x.rank,
            "description": x.description,
            "houses": [{"id": h, "name": content.house_name(h)} for h in x.houses],
            "characters": [{"id": c, "name": content.characters[c].name} for c in x.characters],
        } for x in locs],
        "paths": sorted(paths, key=lambda p: p["name"]),
    }


def clue_out(content: Content, clue_id: str) -> dict:
    c = content.clues[clue_id]
    out = {"kind": c.kind, "text": c.text, "crest": None}
    if c.house and c.house in content.houses:
        out["crest"] = content.houses[c.house].crest.model_dump()
    return out


def session_out(content: Content, tenant: Tenant, g: GeoSession) -> dict:
    rnd = len(g.guesses)
    return {
        "id": g.id, "mode": g.mode, "day": g.day, "round": rnd, "rounds": len(g.clue_ids),
        "max_score": tenant.geo.max_score, "total": g.total, "finished": g.finished,
        "clue": None if g.finished else clue_out(content, g.clue_ids[rnd]),
        "results": g.guesses,
    }


class StartIn(BaseModel):
    mode: Literal["practice", "daily"] = "practice"


async def _daily(s: AsyncSession, user_id: int, day: str) -> GeoSession | None:
    return (await s.execute(select(GeoSession).where(GeoSession.user_id == user_id, GeoSession.mode == "daily",
                                                     GeoSession.day == day))).scalar_one_or_none()


@router.post("/geo/start")
async def start(body: StartIn, request: Request, u: Player, s: Session, content: ContentDep,
                tenant: TenantDep) -> dict:
    day = today(request).isoformat()
    now = now_ms()
    if body.mode == "daily":
        g = await _daily(s, u.id, day)
        if g is None:
            pool = [c.id for c in content.clues.values() if c.spoiler <= tenant.geo.daily_max_spoiler]
            g = GeoSession(user_id=u.id, mode="daily", day=day, guesses=[], created_ms=now,
                           clue_ids=G.pick_clues(pool, tenant.geo.rounds, f"{tenant.daily.seed}:geo:{day}"))
            try:
                async with s.begin_nested():
                    s.add(g)
                    await s.flush()
            except IntegrityError:
                g = await _daily(s, u.id, day)
                assert g is not None
    else:
        lv = level_for(u, tenant, None)
        pool = [c.id for c in content.clues.values() if c.spoiler <= lv]
        if not pool:
            raise HTTPException(409, "no_clues")
        g = GeoSession(user_id=u.id, mode="practice", day=None, guesses=[], created_ms=now,
                       clue_ids=G.pick_clues(pool, tenant.geo.rounds, f"{u.id}:{now}"))
        s.add(g)
        await s.flush()
    out = session_out(content, tenant, g)
    await s.commit()
    return out


class GuessIn(BaseModel):
    x: float
    y: float


@router.post("/geo/{session_id}/guess")
async def guess(session_id: int, body: GuessIn, request: Request, u: Player, s: Session, content: ContentDep,
                tenant: TenantDep) -> dict:
    g = (await s.execute(select(GeoSession).where(GeoSession.id == session_id).with_for_update())).scalar_one_or_none()
    if g is None or g.user_id != u.id:
        raise HTTPException(404, "not_found")
    if g.finished:
        raise HTTPException(409, "finished")
    clue = content.clues.get(g.clue_ids[len(g.guesses)])
    loc = content.locations.get(clue.location) if clue else None
    if loc is None:
        raise HTTPException(409, "clue_missing")
    d = G.distance(body.x, body.y, loc.x, loc.y)
    sc = G.score(d, tenant.geo.max_score, tenant.geo.scale, tenant.geo.perfect_radius)
    result = {"x": body.x, "y": body.y, "score": sc, "distance": round(d, 1),
              "answer": {"id": loc.id, "name": loc.name, "x": loc.x, "y": loc.y}}
    g.guesses = [*g.guesses, result]
    g.total += sc
    now = now_ms()
    if len(g.guesses) >= len(g.clue_ids):
        g.finished = True
        await track(s, u.id, "geo_done", today(request).isoformat(), now, g.mode)
        if g.mode == "daily" and g.day:
            await P.award(s, u.id, "geo_daily", g.day, g.total // 10, now, tenant.predictions.current_season)
    out = session_out(content, tenant, g) | {"last": result}
    await s.commit()
    return out


@router.get("/geo/daily")
async def daily_status(request: Request, u: Player, s: Session, content: ContentDep, tenant: TenantDep) -> dict:
    day = today(request).isoformat()
    g = await _daily(s, u.id, day)
    rows = (await s.execute(select(GeoSession.user_id, GeoSession.total, User.first_name, User.photo_url, User.house)
                            .join(User, User.id == GeoSession.user_id)
                            .where(GeoSession.mode == "daily", GeoSession.day == day, GeoSession.finished)
                            .order_by(GeoSession.total.desc(), GeoSession.id).limit(50))).all()
    top = [{"rank": i, "id": r.user_id, "name": r.first_name or "Игрок", "photo_url": r.photo_url,
            "house": r.house, "points": r.total, "me": r.user_id == u.id} for i, r in enumerate(rows, start=1)]
    out = {"day": day, "session": session_out(content, tenant, g) if g else None, "top": top}
    await s.commit()
    return out


@router.get("/geo/{session_id}/share")
async def geo_share(session_id: int, u: Player, s: Session, tenant: TenantDep) -> dict:
    g = await s.get(GeoSession, session_id)
    if g is None or g.user_id != u.id or not g.finished:
        raise HTTPException(409, "not_finished")
    grid = "".join(G.emoji(r["score"], tenant.geo.max_score) for r in g.guesses)
    title = f"{tenant.app_name} · Где это?" + (" (день)" if g.mode == "daily" else "")
    await s.commit()
    return {"text": f"{title} — {g.total}/{tenant.geo.max_score * len(g.clue_ids)}\n{grid}"}
