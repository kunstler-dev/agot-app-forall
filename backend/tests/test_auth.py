import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

import pytest

from app.telegram_auth import AuthError, validate_init_data

from .conftest import BOT_TOKEN, auth


def signed(user: dict, token: str = BOT_TOKEN, auth_date: int | None = None) -> str:
    pairs = {"auth_date": str(auth_date or int(time.time())), "user": json.dumps(user)}
    check = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    pairs["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return urlencode(pairs)


def test_valid_signature():
    u = validate_init_data(signed({"id": 42, "first_name": "Ann"}), BOT_TOKEN, 86400)
    assert u.id == 42 and u.first_name == "Ann"


def test_bad_signature_and_expiry():
    with pytest.raises(AuthError):
        validate_init_data(signed({"id": 1}, token="1:other"), BOT_TOKEN, 86400)
    with pytest.raises(AuthError):
        validate_init_data(signed({"id": 1}, auth_date=int(time.time()) - 100000), BOT_TOKEN, 86400)


async def test_api_requires_auth(client):
    assert (await client.get("/api/me")).status_code == 401
    r = await client.get("/api/me", headers={"Authorization": "tma " + signed({"id": 77, "first_name": "Bo"})})
    assert r.status_code == 200 and r.json()["user"]["id"] == 77


async def test_dev_auth_only_when_enabled(app, client):
    app.state.settings.dev_auth = False
    assert (await client.get("/api/me", headers=auth(5))).status_code == 401
