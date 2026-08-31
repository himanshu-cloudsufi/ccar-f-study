import { useCallback, useEffect, useMemo, useState } from "react"
import { flashcards, type Flashcard } from "@/data/flashcards"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "ccarf-cards"

interface CardStat {
  got: number
  missed: number
}
type CardStats = Record<string, CardStat>

function loadStats(): CardStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return {}
    const out: CardStats = {}
    for (const [id, v] of Object.entries(parsed as Record<string, unknown>)) {
      const s = v as Partial<CardStat> | null
      if (!s || typeof s !== "object") continue
      out[id] = {
        got: typeof s.got === "number" ? s.got : 0,
        missed: typeof s.missed === "number" ? s.missed : 0,
      }
    }
    return out
  } catch {
    return {}
  }
}

function saveStats(stats: CardStats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
  } catch {
    // Storage unavailable (private mode, quota) — the drill still works in memory.
  }
}

function clearStats() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const topics: { name: string; count: number }[] = (() => {
  const map = new Map<string, number>()
  for (const c of flashcards) map.set(c.topic, (map.get(c.topic) ?? 0) + 1)
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name))
})()

/** Cards the learner has answered "Missed it" at least once. */
function weakCards(stats: CardStats): Flashcard[] {
  return flashcards.filter((c) => (stats[c.id]?.missed ?? 0) > 0)
}

// ─── Session ──────────────────────────────────────────────────────────────────

interface Session {
  label: string
  /** Every card this session covers, so "Go again" can rebuild it. */
  deck: Flashcard[]
  /** Cards still to clear; index 0 is the card on screen. */
  queue: Flashcard[]
  /** Unique cards answered "Got it". */
  cleared: number
  /** Total "Missed it" presses. */
  misses: number
  /** Ids waiting to come back around. */
  retry: string[]
  /** Ids missed at least once this session. */
  stumbled: string[]
}

function newSession(label: string, deck: Flashcard[]): Session {
  return {
    label,
    deck,
    queue: shuffle(deck),
    cleared: 0,
    misses: 0,
    retry: [],
    stumbled: [],
  }
}

// ─── Intro ────────────────────────────────────────────────────────────────────

function Intro({
  stats,
  onStart,
  onReset,
}: {
  stats: CardStats
  onStart: (s: Session) => void
  onReset: () => void
}) {
  const [picked, setPicked] = useState<string[]>([])
  const [confirmReset, setConfirmReset] = useState(false)

  const selected = useMemo(
    () =>
      picked.length === 0
        ? flashcards
        : flashcards.filter((c) => picked.includes(c.topic)),
    [picked]
  )
  const weakInSelection = useMemo(() => {
    const weak = new Set(weakCards(stats).map((c) => c.id))
    return selected.filter((c) => weak.has(c.id))
  }, [selected, stats])

  const totals = useMemo(() => {
    let got = 0
    let missed = 0
    let touched = 0
    for (const c of flashcards) {
      const s = stats[c.id]
      if (!s) continue
      if (s.got || s.missed) touched++
      got += s.got
      missed += s.missed
    }
    return { got, missed, touched }
  }, [stats])

  const toggle = (name: string) =>
    setPicked((p) =>
      p.includes(name) ? p.filter((x) => x !== name) : [...p, name]
    )

  const selectionLabel =
    picked.length === 0
      ? "All topics"
      : picked.length === 1
        ? picked[0]
        : `${picked.length} topics`

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>CCAR-F Flashcards</CardTitle>
          <CardDescription>
            {flashcards.length} cards across {topics.length} topics, drilled
            until you get each one right. Anything you miss cycles back into the
            same session. Space flips the card; G marks it got, M marks it
            missed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            disabled={selected.length === 0}
            onClick={() => onStart(newSession(selectionLabel, selected))}
          >
            🔀 Shuffle &amp; start — {selected.length} card
            {selected.length === 1 ? "" : "s"}
          </Button>
          <Button
            variant="secondary"
            disabled={weakInSelection.length === 0}
            onClick={() => onStart(newSession("Weak cards", weakInSelection))}
          >
            🎯 Drill my weak cards — {weakInSelection.length} card
            {weakInSelection.length === 1 ? "" : "s"} you've missed before
          </Button>
          {weakInSelection.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {totals.touched === 0
                ? "Nothing tracked yet — run a session and anything you miss lands here."
                : "No previously-missed cards in this selection. Nice."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Topics</CardTitle>
          <CardDescription>
            Pick one or more to narrow the deck. Nothing selected means all
            topics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => {
              const on = picked.includes(t.name)
              return (
                <button
                  key={t.name}
                  onClick={() => toggle(t.name)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-accent"
                  }`}
                >
                  {t.name} · {t.count}
                </button>
              )
            })}
          </div>
          {picked.length > 0 && (
            <button
              onClick={() => setPicked([])}
              className="mt-3 text-xs text-muted-foreground hover:underline"
            >
              Clear selection
            </button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Your card history</CardTitle>
            {totals.touched > 0 &&
              (confirmReset ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      onReset()
                      setConfirmReset(false)
                    }}
                  >
                    Erase
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmReset(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="text-xs text-muted-foreground hover:text-destructive hover:underline"
                >
                  Reset
                </button>
              ))}
          </div>
        </CardHeader>
        <CardContent>
          {totals.touched === 0 ? (
            <p className="text-xs text-muted-foreground">
              No cards drilled yet. Progress is stored in this browser only.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{totals.touched} seen</Badge>
              <Badge>{totals.got} got</Badge>
              <Badge variant="destructive">{totals.missed} missed</Badge>
              <span>
                {flashcards.length - totals.touched} never shown
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Drill ────────────────────────────────────────────────────────────────────

function Drill({
  session,
  onAnswer,
  onQuit,
}: {
  session: Session
  onAnswer: (got: boolean) => void
  onQuit: () => void
}) {
  const [flipped, setFlipped] = useState(false)
  const card = session.queue[0]

  const answer = useCallback(
    (got: boolean) => {
      if (!flipped) return
      onAnswer(got)
    },
    [flipped, onAnswer]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault()
        setFlipped(true)
        return
      }
      if (!flipped) return
      const key = e.key.toLowerCase()
      if (key === "g" || e.key === "ArrowRight") {
        e.preventDefault()
        answer(true)
      } else if (key === "m" || e.key === "ArrowLeft") {
        e.preventDefault()
        answer(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [flipped, answer])

  if (!card) return null

  const total = session.deck.length
  const position = Math.min(session.cleared + 1, total)
  const percent = total ? Math.round((session.cleared / total) * 100) : 0

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant="secondary">{session.label}</Badge>
          <span className="text-xs text-muted-foreground">
            {position} of {total}
            {session.retry.length > 0
              ? ` · ${session.retry.length} to retry`
              : ""}
          </span>
        </div>
        <Button size="sm" variant="ghost" onClick={onQuit}>
          End session
        </Button>
      </div>

      <Progress value={percent} />

      <Card
        onClick={() => setFlipped(true)}
        className={`min-h-[14rem] ${
          flipped ? "" : "cursor-pointer transition-colors hover:bg-accent/40"
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline">{card.topic}</Badge>
            {session.retry.includes(card.id) && (
              <Badge variant="destructive">retry</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-base font-medium leading-relaxed sm:text-lg">
            {card.front}
          </p>
          {flipped ? (
            <>
              <Separator />
              <p className="text-sm leading-relaxed text-muted-foreground">
                {card.back}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Click the card or press Space to reveal the answer.
            </p>
          )}
        </CardContent>
      </Card>

      {flipped ? (
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => answer(true)}>
            ✅ Got it <span className="ml-1 text-xs opacity-60">(G)</span>
          </Button>
          <Button
            className="flex-1"
            variant="destructive"
            onClick={() => answer(false)}
          >
            ↻ Missed it <span className="ml-1 text-xs opacity-70">(M)</span>
          </Button>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setFlipped(true)}>
          Flip <span className="ml-1 text-xs opacity-60">(Space)</span>
        </Button>
      )}
    </div>
  )
}

// ─── End screen ───────────────────────────────────────────────────────────────

function Summary({
  session,
  onAgain,
  onDrillStumbled,
  onChangeTopics,
}: {
  session: Session
  onAgain: () => void
  onDrillStumbled: () => void
  onChangeTopics: () => void
}) {
  const total = session.deck.length
  const firstTry = session.cleared - session.stumbled.length
  const accuracy = total ? Math.round((firstTry / total) * 100) : 0
  const stumbledCards = session.deck.filter((c) =>
    session.stumbled.includes(c.id)
  )
  const finished = session.cleared === total

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>
            {finished ? "Session complete" : "Session ended"} — {session.label}
          </CardTitle>
          <CardDescription>
            {finished
              ? `You cleared all ${total} card${total === 1 ? "" : "s"}.`
              : `You cleared ${session.cleared} of ${total} card${
                  total === 1 ? "" : "s"
                }.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                accuracy >= 80
                  ? "default"
                  : accuracy >= 50
                    ? "secondary"
                    : "destructive"
              }
            >
              {accuracy}% first try
            </Badge>
            <Badge variant="secondary">{firstTry} clean</Badge>
            <Badge variant="destructive">
              {session.stumbled.length} needed a retry
            </Badge>
            <span className="text-xs text-muted-foreground">
              {session.misses} miss{session.misses === 1 ? "" : "es"} total
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onAgain}>🔁 Go again</Button>
            {stumbledCards.length > 0 && (
              <Button variant="secondary" onClick={onDrillStumbled}>
                🎯 Drill the {stumbledCards.length} I missed
              </Button>
            )}
            <Button variant="outline" onClick={onChangeTopics}>
              Change topics
            </Button>
          </div>
        </CardContent>
      </Card>

      {stumbledCards.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cards you stumbled on</CardTitle>
            <CardDescription>
              These are now in your weak-cards drill.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y">
              {stumbledCards.map((c) => (
                <li key={c.id} className="flex flex-col gap-1.5 py-3">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="shrink-0">
                      {c.topic}
                    </Badge>
                    <span className="text-sm font-medium">{c.front}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {c.back}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

type Phase = "intro" | "running" | "summary"

export default function CardsView() {
  const [phase, setPhase] = useState<Phase>("intro")
  const [stats, setStats] = useState<CardStats>({})
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    setStats(loadStats())
  }, [])

  const start = (s: Session) => {
    if (!s.deck.length) return
    setSession(s)
    setPhase("running")
  }

  const answer = (got: boolean) => {
    const card = session?.queue[0]
    if (!card) return

    setStats((cur) => {
      const s = cur[card.id] ?? { got: 0, missed: 0 }
      const next: CardStats = {
        ...cur,
        [card.id]: {
          got: s.got + (got ? 1 : 0),
          missed: s.missed + (got ? 0 : 1),
        },
      }
      saveStats(next)
      return next
    })

    setSession((prev) => {
      if (!prev) return prev
      if (got) {
        const queue = prev.queue.slice(1)
        if (queue.length === 0) setPhase("summary")
        return {
          ...prev,
          queue,
          cleared: prev.cleared + 1,
          retry: prev.retry.filter((x) => x !== card.id),
        }
      }

      return {
        ...prev,
        queue: [...prev.queue.slice(1), card],
        misses: prev.misses + 1,
        retry: prev.retry.includes(card.id)
          ? prev.retry
          : [...prev.retry, card.id],
        stumbled: prev.stumbled.includes(card.id)
          ? prev.stumbled
          : [...prev.stumbled, card.id],
      }
    })
  }

  if (phase === "running" && session) {
    return (
      <Drill
        // Remount per card so the next card always starts face down.
        key={`${session.queue[0]?.id}-${session.cleared}-${session.misses}`}
        session={session}
        onAnswer={answer}
        onQuit={() => setPhase(session.cleared > 0 ? "summary" : "intro")}
      />
    )
  }

  if (phase === "summary" && session) {
    return (
      <Summary
        session={session}
        onAgain={() => start(newSession(session.label, session.deck))}
        onDrillStumbled={() =>
          start(
            newSession(
              "Missed last round",
              session.deck.filter((c) => session.stumbled.includes(c.id))
            )
          )
        }
        onChangeTopics={() => setPhase("intro")}
      />
    )
  }

  return (
    <Intro
      stats={stats}
      onStart={start}
      onReset={() => {
        clearStats()
        setStats({})
      }}
    />
  )
}
