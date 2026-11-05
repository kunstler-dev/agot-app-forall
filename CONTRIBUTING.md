# Contributing to Fandom Kit

Thanks for helping! A few rules keep the engine reusable for every channel.

## Ground rules

- **No third-party IP in this repository.** Names, places, quotes or images from existing franchises belong in a private tenant repository, never here. `scripts/check_public.sh` runs as a pre-push hook and in CI and blocks known franchise names and secrets. Enable the hook: `git config core.hooksPath .githooks`.
- **Fandom-specific things are data.** If a feature needs a channel-specific word, color or number, add it to `tenant.json` (`backend/app/tenant.py`) or to the content schema (`backend/app/content/schema.py`), with a default that works for the demo world.
- **Server-side authority.** Answers, deadlines and points are decided on the server. Never send an answer to the client before the player's game ends.
- **Pure rules in `game/`.** No database or HTTP there; cover new rules with unit tests.
- **Language.** UI and bot texts are Russian (the audience); code, comments and docs are English.

## Workflow

1. Fork and branch from `main`.
2. Backend: `cd backend && pip install -r requirements-dev.txt && pytest -q`. Schema changes need an Alembic migration (`alembic revision --autogenerate`), and `alembic check` must pass.
3. Frontend: `cd frontend && npm ci && npx oxlint --deny-warnings && npm run build`.
4. Run the walkthrough to see every screen: start the backend with `DEV_AUTH=1 AUTO_CREATE_SCHEMA=1 ADMIN_IDS=1`, build the frontend, then `node scripts/screenshots.cjs http://localhost:8000 /tmp/shots 360 740`.
5. Open a pull request describing what changed and how you tested it.

## Adding a heraldic charge

Charges live in `frontend/src/lib/heraldry.ts` as SVG in a 100×100 box, using the placeholder fills `"C"` (tincture) and `"D"` (dark detail). Keep them original and simple; `backend/tests/test_content.py` checks that every charge used in content exists.
