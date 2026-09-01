// Derived "where do I stand" statistics for the test intro.
//
// Everything here is a pure fold over the persisted History plus the question
// bank — no React, no storage access — mirroring how @/lib/domains keeps the
// weighting maths out of the view. The intro screen renders these; it does not
// compute them.

import { questions as allQuestions, type Question } from "@/data/questions"
import {
  domains,
  domainsForQuestion,
  projectedScaledScore,
  scoreByDomain,
  type Domain,
} from "@/lib/domains"
import type { Attempt, History } from "@/lib/history"

/**
 * Smallest attempt we are willing to call a "best score". A 3-question mistakes
 * drill at 100% is not a personal best, and letting it win the headline number
 * would quietly flatter the user out of the information they came for.
 */
export const MEANINGFUL_ATTEMPT = 10

/** How many recent attempts the trend sparkline shows. */
export const TREND_WINDOW = 12

export interface DomainMastery {
  domain: Domain
  /** Distinct bank questions in this domain that have been answered at least once. */
  seen: number
  /** Distinct bank questions attributed to this domain. */
  pool: number
  /** Total recorded answers (a question answered three times counts three times). */
  answered: number
  correct: number
  /** correct / answered, or null when the domain has never been answered. */
  percent: number | null
}

export interface AttemptView {
  attempt: Attempt
  /** Domain-weighted projection onto the 100–1000 scale, when computable. */
  scaled: number | null
  /** Domains this attempt's questions touched, in official order. */
  domains: Domain[]
  /** Ids answered wrong or skipped in this attempt that still exist in the bank. */
  missedIds: string[]
}

export interface Coverage {
  seen: number
  total: number
  percent: number
}

export interface Readiness {
  attemptCount: number
  last: AttemptView | null
  /** Highest-percent attempt of at least MEANINGFUL_ATTEMPT questions. */
  best: AttemptView | null
  /** Recent attempt percentages, oldest → newest. */
  trend: { id: string; percent: number; date: number }[]
  coverage: Coverage
  /** One row per official domain, in official order. */
  mastery: DomainMastery[]
  /** Lowest-accuracy domain with any data, or null before the first answer. */
  weakest: DomainMastery | null
  /** Questions currently in the mistakes pool. */
  mistakes: number
  /**
   * Lifetime domain-weighted accuracy mapped onto the scaled range — the same
   * approximation the results screen uses, fed by every answer ever recorded
   * rather than one sitting. Null until something has been answered.
   */
  projected: { weightedPercent: number; scaled: number } | null
}

// ─── Building blocks ──────────────────────────────────────────────────────────

function questionIndex(questions: Question[]): Map<string, Question> {
  return new Map(questions.map((q) => [q.id, q]))
}

/** Per-attempt derivations: its scaled projection, domains covered, and misses. */
function toAttemptView(attempt: Attempt, byId: Map<string, Question>): AttemptView {
  const resolved = attempt.outcomes
    .map((o) => ({ question: byId.get(o.q), correct: o.c, id: o.q }))
    .filter((r): r is { question: Question; correct: boolean; id: string } =>
      Boolean(r.question)
    )

  const scores = scoreByDomain(resolved)
  const projection = projectedScaledScore(scores)
  const covered = new Set(scores.map((s) => s.domain.id))

  return {
    attempt,
    scaled: projection ? projection.scaled : null,
    domains: domains.filter((d) => covered.has(d.id)),
    missedIds: resolved.filter((r) => !r.correct).map((r) => r.id),
  }
}

/**
 * Lifetime accuracy per domain, folded from the cumulative per-question stats.
 *
 * Attribution inherits the caveat documented on domainsForQuestion: an untagged
 * question counts toward every domain its scenario spans, so these rows point at
 * a weak area rather than measuring one.
 */
function masteryByDomain(
  history: History,
  questions: Question[]
): DomainMastery[] {
  const tally = new Map(
    domains.map((d) => [
      d.id,
      { seen: 0, pool: 0, answered: 0, correct: 0 },
    ])
  )

  for (const q of questions) {
    const stat = history.stats[q.id]
    const answered = stat ? stat.timesCorrect + stat.timesWrong : 0
    for (const d of domainsForQuestion(q)) {
      const e = tally.get(d.id)
      if (!e) continue
      e.pool++
      if (answered > 0) {
        e.seen++
        e.answered += answered
        e.correct += stat!.timesCorrect
      }
    }
  }

  return domains.map((d) => {
    const e = tally.get(d.id)!
    return {
      domain: d,
      seen: e.seen,
      pool: e.pool,
      answered: e.answered,
      correct: e.correct,
      percent: e.answered ? Math.round((e.correct / e.answered) * 100) : null,
    }
  })
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function buildReadiness(
  history: History,
  questions: Question[] = allQuestions
): Readiness {
  const byId = questionIndex(questions)
  const attempts = history.attempts

  const last = attempts.length
    ? toAttemptView(attempts[attempts.length - 1], byId)
    : null

  // Ties go to the earlier attempt so the badge stops moving once a ceiling is hit.
  const bestAttempt = attempts
    .filter((a) => a.total >= MEANINGFUL_ATTEMPT)
    .reduce<Attempt | null>(
      (acc, a) => (!acc || a.percent > acc.percent ? a : acc),
      null
    )

  const seen = questions.filter((q) => {
    const s = history.stats[q.id]
    return s ? s.timesCorrect + s.timesWrong > 0 : false
  }).length

  const mastery = masteryByDomain(history, questions)
  const answeredDomains = mastery.filter((m) => m.answered > 0)

  const projection = projectedScaledScore(
    answeredDomains.map((m) => ({
      domain: m.domain,
      total: m.answered,
      correct: m.correct,
      percent: m.percent ?? 0,
    }))
  )

  return {
    attemptCount: attempts.length,
    last,
    best: bestAttempt ? toAttemptView(bestAttempt, byId) : null,
    trend: attempts.slice(-TREND_WINDOW).map((a) => ({
      id: a.id,
      percent: a.percent,
      date: a.date,
    })),
    coverage: {
      seen,
      total: questions.length,
      percent: questions.length ? Math.round((seen / questions.length) * 100) : 0,
    },
    mastery,
    weakest: answeredDomains.length
      ? answeredDomains.reduce((acc, m) =>
          (m.percent ?? 0) < (acc.percent ?? 0) ? m : acc
        )
      : null,
    mistakes: Object.keys(history.stats).filter((id) => history.stats[id].missed)
      .length,
    projected: projection
      ? { weightedPercent: projection.weightedPercent, scaled: projection.scaled }
      : null,
  }
}

/**
 * Public wrapper over the per-attempt derivations, for the attempt-history list
 * (which needs a view per row, not just the last and best ones).
 */
export function attemptView(
  attempt: Attempt,
  questions: Question[] = allQuestions
): AttemptView {
  return toAttemptView(attempt, questionIndex(questions))
}

// ─── Presentation-adjacent pure helpers ───────────────────────────────────────

/** The ~75% raw target the app quotes, expressed on the scaled range. */
export function scaledBarPercent(scaled: number, min = 100, max = 1000): number {
  return Math.max(0, Math.min(100, ((scaled - min) / (max - min)) * 100))
}

/** Traffic-light tier for an accuracy percentage. Never the only signal in the UI. */
export function tierFor(percent: number | null): "strong" | "fair" | "weak" | "none" {
  if (percent === null) return "none"
  if (percent >= 75) return "strong"
  if (percent >= 50) return "fair"
  return "weak"
}
