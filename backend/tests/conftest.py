import os
import sys
from pathlib import Path

import httpx
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import Settings  # noqa: E402
from app.db import Database  # noqa: E402
from app.main import create_app  # noqa: E402

BOT_TOKEN = "123456:TEST-TOKEN"
ADMIN = 999


@pytest.fixture
def settings(tmp_path):
    # CONTENT_DIR / TENANT_FILE from the environment let a tenant repo run the same tests on its content
    return Settings(database_url=f"sqlite+aiosqlite:///{tmp_path / 't.db'}", dev_auth=True, bot_token=BOT_TOKEN,
                    admin_ids=str(ADMIN), jobs_enabled=False, _env_file=None,
                    **{k: v for k, v in (("content_dir", os.environ.get("CONTENT_DIR")),
                                         ("tenant_file", os.environ.get("TENANT_FILE"))) if v})


@pytest.fixture
async def app(settings):
    a = create_app(settings)
    db = Database(settings.db_url)
    await db.create_schema()
    a.state.db = db
    a.state.bot = None
    a.state.bot_username = "fandom_test_bot"
    yield a
    await db.close()


@pytest.fixture
async def client(app):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
        yield c


def auth(uid: int) -> dict:
    return {"Authorization": f"tma dev:{uid}"}
