from app.models import ChatMessage

from .conftest import ADMIN, auth


async def test_send_and_read(app, client):
    app.state.tenant.chat.cooldown_s = 0
    r = await client.post("/api/chat", json={"text": "  Привет, архив  "}, headers=auth(1))
    assert r.status_code == 200 and r.json()["text"] == "Привет, архив" and r.json()["me"]
    await client.post("/api/chat", json={"text": "И тебе"}, headers=auth(2))
    h = (await client.get("/api/chat", headers=auth(1))).json()
    assert [m["text"] for m in h["messages"]] == ["Привет, архив", "И тебе"]
    assert h["messages"][1]["me"] is False and h["messages"][1]["user"]["id"] == 2
    first = h["messages"][0]["id"]
    newer = (await client.get(f"/api/chat?after={first}", headers=auth(1))).json()["messages"]
    assert [m["text"] for m in newer] == ["И тебе"]


async def test_validation_and_rate_limit(app, client):
    assert (await client.post("/api/chat", json={"text": "   "}, headers=auth(3))).status_code == 422
    assert (await client.post("/api/chat", json={"text": "x" * 501}, headers=auth(3))).status_code == 422
    assert (await client.post("/api/chat", json={"text": "заходи на t.me/spam"}, headers=auth(3))).json()["detail"] == "no_links"
    assert (await client.post("/api/chat", json={"text": "раз"}, headers=auth(3))).status_code == 200
    r = await client.post("/api/chat", json={"text": "два"}, headers=auth(3))
    assert r.status_code == 429 and r.json()["detail"] == "too_fast"


async def test_admin_delete_and_ban(app, client):
    app.state.tenant.chat.cooldown_s = 0
    mid = (await client.post("/api/chat", json={"text": "плохое"}, headers=auth(4))).json()["id"]
    assert (await client.delete(f"/api/chat/{mid}", headers=auth(4))).status_code == 403
    assert (await client.delete(f"/api/chat/{mid}", headers=auth(ADMIN))).status_code == 200
    assert (await client.get("/api/chat", headers=auth(1))).json()["messages"] == []
    await client.post("/api/chat", json={"text": "ещё"}, headers=auth(4))
    assert (await client.post("/api/chat/ban/4", json={"banned": True}, headers=auth(ADMIN))).status_code == 200
    assert (await client.post("/api/chat", json={"text": "снова"}, headers=auth(4))).status_code == 403
    assert (await client.get("/api/chat", headers=auth(4))).json()["banned"] is True
    async with app.state.db.sessions() as s:
        from sqlalchemy import select
        assert all(m.deleted for m in (await s.execute(select(ChatMessage).where(ChatMessage.user_id == 4))).scalars())


async def test_features_switch_off(app, client):
    app.state.tenant.features.chat = False
    app.state.tenant.features.predictions = False
    assert (await client.get("/api/chat", headers=auth(1))).status_code == 404
    assert (await client.get("/api/predictions", headers=auth(1))).status_code == 404
    assert (await client.get("/api/config")).json()["tenant"]["features"] == {"predictions": False, "chat": False}
