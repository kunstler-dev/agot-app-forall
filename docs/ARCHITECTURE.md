# Architecture

## Request path

1. Telegram opens the Mini App; every API call carries `Authorization: tma <initData>`. `telegram_auth.py` checks the HMAC with the bot token and rejects data older than 24 h. Locally, `DEV_AUTH=1` accepts `tma dev:<id>`.
2. `api/deps.py:get_player` loads (and row-locks) the player and runs the **subscription gate** (`services/subscriptions.py`): Telegram `getChatMember` at most every 10 minutes, or immediately on "I've subscribed". On any Telegram error the gate fails open, logs the problem and records it for the admin panel.
3. The router calls pure rules in `game/` and writes the result.

## Daily puzzles

- `game/daily.py:pick` builds a seeded permutation of the pool per cycle, so no answer repeats until the whole pool has been used, and a new cycle never starts with the previous day's answer.
- The answer is stored in `daily_puzzles` on the first request of the day, so later content edits don't change past days.
- `GET /api/daily` returns guesses with comparison cells, unlocked hints and the answer **only when the player's game is finished**. The names list for autocomplete has no attributes.
- Crest of the day: `crest_stage` returns a partial blazon (field → ordinary → charge) and a blur level per wrong guess.

## Points

`services/points.py:award` is the only way to give points: it locks the player (`SELECT … FOR UPDATE`), inserts a `PointAward` with a unique `(source, ref, user)` inside a savepoint and updates `users.points`. Resolving an event twice, a retried request or a double click hits the unique constraint and pays nothing. Leaderboards sum `point_awards` by week (tenant time zone), season tag or all time.

## Content and tenant

- `tenant.json` (`tenant.py`): channel, names, texts, colors, spoiler levels and tuning (attempts, bonus, geo scale). `REQUIRED_CHANNEL`, `CHANNEL_URL` and `TIMEZONE` env vars override it.
- `content/` (`content/schema.py`): houses with blazons, characters with attributes defined by the content itself, locations on the map, journeys, geo clues, the quiz and seed events. Everything is validated with cross references on startup.
- Admin edits are stored in `content_overrides` and applied over the files; each edit is validated against the full content before it is saved.

## Jobs

`jobs.loop` runs every minute: reminders an hour before prediction deadlines (an event is marked `reminded` before sending), the daily announcement once per game day (`job_runs` key), cleanup of share cards older than 7 days. Demo events from `events.json` are seeded into an empty table.

## Frontend

React 19 + Vite + Tailwind v4. Server state in TanStack Query, UI state in zustand. Crests are rendered by `lib/heraldry.ts` into SVG strings (inline, blurred, or drawn into the share-card canvas). The map is an `<img>` of the SVG inside a custom pinch-zoom component with pins drawn in screen space.
