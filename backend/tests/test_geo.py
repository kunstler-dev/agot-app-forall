from app.game import geo as G

from .conftest import auth


def test_score_curve():
    assert G.score(5, 1000, 100, 10) == 1000
    assert G.score(110, 1000, 100, 10) == 368
    assert G.score(10_000, 1000, 100, 10) == 0
    assert G.pick_clues(list("abcdef"), 3, "x") == G.pick_clues(list("fedcba"), 3, "x")
    assert len(set(G.pick_clues(list("abcdef"), 5, "y"))) == 5


async def test_map_respects_spoiler_level(app, client):
    h = auth(30)
    full = (await client.get("/api/map", headers=h)).json()
    low = (await client.get("/api/map?level=1", headers=h)).json()
    assert len(low["locations"]) <= len(full["locations"])
    max_low = {x.id for x in app.state.content.locations.values() if x.spoiler <= 1}
    assert {x["id"] for x in low["locations"]} == max_low
    for p in low["paths"]:
        assert all(s["location"] in max_low for s in p["stops"])


async def test_where_is_it_round(app, client):
    h = auth(31)
    g = (await client.post("/api/geo/start", json={"mode": "practice"}, headers=h)).json()
    assert g["round"] == 0 and g["clue"]["text"] and "location" not in g["clue"]
    clue_id = None
    async with app.state.db.sessions() as s:
        from app.models import GeoSession
        clue_id = (await s.get(GeoSession, g["id"])).clue_ids[0]
    loc = app.state.content.locations[app.state.content.clues[clue_id].location]
    r = (await client.post(f"/api/geo/{g['id']}/guess", json={"x": loc.x, "y": loc.y}, headers=h)).json()
    assert r["last"]["score"] == app.state.tenant.geo.max_score and r["last"]["answer"]["id"] == loc.id
    for _ in range(g["rounds"] - 1):
        r = (await client.post(f"/api/geo/{g['id']}/guess", json={"x": 0, "y": 0}, headers=h)).json()
    assert r["finished"] and r["clue"] is None
    assert (await client.post(f"/api/geo/{g['id']}/guess", json={"x": 0, "y": 0}, headers=h)).status_code == 409
    assert (await client.post(f"/api/geo/{g['id']}/guess", json={"x": 0, "y": 0}, headers=auth(32))).status_code == 404
    assert "Где это?" in (await client.get(f"/api/geo/{g['id']}/share", headers=h)).json()["text"]


async def test_daily_geo_is_shared_and_single(app, client):
    a = (await client.post("/api/geo/start", json={"mode": "daily"}, headers=auth(33))).json()
    b = (await client.post("/api/geo/start", json={"mode": "daily"}, headers=auth(34))).json()
    assert a["clue"] == b["clue"]
    again = (await client.post("/api/geo/start", json={"mode": "daily"}, headers=auth(33))).json()
    assert again["id"] == a["id"]
    for _ in range(a["rounds"]):
        await client.post(f"/api/geo/{a['id']}/guess", json={"x": 500, "y": 700}, headers=auth(33))
    top = (await client.get("/api/geo/daily", headers=auth(34))).json()
    assert top["top"][0]["id"] == 33 and top["session"]["id"] == b["id"]


async def test_house_layer_counts_players(app, client):
    answers = len(app.state.content.quiz.questions)
    for uid in (40, 41, 42):
        await client.post("/api/quiz", json={"answers": [0] * answers}, headers=auth(uid))
    m = (await client.get("/api/map", headers=auth(43))).json()
    layer = m["houses"]
    assert layer["total"] == 3
    top = layer["items"][0]
    assert top["count"] == 3 and top["pct"] == 100.0
    assert top["location"] in {x["id"] for x in m["locations"]}
    assert sum(i["count"] for i in layer["items"]) == 3
    assert m["my_house"] is None
