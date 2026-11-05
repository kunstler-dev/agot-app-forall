from __future__ import annotations

import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse

from . import jobs
from .api.admin import router as admin_router
from .api.daily import router as daily_router
from .api.geo import router as geo_router
from .api.predictions import router as predictions_router
from .api.quiz import router as quiz_router
from .api.routes import router as api_router
from .api.share import router as share_router
from .api.top import router as top_router
from .config import Settings, get_settings
from .content import Content
from .db import Database
from .services import content as content_svc
from .tenant import load_tenant

log = logging.getLogger("fandom")

# Built frontend: in Docker it is /app/static, locally frontend/dist
STATIC_CANDIDATES = [Path(__file__).resolve().parent.parent / "static",
                     Path(__file__).resolve().parents[2] / "frontend" / "dist"]


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    tenant = load_tenant(settings)
    # Validate content before anything else: a broken file fails the deploy, not a screen
    base_content = Content.load(settings.content_dir)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        db = Database(settings.db_url)
        if settings.auto_create_schema:
            await db.create_schema()
        app.state.db = db
        async with db.sessions() as s:
            await content_svc.reload(app, s)  # apply admin edits stored in the database
        app.state.bot_username = None
        app.state.bot = app.state.dp = None
        polling = None
        bot = None
        if settings.bot_token and settings.bot_mode != "off":
            from .bot import create_bot, create_dispatcher, setup_menu
            bot = create_bot(settings)
            dp = create_dispatcher(settings, db, tenant)
            app.state.bot_username = (await bot.get_me()).username
            app.state.bot = bot
            await setup_menu(bot, settings, tenant)
            if settings.bot_mode == "webhook":
                app.state.dp = dp
                url = settings.webapp_url.rstrip("/") + "/bot/webhook"
                await bot.set_webhook(url, secret_token=settings.webhook_secret or None,
                                      allowed_updates=dp.resolve_used_update_types())
            else:
                await bot.delete_webhook()
                polling = asyncio.create_task(dp.start_polling(bot, handle_signals=False))
            log.info("bot @%s started (%s)", app.state.bot_username, settings.bot_mode)
        elif not settings.dev_auth:
            log.error("BOT_TOKEN/BOT_MODE not set: Telegram auth and the subscription gate cannot work")
        background = asyncio.create_task(jobs.loop(app, with_bot=bot is not None)) if settings.jobs_enabled else None
        try:
            yield
        finally:
            for t in (polling, background):
                if t:
                    t.cancel()
                    with contextlib.suppress(asyncio.CancelledError):
                        await t
            if bot:
                await bot.session.close()
            await db.close()

    app = FastAPI(title=tenant.app_name, lifespan=lifespan,
                  docs_url="/api/docs" if settings.dev_auth else None, redoc_url=None,
                  openapi_url="/api/openapi.json" if settings.dev_auth else None)
    app.state.settings = settings
    app.state.tenant = tenant
    app.state.content = base_content
    app.state.gate_problem = None
    for r in (api_router, daily_router, quiz_router, predictions_router, top_router, geo_router, share_router,
              admin_router):
        app.include_router(r)

    @app.post("/bot/webhook", include_in_schema=False)
    async def webhook(request: Request) -> dict:
        bot, dp = request.app.state.bot, request.app.state.dp
        if dp is None:
            raise HTTPException(404)
        if settings.webhook_secret and request.headers.get(
                "x-telegram-bot-api-secret-token") != settings.webhook_secret:
            raise HTTPException(403)
        from aiogram.types import Update
        await dp.feed_update(bot, Update.model_validate(await request.json(), context={"bot": bot}))
        return {"ok": True}

    static = next((p for p in STATIC_CANDIDATES if (p / "index.html").exists()), None)
    app.state.static_dir = static
    if static is not None:
        index = static / "index.html"

        @app.get("/{path:path}", include_in_schema=False)
        async def spa(path: str) -> FileResponse:
            if path.startswith("api/"):
                raise HTTPException(404)
            f = (static / path).resolve()
            if path and f.is_file() and static.resolve() in f.parents:
                cache = "public, max-age=31536000, immutable" if path.startswith("assets/") else "no-cache"
                return FileResponse(f, headers={"Cache-Control": cache})
            return FileResponse(index, headers={"Cache-Control": "no-cache"})

    return app


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logging.getLogger("httpx").setLevel(logging.WARNING)


def __getattr__(name: str):
    # `uvicorn app.main:app` — built lazily so importing the module in tests doesn't need content on disk
    if name == "app":
        globals()["app"] = create_app()
        return globals()["app"]
    raise AttributeError(name)
