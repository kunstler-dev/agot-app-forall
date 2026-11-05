import type { Blazon } from '../heraldry/render'
import { authHeader } from './telegram'

export class ApiError extends Error {
  status: number
  detail: unknown
  constructor(status: number, detail: unknown) {
    super(typeof detail === 'string' ? detail : `HTTP ${status}`)
    this.status = status
    this.detail = detail
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: authHeader(), ...init?.headers },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, body.detail ?? res.statusText)
  return body as T
}

const post = <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) })

// ---------- types ----------

export type SpoilerLevel = { level: number; label: string; hint: string }
export type Tenant = {
  id: string
  app_name: string
  app_tagline: string
  welcome: string
  channel: string
  channel_url: string
  channel_title: string
  channel_about: string
  timezone: string
  author_links: { label: string; url: string }[]
  theme: { accent: string; accent2: string }
  texts: Record<string, string>
  spoiler_levels: SpoilerLevel[]
  predictions: { current_season: string; season_label: string; base_points: number; bold_threshold: number; bold_multiplier: number }
  geo: { rounds: number; max_score: number; leagues_per_unit: number }
  daily: { max_attempts: number; hint_quote_after: number; hint_crest_after: number; crest_attempts: number }
  app_link: string
  disclaimer: string
  features: { predictions: boolean; chat: boolean }
}
export type HouseRef = { id: string; name: string; words: string; region: string; seat: string; great: boolean; crest: Blazon }
export type MapMeta = { file: string; width: number; height: number; title: string }
export type Config = {
  tenant: Tenant
  share_link: string | null
  attributes: { key: string; label: string; type: 'category' | 'ordinal' | 'set' }[]
  houses: HouseRef[]
  map: MapMeta
}

export type User = {
  id: number
  first_name: string
  username: string | null
  photo_url: string | null
  is_admin: boolean
  house: string | null
  points: number
  spoiler_level: number | null
  notify_daily: boolean
  notify_predictions: boolean
}
export type Me = { user: User; subscription: { channel: string; url: string; title: string; ok: boolean }; server_ms: number }

export type Cell = { key: string; status: 'hit' | 'partial' | 'miss'; arrow: 'up' | 'down' | null; value: string }
export type DailyStats = { played: number; won: number; streak: number; best_streak: number; dist: Record<string, number> }
export type CharacterDaily = {
  max_attempts: number
  guesses: { id: string; name: string; cells: Cell[]; correct: boolean }[]
  solved: boolean
  finished: boolean
  hints: { quote: string | null; crest: Blazon | null }
  answer: { id: string; name: string; bio: string; house: string | null } | null
  points?: number
  stats: DailyStats
}
export type CrestDaily = {
  max_attempts: number
  guesses: { house: string; name: string; correct: boolean }[]
  solved: boolean
  finished: boolean
  stage: { crest: Blazon; engraved: boolean; fade: number; words: string | null }
  answer: { house: string; name: string; words: string; crest: Blazon } | null
  stats: DailyStats
}
export type Daily = { day: string; number: number; next_ms: number; character: CharacterDaily; crest: CrestDaily }
export type NameRef = { id: string; name: string; aliases: string[]; house?: string | null }

export type QuizQ = { id: string; text: string; answers: string[] }
export type Quiz = { title: string; intro: string; questions: QuizQ[] }
export type QuizResult = {
  house: string
  name: string
  words: string
  text: string
  crest: Blazon
  ranking: { house: string; name: string; pct: number; score: number }[]
}
export type HouseStats = { total: number; houses: Record<string, number> }

export type PEvent = {
  id: number
  question: string
  options: string[]
  deadline_ms: number
  tag: string
  season: string
  status: 'open' | 'resolved' | 'cancelled'
  open: boolean
  my_vote: number | null
  votes: number
  correct: number | null
  base_points: number
  bold_threshold: number
  bold_multiplier: number
  distribution: { option: number; votes: number; share: number }[] | null
  my_points: number | null
  payout?: { winners: number; paid: number; points: number; bold: boolean }
}
export type TopRow = { rank: number; id: number; name: string; photo_url: string | null; house: string | null; points: number; me: boolean }
export type Top = { period: string; scope: string; season_label: string; top: TopRow[]; me: { rank: number | null; points: number } }

export type MapLocation = {
  id: string
  name: string
  x: number
  y: number
  kind: string
  region: string
  rank: number
  description: string
  houses: { id: string; name: string }[]
  characters: { id: string; name: string }[]
}
export type MapPath = { character: string; name: string; stops: { location: string; note: string }[] }
export type HousePin = { house: string; name: string; words: string; location: string; x: number; y: number; count: number; pct: number; crest: Blazon }
export type WorldMap = { level: number; map: MapMeta; locations: MapLocation[]; paths: MapPath[]; hidden: { x: number; y: number }[]; houses: { total: number; items: HousePin[] }; my_house: string | null }
export type GeoResult = { x: number; y: number; score: number; distance: number; answer: { id: string; name: string; x: number; y: number } }
export type GeoSession = {
  id: number
  mode: 'practice' | 'daily'
  day: string | null
  round: number
  rounds: number
  max_score: number
  total: number
  finished: boolean
  clue: { kind: string; text: string; crest: Blazon | null } | null
  results: GeoResult[]
  last?: GeoResult
}
export type GeoDaily = { day: string; session: GeoSession | null; top: TopRow[] }

export type Profile = {
  user: User
  since_ms: number
  daily: { character: DailyStats; crest: DailyStats }
  quiz: { house: string; scores: { house: string; pct: number }[] } | null
  ranks: { all: { rank: number | null; points: number }; season: { rank: number | null; points: number }; week: { rank: number | null; points: number } }
  predictions_won: number
}

export type AdminStatus = {
  channel: string
  bot_running: boolean
  bot_username: string | null
  bot_is_admin: boolean | null
  gate_problem: { text: string; ms: number } | null
  dev_auth: boolean
}
export type AdminStats = {
  days: { day: string; dau: number; new: number; daily_played: number; daily_solved: number; shares: number }[]
  totals: { players: number; quiz_done: number; votes: number; shares: number; notify_daily: number }
  share_kinds: Record<string, number>
  houses: Record<string, number>
}
export type ChatMessage = { id: number; text: string; ms: number; me: boolean; user: { id: number; name: string; photo_url: string | null; house: string | null } }
export type ContentKind = 'characters' | 'houses' | 'locations' | 'clues'
export type ShareKind = 'share_daily' | 'share_crest' | 'share_quiz' | 'share_geo'

// ---------- calls ----------

export const api = {
  config: () => request<Config>('/config'),
  me: () => request<Me>('/me'),
  subscriptionCheck: () => post<{ ok: boolean }>('/subscription/check'),
  settings: (b: Partial<Pick<User, 'spoiler_level' | 'notify_daily' | 'notify_predictions'>>) => post<User>('/me/settings', b),
  profile: () => request<Profile>('/profile'),

  daily: () => request<Daily>('/daily'),
  characterNames: () => request<NameRef[]>('/daily/characters'),
  guessCharacter: (id: string) => post<Daily>('/daily/character/guess', { id }),
  guessCrest: (house: string) => post<Daily>('/daily/crest/guess', { house }),
  dailyShare: (mode: 'character' | 'crest') => request<{ text: string }>(`/daily/share/${mode}`),

  quiz: () => request<Quiz>('/quiz'),
  submitQuiz: (answers: number[]) => post<QuizResult & { stats: HouseStats }>('/quiz', { answers }),
  quizResult: () => request<{ result: QuizResult | null; stats: HouseStats }>('/quiz/result'),

  predictions: () => request<{ events: PEvent[]; season_label: string }>('/predictions'),
  vote: (id: number, option: number) => post<PEvent>(`/predictions/${id}/vote`, { option }),
  top: (period: 'week' | 'season' | 'all', scope: 'all' | 'predictions') => request<Top>(`/top?period=${period}&scope=${scope}`),

  map: (level?: number) => request<WorldMap>(`/map${level ? `?level=${level}` : ''}`),
  geoStart: (mode: 'practice' | 'daily') => post<GeoSession>('/geo/start', { mode }),
  geoGuess: (id: number, x: number, y: number) => post<GeoSession>(`/geo/${id}/guess`, { x, y }),
  geoDaily: () => request<GeoDaily>('/geo/daily'),
  geoShare: (id: number) => request<{ text: string }>(`/geo/${id}/share`),

  chat: (after = 0) => request<{ messages: ChatMessage[]; banned: boolean; max_length: number }>(`/chat${after ? `?after=${after}` : ''}`),
  chatSend: (text: string) => post<ChatMessage>('/chat', { text }),
  chatDelete: (id: number) => request<{ ok: boolean }>(`/chat/${id}`, { method: 'DELETE' }),
  chatBan: (userId: number, banned = true) => post<{ ok: boolean }>(`/chat/ban/${userId}`, { banned }),

  shareCard: (png_base64: string) => post<{ id: string }>('/share/card', { png_base64 }),
  sharePrepare: (kind: ShareKind, text: string, card_id?: string) =>
    post<{ prepared_id: string | null; fallback_url: string; text: string }>('/share/prepare', { kind, text, card_id }),

  admin: {
    status: () => request<AdminStatus>('/admin/status'),
    stats: (days = 14) => request<AdminStats>(`/admin/stats?days=${days}`),
    events: () => request<PEvent[]>('/admin/events'),
    createEvent: (b: { question: string; options: string[]; deadline_ms: number; tag: string; base_points: number }) =>
      post<PEvent>('/admin/events', b),
    closeEvent: (id: number) => post<PEvent>(`/admin/events/${id}/close`),
    resolveEvent: (id: number, correct: number) => post<PEvent>(`/admin/events/${id}/resolve`, { correct }),
    cancelEvent: (id: number) => post<PEvent>(`/admin/events/${id}/cancel`),
    content: (kind: ContentKind) => request<{ kind: string; items: Record<string, unknown>[] }>(`/admin/content/${kind}`),
    saveContent: (kind: ContentKind, id: string, data: unknown) =>
      request<{ ok: boolean }>(`/admin/content/${kind}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    revertContent: (kind: ContentKind, id: string) => request<{ ok: boolean }>(`/admin/content/${kind}/${id}`, { method: 'DELETE' }),
  },
}

export function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    const map: Record<string, string> = {
      deadline_passed: 'Приём прогнозов закрыт',
      already_guessed: 'Этот вариант уже был',
      finished: 'Игра на сегодня окончена',
      subscription_required: 'Нужна подписка на канал',
      unknown_character: 'Такого персонажа нет в архиве',
      unknown_house: 'Такого дома нет в архиве',
      too_fast: 'Не так быстро: подождите пару секунд',
      no_links: 'Ссылки и упоминания в чате запрещены',
      chat_banned: 'Администратор закрыл вам чат',
      too_long: 'Слишком длинное сообщение',
      empty: 'Пустое сообщение',
    }
    if (typeof e.detail === 'string') return map[e.detail] ?? e.detail
    return 'Ошибка проверки данных'
  }
  return 'Нет связи с сервером'
}
