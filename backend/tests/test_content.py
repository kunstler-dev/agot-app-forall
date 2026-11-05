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


def test_crest_charges_are_known_to_the_renderer(settings):
    """Every charge used by the content must exist in frontend/src/lib/heraldry.ts."""
    import re
    from pathlib import Path
    ts = Path(__file__).resolve().parents[2] / "frontend" / "src" / "lib" / "heraldry.ts"
    if not ts.exists():
        pytest.skip("frontend sources not present")
    known = set(re.findall(r"^  ([a-z_]+): `", ts.read_text(encoding="utf-8"), re.M))
    c = Content.load(settings.content_dir)
    used = {h.crest.charge for h in c.houses.values() if h.crest.charge}
    assert used <= known, f"unknown charges: {sorted(used - known)}"
