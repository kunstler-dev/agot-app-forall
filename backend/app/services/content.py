"""Content in memory: JSON files from CONTENT_DIR plus admin overrides stored in the database."""

from __future__ import annotations

from fastapi import FastAPI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..content import Content
from ..models import ContentOverride


async def overrides(s: AsyncSession) -> dict[str, dict[str, dict]]:
    out: dict[str, dict[str, dict]] = {}
    for o in (await s.execute(select(ContentOverride))).scalars():
        out.setdefault(o.kind, {})[o.item_id] = o.data
    return out


async def reload(app: FastAPI, s: AsyncSession) -> Content:
    app.state.content = Content.load(app.state.settings.content_dir, await overrides(s))
    return app.state.content
