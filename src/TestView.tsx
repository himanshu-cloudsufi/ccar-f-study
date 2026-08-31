import { useEffect, useMemo, useRef, useState } from "react"
import { questions, type Question } from "@/data/questions"
import {
  clearHistory,
  emptyHistory,
  formatAttemptDate,
  loadHistory,
  missedIds,
  recordAttempt,
  MASTERY_STREAK,
  type History,
  type QuestionOutcome,
} from "@/lib/history"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { LeaderboardBoard, SubmitScore } from "@/LeaderboardPanel"

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface TestQuestion extends Question {
  shuffledOptions: string[]
  shuffledAnswers: number[] // correct indexes within shuffledOptions
}

/** Exam format: 4 of the 6 scenarios, 15 questions each, 120 minutes. */
const EXAM_SCENARIO_COUNT = 4
const EXAM_PER_SCENARIO = 15
const EXAM_MINUTES = 120
const SECONDS_PER_QUESTION = 120

const scenarios: { id: string; label: string; count: number }[] = (() => {
  const map = new Map<string, { id: string; label: string; count: number }>()
  for (const q of questions) {
    const e = map.get(q.scenarioId)
    if (e) e.count++
    else map.set(q.scenarioId, { id: q.scenarioId, label: q.scenario, count: 1 })
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id))
})()

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function toTestQuestion(q: Question): TestQuestion {
  const order = shuffle(q.options.map((_, i) => i))
  return {
    ...q,
    shuffledOptions: order.map((i) => q.options[i]),
    shuffledAnswers: q.answers.map((a) => order.indexOf(a)).sort((x, y) => x - y),
  }
}

function sameSet(a: number[] | undefined, b: number[]) {
  if (!a || a.length !== b.length) return false
  const s = [...a].sort((x, y) => x - y)
  return s.every((v, i) => v === b[i])
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, "0")}`
}

// ─── Test construction ────────────────────────────────────────────────────────

interface ActiveTest {
  label: string
  questions: TestQuestion[]
  /** null = untimed */
  durationSec: number | null
  /** scenario labels this test was drawn from, when the draw is worth showing */
  drawnScenarios: string[] | null
}

function randomTest(label: string, count: number): ActiveTest {
  const picked = shuffle(questions).slice(0, count).map(toTestQuestion)
  return {
    label,
    questions: picked,
    durationSec: picked.length * SECONDS_PER_QUESTION,
    drawnScenarios: null,
  }
}

function examTest(): ActiveTest {
  const drawn = shuffle(scenarios).slice(0, EXAM_SCENARIO_COUNT)
  const picked = drawn.flatMap((s) =>
    // Real exam format is single-answer only (official guide v0.2)
    shuffle(
      questions.filter((q) => q.scenarioId === s.id && !q.multiSelect)
    ).slice(
      0,
      EXAM_PER_SCENARIO
    )
  )
  return {
    label: "Exam simulation",
    questions: shuffle(picked).map(toTestQuestion),
    durationSec: EXAM_MINUTES * 60,
    drawnScenarios: drawn.map((s) => s.label),
  }
}

function mistakesTest(ids: string[]): ActiveTest {
  const set = new Set(ids)
  const picked = shuffle(questions.filter((q) => set.has(q.id))).map(toTestQuestion)
  return {
    label: "Mistakes drill",
    questions: picked,
    durationSec: null,
    drawnScenarios: null,
  }
}

function targetedTest(
  scenarioIds: string[],
  count: number | "all",
  timed: boolean
): ActiveTest {
  const pool = shuffle(questions.filter((q) => scenarioIds.includes(q.scenarioId)))
  const picked = (count === "all" ? pool : pool.slice(0, count)).map(toTestQuestion)
  const labels = scenarios
    .filter((s) => scenarioIds.includes(s.id))
    .map((s) => s.label)
  return {
    label: "Targeted practice",
    questions: picked,
    durationSec: timed ? picked.length * SECONDS_PER_QUESTION : null,
    drawnScenarios: labels,
  }
}

// ─── Question navigator ───────────────────────────────────────────────────────

function Navigator({
  test,
  answers,
  flagged,
  current,
  onJump,
  onSubmit,
}: {
  test: TestQuestion[]
  answers: Record<string, number[]>
  flagged: Record<string, boolean>
  current: number
  onJump: (i: number) => void
  onSubmit: () => void
}) {
  const [open, setOpen] = useState(true)
  const answeredCount = test.filter((q) => (answers[q.id]?.length ?? 0) > 0).length
  const flaggedCount = test.filter((q) => flagged[q.id]).length

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-sm font-medium hover:underline"
          >
            {open ? "▾" : "▸"} Question navigator
          </button>
          <Badge variant="secondary">
            {answeredCount}/{test.length} answered
          </Badge>
          {flaggedCount > 0 && (
            <Badge variant="outline">🚩 {flaggedCount} flagged</Badge>
          )}
          <Button
            size="sm"
            variant="destructive"
            className="ml-auto"
            onClick={onSubmit}
          >
            Submit test
          </Button>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1.5">
            {test.map((q, i) => {
              const isAnswered = (answers[q.id]?.length ?? 0) > 0
              const isFlagged = flagged[q.id]
              const isCurrent = i === current
              return (
                <button
                  key={q.id}
                  onClick={() => onJump(i)}
                  title={isFlagged ? "Flagged for review" : undefined}
                  className={`relative h-8 w-8 rounded-md border text-xs font-medium transition-colors ${
                    isFlagged
                      ? "border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-400"
                      : isAnswered
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted text-muted-foreground hover:bg-accent"
                  } ${isCurrent ? "ring-2 ring-ring ring-offset-1" : ""}`}
                >
                  {i + 1}
                  {isFlagged && isAnswered && (
                    <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Filled = answered · amber = flagged for review (dot means answered too)
            · outlined = not yet answered
          </p>
        </CardContent>
      )}
    </Card>
  )
}

// ─── Intro screen ─────────────────────────────────────────────────────────────

function IntroScreen({
  history,
  onStart,
  onClearHistory,
}: {
  history: History
  onStart: (t: ActiveTest) => void
  onClearHistory: () => void
}) {
  const [picked, setPicked] = useState<string[]>([])
  const [timed, setTimed] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const missed = useMemo(() => missedIds(history), [history])
  const targetedPool = useMemo(
    () => questions.filter((q) => picked.includes(q.scenarioId)).length,
    [picked]
  )
  const recent = useMemo(() => [...history.attempts].reverse().slice(0, 10), [
    history.attempts,
  ])

  const toggleScenario = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const startTargeted = (count: number | "all") => {
    if (!picked.length) return
    onStart(targetedTest(picked, count, timed))
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>CCAR-F Mock Test</CardTitle>
          <CardDescription>
            A bank of {questions.length} questions covering all six exam
            scenarios. Questions and options are shuffled each attempt. The
            exam simulation mirrors the real format (single-answer only, 4
            random scenarios); a few multi-select drill items appear in the
            other modes as extra practice. The real exam passing bar is a
            scaled 720/1000 — aim for 75%+ here.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={() => onStart(examTest())}>
            🎯 Exam simulation — 4 random scenarios × {EXAM_PER_SCENARIO} questions ·{" "}
            {EXAM_MINUTES} min
          </Button>
          <Button variant="secondary" onClick={() => onStart(randomTest("Quick quiz", 15))}>
            ⚡ Quick quiz — 15 questions · 30 min
          </Button>
          <Button
            variant="outline"
            onClick={() => onStart(randomTest("Full bank", questions.length))}
          >
            🏋️ Full bank — {questions.length} questions
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Review my mistakes</CardTitle>
          <CardDescription>
            Questions you got wrong or skipped stay here until you answer them
            correctly {MASTERY_STREAK} times.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="secondary"
            className="w-full"
            disabled={missed.length === 0}
            onClick={() => onStart(mistakesTest(missed))}
          >
            🔁 Review my mistakes — {missed.length} question
            {missed.length === 1 ? "" : "s"}
          </Button>
          {missed.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Nothing to review yet — take a test, and anything you miss lands
              here automatically.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Targeted practice</CardTitle>
          <CardDescription>
            Pick one or more scenarios, then choose how many questions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2">
            {scenarios.map((s) => {
              const on = picked.includes(s.id)
              return (
                <button
                  key={s.id}
                  onClick={() => toggleScenario(s.id)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-accent"
                  }`}
                >
                  {s.label} · {s.count}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Start:</span>
            <Button
              size="sm"
              variant="outline"
              disabled={!picked.length}
              onClick={() => startTargeted(10)}
            >
              10
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!picked.length || targetedPool < 20}
              onClick={() => startTargeted(20)}
            >
              20
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!picked.length}
              onClick={() => startTargeted("all")}
            >
              All {picked.length ? `(${targetedPool})` : ""}
            </Button>
            <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={timed}
                onCheckedChange={(v) => setTimed(v === true)}
              />
              Timed at exam pace
            </label>
          </div>
          {!picked.length && (
            <p className="mt-2 text-xs text-muted-foreground">
              Select at least one scenario.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Attempt history</CardTitle>
            {recent.length > 0 &&
              (confirmClear ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      onClearHistory()
                      setConfirmClear(false)
                    }}
                  >
                    Erase everything
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmClear(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="text-xs text-muted-foreground hover:text-destructive hover:underline"
                >
                  Clear history
                </button>
              ))}
          </div>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No attempts recorded yet. Scores are stored in this browser only.
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {recent.map((a, i) => {
                const prev = recent[i + 1]
                const delta = prev ? a.percent - prev.percent : null
                return (
                  <li
                    key={a.id}
                    className="flex items-center gap-2 py-1.5 text-sm"
                  >
                    <span className="w-28 shrink-0 text-xs text-muted-foreground">
                      {formatAttemptDate(a.date)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs">
                      {a.mode}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {a.score}/{a.total}
                    </span>
                    <Badge
                      variant={
                        a.percent >= 75
                          ? "default"
                          : a.percent >= 50
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {a.percent}%
                    </Badge>
                    <span
                      className={`w-8 shrink-0 text-xs ${
                        delta === null
                          ? "text-muted-foreground"
                          : delta > 0
                            ? "text-green-600 dark:text-green-400"
                            : delta < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-muted-foreground"
                      }`}
                    >
                      {delta === null
                        ? "–"
                        : delta > 0
                          ? `▲${delta}`
                          : delta < 0
                            ? `▼${Math.abs(delta)}`
                            : "="}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <LeaderboardBoard />
    </div>
  )
}

// ─── Test view ────────────────────────────────────────────────────────────────

type TestPhase = "intro" | "running" | "results"

export default function TestView() {
  const [phase, setPhase] = useState<TestPhase>("intro")
  const [history, setHistory] = useState<History>(emptyHistory)
  const [test, setTest] = useState<ActiveTest | null>(null)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number[]>>({})
  const [flagged, setFlagged] = useState<Record<string, boolean>>({})
  const [elapsed, setElapsed] = useState(0)
  const [confirmSubmit, setConfirmSubmit] = useState(false)

  const finishedRef = useRef(false)
  const stateRef = useRef({ test, answers, history })
  stateRef.current = { test, answers, history }

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  const start = (t: ActiveTest) => {
    if (!t.questions.length) return
    finishedRef.current = false
    setTest(t)
    setAnswers({})
    setFlagged({})
    setCurrent(0)
    setElapsed(0)
    setConfirmSubmit(false)
    setPhase("running")
    window.scrollTo({ top: 0 })
  }

  const finish = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    const { test: t, answers: a, history: h } = stateRef.current
    if (t) {
      const now = Date.now()
      const outcomes: QuestionOutcome[] = t.questions.map((q) => ({
        q: q.id,
        c: sameSet(a[q.id], q.shuffledAnswers),
        t: now,
      }))
      setHistory(recordAttempt(h, t.label, outcomes))
    }
    setConfirmSubmit(false)
    setPhase("results")
    window.scrollTo({ top: 0 })
  }

  // Clock: counts up always; timed tests auto-submit when the budget runs out.
  useEffect(() => {
    if (phase !== "running") return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase !== "running" || !test?.durationSec) return
    if (elapsed >= test.durationSec) finish()
  }, [elapsed, phase, test])

  const score = useMemo(
    () =>
      test
        ? test.questions.filter((q) => sameSet(answers[q.id], q.shuffledAnswers))
            .length
        : 0,
    [test, answers]
  )

  if (phase === "intro" || !test) {
    return (
      <IntroScreen
        history={history}
        onStart={start}
        onClearHistory={() => setHistory(clearHistory())}
      />
    )
  }

  const items = test.questions

  if (phase === "results") {
    const pct = Math.round((score / items.length) * 100)
    const passed = pct >= 75
    const missedNow = missedIds(history)

    const byScenario = new Map<string, { total: number; correct: number }>()
    for (const q of items) {
      const e = byScenario.get(q.scenario) ?? { total: 0, correct: 0 }
      e.total++
      if (sameSet(answers[q.id], q.shuffledAnswers)) e.correct++
      byScenario.set(q.scenario, e)
    }

    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {passed ? "Pass-level score 🎉" : "Keep studying"}
              <Badge variant={passed ? "default" : "destructive"}>
                {score}/{items.length} · {pct}%
              </Badge>
            </CardTitle>
            <CardDescription>
              {test.label}
              {test.drawnScenarios
                ? ` · ${test.drawnScenarios.join(", ")}`
                : ""}
              {". "}
              {passed
                ? "You're at or above the ~75% target that maps to the 720 scaled passing score."
                : "Below the ~75% target. Review the explanations below, then revisit the weak scenarios in Learn mode."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={pct} className="mb-5" />
            <div className="mb-5 grid gap-2 sm:grid-cols-2">
              {[...byScenario.entries()]
                .sort(
                  (a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total
                )
                .map(([scen, s]) => {
                  const p = Math.round((s.correct / s.total) * 100)
                  return (
                    <div
                      key={scen}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="truncate">{scen}</span>
                      <Badge
                        variant={
                          p >= 75 ? "default" : p >= 50 ? "secondary" : "destructive"
                        }
                      >
                        {s.correct}/{s.total}
                      </Badge>
                    </div>
                  )
                })}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setPhase("intro")}>Take another test</Button>
              {missedNow.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => start(mistakesTest(missedNow))}
                >
                  🔁 Drill my {missedNow.length} missed question
                  {missedNow.length === 1 ? "" : "s"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {test.label === "Exam simulation" && (
          <div className="mb-6">
            <SubmitScore
              score={score}
              total={items.length}
              scenarios={test.drawnScenarios}
            />
          </div>
        )}

        <h2 className="mb-4 text-lg font-semibold">Answer review</h2>
        <div className="flex flex-col gap-4">
          {items.map((q, i) => {
            const chosen = answers[q.id]
            const correct = sameSet(chosen, q.shuffledAnswers)
            return (
              <Card
                key={q.id}
                className={correct ? "border-green-500/50" : "border-red-500/50"}
              >
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={correct ? "default" : "destructive"}>
                      {correct ? "Correct" : !chosen?.length ? "Skipped" : "Wrong"}
                    </Badge>
                    <Badge variant="outline">{q.scenario}</Badge>
                    {q.multiSelect && <Badge variant="secondary">Multi-select</Badge>}
                    {flagged[q.id] && <Badge variant="outline">🚩 Flagged</Badge>}
                  </div>
                  <CardTitle className="text-base font-medium">
                    {i + 1}. {q.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <ul className="mb-3 flex flex-col gap-1">
                    {q.shuffledOptions.map((opt, oi) => {
                      const isCorrect = q.shuffledAnswers.includes(oi)
                      const wasChosen = chosen?.includes(oi)
                      return (
                        <li
                          key={oi}
                          className={`rounded-md px-3 py-1.5 ${
                            isCorrect
                              ? "bg-green-500/10 font-medium text-green-700 dark:text-green-400"
                              : wasChosen
                                ? "bg-red-500/10 text-red-700 dark:text-red-400"
                                : "text-muted-foreground"
                          }`}
                        >
                          {String.fromCharCode(65 + oi)}. {opt}
                          {isCorrect && " ✓"}
                          {wasChosen && !isCorrect && " ✗ (your answer)"}
                        </li>
                      )
                    })}
                  </ul>
                  <Separator className="mb-3" />
                  {q.explanation && (
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Why: </span>
                      {q.explanation}
                    </p>
                  )}
                  {q.wrongAnswerNotes && (
                    <p className="mt-2 text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Why the others are wrong:{" "}
                      </span>
                      {q.wrongAnswerNotes}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  // ── running ──
  const q = items[current]
  const chosen = answers[q.id] ?? []
  const answeredCount = items.filter((x) => (answers[x.id]?.length ?? 0) > 0).length
  const unansweredCount = items.length - answeredCount
  const flaggedCount = items.filter((x) => flagged[x.id]).length
  const remaining = test.durationSec !== null ? test.durationSec - elapsed : null

  const toggleMulti = (oi: number) =>
    setAnswers((a) => {
      const cur = a[q.id] ?? []
      return {
        ...a,
        [q.id]: cur.includes(oi) ? cur.filter((x) => x !== oi) : [...cur, oi],
      }
    })

  const requestSubmit = () => {
    if (unansweredCount > 0 || flaggedCount > 0) setConfirmSubmit(true)
    else finish()
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-1 flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          Question {current + 1} of {items.length} · {answeredCount} answered
        </div>
        {remaining !== null ? (
          <Badge variant={remaining < 300 ? "destructive" : "secondary"}>
            ⏱ {formatTime(Math.max(0, remaining))}
          </Badge>
        ) : (
          <Badge variant="outline">Untimed · {formatTime(elapsed)}</Badge>
        )}
      </div>
      <div className="mb-3 text-xs text-muted-foreground">
        {test.label}
        {test.drawnScenarios
          ? ` — scenarios drawn: ${test.drawnScenarios.join(", ")}`
          : ""}
      </div>
      <Progress value={((current + 1) / items.length) * 100} className="mb-6" />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="w-fit">
              {q.scenario}
            </Badge>
            {q.multiSelect && (
              <Badge variant="secondary">
                Multi-select — choose {q.shuffledAnswers.length}
              </Badge>
            )}
            <Button
              size="sm"
              variant={flagged[q.id] ? "default" : "outline"}
              className="ml-auto"
              onClick={() =>
                setFlagged((f) => ({ ...f, [q.id]: !f[q.id] }))
              }
            >
              {flagged[q.id] ? "🚩 Flagged" : "🏳 Flag for review"}
            </Button>
          </div>
          <CardTitle className="text-base font-medium leading-relaxed">
            {q.question}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {q.multiSelect ? (
            <div className="flex flex-col gap-3">
              {q.shuffledOptions.map((opt, oi) => (
                <label
                  key={oi}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-accent ${
                    chosen.includes(oi) ? "border-primary bg-accent" : "border-border"
                  }`}
                >
                  <Checkbox
                    checked={chosen.includes(oi)}
                    onCheckedChange={() => toggleMulti(oi)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="mr-1 font-medium">
                      {String.fromCharCode(65 + oi)}.
                    </span>
                    {opt}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <RadioGroup
              key={q.id}
              value={chosen[0]?.toString() ?? ""}
              onValueChange={(v) =>
                setAnswers((a) => ({ ...a, [q.id]: [Number(v)] }))
              }
              className="gap-3"
            >
              {q.shuffledOptions.map((opt, oi) => (
                <label
                  key={oi}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-accent ${
                    chosen[0] === oi ? "border-primary bg-accent" : "border-border"
                  }`}
                >
                  <RadioGroupItem value={oi.toString()} className="mt-0.5" />
                  <span>
                    <span className="mr-1 font-medium">
                      {String.fromCharCode(65 + oi)}.
                    </span>
                    {opt}
                  </span>
                </label>
              ))}
            </RadioGroup>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          disabled={current === 0}
          onClick={() => setCurrent((c) => c - 1)}
        >
          ← Previous
        </Button>
        {current < items.length - 1 ? (
          <Button onClick={() => setCurrent((c) => c + 1)}>Next →</Button>
        ) : (
          <Button variant="destructive" onClick={requestSubmit}>
            Submit test
          </Button>
        )}
      </div>

      <Navigator
        test={items}
        answers={answers}
        flagged={flagged}
        current={current}
        onJump={(i) => {
          setCurrent(i)
          window.scrollTo({ top: 0 })
        }}
        onSubmit={requestSubmit}
      />

      {confirmSubmit && (
        <Card className="mt-4 border-destructive/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Submit now?</CardTitle>
            <CardDescription>
              {unansweredCount > 0 &&
                `${unansweredCount} question${
                  unansweredCount === 1 ? "" : "s"
                } still unanswered`}
              {unansweredCount > 0 && flaggedCount > 0 && " · "}
              {flaggedCount > 0 &&
                `${flaggedCount} still flagged for review`}
              . Unanswered questions count as wrong and go into your mistakes
              pool.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="destructive" onClick={finish}>
              Submit anyway
            </Button>
            <Button variant="outline" onClick={() => setConfirmSubmit(false)}>
              Keep working
            </Button>
            {unansweredCount > 0 && (
              <Button
                variant="ghost"
                onClick={() => {
                  const i = items.findIndex(
                    (x) => (answers[x.id]?.length ?? 0) === 0
                  )
                  if (i >= 0) setCurrent(i)
                  setConfirmSubmit(false)
                  window.scrollTo({ top: 0 })
                }}
              >
                Go to first unanswered
              </Button>
            )}
            {flaggedCount > 0 && (
              <Button
                variant="ghost"
                onClick={() => {
                  const i = items.findIndex((x) => flagged[x.id])
                  if (i >= 0) setCurrent(i)
                  setConfirmSubmit(false)
                  window.scrollTo({ top: 0 })
                }}
              >
                Go to first flagged
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
