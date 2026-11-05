from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


def _demo_dir() -> Path:
    """The bundled demo world: `demo/` next to the backend in Docker, at the repo root locally."""
    for p in (BACKEND_DIR / "demo", BACKEND_DIR.parent / "demo"):
        if p.is_dir():
            return p
    return BACKEND_DIR.parent / "demo"


class Settings(BaseSettings):
    """Deployment settings come from environment variables (or backend/.env locally).

    Everything that describes a specific channel or fandom (names, texts, colors, content)
    lives in the tenant file and the content directory, not here.
    """

    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    bot_token: str = ""
    # Public https URL of the Mini App (on Railway, the service domain)
    webapp_url: str = ""
    # off: no bot (frontend development), polling: local test bot, webhook: production
    bot_mode: Literal["off", "polling", "webhook"] = "off"
    webhook_secret: str = ""
    admin_ids: str = ""

    database_url: str = f"sqlite+aiosqlite:///{(BACKEND_DIR / 'data' / 'dev.db').as_posix()}"
    # Create tables on startup (local SQLite only; production runs `alembic upgrade head`)
    auto_create_schema: bool = False

    # White-label: tenant config and content. Defaults point at the bundled demo world.
    tenant_file: Path = _demo_dir() / "tenant.json"
    content_dir: Path = _demo_dir() / "content"

    # Env overrides for the most deployment-specific tenant fields (empty = take from tenant.json)
    required_channel: str | None = None
    channel_url: str | None = None
    timezone: str | None = None

    # Allow `Authorization: tma dev:<id>` without a Telegram signature (LOCAL ONLY)
    dev_auth: bool = False
    init_data_max_age: int = 86400

    # Background jobs: reminders before prediction deadlines and the "new daily" broadcast
    jobs_enabled: bool = True

    @property
    def db_url(self) -> str:
        url = self.database_url
        # Railway provides postgres://… / postgresql://…; an async driver is needed
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+asyncpg://" + url[len(prefix):]
        return url

    @property
    def admin_id_set(self) -> set[int]:
        return {int(x) for x in self.admin_ids.replace(" ", "").split(",") if x}


@lru_cache
def get_settings() -> Settings:
    return Settings()
