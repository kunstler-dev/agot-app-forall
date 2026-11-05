// Default UI strings. A tenant can override any of them with "texts" in tenant.json.

const DEFAULTS = {
  'tab.today': 'Сегодня',
  'tab.predictions': 'Прогнозы',
  'tab.geo': 'Где это?',
  'tab.chat': 'Чат',
  'tab.map': 'Карта',
  'tab.profile': 'Профиль',
  'gate.title': 'Вход для подписчиков',
  'gate.text': 'Архив открыт подписчикам канала. Подпишитесь и возвращайтесь.',
  'gate.subscribe': 'Подписаться',
  'gate.check': 'Я подписался, проверить',
  'gate.fail': 'В списках вас пока нет. Подпишитесь и проверьте ещё раз.',
  'daily.character': 'Персонаж дня',
  'daily.crest': 'Герб дня',
  'daily.character.prompt': 'Запишите имя. Каждая запись покажет, что совпало.',
  'daily.crest.prompt': 'Чей герб? С каждой ошибкой проступает больше.',
  'daily.input': 'Имя персонажа',
  'daily.crest.input': 'Название дома',
  'quiz.cta': 'Пройти тест',
  'quiz.house': 'Дом',
  'predictions.title': 'Прогнозы',
  'predictions.subtitle': 'Записи принимаются до срока. Угадавший редкий исход получает вдвое.',
  'map.title': 'Карта',
  'map.spoiler': 'Прочитано и просмотрено до…',
  'geo.title': 'Где это?',
  'geo.subtitle': 'Прочтите запись и отметьте место на карте. Чем ближе, тем больше очков.',
  'profile.points': 'очков',
  'about.title': 'О приложении',
}

export type TextKey = keyof typeof DEFAULTS

let overrides: Record<string, string> = {}

export function setTexts(t: Record<string, string>) {
  overrides = t ?? {}
}

export function t(key: TextKey): string {
  return overrides[key] ?? DEFAULTS[key]
}

export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

export function timeLeft(ms: number): string {
  if (ms <= 0) return 'закрыто'
  const m = Math.floor(ms / 60000)
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  if (d > 0) return `${d} ${plural(d, 'день', 'дня', 'дней')} ${h} ч`
  if (h > 0) return `${h} ч ${m % 60} мин`
  return `${Math.max(1, m)} мин`
}

export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const hh = String(Math.floor(s / 3600)).padStart(2, '0')
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}
