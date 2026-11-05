import json

from app.content.schema import AttrDef, Character, Crest
from app.game import daily as D
from app.game.calendar import game_day
from app.models import DailyPuzzle
from app.services.users import now_ms

from .conftest import auth

# ---------------- pure logic ----------------


def test_schedule_is_deterministic_and_has_no_repeats_within_a_cycle():
    pool = [f"c{i}" for i in range(30)]
    first = [D.pick(pool, "seed", "character", i) for i in range(30)]
    assert first == [D.pick(pool, "seed", "character", i) for i in range(30)]
    assert sorted(first) == sorted(pool)
    second = [D.pick(pool, "seed", "character", i) for i in range(30, 60)]
    assert sorted(second) == sorted(pool)
    assert first != second  # a new cycle is reshuffled
    assert D.pick(pool, "other-seed", "character", 0) != first[0] or \
        D.pick(pool, "other-seed", "character", 1) != first[1]


def test_new_cycle_never_repeats_the_previous_day():
    pool = ["a", "b", "c"]
    for cycle in range(1, 300):
        last = D.pick(pool, "s", "m", cycle * 3 - 1)
        assert D.pick(pool, "s", "m", cycle * 3) != last


ATTRS = [AttrDef(key="house", label="Дом", type="category", ref="house", partial_via="allegiance"),
         AttrDef(key="first", label="Появление", type="ordinal"),
         AttrDef(key="roles", label="Роль", type="set"),
         AttrDef(key="allegiance", label="Союз", type="set", ref="house")]


def char(cid, house, first, roles, al):
    return Character(id=cid, name=cid, attrs={"house": house, "first": first, "roles": roles, "allegiance": al})


def test_compare_hit_partial_miss_and_arrows():
    target = char("t", "a", 3, ["lord", "warrior"], ["a", "b"])
    same = D.compare(ATTRS, target, char("g", "a", 3, ["warrior", "lord"], ["b", "a"]))
    assert [c["status"] for c in same] == ["hit", "hit", "hit", "hit"]
    ally = D.compare(ATTRS, target, char("g", "b", 1, ["lord"], ["b"]))
    assert [c["status"] for c in ally] == ["partial", "miss", "partial", "partial"]
    assert ally[1]["arrow"] == "up"  # the answer appears later than the guess
    other = D.compare(ATTRS, target, char("g", "z", 5, ["spy"], ["z"]))
    assert [c["status"] for c in other] == ["miss", "miss", "miss", "miss"]
    assert other[1]["arrow"] == "down"
    assert D.emoji_row(ally) == "🟨⬛🟨🟨"


def test_crest_stages_reveal_gradually():
    crest = Crest.model_validate({"field": {"tinctures": ["azure"]}, "ordinary": {"type": "bordure", "tincture": "argent"},
                                  "charges": [{"charge": "bear_rampant", "tincture": "argent"}]})
    s0 = D.crest_stage(crest, 0, "words", False)
    assert s0["crest"]["charges"] == [] and s0["crest"]["ordinary"]["type"] == "none" and s0["words"] is None
    assert s0["engraved"] and s0["fade"] < 1
    s2 = D.crest_stage(crest, 2, "words", False)
    assert s2["crest"]["charges"][0]["charge"] == "bear_rampant" and s2["engraved"]
    assert not D.crest_stage(crest, 3, "words", False)["engraved"]
    assert D.crest_stage(crest, 4, "words", False)["words"] == "words"
    done = D.crest_stage(crest, 0, "words", True)
    assert not done["engraved"] and done["crest"]["ordinary"]["type"] == "bordure"


def test_streaks():
    from datetime import date

    class S:
        played = won = streak = best_streak = 0
        last_won_day = None
        dist = {}

    s = S()
    D.update_stats(s, date(2026, 1, 1), True, 3)
    D.update_stats(s, date(2026, 1, 2), True, 2)
    assert s.streak == 2 and s.best_streak == 2 and s.dist == {"3": 1, "2": 1}
    assert D.current_streak(s, date(2026, 1, 3)) == 2
    assert D.current_streak(s, date(2026, 1, 4)) == 0
    D.update_stats(s, date(2026, 1, 3), False, 8)
    assert s.streak == 0 and s.best_streak == 2


# ---------------- API ----------------


async def answer_of(app, mode="character"):
    day = game_day(now_ms(), app.state.tenant.timezone).isoformat()
    async with app.state.db.sessions() as s:
        return (await s.get(DailyPuzzle, (day, mode))).answer


def wrong_ids(app, answer, n):
    return [c for c in sorted(app.state.content.characters) if c != answer][:n]


async def test_answer_is_never_sent_before_the_end(app, client):
    h = auth(10)
    r = await client.get("/api/daily", headers=h)
    assert r.status_code == 200
    answer = await answer_of(app)
    target = app.state.content.characters[answer]
    body = r.text
    assert answer not in body and target.name not in body
    for i, gid in enumerate(wrong_ids(app, answer, 3), start=1):
        r = await client.post("/api/daily/character/guess", json={"id": gid}, headers=h)
        assert r.status_code == 200
        data = r.json()["character"]
        assert data["answer"] is None and len(data["guesses"]) == i
        assert target.name not in r.text
    # the names list for autocomplete carries no attributes
    names = (await client.get("/api/daily/characters", headers=h)).json()
    assert set(names[0]) == {"id", "name", "aliases", "house"}


async def test_hints_unlock_and_game_ends(app, client):
    h = auth(11)
    await client.get("/api/daily", headers=h)
    answer = await answer_of(app)
    cfg = app.state.tenant.daily
    wrong = wrong_ids(app, answer, cfg.max_attempts)
    data = None
    for i, gid in enumerate(wrong, start=1):
        data = (await client.post("/api/daily/character/guess", json={"id": gid}, headers=h)).json()["character"]
        if i < cfg.hint_quote_after:
            assert data["hints"]["quote"] is None
        if i == cfg.hint_quote_after:
            assert data["hints"]["quote"]
        if i < cfg.hint_crest_after:
            assert data["hints"]["crest"] is None
    assert data["finished"] and not data["solved"] and data["answer"]["id"] == answer
    r = await client.post("/api/daily/character/guess", json={"id": answer}, headers=h)
    assert r.status_code == 409
    share = (await client.get("/api/daily/share/character", headers=h)).json()["text"]
    assert app.state.content.characters[answer].name not in share and "✗/" in share


async def test_solve_gives_points_once_and_streak(app, client):
    h = auth(12)
    await client.get("/api/daily", headers=h)
    answer = await answer_of(app)
    gid = wrong_ids(app, answer, 1)[0]
    assert (await client.post("/api/daily/character/guess", json={"id": gid}, headers=h)).status_code == 200
    assert (await client.post("/api/daily/character/guess", json={"id": gid}, headers=h)).status_code == 409
    data = (await client.post("/api/daily/character/guess", json={"id": answer}, headers=h)).json()["character"]
    assert data["solved"] and data["stats"]["streak"] == 1 and data["points"] == 80
    me = (await client.get("/api/me", headers=h)).json()["user"]
    assert me["points"] == 80
    assert (await client.get("/api/daily/share/character", headers=h)).json()["text"].count("\n") == 2


async def test_same_answer_for_everyone_and_unknown_guess(app, client):
    await client.get("/api/daily", headers=auth(13))
    a1 = await answer_of(app)
    await client.get("/api/daily", headers=auth(14))
    assert await answer_of(app) == a1
    r = await client.post("/api/daily/character/guess", json={"id": "nobody"}, headers=auth(13))
    assert r.status_code == 404


async def test_crest_of_the_day(app, client):
    h = auth(15)
    first = (await client.get("/api/daily", headers=h)).json()["crest"]
    answer = await answer_of(app, "crest")
    assert answer not in json.dumps(first) and first["stage"]["crest"]["charges"] == []
    wrong = [x for x in sorted(app.state.content.houses) if x != answer][0]
    data = (await client.post("/api/daily/crest/guess", json={"house": wrong}, headers=h)).json()["crest"]
    assert data["guesses"][0]["correct"] is False and data["answer"] is None
    data = (await client.post("/api/daily/crest/guess", json={"house": answer}, headers=h)).json()["crest"]
    assert data["solved"] and data["answer"]["house"] == answer
    assert "🟥🟩" in (await client.get("/api/daily/share/crest", headers=h)).json()["text"]
