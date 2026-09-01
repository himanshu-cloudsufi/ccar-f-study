import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  Check,
  Eye,
  Layers,
  RotateCcw,
  Shuffle,
  Sparkles,
  Target,
  TriangleAlert,
  Undo2,
  X,
} from "lucide-react"
import { flashcards, type Flashcard } from "@/data/flashcards"
import { InlineMarkdown } from "@/components/InlineMarkdown"
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
import {
  applyRating,
  cardState,
  clearsToGraduate,
  clearStore,
  domainGroups,
  loadStore,
  MASTERY_STREAK,
  saveStore,
  standing,
  topics,
  unseenCards,
  weakCards,
  type CardStore,
  type Rating,
  type Standing,
} from "@/lib/cardStats"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
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
  ["Space", "Reveal the answer — press again to hide it"],
  ["G / →", "Got it: clears the card and builds its mastery streak"],
  ["A", "Almost: clears the card but restarts the streak"],
  ["M / ←", "Missed it: card comes back this session and goes in the weak pool"],
  ["U", "Undo the last rating"],
  ["?", "Show or hide this list"],
]

function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>
            <h2>Keyboard shortcuts</h2>
          </CardTitle>
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
      </CardContent>
    </Card>
  )
}

// ─── Standing meter ───────────────────────────────────────────────────────────

/**
 * Four-segment bar for one slice of the deck. Hand-rolled: there is no chart
 * primitive in the kit, and a stacked <div> row is honest about being four
 * numbers rather than a graph. The counts are always spelled out next to it, so
 * nothing depends on telling the colours apart.
 */
function Meter({ s, className = "" }: { s: Standing; className?: string }) {
  if (!s.total) return null
  const pct = (n: number) => `${(n / s.total) * 100}%`
  return (
    <div
      className={`flex h-1.5 w-full overflow-hidden rounded-full bg-muted ${className}`}
      aria-hidden
    >
      <div className="bg-primary" style={{ width: pct(s.mastered) }} />
      <div className="bg-primary/40" style={{ width: pct(s.learning) }} />
      <div className="bg-destructive" style={{ width: pct(s.weak) }} />
    </div>
  )
}

function StandingWords({ s }: { s: Standing }) {
  return (
    <span className="text-xs text-muted-foreground">
      {s.mastered} mastered · {s.learning} learning · {s.weak} weak ·{" "}
      {s.unseen} unseen
    </span>
  )
}

// ─── Session ──────────────────────────────────────────────────────────────────

interface Session {
  label: string
  /** Every card this session covers, so "Go again" can rebuild it. */
  deck: Flashcard[]
  /** Cards still to clear; index 0 is the card on screen. */
  queue: Flashcard[]
  /** Cards finished — only a "got" removes a card from the queue. */
  cleared: number
  /** Total "Missed it" presses. */
  misses: number
  /** Total "Almost" presses. */
  softs: number
  /** Ids waiting to come back around. */
  retry: string[]
  /** Ids missed at least once this session. */
  stumbled: string[]
  /** Ids rated "almost" at least once this session. */
  shaky: string[]
}

function newSession(label: string, deck: Flashcard[]): Session {
  return {
    label,
    deck,
    queue: shuffle(deck),
    cleared: 0,
    misses: 0,
    softs: 0,
    retry: [],
    stumbled: [],
    shaky: [],
  }
}

/** Pure queue advance, so the shell can snapshot the previous session for undo. */
function advance(prev: Session, card: Flashcard, rating: Rating): Session {
  if (rating === "got") {
    return {
      ...prev,
      queue: prev.queue.slice(1),
      cleared: prev.cleared + 1,
      retry: prev.retry.filter((x) => x !== card.id),
    }
  }

  const add = (ids: string[]) =>
    ids.includes(card.id) ? ids : [...ids, card.id]

  // Both "almost" and "missed" send the card to the back of the queue: the
  // point of the in-session recycle is that you see it again before you leave.
  return {
    ...prev,
    queue: [...prev.queue.slice(1), card],
    misses: prev.misses + (rating === "missed" ? 1 : 0),
    softs: prev.softs + (rating === "almost" ? 1 : 0),
    retry: add(prev.retry),
    stumbled: rating === "missed" ? add(prev.stumbled) : prev.stumbled,
    shaky: rating === "almost" ? add(prev.shaky) : prev.shaky,
  }
}

// ─── Intro ────────────────────────────────────────────────────────────────────

function TopicPill({
  label,
  count,
  on,
  onClick,
}: {
  label: string
  count: number
  on: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none ${
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:bg-accent"
      }`}
    >
      {on && <Check className="size-3" aria-hidden />}
      {label} · {count}
    </button>
  )
}

function Intro({
  store,
  onStart,
  onReset,
}: {
  store: CardStore
  onStart: (s: Session) => void
  onReset: () => void
}) {
  const [picked, setPicked] = useState<string[]>([])
  const [confirmReset, setConfirmReset] = useState(false)

  const groups = useMemo(() => domainGroups(store), [store])
  const overall = useMemo(() => standing(store, flashcards), [store])
  const firstVisit = overall.seen === 0

  const selected = useMemo(
    () =>
      picked.length === 0
        ? flashcards
        : flashcards.filter((c) => picked.includes(c.topic)),
    [picked]
  )
  const weak = useMemo(() => weakCards(store, selected), [store, selected])
  const unseen = useMemo(() => unseenCards(store, selected), [store, selected])

  const toggleTopic = (name: string) =>
    setPicked((p) =>
      p.includes(name) ? p.filter((x) => x !== name) : [...p, name]
    )

  const toggleDomain = (names: string[]) =>
    setPicked((p) => {
      const all = names.every((n) => p.includes(n))
      return all
        ? p.filter((n) => !names.includes(n))
        : [...p.filter((n) => !names.includes(n)), ...names]
    })

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
          <CardTitle>
            <h1>CCAR-F Flashcards</h1>
          </CardTitle>
          <CardDescription>
            {flashcards.length} cards across {topics.length} topics. Rate each
            one as you go; anything you miss cycles back before the session ends
            and joins your weak pool until you clear it {MASTERY_STREAK} times
            cleanly.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {firstVisit ? (
            <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              <li className="flex gap-2">
                <Eye className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Read the question, commit to an answer, then reveal.
              </li>
              <li className="flex gap-2">
                <Target className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Rate yourself honestly — missed cards come straight back.
              </li>
              <li className="flex gap-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Two clean clears retires a card from the weak pool.
              </li>
            </ul>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium">
                  {Math.round((overall.seen / overall.total) * 100)}% of the deck
                  seen
                </span>
                <StandingWords s={overall} />
              </div>
              <Meter s={overall} />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              disabled={selected.length === 0}
              onClick={() => onStart(newSession(selectionLabel, selected))}
            >
              <Shuffle aria-hidden />
              Shuffle &amp; start — {selected.length} card
              {selected.length === 1 ? "" : "s"}
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1"
                variant="secondary"
                disabled={weak.length === 0}
                onClick={() => onStart(newSession("Weak cards", weak))}
              >
                <Target aria-hidden />
                Weak pool — {weak.length}
              </Button>
              <Button
                className="flex-1"
                variant="secondary"
                disabled={unseen.length === 0}
                onClick={() =>
                  onStart(newSession("New cards", shuffle(unseen).slice(0, 20)))
                }
              >
                <Layers aria-hidden />
                New cards — {Math.min(unseen.length, 20)} of {unseen.length}
              </Button>
            </div>
            {weak.length === 0 && !firstVisit && (
              <p className="text-xs text-muted-foreground">
                Weak pool is empty for this selection. Everything you have missed
                here you have since cleared {MASTERY_STREAK}× running.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>
            <h2>By exam domain</h2>
          </CardTitle>
          <CardDescription>
            Percentages are the real exam's published weights. Tap a domain or a
            topic to narrow the deck; nothing selected means everything.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {groups.map((g) => {
            const names = g.topics.map((t) => t.name)
            const on = names.every((n) => picked.includes(n))
            return (
              <div key={g.domain.id} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDomain(names)}
                    className="flex min-w-0 items-center gap-2 rounded text-left focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <Badge variant={on ? "default" : "outline"}>
                      {on && <Check className="size-3" aria-hidden />}
                      {g.domain.label}
                    </Badge>
                    <span className="text-sm font-medium">{g.domain.name}</span>
                  </button>
                  {g.domain.weight > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {g.domain.weight}% of the exam
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {g.standing.mastered}/{g.standing.total} mastered
                  </span>
                </div>
                <Meter s={g.standing} />
                <StandingWords s={g.standing} />
                <div className="flex flex-wrap gap-1.5">
                  {g.topics.map((t) => (
                    <TopicPill
                      key={t.name}
                      label={t.name}
                      count={t.count}
                      on={picked.includes(t.name)}
                      onClick={() => toggleTopic(t.name)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
          {picked.length > 0 && (
            <button
              type="button"
              onClick={() => setPicked([])}
              className="self-start text-xs text-muted-foreground hover:underline"
            >
              Clear selection ({picked.length} topic
              {picked.length === 1 ? "" : "s"})
            </button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle>
              <h2>Your card history</h2>
            </CardTitle>
            {!firstVisit &&
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
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="text-xs text-muted-foreground hover:text-destructive hover:underline"
                >
                  Reset
                </button>
              ))}
          </div>
        </CardHeader>
        <CardContent>
          {firstVisit ? (
            <p className="text-xs text-muted-foreground">
              No cards drilled yet. Progress is stored in this browser only.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">{overall.mastered} mastered</Badge>
              <Badge variant="secondary">{overall.learning} learning</Badge>
              <Badge variant="destructive">
                <TriangleAlert aria-hidden />
                {overall.weak} weak
              </Badge>
              <Badge variant="outline">{overall.unseen} unseen</Badge>
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
  store,
  startFlipped,
  canUndo,
  onRate,
  onUndo,
  onQuit,
}: {
  session: Session
  store: CardStore
  startFlipped: boolean
  canUndo: boolean
  onRate: (r: Rating) => void
  onUndo: () => void
  onQuit: () => void
}) {
  const [flipped, setFlipped] = useState(startFlipped)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const card = session.queue[0]

  const rate = useCallback(
    (r: Rating) => {
      if (!flipped) return
      onRate(r)
    },
    [flipped, onRate]
  )

  // Keyboard driving. Modifier chords are left alone so app-level bindings
  // (⌘K) still see them, and typing in a field is never hijacked.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (
        el &&
        (el.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))
      )
        return

      if (e.key === "?") {
        e.preventDefault()
        setShowShortcuts((v) => !v)
        return
      }
      if (e.key === "Escape" && showShortcuts) {
        e.preventDefault()
        setShowShortcuts(false)
        return
      }
      if (e.key === " " || e.key === "Enter") {
        // A focused button owns Space/Enter — otherwise pressing "Got it" with
        // the keyboard would also toggle the card underneath it.
        if (el?.tagName === "BUTTON") return
        e.preventDefault()
        setFlipped((v) => !v)
        return
      }
      const key = e.key.toLowerCase()
      if (key === "u") {
        e.preventDefault()
        onUndo()
        return
      }
      if (!flipped) return
      if (key === "g" || e.key === "ArrowRight") {
        e.preventDefault()
        rate("got")
      } else if (key === "a") {
        e.preventDefault()
        rate("almost")
      } else if (key === "m" || e.key === "ArrowLeft") {
        e.preventDefault()
        rate("missed")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [flipped, showShortcuts, rate, onUndo])

  if (!card) return null

  const total = session.deck.length
  const position = Math.min(session.cleared + 1, total)
  const percent = total ? Math.round((session.cleared / total) * 100) : 0
  const state = cardState(store, card.id)
  const stat = store.cards[card.id]
  const toGo = clearsToGraduate(store, card.id)
  const answerId = `card-answer-${card.id}`

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant="secondary">{session.label}</Badge>
          <span className="text-xs text-muted-foreground">
            Card {position} of {total}
            {session.cleared > 0 ? ` · ${session.cleared} cleared` : ""}
            {session.retry.length > 0
              ? ` · ${session.retry.length} circling back`
              : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" disabled={!canUndo} onClick={onUndo}>
            <Undo2 aria-hidden />
            Undo
          </Button>
          <Button size="sm" variant="ghost" onClick={onQuit}>
            End session
          </Button>
        </div>
      </div>

      <Progress
        value={percent}
        aria-label={`${session.cleared} of ${total} cards cleared`}
      />

      <Card className="min-h-[14rem]">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{card.topic}</Badge>
            {state === "weak" && (
              <Badge variant="destructive">
                <TriangleAlert aria-hidden />
                Weak · {toGo} clean clear{toGo === 1 ? "" : "s"} to retire
              </Badge>
            )}
            {state === "mastered" && (
              <Badge variant="secondary">
                <Sparkles aria-hidden />
                Mastered
              </Badge>
            )}
            {session.retry.includes(card.id) && (
              <Badge variant="outline">
                <RotateCcw aria-hidden />
                Second look
              </Badge>
            )}
            {stat && stat.missed > 0 && state !== "weak" && (
              <span className="text-xs text-muted-foreground">
                missed {stat.missed}× before
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <button
            type="button"
            aria-expanded={flipped}
            aria-controls={answerId}
            onClick={() => setFlipped((v) => !v)}
            className="-m-2 flex flex-col gap-2 rounded-lg p-2 text-left transition-colors hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <h2 className="text-base font-medium leading-relaxed sm:text-lg">
              {card.front}
            </h2>
            <span className="text-xs text-muted-foreground">
              {flipped
                ? "Hide the answer"
                : "Click here or press Space to reveal the answer."}
            </span>
          </button>
          <div id={answerId} hidden={!flipped}>
            {flipped && (
              <>
                <Separator />
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  <InlineMarkdown text={card.back} />
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {flipped ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" onClick={() => rate("got")}>
            <Check aria-hidden />
            Got it <span className="ml-1 text-xs opacity-60">(G)</span>
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            onClick={() => rate("almost")}
          >
            <RotateCcw aria-hidden />
            Almost <span className="ml-1 text-xs opacity-60">(A)</span>
          </Button>
          <Button
            className="flex-1"
            variant="destructive"
            onClick={() => rate("missed")}
          >
            <X aria-hidden />
            Missed it <span className="ml-1 text-xs opacity-70">(M)</span>
          </Button>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setFlipped(true)}>
          <Eye aria-hidden />
          Reveal <span className="ml-1 text-xs opacity-60">(Space)</span>
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        Keyboard: <Kbd>Space</Kbd> reveal · <Kbd>G</Kbd> got · <Kbd>A</Kbd>{" "}
        almost · <Kbd>M</Kbd> missed · <Kbd>U</Kbd> undo ·{" "}
        <button
          type="button"
          onClick={() => setShowShortcuts((v) => !v)}
          className="underline hover:text-foreground"
        >
          <Kbd>?</Kbd> all shortcuts
        </button>
      </p>

      {showShortcuts && (
        <ShortcutsPanel onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  )
}

// ─── End screen ───────────────────────────────────────────────────────────────

function ReviewList({
  title, description, cards, store,
}: {
  title: string
  description: string
  cards: Flashcard[]
  store: CardStore
}) {
  if (!cards.length) return null
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y">
          {cards.map((c) => {
            const state = cardState(store, c.id)
            const toGo = clearsToGraduate(store, c.id)
            return (
              <li key={c.id} className="flex flex-col gap-1.5 py-3">
                <div className="flex flex-wrap items-start gap-2">
                  <Badge variant="outline" className="shrink-0">
                    {c.topic}
                  </Badge>
                  {state === "weak" ? (
                    <Badge variant="destructive" className="shrink-0">
                      <TriangleAlert aria-hidden />
                      Weak · {toGo} to retire
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0">
                      <Check aria-hidden />
                      Cleared
                    </Badge>
                  )}
                </div>
                <h3 className="text-sm font-medium">{c.front}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <InlineMarkdown text={c.back} />
                </p>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

function Summary({
  session,
  store,
  onAgain,
  onDrillStumbled,
  onChangeTopics,
}: {
  session: Session
  store: CardStore
  onAgain: () => void
  onDrillStumbled: () => void
  onChangeTopics: () => void
}) {
  const total = session.deck.length
  const firstTry = session.cleared - session.stumbled.length - session.shaky.length
  const accuracy = total ? Math.round((firstTry / total) * 100) : 0
  const review = session.deck.filter(
    (c) => session.stumbled.includes(c.id) || session.shaky.includes(c.id)
  )
  const finished = session.cleared === total
  const after = standing(store, session.deck)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>
              {finished ? "Session complete" : "Session ended"} —{" "}
              {session.label}
            </h1>
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
              {accuracy}% clean first pass
            </Badge>
            <Badge variant="secondary">{firstTry} straight through</Badge>
            {session.shaky.length > 0 && (
              <Badge variant="outline">
                <RotateCcw aria-hidden />
                {session.shaky.length} almost
              </Badge>
            )}
            <Badge variant="destructive">
              <TriangleAlert aria-hidden />
              {session.stumbled.length} missed
            </Badge>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-medium">
                Where this deck stands now
              </span>
              <StandingWords s={after} />
            </div>
            <Meter s={after} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={onAgain}>
              <Shuffle aria-hidden />
              Go again
            </Button>
            {session.stumbled.length > 0 && (
              <Button variant="secondary" onClick={onDrillStumbled}>
                <Target aria-hidden />
                Drill the {session.stumbled.length} I missed
              </Button>
            )}
            <Button variant="outline" onClick={onChangeTopics}>
              Change topics
            </Button>
          </div>
        </CardContent>
      </Card>

      <ReviewList
        title="Cards worth another look"
        description={`Everything you missed or only half-recalled. Weak cards leave the pool after ${MASTERY_STREAK} clean clears.`}
        cards={review}
        store={store}
      />
    </div>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

type Phase = "intro" | "running" | "summary"

/** One step of undo: everything a rating touched. */
interface UndoPoint {
  store: CardStore
  session: Session
}

export default function CardsView() {
  const [phase, setPhase] = useState<Phase>("intro")
  // Read straight into the initial state: an effect that immediately setState's
  // costs a second render and a flash of the empty dashboard.
  const [store, setStore] = useState<CardStore>(loadStore)
  const [session, setSession] = useState<Session | null>(null)
  const [undoPoint, setUndoPoint] = useState<UndoPoint | null>(null)
  /** Set only by undo, so the restored card comes back already revealed. */
  const [restored, setRestored] = useState(false)

  const start = (s: Session) => {
    if (!s.deck.length) return
    setSession(s)
    setUndoPoint(null)
    setRestored(false)
    setPhase("running")
  }

  const rate = (rating: Rating) => {
    if (!session) return
    const card = session.queue[0]
    if (!card) return

    setUndoPoint({ store, session })
    setStore(applyRating(store, card.id, rating))
    setRestored(false)

    const next = advance(session, card, rating)
    setSession(next)
    if (next.queue.length === 0) setPhase("summary")
  }

  const undo = useCallback(() => {
    if (!undoPoint) return
    saveStore(undoPoint.store)
    setStore(undoPoint.store)
    setSession(undoPoint.session)
    setUndoPoint(null)
    setRestored(true)
    setPhase("running")
  }, [undoPoint])

  if (phase === "running" && session) {
    return (
      <Drill
        // Remount per rating so the next card starts face down — except after
        // an undo, where the point is to land back on the revealed card.
        key={`${session.queue[0]?.id}-${session.cleared}-${session.misses}-${session.softs}`}
        session={session}
        store={store}
        startFlipped={restored}
        canUndo={!!undoPoint}
        onRate={rate}
        onUndo={undo}
        onQuit={() => setPhase(session.cleared > 0 ? "summary" : "intro")}
      />
    )
  }

  if (phase === "summary" && session) {
    return (
      <Summary
        session={session}
        store={store}
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
      store={store}
      onStart={start}
      onReset={() => {
        setStore(clearStore())
        setUndoPoint(null)
      }}
    />
  )
}
