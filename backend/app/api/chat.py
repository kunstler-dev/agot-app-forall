"""The common chat: one room for every player of the channel. Polling, not websockets."""

from __future__ import annotations

import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select

from ..models import ChatMessage, User
from ..services.users import now_ms
from .deps import AdminTg, Player, Session, TenantDep

router = APIRouter(prefix="/api/chat")

LINK = re.compile(r"(https?://|t\.me/|@\w{4,})", re.I)


def message_out(m: ChatMessage, u: User, me_id: int) -> dict:
    return {"id": m.id, "text": m.text, "ms": m.created_ms, "me": u.id == me_id,
            "user": {"id": u.id, "name": u.first_name or u.username or "Игрок", "photo_url": u.photo_url,
                     "house": u.house}}


def _enabled(tenant) -> None:
    if not tenant.features.chat:
        raise HTTPException(404, "chat_disabled")


@router.get("")
async def history(u: Player, s: Session, tenant: TenantDep, after: int = 0) -> dict:
    """The last messages (or only those newer than `after`)."""
    _enabled(tenant)
    q = select(ChatMessage, User).join(User, User.id == ChatMessage.user_id).where(ChatMessage.deleted.is_(False))
    if after:
        q = q.where(ChatMessage.id > after).order_by(ChatMessage.id).limit(200)
        rows = (await s.execute(q)).all()
    else:
        rows = list(reversed((await s.execute(q.order_by(ChatMessage.id.desc()).limit(tenant.chat.history))).all()))
    out = {"messages": [message_out(m, a, u.id) for m, a in rows], "banned": u.chat_banned,
           "max_length": tenant.chat.max_length}
    await s.commit()
    return out


class SendIn(BaseModel):
    text: str


@router.post("")
async def send(body: SendIn, u: Player, s: Session, tenant: TenantDep) -> dict:
    _enabled(tenant)
    if u.chat_banned:
        raise HTTPException(403, "chat_banned")
    text = re.sub(r"\s+\n", "\n", body.text.strip())
    text = re.sub(r"\n{3,}", "\n\n", text)
    if not text:
        raise HTTPException(422, "empty")
    if len(text) > tenant.chat.max_length:
        raise HTTPException(422, "too_long")
    if LINK.search(text):
        raise HTTPException(422, "no_links")
    now = now_ms()
    last = (await s.execute(select(func.max(ChatMessage.created_ms)).where(ChatMessage.user_id == u.id))).scalar_one()
    if last and now - last < tenant.chat.cooldown_s * 1000:
        raise HTTPException(429, "too_fast")
    m = ChatMessage(user_id=u.id, text=text, created_ms=now)
    s.add(m)
    await s.flush()
    out = message_out(m, u, u.id)
    await s.commit()
    return out


@router.delete("/{message_id}")
async def delete(message_id: int, admin: AdminTg, s: Session) -> dict:
    m = await s.get(ChatMessage, message_id)
    if m is None:
        raise HTTPException(404)
    m.deleted = True
    await s.commit()
    return {"ok": True}


class BanIn(BaseModel):
    banned: bool = True


@router.post("/ban/{user_id}")
async def ban(user_id: int, body: BanIn, admin: AdminTg, s: Session) -> dict:
    u = await s.get(User, user_id)
    if u is None:
        raise HTTPException(404)
    u.chat_banned = body.banned
    if body.banned:  # hide what they wrote
        for m in (await s.execute(select(ChatMessage).where(ChatMessage.user_id == user_id))).scalars():
            m.deleted = True
    await s.commit()
    return {"ok": True, "banned": body.banned}
