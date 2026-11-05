import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

import { Art } from '../art'
import { Button, Radio, Rubric, Skeleton } from '../components/ui'
import { Crest } from '../heraldry'
import { api, errorText, type HouseStats, type QuizResult } from '../lib/api'
import { houseCard } from '../lib/card'
import { shareResult } from '../lib/share'
import { bindBack, haptic, hapticResult } from '../lib/telegram'
import { useToast } from '../lib/toast'
import { houseById, useApp } from '../store/app'
import { ease, roman } from '../lib/format'

export function QuizScreen({ onboarding = false, onDone }: { onboarding?: boolean; onDone: () => void }) {
  const cfg = useApp((s) => s.config)!
  const patchUser = useApp((s) => s.patchUser)
  const qc = useQueryClient()
  const toast = useToast((s) => s.show)
  const quiz = useQuery({ queryKey: ['quiz'], queryFn: api.quiz, staleTime: Infinity })
  const [step, setStep] = useState(-1)
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<(QuizResult & { stats: HouseStats }) | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => bindBack(onDone), [onDone])

  async function pick(i: number) {
    haptic('light')
    const next = [...answers.slice(0, step), i]
    setAnswers(next)
    if (step + 1 < quiz.data!.questions.length) {
      setStep(step + 1)
      return
    }
    setBusy(true)
    try {
      const r = await api.submitQuiz(next)
      hapticResult('success')
      setResult(r)
      patchUser({ house: r.house })
      qc.invalidateQueries({ queryKey: ['profile'] })
    } catch (e) {
      toast(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  async function share() {
    if (!result) return
    setBusy(true)
    try {
      const png = await houseCard({ appName: cfg.tenant.app_name, house: result.name, words: result.words, text: result.text, crest: result.crest, ranking: result.ranking })
      await shareResult('share_quiz', `Мой дом: ${result.name}${result.words ? ` («${result.words}»)` : ''}. А ваш?`, png)
    } finally {
      setBusy(false)
    }
  }

  const q = quiz.data
  return (
    <div className="paper no-scrollbar fixed inset-0 z-30 mx-auto max-w-[480px] overflow-y-auto">
      <div className="relative flex min-h-full flex-col px-6 pt-4 pb-[max(24px,env(safe-area-inset-bottom))] safe-top">
        <div className="double-rule-b flex items-baseline justify-between pb-2">
          <span className="sc text-sm text-ink-muted">{q?.title ?? 'Тест'}</span>
          <button type="button" onClick={onDone} className="sc text-sm text-ink-muted underline decoration-rule-strong underline-offset-4">{result ? 'готово' : onboarding ? 'позже' : 'закрыть'}</button>
        </div>
        {!q ? (
          <Skeleton lines={6} />
        ) : result ? (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={ease} className="flex flex-1 flex-col gap-5 pt-6">
            <div className="flex items-end gap-5">
              <Crest blazon={result.crest} size={120} />
              <div className="pb-1">
                <div className="sc text-xs text-ink-muted">ваш дом</div>
                <h1 className="sc m-0 text-xl leading-tight font-medium">{result.name}</h1>
                {result.words && <p className="m-0 text-base italic text-ink-muted">«{result.words}»</p>}
              </div>
            </div>
            <p className="dropcap m-0 text-base">{result.text}</p>
            <section className="flex flex-col gap-2">
              <Rubric>Ближайшие дома</Rubric>
              {result.ranking.map((r, i) => (
                <div key={r.house} className="rule-b flex items-center gap-3 py-1.5">
                  <Crest blazon={houseById(cfg, r.house)?.crest} size={22} engraved={i > 0} />
                  <span className={`flex-1 ${i === 0 ? '' : 'text-ink-muted'}`}>{r.name}</span>
                  <span className="num text-sm">{r.pct}%</span>
                </div>
              ))}
            </section>
            {result.stats.total > 0 && (
              <p className="m-0 text-sm text-ink-muted">
                <span className="num text-ink">{result.stats.houses[result.house] ?? 0}%</span> игроков{cfg.tenant.channel_title ? ` канала ${cfg.tenant.channel_title}` : ''} тоже здесь.
              </p>
            )}
            <div className="mt-auto flex flex-col items-start gap-3 pt-2">
              <Button onClick={share} disabled={busy} icon="seal" className="w-full">{busy ? 'Ставим печать…' : 'Отправить карточку'}</Button>
              <Button kind="link" onClick={onDone}>{onboarding ? 'В архив' : 'Готово'}</Button>
            </div>
          </motion.div>
        ) : step < 0 ? (
          <div className="flex flex-1 flex-col justify-center gap-5">
            <div className="h-[150px] overflow-hidden rounded-2xl border border-rule [&>svg]:h-full [&>svg]:w-full"><Art name="castle" /></div>
            <h1 className="sc m-0 text-2xl leading-tight font-medium">{q.title}</h1>
            <p className="dropcap m-0 text-base">{onboarding && cfg.tenant.welcome ? `${cfg.tenant.welcome} ` : ''}{q.intro}</p>
            <div className="flex gap-1.5 py-1">
              {cfg.houses.filter((h) => h.great).slice(0, 7).map((h) => <Crest key={h.id} blazon={h.crest} size={30} engraved />)}
            </div>
            <Button onClick={() => setStep(0)} className="w-full">Начать</Button>
            <p className="num m-0 text-sm text-ink-muted">{q.questions.length} вопросов, без правильных ответов.</p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col pt-6">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={ease} className="grid grid-cols-[2rem_1fr] gap-x-2">
                <span className="sc pt-1.5 text-sm text-gilt">{roman(step + 1)}</span>
                <h2 className="m-0 text-lg leading-snug font-normal">{q.questions[step].text}</h2>
                <ul className="col-start-2 mt-4 mb-0 list-none p-0">
                  {q.questions[step].answers.map((a, i) => (
                    <li key={i} className="mb-2">
                      <button type="button" disabled={busy} onClick={() => pick(i)} className={`press flex w-full items-start gap-3 rounded-xl border-2 p-3.5 text-left text-[15px] ${answers[step] === i ? 'border-gilt bg-gilt/10' : 'border-rule bg-paper-2'}`}>
                        <span className="mt-1"><Radio on={answers[step] === i} /></span>
                        {a}
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
            <div className="num mt-auto flex items-center justify-between pt-6 text-sm text-ink-muted">
              {step > 0 ? <button type="button" onClick={() => setStep(step - 1)} className="underline decoration-rule-strong underline-offset-4">назад</button> : <span />}
              <span>{roman(step + 1)} из {roman(q.questions.length)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
