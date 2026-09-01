import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { questions, type Question } from "@/data/questions"
import {
  clearHistory,
  emptyHistory,
  formatAttemptDate,
  loadHistory,
  missedIds,
  recordAttempt,
  MASTERY_STREAK,
  type Attempt,
  type History,
  type QuestionOutcome,
} from "@/lib/history"
import {
  domains,
  domainsForQuestion,
  projectedScaledScore,
  scoreByDomain,
  SCALED_PASS,
} from "@/lib/domains"
import { attemptView, buildReadiness } from "@/lib/readiness"
import ReadinessPanel from "@/components/ReadinessPanel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import {
  ArrowRight,
  Check,
  ChevronRight,
  Crosshair,
  GraduationCap,
  History as HistoryIcon,
  Library,
  RotateCcw,
  Shuffle,
  Target,
  Trash2,
  Zap,
  type LucideIcon,
} from "lucide-react"

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

function mistakesTest(ids: string[], label = "Mistakes drill"): ActiveTest {
  const set = new Set(ids)
  const picked = shuffle(questions.filter((q) => set.has(q.id))).map(toTestQuestion)
  return {
    label,
    questions: picked,
    durationSec: null,
    drawnScenarios: null,
  }
}

/**
 * Every bank question attributed to one domain — the "practise my weakest area"
 * path off the readiness panel. Attribution goes through domainsForQuestion, so
 * an untagged question is drawn for any domain its scenario spans.
 */
function domainTest(domainId: string, timed: boolean): ActiveTest {
  const domain = domains.find((d) => d.id === domainId)
  const pool = shuffle(
    questions.filter((q) => domainsForQuestion(q).some((d) => d.id === domainId))
  )
  const picked = pool.slice(0, 20).map(toTestQuestion)
  return {
    label: `${domain?.label ?? "Domain"} drill`,
    questions: picked,
    durationSec: timed ? picked.length * SECONDS_PER_QUESTION : null,
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

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-medium">
      {children}
    </kbd>
  )
}

const SHORTCUTS: [string, string][] = [
  ["A – H", "Select that option (toggles it on multi-select questions)"],
  ["1 – 8", "Same as the letters, for the numeric row"],
  ["← / →", "Previous / next question"],
  ["Enter", "Next question — on the last one, opens the submit prompt"],
  ["F", "Flag or unflag this question"],
  ["?", "Show or hide this list"],
]

function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Keyboard shortcuts</CardTitle>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-1.5 text-sm">
          {SHORTCUTS.map(([keys, what]) => (
            <li key={keys} className="flex items-baseline gap-3">
              <kbd className="min-w-16 shrink-0 rounded border bg-muted px-1.5 py-0.5 text-center text-xs font-medium">
                {keys}
              </kbd>
              <span className="text-muted-foreground">{what}</span>
            </li>
          ))}
        </ul>
        {/* F is the flag key even though it is also a letter: no bank question
            has a sixth option, and the number row still reaches every option. */}
        <p className="mt-3 text-xs text-muted-foreground">
          F always flags. Use 6 if a question ever offers an option F.
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Question navigator ───────────────────────────────────────────────────────

function Navigator({
  test,
  answers,
  flagged,
  current,
  onJump,
  onSubmit,
  onShortcuts,
}: {
  test: TestQuestion[]
  answers: Record<string, number[]>
  flagged: Record<string, boolean>
  current: number
  onJump: (i: number) => void
  onSubmit: () => void
  onShortcuts: () => void
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
        <p className="text-xs text-muted-foreground">
          Keyboard: <Kbd>A</Kbd>–<Kbd>H</Kbd> or <Kbd>1</Kbd>–<Kbd>8</Kbd> answer ·{" "}
          <Kbd>←</Kbd> <Kbd>→</Kbd> move · <Kbd>F</Kbd> flag ·{" "}
          <button onClick={onShortcuts} className="underline hover:text-foreground">
            <Kbd>?</Kbd> all shortcuts
          </button>
        </p>
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
                  aria-current={isCurrent ? "true" : undefined}
                  aria-label={`Question ${i + 1}: ${
                    isAnswered ? "answered" : "not answered"
                  }${isFlagged ? ", flagged for review" : ""}`}
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

/**
 * The exam format, as scannable rows instead of the paragraph this used to be.
 * Every claim here is the same one the prose made; only the shape changed.
 */
const FORMAT_FACTS: { label: string; value: string }[] = [
  {
    label: "Draw",
    value: `${EXAM_SCENARIO_COUNT} of ${scenarios.length} scenarios × ${EXAM_PER_SCENARIO} questions`,
  },
  { label: "Time", value: `${EXAM_MINUTES} minutes` },
  { label: "Answers", value: "single-answer only, as on the real exam" },
  { label: "Pass bar", value: `scaled ${SCALED_PASS}/1000 ≈ 75% raw here` },
]

/** A start option that is not the exam: a whole tile is the button, for reach. */
function StartTile({
  icon: Icon,
  title,
  meta,
  hint,
  disabled,
  onClick,
}: {
  icon: LucideIcon
  title: string
  meta: string
  hint?: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex flex-col gap-1 rounded-xl bg-card p-3 text-left ring-1 ring-foreground/10 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60"
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        {title}
      </span>
      <span className="text-xs text-muted-foreground">{meta}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </button>
  )
}

/**
 * First-run primer. Nothing has been recorded yet, so instead of a scorecard
 * full of dashes this slot tells a newcomer what to do first — and a returning
 * user never sees it (ReadinessPanel takes over, in the second column).
 */
function FirstRunPrimer({ onQuickQuiz }: { onQuickQuiz: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="size-4 text-muted-foreground" aria-hidden />
          Start here
        </CardTitle>
        <CardDescription>
          Nothing recorded yet. Submit one test and this slot becomes your
          readiness scorecard: projected scaled score, trend across attempts,
          bank coverage, and your weakest domain.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ol className="flex flex-col gap-2 text-sm">
          {[
            "Start with a quick quiz to find your level — 15 questions, no ceremony.",
            "Anything you miss is collected automatically into a mistakes drill.",
            "Sit the full exam simulation once you are clearing 75% on quizzes.",
          ].map((step, i) => (
            <li key={step} className="flex gap-2.5">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums">
                {i + 1}
              </span>
              <span className="text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
        <Separator />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={onQuickQuiz}>
            Take the 15-question quiz
            <ArrowRight aria-hidden />
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Scores stay in this browser — nothing leaves your machine.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Attempt history. Each row expands into the domains that attempt covered and a
 * one-click re-drill of exactly the questions it got wrong, so a past score is
 * something you can act on rather than a number to read.
 */
function AttemptHistory({
  attempts,
  onDrill,
  onClearHistory,
}: {
  attempts: Attempt[]
  onDrill: (ids: string[]) => void
  onClearHistory: () => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const recent = useMemo(() => [...attempts].reverse().slice(0, 10), [attempts])
  const views = useMemo(
    () => new Map(recent.map((a) => [a.id, attemptView(a)])),
    [recent]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HistoryIcon className="size-4 text-muted-foreground" aria-hidden />
          Attempt history
        </CardTitle>
        {recent.length > 0 && (
          <CardAction>
            {confirmClear ? (
              <div className="flex items-center gap-1">
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
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmClear(true)}
              >
                <Trash2 aria-hidden />
                Clear
              </Button>
            )}
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No attempts yet. Every test you submit is logged here with the
            domains it covered.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {recent.map((a, i) => {
              const prev = recent[i + 1]
              const delta = prev ? a.percent - prev.percent : null
              const view = views.get(a.id)
              const open = openId === a.id
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : a.id)}
                    aria-expanded={open}
                    aria-controls={`attempt-${a.id}`}
                    className="flex w-full items-center gap-2 rounded-md py-2 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronRight
                      className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${
                        open ? "rotate-90" : ""
                      }`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">
                        {a.mode}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {formatAttemptDate(a.date)} · {a.score}/{a.total}
                      </span>
                    </span>
                    {/* Percent carries the tier as colour AND as its own text. */}
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
                      className={`w-11 shrink-0 text-right text-[11px] tabular-nums ${
                        delta === null
                          ? "text-muted-foreground"
                          : delta > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : delta < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-muted-foreground"
                      }`}
                    >
                      {delta === null
                        ? "–"
                        : delta > 0
                          ? `▲ ${delta}`
                          : delta < 0
                            ? `▼ ${Math.abs(delta)}`
                            : "="}
                    </span>
                  </button>
                  {open && view && (
                    <div
                      id={`attempt-${a.id}`}
                      className="flex flex-col gap-2 pb-3 pl-5 pr-1"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground">
                          Domains covered:
                        </span>
                        {view.domains.length ? (
                          view.domains.map((d) => (
                            <Badge key={d.id} variant="outline" title={d.name}>
                              {d.label}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            unknown
                          </span>
                        )}
                        {view.scaled !== null && (
                          <span className="text-[11px] text-muted-foreground">
                            · projected ≈ {view.scaled}
                          </span>
                        )}
                      </div>
                      {view.missedIds.length > 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-fit"
                          onClick={() => onDrill(view.missedIds)}
                        >
                          <RotateCcw aria-hidden />
                          Re-drill the {view.missedIds.length} missed here
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          Nothing missed in this attempt.
                        </span>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

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

  const missed = useMemo(() => missedIds(history), [history])
  const targetedPool = useMemo(
    () => questions.filter((q) => picked.includes(q.scenarioId)).length,
    [picked]
  )
  const readiness = useMemo(() => buildReadiness(history), [history])
  const returning = readiness.attemptCount > 0

  const toggleScenario = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const startTargeted = (count: number | "all") => {
    if (!picked.length) return
    onStart(targetedTest(picked, count, timed))
  }

  return (
    <div
      className={`mx-auto w-full px-4 py-6 ${
        returning ? "max-w-7xl" : "max-w-3xl"
      }`}
    >
      {/* ── Page head ── */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h2 className="font-heading text-xl font-semibold">CCAR-F mock test</h2>
          <p className="text-sm text-muted-foreground">
            {questions.length} questions across all {scenarios.length} exam
            scenarios.
          </p>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Shuffle className="size-3.5" aria-hidden />
          Reshuffled every attempt · progress saved in this browser only
        </p>
      </div>

      {/* Two columns only pay for themselves once there is a scorecard to put
          in the second one; a first-timer reads a single narrow column.
          Explicit lg placement (rather than plain flow) lets the scorecard span
          both rows on the right while the start options and attempt history
          stack on the left, so neither column bottoms out early. */}
      <div
        className={`grid gap-4 ${
          returning
            ? "lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start"
            : ""
        }`}
      >
        {/* ── Start a test ── */}
        <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
          {/* The exam simulation is the point of the app, so it gets the only
              hero treatment on the screen: primary ring, big type, big button. */}
          <Card className="ring-2 ring-primary/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="size-5 text-primary" aria-hidden />
                Exam simulation
              </CardTitle>
              <CardDescription>
                The real thing, end to end: a random {EXAM_SCENARIO_COUNT}
                -scenario draw under the clock.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                {FORMAT_FACTS.map((f) => (
                  <div key={f.label}>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {f.label}
                    </dt>
                    <dd className="text-sm leading-snug">{f.value}</dd>
                  </div>
                ))}
              </dl>
              <Button
                className="h-11 w-full text-base"
                onClick={() => onStart(examTest())}
              >
                Start the {EXAM_MINUTES}-minute exam
                <ArrowRight aria-hidden />
              </Button>
            </CardContent>
          </Card>

          {/* ── Shorter paths ── */}
          <div className="grid gap-3 sm:grid-cols-3">
            <StartTile
              icon={Zap}
              title="Quick quiz"
              meta="15 questions · 30 min"
              hint="Mixed scenarios"
              onClick={() => onStart(randomTest("Quick quiz", 15))}
            />
            <StartTile
              icon={Library}
              title="Full bank"
              meta={`${questions.length} questions`}
              hint="Every question, timed at pace"
              onClick={() =>
                onStart(randomTest("Full bank", questions.length))
              }
            />
            <StartTile
              icon={RotateCcw}
              title="My mistakes"
              meta={`${missed.length} question${missed.length === 1 ? "" : "s"}`}
              hint={
                missed.length
                  ? `Cleared after ${MASTERY_STREAK} correct in a row`
                  : "Nothing missed yet"
              }
              disabled={missed.length === 0}
              onClick={() => onStart(mistakesTest(missed))}
            />
          </div>

          {!returning && (
            <FirstRunPrimer
              onQuickQuiz={() => onStart(randomTest("Quick quiz", 15))}
            />
          )}

          {/* ── Targeted practice ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crosshair className="size-4 text-muted-foreground" aria-hidden />
                Targeted practice
              </CardTitle>
              <CardDescription>
                Pick the scenarios you want, then how many questions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-wrap gap-2">
                {scenarios.map((s) => {
                  const on = picked.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleScenario(s.id)}
                      aria-pressed={on}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:bg-accent"
                      }`}
                    >
                      {on && <Check className="size-3" aria-hidden />}
                      {s.label} · {s.count}
                    </button>
                  )
                })}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {picked.length
                    ? `${targetedPool} in pool · start`
                    : "Select at least one scenario"}
                </span>
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
            </CardContent>
          </Card>
        </div>

        {/* ── Where you stand ── */}
        {returning && (
          <>
            <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <ReadinessPanel
                readiness={readiness}
                onDrillMistakes={() => onStart(mistakesTest(missed))}
                onPracticeWeakest={(id) => onStart(domainTest(id, timed))}
              />
            </div>
            <div className="lg:col-start-1 lg:row-start-2">
              <AttemptHistory
                attempts={history.attempts}
                onDrill={(ids) => onStart(mistakesTest(ids, "Attempt re-drill"))}
                onClearHistory={onClearHistory}
              />
            </div>
          </>
        )}
      </div>
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
  const [showShortcuts, setShowShortcuts] = useState(false)

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
    setShowShortcuts(false)
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

  // Keyboard driving, only while a question is on screen. Modifier chords are
  // deliberately untouched so app-level bindings (⌘K) still see them.
  useEffect(() => {
    if (phase !== "running" || !test) return

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (
        el &&
        (el.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))
      )
        return

      const items = test.questions
      const q = items[current]
      if (!q) return

      if (e.key === "?") {
        e.preventDefault()
        setShowShortcuts((v) => !v)
        return
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault()
        setFlagged((f) => ({ ...f, [q.id]: !f[q.id] }))
        return
      }
      if (e.key === "ArrowLeft") {
        if (current === 0) return
        e.preventDefault()
        setCurrent((c) => c - 1)
        return
      }
      if (e.key === "ArrowRight" || e.key === "Enter") {
        // Enter belongs to a focused button (Next, Flag, Submit); only the
        // option radios/checkboxes ignore it, so we take it back there.
        const role = el?.getAttribute("role")
        if (
          e.key === "Enter" &&
          el?.tagName === "BUTTON" &&
          role !== "radio" &&
          role !== "checkbox"
        )
          return
        e.preventDefault()
        if (current < items.length - 1) {
          setCurrent((c) => c + 1)
          return
        }
        // Last question: hand off to the existing confirm affordance rather
        // than submitting out from under the user.
        const loose =
          items.some((x) => (answers[x.id]?.length ?? 0) === 0) ||
          items.some((x) => flagged[x.id])
        if (loose) setConfirmSubmit(true)
        else finish()
        return
      }

      // Letters and the number row both address the visible options. F is
      // reserved for flagging (see ShortcutsPanel).
      const oi = /^[a-eg-hA-EG-H]$/.test(e.key)
        ? e.key.toUpperCase().charCodeAt(0) - 65
        : /^[1-8]$/.test(e.key)
          ? Number(e.key) - 1
          : -1
      if (oi < 0 || oi >= q.shuffledOptions.length) return
      e.preventDefault()
      setAnswers((a) => {
        if (!q.multiSelect) return { ...a, [q.id]: [oi] }
        const cur = a[q.id] ?? []
        return {
          ...a,
          [q.id]: cur.includes(oi) ? cur.filter((x) => x !== oi) : [...cur, oi],
        }
      })
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // No dep array: the handler closes over answers/flagged/current, and
    // rebinding one listener per render is cheaper than stale-closure bugs.
  })

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

    const byDomain = scoreByDomain(
      items.map((q) => ({
        question: q,
        correct: sameSet(answers[q.id], q.shuffledAnswers),
      }))
    )
    const projection = projectedScaledScore(byDomain)

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

            {projection && (
              <div className="mb-5 rounded-lg border p-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-2xl font-semibold tabular-nums">
                    Projected ≈ {projection.scaled}
                  </span>
                  <Badge
                    variant={
                      projection.scaled >= SCALED_PASS ? "default" : "destructive"
                    }
                  >
                    pass bar {SCALED_PASS}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {projection.weightedPercent}% weighted by domain
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Estimate only. Anthropic does not publish how raw performance
                  is scaled onto 100–1000, so this maps your domain-weighted
                  accuracy linearly onto that range — a rough orientation, not a
                  prediction of your result.
                </p>
              </div>
            )}

            <div className="mb-2 text-sm font-medium">By domain</div>
            <div className="mb-2 grid gap-2 sm:grid-cols-2">
              {byDomain.map((d) => (
                <div
                  key={d.domain.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{d.domain.label}</span>{" "}
                    {d.domain.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {d.domain.weight}%
                  </span>
                  <Badge
                    variant={
                      d.percent >= 75
                        ? "default"
                        : d.percent >= 50
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {d.correct}/{d.total}
                  </Badge>
                </div>
              ))}
            </div>
            <p className="mb-5 text-xs text-muted-foreground">
              Weakest first · the % is the domain's share of the real exam.
              Questions are attributed by scenario, so one question can count
              toward several domains — treat this as directional.
            </p>

            <div className="mb-2 text-sm font-medium">By scenario</div>
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
                    {domainsForQuestion(q).map((d) => (
                      <Badge key={d.id} variant="outline" title={d.name}>
                        {d.label}
                      </Badge>
                    ))}
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
        onShortcuts={() => setShowShortcuts(true)}
      />

      {showShortcuts && <ShortcutsPanel onClose={() => setShowShortcuts(false)} />}

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
