// The five official CCAR-F exam domains and their published weights, plus the
// pure scoring helpers the results screen renders. Kept out of TestView so the
// weighting maths is testable and the view stays presentational.

import type { Question } from "@/data/questions"

export interface Domain {
  id: string
  /** Short tag for badges, e.g. "D1". */
  label: string
  name: string
  /** Share of the real exam, as a percentage. Sums to 100. */
  weight: number
}

export const domains: Domain[] = [
  { id: "d1", label: "D1", name: "Agentic Architecture & Orchestration", weight: 27 },
  { id: "d2", label: "D2", name: "Tool Design & MCP Integration", weight: 18 },
  { id: "d3", label: "D3", name: "Claude Code Configuration & Workflows", weight: 20 },
  { id: "d4", label: "D4", name: "Prompt Engineering & Structured Output", weight: 20 },
  { id: "d5", label: "D5", name: "Context Management & Reliability", weight: 15 },
]

const domainById = new Map(domains.map((d) => [d.id, d]))

/**
 * Scenario → domains, as documented in content/07-Official-Exam-Guide.md under
 * "The Six Exam Scenarios".
 */
export const scenarioDomains: Record<string, string[]> = {
  s1: ["d1", "d2", "d5"],
  s2: ["d3", "d5"],
  s3: ["d1", "d2", "d5"],
  s4: ["d2", "d3", "d1"],
  s5: ["d3", "d4"],
  s6: ["d4", "d5"],
}

/**
 * Domains a question exercises. A question's own `domains` wins when it has one;
 * otherwise we fall back to every domain its scenario touches.
 *
 * That fallback is deliberately an approximation, not a fact: a scenario spans
 * two or three domains, so an untagged question is counted against all of them
 * even though it almost certainly tests one. The per-domain breakdown is
 * therefore directional — useful for spotting a weak area, not an audit of it.
 * Tagging questions individually is the only way to sharpen it.
 */
export function domainsForQuestion(
  q: Pick<Question, "scenarioId" | "domains">
): Domain[] {
  const ids = q.domains?.length ? q.domains : (scenarioDomains[q.scenarioId] ?? [])
  return ids.map((id) => domainById.get(id)).filter((d): d is Domain => !!d)
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export interface DomainScore {
  domain: Domain
  total: number
  correct: number
  percent: number
}

/** Per-domain tallies for one submitted test, weakest first. */
export function scoreByDomain(
  results: { question: Pick<Question, "scenarioId" | "domains">; correct: boolean }[]
): DomainScore[] {
  const tally = new Map<string, { total: number; correct: number }>()
  for (const r of results) {
    for (const d of domainsForQuestion(r.question)) {
      const e = tally.get(d.id) ?? { total: 0, correct: 0 }
      e.total++
      if (r.correct) e.correct++
      tally.set(d.id, e)
    }
  }
  return domains
    .filter((d) => tally.has(d.id))
    .map((d) => {
      const e = tally.get(d.id)!
      return {
        domain: d,
        total: e.total,
        correct: e.correct,
        percent: Math.round((e.correct / e.total) * 100),
      }
    })
    .sort((a, b) => a.correct / a.total - b.correct / b.total)
}

export const SCALED_MIN = 100
export const SCALED_MAX = 1000
/** Published passing score on the real exam's scaled range. */
export const SCALED_PASS = 720

export interface ScaledEstimate {
  /** Domain-weighted accuracy, renormalised over the covered domains. */
  weightedPercent: number
  /** weightedPercent mapped linearly onto SCALED_MIN..SCALED_MAX. */
  scaled: number
  passBar: number
}

/**
 * Rough projection of a scaled exam score from per-domain accuracy.
 *
 * Anthropic does not publish how raw performance is scaled onto the 100–1000
 * range (nor whether the scaling is linear, equated across forms, or per-domain
 * gated), so this is an approximation for orientation — never a prediction.
 * We weight each domain's accuracy by its official share, renormalise over only
 * the domains the test actually covered (a 4-scenario draw never touches all
 * five evenly), then map that percentage linearly onto the scale.
 */
export function projectedScaledScore(scores: DomainScore[]): ScaledEstimate | null {
  const covered = scores.filter((s) => s.total > 0)
  if (!covered.length) return null

  const weightSum = covered.reduce((n, s) => n + s.domain.weight, 0)
  const weighted = covered.reduce(
    (n, s) => n + (s.correct / s.total) * s.domain.weight,
    0
  )
  const weightedPercent = (weighted / weightSum) * 100

  return {
    weightedPercent: Math.round(weightedPercent),
    scaled: Math.round(
      SCALED_MIN + (weightedPercent / 100) * (SCALED_MAX - SCALED_MIN)
    ),
    passBar: SCALED_PASS,
  }
}
