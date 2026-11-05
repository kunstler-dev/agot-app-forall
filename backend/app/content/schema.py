"""Content schema of a fandom: characters, houses, locations, map clues, the house quiz and demo events.

Content is plain JSON in CONTENT_DIR, validated with pydantic on startup (including cross references),
so a broken file stops the deploy instead of breaking the app for players.
Fields marked `verify: true` are facts the author was not sure about and wants a human to check.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, model_validator

SLUG = r"^[a-z0-9][a-z0-9_-]*$"
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")

# Heraldic tinctures the renderer knows (frontend/src/heraldry/render.ts has the same table)
METALS = {"or", "argent"}
COLOURS = {"gules", "azure", "vert", "sable", "purpure", "tenne", "sanguine", "murrey", "bleu_celeste", "rose",
           "cendree", "brunatre"}
TINCTURES = METALS | COLOURS
DIVISIONS = {"plain", "per_pale", "per_fess", "per_bend", "per_bend_sinister", "quarterly", "per_saltire",
             "per_chevron", "gyronny", "paly", "barry", "chequy", "bendy"}
ORDINARIES = {"none", "chief", "fess", "pale", "bend", "chevron", "cross", "saltire", "bordure", "pile"}
ARRANGEMENTS = {"single", "two_one", "in_pale", "in_fess", "semy"}

ENGINE_CHARGES = Path(__file__).resolve().parent / "charges.json"
log = logging.getLogger("fandom.content")


def _tincture_ok(t: str | None) -> bool:
    return t is None or t in TINCTURES or bool(HEX.match(t))


def is_metal(t: str) -> bool:
    return t in METALS


class BlazonField(BaseModel):
    division: str = "plain"
    tinctures: list[str] = Field(min_length=1, max_length=2)


class BlazonOrdinary(BaseModel):
    type: str = "none"
    tincture: str | None = None


class BlazonCharge(BaseModel):
    charge: str
    tincture: str
    count: int = Field(1, ge=1, le=12)
    arrangement: str = "single"


class Crest(BaseModel):
    """A blazon: the crest as data. Every crest is drawn by one renderer."""

    field: BlazonField
    ordinary: BlazonOrdinary = BlazonOrdinary()
    charges: list[BlazonCharge] = []
    blazon: str = ""  # human-readable description
    # the canon breaks the tincture rule on purpose (metal on metal / colour on colour)
    canon_exception: bool = False

    @model_validator(mode="after")
    def _check(self) -> Crest:
        ts = [*self.field.tinctures, self.ordinary.tincture, *(c.tincture for c in self.charges)]
        for t in ts:
            if not _tincture_ok(t):
                raise ValueError(f"unknown tincture {t!r}")
        if self.field.division not in DIVISIONS:
            raise ValueError(f"unknown division {self.field.division!r}")
        if self.field.division != "plain" and len(self.field.tinctures) != 2:
            raise ValueError("a divided field needs two tinctures")
        if self.ordinary.type not in ORDINARIES:
            raise ValueError(f"unknown ordinary {self.ordinary.type!r}")
        if self.ordinary.type != "none" and not self.ordinary.tincture:
            raise ValueError("an ordinary needs a tincture")
        for c in self.charges:
            if c.arrangement not in ARRANGEMENTS:
                raise ValueError(f"unknown arrangement {c.arrangement!r}")
        return self

    def tincture_problems(self) -> list[str]:
        """Metal on metal or colour on colour (only checked on a plain field; custom hex counts as colour)."""
        if self.field.division != "plain":
            return []
        base = self.field.tinctures[0]
        clash = [] if self.ordinary.type == "none" else [("ordinary", self.ordinary.tincture)]
        clash += [(c.charge, c.tincture) for c in self.charges]
        return [f"{what} {t} on {base}" for what, t in clash if t and is_metal(t) == is_metal(base)]


class House(BaseModel):
    id: str = Field(pattern=SLUG)
    name: str
    words: str = ""
    region: str = ""
    seat: str = ""
    description: str = ""
    crest: Crest
    great: bool = False
    # Can be a result of the "Which house are you?" quiz
    quiz: bool = False
    quiz_text: str = ""
    verify: bool = False


class AttrDef(BaseModel):
    """One column of the daily comparison grid."""

    key: str = Field(pattern=SLUG)
    label: str
    # category: one value, exact match; ordinal: a number, arrow up/down; set: several values, overlap = partial
    type: Literal["category", "ordinal", "set"]
    values: dict[str, str] = {}
    # Values are house ids (labels come from houses)
    ref: Literal["house"] | None = None
    # category only: partial (yellow) when the value is found in this set attribute of the other side
    partial_via: str | None = None


class Character(BaseModel):
    id: str = Field(pattern=SLUG)
    name: str
    aliases: list[str] = []
    attrs: dict[str, str | int | list[str]]
    # Hint after N attempts: a short phrase associated with the character, without the name
    quote: str = ""
    bio: str = ""
    # Not used as "character of the day" (still guessable)
    daily: bool = True
    verify: bool = False


class Characters(BaseModel):
    attributes: list[AttrDef]
    # Attribute holding the house id used for the crest hint
    crest_attr: str = "house"
    characters: list[Character]


class Location(BaseModel):
    id: str = Field(pattern=SLUG)
    name: str
    x: float
    y: float
    kind: Literal["castle", "city", "ruin", "landmark", "region", "sea", "island"] = "castle"
    spoiler: int = 1
    region: str = ""
    description: str = ""
    houses: list[str] = []
    characters: list[str] = []
    # Labels with a higher rank show up only when zoomed in (1 = always)
    rank: int = Field(2, ge=1, le=3)
    verify: bool = False


class PathStop(BaseModel):
    location: str
    spoiler: int = 1
    note: str = ""


class CharacterPath(BaseModel):
    character: str
    stops: list[PathStop] = Field(min_length=2)


class MapMeta(BaseModel):
    file: str = "map.svg"
    width: float
    height: float
    title: str = ""


class Locations(BaseModel):
    map: MapMeta
    locations: list[Location]
    paths: list[CharacterPath] = []


class GeoClue(BaseModel):
    id: str = Field(pattern=SLUG)
    kind: Literal["description", "quote", "climate", "crest", "event"] = "description"
    text: str
    location: str
    spoiler: int = 1
    # kind=crest: the crest of this house is shown with the text
    house: str | None = None
    verify: bool = False


class QuizAnswer(BaseModel):
    text: str
    weights: dict[str, int]


class QuizQuestion(BaseModel):
    id: str = Field(pattern=SLUG)
    text: str
    answers: list[QuizAnswer] = Field(min_length=2)


class Quiz(BaseModel):
    title: str = "Какой ты дом?"
    intro: str = ""
    questions: list[QuizQuestion] = Field(min_length=3)


class SeedEvent(BaseModel):
    question: str
    options: list[str] = Field(min_length=2, max_length=8)
    deadline_hours: int = 72
    tag: str = ""
    season: str | None = None


class ContentError(ValueError):
    pass


class Content:
    """All content of one tenant, indexed by id. Built once on startup, rebuilt after admin edits."""

    EDITABLE = ("characters", "houses", "locations", "clues")

    def __init__(self, directory: Path, houses: list[House], characters: Characters, locations: Locations,
                 clues: list[GeoClue], quiz: Quiz, events: list[SeedEvent]) -> None:
        self.directory = directory
        self.houses = {h.id: h for h in houses}
        self.attributes = characters.attributes
        self.crest_attr = characters.crest_attr
        self.characters = {c.id: c for c in characters.characters}
        self.map = locations.map
        self.locations = {x.id: x for x in locations.locations}
        self.paths = {p.character: p for p in locations.paths}
        self.clues = {c.id: c for c in clues}
        self.quiz = quiz
        self.events = events
        self.charges = self.load_charges(directory)
        self._validate()

    # ---------- loading ----------

    @classmethod
    def load(cls, directory: Path, overrides: dict[str, dict[str, dict]] | None = None) -> Content:
        directory = Path(directory)

        def read(name: str):
            p = directory / name
            if not p.exists():
                raise ContentError(f"missing content file {p}")
            return json.loads(p.read_text(encoding="utf-8"))

        raw = {
            "houses": read("houses.json"),
            "characters": read("characters.json"),
            "locations": read("locations.json"),
            "clues": read("geo.json"),
            "quiz": read("quiz.json"),
            "events": read("events.json") if (directory / "events.json").exists() else [],
        }
        for kind, items in (overrides or {}).items():
            cls._apply(raw, kind, items)
        try:
            return cls(
                directory,
                houses=[House.model_validate(h) for h in raw["houses"]],
                characters=Characters.model_validate(raw["characters"]),
                locations=Locations.model_validate(raw["locations"]),
                clues=[GeoClue.model_validate(c) for c in raw["clues"]],
                quiz=Quiz.model_validate(raw["quiz"]),
                events=[SeedEvent.model_validate(e) for e in raw["events"]],
            )
        except ContentError:
            raise
        except ValueError as e:
            raise ContentError(str(e)) from e

    @staticmethod
    def _apply(raw: dict, kind: str, items: dict[str, dict]) -> None:
        """Admin edits replace (or add) items by id."""
        lst = {"characters": raw["characters"]["characters"], "houses": raw["houses"],
               "locations": raw["locations"]["locations"], "clues": raw["clues"]}.get(kind)
        if lst is None:
            return
        index = {it["id"]: i for i, it in enumerate(lst)}
        for item_id, data in items.items():
            data = {**data, "id": item_id}
            if item_id in index:
                lst[index[item_id]] = data
            else:
                lst.append(data)

    @staticmethod
    def model_for(kind: str) -> type[BaseModel]:
        return {"characters": Character, "houses": House, "locations": Location, "clues": GeoClue}[kind]

    def items(self, kind: str) -> dict[str, BaseModel]:
        return {"characters": self.characters, "houses": self.houses, "locations": self.locations,
                "clues": self.clues}[kind]

    @staticmethod
    def load_charges(directory: Path) -> dict[str, dict]:
        """Engine charges plus the tenant's own (content/heraldry/charges.json); the tenant wins on name clashes."""
        lib = json.loads(ENGINE_CHARGES.read_text(encoding="utf-8"))
        own = Path(directory) / "heraldry" / "charges.json"
        if own.exists():
            lib |= json.loads(own.read_text(encoding="utf-8"))
        return lib

    # ---------- validation ----------

    def _validate(self) -> None:
        errors: list[str] = []
        keys = {a.key for a in self.attributes}
        by_key = {a.key: a for a in self.attributes}
        for a in self.attributes:
            if a.partial_via and (a.partial_via not in by_key or by_key[a.partial_via].type != "set"):
                errors.append(f"attribute {a.key}: partial_via must name a set attribute")
        if self.crest_attr not in keys:
            errors.append(f"crest_attr {self.crest_attr!r} is not an attribute")
        seen_names: dict[str, str] = {}
        for c in self.characters.values():
            if set(c.attrs) != keys:
                errors.append(f"character {c.id}: attrs must be exactly {sorted(keys)}")
                continue
            for a in self.attributes:
                v = c.attrs[a.key]
                if a.type == "set" and not isinstance(v, list):
                    errors.append(f"character {c.id}.{a.key}: expected a list")
                if a.type == "ordinal" and not isinstance(v, int):
                    errors.append(f"character {c.id}.{a.key}: expected a number")
                if a.type == "category" and not isinstance(v, str):
                    errors.append(f"character {c.id}.{a.key}: expected a string")
                vals = v if isinstance(v, list) else [v]
                for x in vals:
                    if a.ref == "house" and x not in self.houses and x != "none":
                        errors.append(f"character {c.id}.{a.key}: unknown house {x!r}")
                    elif a.ref is None and a.values and str(x) not in a.values:
                        errors.append(f"character {c.id}.{a.key}: value {x!r} not in values")
            n = c.name.casefold()
            if n in seen_names:
                errors.append(f"duplicate character name {c.name!r}")
            seen_names[n] = c.id
        for loc in self.locations.values():
            if not (0 <= loc.x <= self.map.width and 0 <= loc.y <= self.map.height):
                errors.append(f"location {loc.id}: outside the map")
            errors += [f"location {loc.id}: unknown house {h!r}" for h in loc.houses if h not in self.houses]
            errors += [f"location {loc.id}: unknown character {c!r}" for c in loc.characters
                       if c not in self.characters]
        for p in self.paths.values():
            if p.character not in self.characters:
                errors.append(f"path: unknown character {p.character!r}")
            errors += [f"path {p.character}: unknown location {s.location!r}" for s in p.stops
                       if s.location not in self.locations]
        for c in self.clues.values():
            if c.location not in self.locations:
                errors.append(f"clue {c.id}: unknown location {c.location!r}")
            if c.house and c.house not in self.houses:
                errors.append(f"clue {c.id}: unknown house {c.house!r}")
        for h in self.houses.values():
            errors += [f"house {h.id}: unknown charge {c.charge!r}" for c in h.crest.charges if c.charge not in self.charges]
            problems = h.crest.tincture_problems()
            if problems and not h.crest.canon_exception:
                log.warning("house %s breaks the tincture rule: %s (set canon_exception if intended)",
                            h.id, "; ".join(problems))
        quiz_houses = {h.id for h in self.houses.values() if h.quiz}
        if len(quiz_houses) < 4:
            errors.append("quiz needs at least 4 houses with quiz=true")
        for q in self.quiz.questions:
            for a in q.answers:
                bad = set(a.weights) - quiz_houses
                if bad:
                    errors.append(f"quiz {q.id}: weights for non-quiz houses {sorted(bad)}")
        if not (self.directory / self.map.file).exists():
            errors.append(f"map file {self.map.file} not found")
        if errors:
            raise ContentError("content is invalid:\n  " + "\n  ".join(errors))

    # ---------- helpers ----------

    def house_name(self, house_id: str) -> str:
        h = self.houses.get(house_id)
        return h.name if h else "—"

    def value_label(self, attr: AttrDef, value) -> str:
        if attr.ref == "house":
            return self.house_name(value) if value != "none" else attr.values.get("none", "—")
        return attr.values.get(str(value), str(value))

    def daily_pool(self) -> list[str]:
        return sorted(c.id for c in self.characters.values() if c.daily)

    def crest_pool(self) -> list[str]:
        return sorted(self.houses)
