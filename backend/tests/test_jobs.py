from app import jobs
from app.models import PredictionEvent, User
from app.services.users import now_ms

from .conftest import auth


class FakeBot:
    def __init__(self):
        self.sent = []

    async def send_message(self, uid, text, reply_markup=None):
        self.sent.append((uid, text))


async def test_seed_events_once(app):
    await jobs.seed_events(app)
    await jobs.seed_events(app)
    async with app.state.db.sessions() as s:
        from sqlalchemy import func, select
        n = (await s.execute(select(func.count()).select_from(PredictionEvent))).scalar_one()
    assert n == len(app.state.content.events)


async def test_reminders_are_sent_once_and_skip_voters(app, client, monkeypatch):
    monkeypatch.setattr(jobs.asyncio, "sleep", _nosleep)
    app.state.bot = FakeBot()
    for uid in (1, 2):
        await client.get("/api/me", headers=auth(uid))
    async with app.state.db.sessions() as s:
        for uid in (1, 2):
            (await s.get(User, uid)).bot_started = True
        e = PredictionEvent(question="Q", options=["a", "b"], deadline_ms=now_ms() + 30 * 60 * 1000, status="open")
        s.add(e)
        await s.commit()
        eid = e.id
    await client.post(f"/api/predictions/{eid}/vote", json={"option": 0}, headers=auth(1))
    await jobs.remind_predictions(app, now_ms())
    await jobs.remind_predictions(app, now_ms())
    assert [uid for uid, _ in app.state.bot.sent] == [2]


async def test_daily_announcement_once_per_day(app, client, monkeypatch):
    monkeypatch.setattr(jobs.asyncio, "sleep", _nosleep)
    app.state.bot = FakeBot()
    app.state.tenant.daily.announce_hour = 0
    await client.get("/api/me", headers=auth(5))
    async with app.state.db.sessions() as s:
        (await s.get(User, 5)).bot_started = True
        await s.commit()
    await jobs.announce_daily(app, now_ms())
    await jobs.announce_daily(app, now_ms())
    assert len(app.state.bot.sent) == 1


async def _nosleep(_):
    return None
