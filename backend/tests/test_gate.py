from .conftest import auth


async def test_gate_blocks_non_members(app, client):
    app.state.tenant.channel = "@demo_channel"
    members = set()

    async def checker(channel, uid):
        assert channel == "@demo_channel"
        return uid in members

    app.state.sub_checker = checker
    me = (await client.get("/api/me", headers=auth(1))).json()
    assert me["subscription"]["ok"] is False
    assert (await client.get("/api/daily", headers=auth(1))).status_code == 403
    members.add(1)
    # cached negative result is re-checked on the button press
    assert (await client.post("/api/subscription/check", headers=auth(1))).json()["ok"] is True
    assert (await client.get("/api/daily", headers=auth(1))).status_code == 200


async def test_gate_fails_open_when_telegram_is_down(app, client):
    from app.services.subscriptions import CheckUnavailable
    app.state.tenant.channel = "@demo_channel"

    async def broken(channel, uid):
        raise CheckUnavailable("bot is not an admin")

    app.state.sub_checker = broken
    assert (await client.get("/api/me", headers=auth(2))).json()["subscription"]["ok"] is True
    assert app.state.gate_problem and "admin" in app.state.gate_problem["text"]
    st = (await client.get("/api/admin/status", headers=auth(999))).json()
    assert st["gate_problem"]
