import base64

from .conftest import ADMIN, auth


async def test_admin_only(client):
    for path in ("/api/admin/stats", "/api/admin/status", "/api/admin/content/characters"):
        assert (await client.get(path, headers=auth(1))).status_code == 403


async def test_stats(client):
    await client.get("/api/daily", headers=auth(1))
    await client.post("/api/share/prepare", json={"kind": "share_daily", "text": "x"}, headers=auth(1))
    st = (await client.get("/api/admin/stats?days=7", headers=auth(ADMIN))).json()
    assert len(st["days"]) == 7 and st["days"][-1]["dau"] >= 1 and st["days"][-1]["new"] >= 1
    assert st["totals"]["shares"] == 1 and st["days"][-1]["shares"] == 1


async def test_content_edit_validates_and_applies(app, client):
    cid = sorted(app.state.content.characters)[0]
    item = [x for x in (await client.get("/api/admin/content/characters", headers=auth(ADMIN))).json()["items"]
            if x["id"] == cid][0]
    item["name"] = "Новое имя"
    r = await client.put(f"/api/admin/content/characters/{cid}", json=item, headers=auth(ADMIN))
    assert r.status_code == 200 and app.state.content.characters[cid].name == "Новое имя"
    item["attrs"]["house"] = "no-such-house"
    r = await client.put(f"/api/admin/content/characters/{cid}", json=item, headers=auth(ADMIN))
    assert r.status_code == 422 and app.state.content.characters[cid].name == "Новое имя"
    await client.delete(f"/api/admin/content/characters/{cid}", headers=auth(ADMIN))
    assert app.state.content.characters[cid].name != "Новое имя"


async def test_share_without_bot_returns_fallback(client):
    r = (await client.post("/api/share/prepare", json={"kind": "share_quiz", "text": "Я — дом X"},
                           headers=auth(1))).json()
    assert r["prepared_id"] is None and r["fallback_url"].startswith("https://t.me/share/url")


async def test_share_card_upload(client):
    png = b"\x89PNG\r\n\x1a\n" + b"0" * 100
    r = await client.post("/api/share/card", json={"png_base64": base64.b64encode(png).decode()}, headers=auth(1))
    cid = r.json()["id"]
    got = await client.get(f"/api/share/card/{cid}.png")
    assert got.status_code == 200 and got.content == png
    bad = await client.post("/api/share/card", json={"png_base64": base64.b64encode(b"GIF89a").decode()},
                            headers=auth(1))
    assert bad.status_code == 422


async def test_profile_and_settings(client):
    p = (await client.get("/api/profile", headers=auth(1))).json()
    assert p["ranks"]["all"]["rank"] is None
    r = await client.post("/api/me/settings", json={"spoiler_level": 1, "notify_daily": False}, headers=auth(1))
    assert r.json()["spoiler_level"] == 1 and r.json()["notify_daily"] is False
    assert (await client.post("/api/me/settings", json={"spoiler_level": 99}, headers=auth(1))).status_code == 422


async def test_config_is_public_and_has_no_answers(client):
    c = (await client.get("/api/config")).json()
    assert c["tenant"]["app_name"] and c["houses"] and "seed" not in str(c["tenant"])
    assert (await client.get("/api/content/map.svg")).headers["content-type"].startswith("image/svg")
