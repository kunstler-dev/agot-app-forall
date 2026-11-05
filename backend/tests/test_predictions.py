from app.game import predictions as G
from app.services.users import now_ms

from .conftest import ADMIN, auth

HOUR = 3600 * 1000


def test_bold_bonus_rule():
    assert G.award(100, 1, 10, 0.2, 2.0) == (200, True)
    assert G.award(100, 2, 10, 0.2, 2.0) == (100, False)  # exactly 20% is not bold
    assert G.award(100, 5, 10, 0.2, 2.0) == (100, False)
    assert G.can_vote("open", 1000, 999) and not G.can_vote("open", 1000, 1000)


async def create(client, **kw):
    body = {"question": "Кто победит?", "options": ["A", "B", "C"], "deadline_ms": now_ms() + HOUR} | kw
    r = await client.post("/api/admin/events", json=body, headers=auth(ADMIN))
    assert r.status_code == 200, r.text
    return r.json()["id"]


async def test_only_admin_creates_events(client):
    r = await client.post("/api/admin/events", json={"question": "Q?", "options": ["a", "b"],
                                                     "deadline_ms": now_ms() + HOUR}, headers=auth(1))
    assert r.status_code == 403


async def test_vote_hidden_distribution_and_deadline(app, client):
    eid = await create(client)
    r = await client.post(f"/api/predictions/{eid}/vote", json={"option": 1}, headers=auth(1))
    assert r.status_code == 200 and r.json()["distribution"] is None and r.json()["my_vote"] == 1
    # changing the vote before the deadline is allowed
    assert (await client.post(f"/api/predictions/{eid}/vote", json={"option": 2}, headers=auth(1))).json()["my_vote"] == 2
    assert (await client.post(f"/api/predictions/{eid}/vote", json={"option": 9}, headers=auth(1))).status_code == 422
    await client.post(f"/api/admin/events/{eid}/close", headers=auth(ADMIN))
    r = await client.post(f"/api/predictions/{eid}/vote", json={"option": 0}, headers=auth(2))
    assert r.status_code == 409 and r.json()["detail"] == "deadline_passed"
    ev = [e for e in (await client.get("/api/predictions", headers=auth(1))).json()["events"] if e["id"] == eid][0]
    assert ev["open"] is False and ev["distribution"][2]["votes"] == 1


async def test_resolve_is_idempotent_and_bold_bonus(app, client):
    eid = await create(client)
    # 1 of 6 picks the right option (C) -> bold, x2
    for uid, opt in ((1, 2), (2, 0), (3, 0), (4, 0), (5, 1), (6, 1)):
        assert (await client.post(f"/api/predictions/{eid}/vote", json={"option": opt}, headers=auth(uid))).status_code == 200
    r = (await client.post(f"/api/admin/events/{eid}/resolve", json={"correct": 2}, headers=auth(ADMIN))).json()
    assert r["payout"] == {"winners": 1, "paid": 1, "points": 200, "bold": True}
    again = (await client.post(f"/api/admin/events/{eid}/resolve", json={"correct": 2}, headers=auth(ADMIN))).json()
    assert again["payout"]["paid"] == 0
    other = await client.post(f"/api/admin/events/{eid}/resolve", json={"correct": 0}, headers=auth(ADMIN))
    assert other.status_code == 409
    assert (await client.get("/api/me", headers=auth(1))).json()["user"]["points"] == 200
    assert (await client.get("/api/me", headers=auth(2))).json()["user"]["points"] == 0
    ev = [e for e in (await client.get("/api/predictions", headers=auth(1))).json()["events"] if e["id"] == eid][0]
    assert ev["correct"] == 2 and ev["my_points"] == 200


async def test_leaderboards(app, client):
    e1 = await create(client)
    e2 = await create(client, season="old")
    for uid in (1, 2):
        await client.post(f"/api/predictions/{e1}/vote", json={"option": 0}, headers=auth(uid))
    await client.post(f"/api/predictions/{e2}/vote", json={"option": 0}, headers=auth(2))
    await client.post(f"/api/admin/events/{e1}/resolve", json={"correct": 0}, headers=auth(ADMIN))
    await client.post(f"/api/admin/events/{e2}/resolve", json={"correct": 0}, headers=auth(ADMIN))
    top = (await client.get("/api/top?period=all&scope=predictions", headers=auth(1))).json()
    assert [r["id"] for r in top["top"]] == [2, 1] and top["me"] == {"rank": 2, "points": 100}
    season = (await client.get("/api/top?period=season&scope=predictions", headers=auth(1))).json()
    assert [r["points"] for r in season["top"]] == [100, 100] and season["top"][1]["rank"] == 1
    week = (await client.get("/api/top?period=week", headers=auth(3))).json()
    assert week["me"] == {"rank": None, "points": 0}


async def test_cancelled_events_are_hidden(client):
    eid = await create(client)
    await client.post(f"/api/admin/events/{eid}/cancel", headers=auth(ADMIN))
    ids = [e["id"] for e in (await client.get("/api/predictions", headers=auth(1))).json()["events"]]
    assert eid not in ids
    assert (await client.post(f"/api/predictions/{eid}/vote", json={"option": 0}, headers=auth(1))).status_code == 404


async def test_deadline_in_past_is_rejected(client):
    r = await client.post("/api/admin/events", json={"question": "Q?", "options": ["a", "b"],
                                                     "deadline_ms": now_ms() - 1}, headers=auth(ADMIN))
    assert r.status_code == 422
