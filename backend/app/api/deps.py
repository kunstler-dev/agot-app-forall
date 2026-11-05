from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import date
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import Settings
from ..content import Content
from ..game.calendar import game_day
from ..models import User
from ..services import subscriptions
from ..services.users import get_or_create, mark_active, now_ms
from ..telegram_auth import AuthError, TgUser, validate_init_data
from ..tenant import Tenant


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_tenant(request: Request) -> Tenant:
    return request.app.state.tenant


def get_content(request: Request) -> Content:
    return request.app.state.content


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    async with request.app.state.db.sessions() as s:
        yield s


def get_tg_user(
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header()] = None,
) -> TgUser:
    """`Authorization: tma <initData>`; locally with DEV_AUTH=1: `tma dev:<id>`."""
    if not authorization or not authorization.startswith("tma "):
        raise HTTPException(401, "auth required")
    raw = authorization[4:]
    if settings.dev_auth and raw.startswith("dev:"):
        parts = raw.split(":")
        if not parts[1].isdigit():
            raise HTTPException(401, "bad dev auth")
        return TgUser(id=int(parts[1]), first_name=f"Игрок {parts[1]}", username=f"dev{parts[1]}",
                      start_param=parts[2] if len(parts) > 2 else None)
    try:
        return validate_init_data(raw, settings.bot_token, settings.init_data_max_age)
    except AuthError as e:
        raise HTTPException(401, str(e)) from e


def get_admin(settings: Annotated[Settings, Depends(get_settings)],
              tg: Annotated[TgUser, Depends(get_tg_user)]) -> TgUser:
    if tg.id not in settings.admin_id_set:
        raise HTTPException(403, "admin_only")
    return tg


Session = Annotated[AsyncSession, Depends(get_session)]
CurrentTg = Annotated[TgUser, Depends(get_tg_user)]
AdminTg = Annotated[TgUser, Depends(get_admin)]
TenantDep = Annotated[Tenant, Depends(get_tenant)]
ContentDep = Annotated[Content, Depends(get_content)]


def today(request: Request) -> date:
    return game_day(now_ms(), request.app.state.tenant.timezone)


async def get_player(request: Request, tg: CurrentTg, s: Session) -> User:
    """The current player (row-locked), only if they pass the subscription gate."""
    u = await get_or_create(s, tg)
    if not await subscriptions.refresh(request.app, u, now_ms()):
        await s.commit()
        raise HTTPException(403, "subscription_required")
    await mark_active(s, u.id, today(request).isoformat())
    return u


Player = Annotated[User, Depends(get_player)]
