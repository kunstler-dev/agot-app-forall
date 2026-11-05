"""Sharing results to Telegram chats: prepared inline messages (WebApp.shareMessage) with a link fallback."""

from __future__ import annotations

import base64
import binascii
import logging
import secrets
from typing import Literal
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field

from ..models import ShareCard
from ..services.analytics import track
from ..services.users import now_ms
from .deps import Player, Session, today
from .routes import share_link

log = logging.getLogger("fandom.share")
router = APIRouter(prefix="/api/share")

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
MAX_CARD_BYTES = 1_500_000


class CardIn(BaseModel):
    png_base64: str = Field(max_length=2_100_000)


@router.post("/card")
async def upload_card(body: CardIn, u: Player, s: Session) -> dict:
    try:
        data = base64.b64decode(body.png_base64.split(",")[-1], validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(422, "bad_png") from None
    if not data.startswith(PNG_MAGIC) or len(data) > MAX_CARD_BYTES:
        raise HTTPException(422, "bad_png")
    card = ShareCard(id=secrets.token_hex(12), user_id=u.id, png=data, created_ms=now_ms())
    s.add(card)
    await s.commit()
    return {"id": card.id}


@router.get("/card/{card_id}.png", include_in_schema=False)
async def get_card(card_id: str, request: Request) -> Response:
    async with request.app.state.db.sessions() as s:
        card = await s.get(ShareCard, card_id)
    if card is None:
        raise HTTPException(404)
    return Response(card.png, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})


class PrepareIn(BaseModel):
    kind: Literal["share_daily", "share_crest", "share_quiz", "share_geo"]
    text: str = Field(max_length=900)
    card_id: str | None = None


@router.post("/prepare")
async def prepare(body: PrepareIn, request: Request, u: Player, s: Session) -> dict:
    """Returns a prepared message id for WebApp.shareMessage, or a t.me/share link when there is no bot."""
    link = share_link(request) or request.app.state.tenant.channel_url
    text = f"{body.text}\n\n{link}" if link else body.text
    await track(s, u.id, body.kind, today(request).isoformat(), now_ms())
    await s.commit()
    fallback = f"https://t.me/share/url?url={quote(link or '')}&text={quote(body.text)}"
    bot = getattr(request.app.state, "bot", None)
    if bot is None:
        return {"prepared_id": None, "fallback_url": fallback, "text": text}
    from aiogram.types import (InlineKeyboardButton, InlineKeyboardMarkup, InlineQueryResultArticle,
                               InlineQueryResultPhoto, InputTextMessageContent)
    tenant = request.app.state.tenant
    kb = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text=f"Открыть «{tenant.app_name}»",
                                                                     url=link)]]) if link else None
    base = request.app.state.settings.webapp_url.rstrip("/")
    try:
        if body.card_id and base:
            url = f"{base}/api/share/card/{body.card_id}.png"
            result = InlineQueryResultPhoto(id=secrets.token_hex(8), photo_url=url, thumbnail_url=url,
                                            caption=text, reply_markup=kb)
        else:
            result = InlineQueryResultArticle(id=secrets.token_hex(8), title=tenant.app_name,
                                              input_message_content=InputTextMessageContent(message_text=text),
                                              reply_markup=kb)
        msg = await bot.save_prepared_inline_message(user_id=u.id, result=result, allow_user_chats=True,
                                                     allow_group_chats=True, allow_channel_chats=True)
        return {"prepared_id": msg.id, "fallback_url": fallback, "text": text}
    except Exception:  # noqa: BLE001 — sharing must never break the screen
        log.warning("savePreparedInlineMessage failed", exc_info=True)
        return {"prepared_id": None, "fallback_url": fallback, "text": text}
