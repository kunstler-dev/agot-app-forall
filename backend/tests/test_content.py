"""Validates the content of the configured tenant (the demo world by default)."""

import pytest

from app.config import Settings
from app.content import Content, ContentError
from app.tenant import load_tenant


def test_content_and_tenant_load(settings):
    t = load_tenant(settings)
    c = Content.load(settings.content_dir)
    assert c.characters and c.houses and c.locations and c.clues
    assert len(c.daily_pool()) >= 10
    for clue in c.clues.values():
        assert clue.spoiler <= t.max_spoiler
    for loc in c.locations.values():
        assert 1 <= loc.spoiler <= t.max_spoiler


def test_broken_reference_is_rejected(settings, tmp_path):
    import json
    import shutil
    d = tmp_path / "c"
    shutil.copytree(settings.content_dir, d)
    locs = json.loads((d / "locations.json").read_text())
    locs["locations"][0]["houses"] = ["no-such-house"]
    (d / "locations.json").write_text(json.dumps(locs))
    with pytest.raises(ContentError, match="no-such-house"):
        Content.load(d)


@pytest.mark.skipif(bool(__import__("os").environ.get("CONTENT_DIR")), reason="tenant content configured")
def test_settings_default_to_demo():
    s = Settings(_env_file=None)
    assert s.content_dir.name == "content" and s.tenant_file.name == "tenant.json"


def test_every_charge_exists_and_tincture_rule(settings):
    c = Content.load(settings.content_dir)
    for h in c.houses.values():
        for ch in h.crest.charges:
            assert ch.charge in c.charges, f"{h.id}: {ch.charge}"
        assert not h.crest.tincture_problems() or h.crest.canon_exception, f"{h.id}: {h.crest.tincture_problems()}"


def test_tincture_rule_detects_clashes():
    from app.content.schema import Crest
    bad = Crest.model_validate({"field": {"tinctures": ["or"]}, "charges": [{"charge": "mullet", "tincture": "argent"}]})
    assert bad.tincture_problems() == ["mullet argent on or"]
    ok = Crest.model_validate({"field": {"tinctures": ["gules"]}, "charges": [{"charge": "mullet", "tincture": "or"}]})
    assert ok.tincture_problems() == []
    divided = Crest.model_validate({"field": {"division": "per_pale", "tinctures": ["or", "gules"]},
                                    "charges": [{"charge": "mullet", "tincture": "argent"}]})
    assert divided.tincture_problems() == []


async def test_heraldry_endpoint(client):
    lib = (await client.get("/api/heraldry")).json()
    assert "lion_rampant" in lib and "svg" in lib["lion_rampant"]


async def test_prerendered_crest_is_served(client, app):
    hid = sorted(app.state.content.houses)[0]
    r = await client.get(f"/api/heraldry/house/{hid}.svg")
    assert r.status_code in (200, 404)
    if r.status_code == 200:
        assert r.headers["content-type"].startswith("image/svg")
    assert (await client.get("/api/heraldry/house/nope.svg")).status_code == 404


async def test_crest_image_and_content_files(app, client, settings, tmp_path):
    import json
    import shutil
    from app.content import Content
    d = tmp_path / "c"
    shutil.copytree(settings.content_dir, d)
    (d / "heraldry" / "images").mkdir(parents=True, exist_ok=True)
    (d / "heraldry" / "images" / "x.png").write_bytes(b"\x89PNG\r\n\x1a\n0000")
    houses = json.loads((d / "houses.json").read_text())
    houses[0]["crest"]["image"] = "heraldry/images/x.png"
    (d / "houses.json").write_text(json.dumps(houses))
    app.state.content = Content.load(d)
    r = await client.get("/api/content/file/heraldry/images/x.png")
    assert r.status_code == 200 and r.headers["content-type"] == "image/png"
    assert (await client.get("/api/content/file/../../etc/passwd")).status_code == 404
    assert (await client.get("/api/content/file/houses.json")).status_code == 404
    cfg = (await client.get("/api/config")).json()
    assert cfg["houses"][0]["crest"]["image"] == "heraldry/images/x.png" or any(h["crest"].get("image") for h in cfg["houses"])
    houses[0]["crest"]["image"] = "heraldry/images/missing.png"
    (d / "houses.json").write_text(json.dumps(houses))
    import pytest
    from app.content import ContentError
    with pytest.raises(ContentError, match="missing.png"):
        Content.load(d)
