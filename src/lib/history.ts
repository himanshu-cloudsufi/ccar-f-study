// Persistence for attempt history and the "missed questions" pool.
// Every read/write is guarded — the app must stay fully usable when
// localStorage is unavailable (private mode, storage disabled, quota full).

const KEY = "ccarf-history"
const MAX_ATTEMPTS = 30
/** Correct answers needed since the last wrong answer to leave the mistakes pool. */
export const MASTERY_STREAK = 2

export interface QuestionOutcome {
  q: string
  c: boolean
  t: number
}

export interface Attempt {
  id: string
  date: number
  mode: string
  score: number
  total: number
  percent: number
  outcomes: QuestionOutcome[]
}

export interface QuestionStat {
  /** In the mistakes pool right now. */
  missed: boolean
  /** Correct answers since the last wrong/skipped answer. */
  streak: number
  timesWrong: number
  timesCorrect: number
  lastSeen: number
}

export interface History {
  version: 1
  attempts: Attempt[]
  stats: Record<string, QuestionStat>
}

export const emptyHistory: History = { version: 1, attempts: [], stats: {} }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null
}

export function loadHistory(): History {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyHistory
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return emptyHistory
    const attempts = Array.isArray(parsed.attempts)
      ? (parsed.attempts as Attempt[]).filter(
          (a) => isRecord(a) && typeof a.total === "number"
        )
      : []
    const stats = isRecord(parsed.stats)
      ? (parsed.stats as Record<string, QuestionStat>)
      : {}
    return { version: 1, attempts, stats }
  } catch {
    return emptyHistory
  }
}

export function saveHistory(h: History): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(h))
  } catch {
    // Storage unavailable or full — history is a convenience, never a blocker.
  }
}

export function clearHistory(): History {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  return emptyHistory
}

/**
 * Fold one submitted test into history: append the attempt summary + per-question
 * outcomes and update the mistakes pool. A question enters the pool when it is
 * answered wrong or skipped, and leaves it after MASTERY_STREAK correct answers.
 */
export function recordAttempt(
  prev: History,
  mode: string,
  outcomes: QuestionOutcome[]
): History {
  const now = Date.now()
  const score = outcomes.filter((o) => o.c).length
  const total = outcomes.length
  const attempt: Attempt = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    date: now,
    mode,
    score,
    total,
    percent: total ? Math.round((score / total) * 100) : 0,
    outcomes,
  }

  const stats: Record<string, QuestionStat> = { ...prev.stats }
  for (const o of outcomes) {
    const s: QuestionStat = stats[o.q]
      ? { ...stats[o.q] }
      : { missed: false, streak: 0, timesWrong: 0, timesCorrect: 0, lastSeen: 0 }
    s.lastSeen = o.t
    if (o.c) {
      s.streak += 1
      s.timesCorrect += 1
      if (s.missed && s.streak >= MASTERY_STREAK) s.missed = false
    } else {
      s.streak = 0
      s.timesWrong += 1
      s.missed = true
    }
    stats[o.q] = s
  }

  const next: History = {
    version: 1,
    attempts: [...prev.attempts, attempt].slice(-MAX_ATTEMPTS),
    stats,
  }
  saveHistory(next)
  return next
}

/**
 * Fold a single inline answer (the quizzes embedded in the guides) into the
 * mistakes pool. Deliberately updates `stats` only and appends no Attempt: a
 * one-question attempt per click would swamp the recent-attempts list on the
 * test intro, and reading a guide is not a test result.
 */
export function recordInlineAnswer(
  prev: History,
  questionId: string,
  correct: boolean
): History {
  const s: QuestionStat = prev.stats[questionId]
    ? { ...prev.stats[questionId] }
    : { missed: false, streak: 0, timesWrong: 0, timesCorrect: 0, lastSeen: 0 }
  s.lastSeen = Date.now()
  if (correct) {
    s.streak += 1
    s.timesCorrect += 1
    if (s.missed && s.streak >= MASTERY_STREAK) s.missed = false
  } else {
    s.streak = 0
    s.timesWrong += 1
    s.missed = true
  }

  const next: History = {
    version: 1,
    attempts: prev.attempts,
    stats: { ...prev.stats, [questionId]: s },
  }
  saveHistory(next)
  return next
}

export function missedIds(h: History): string[] {
  return Object.keys(h.stats).filter((id) => h.stats[id].missed)
}

export function formatAttemptDate(ms: number): string {
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
}
