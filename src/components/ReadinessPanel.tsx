// The "where do I stand" panel on the test intro. Purely presentational: every
// number it shows is computed by buildReadiness in @/lib/readiness.
//
// Charts are hand-rolled SVG/divs on purpose — the app carries no chart library,
// and a 12-point sparkline plus five bars does not justify one.

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SCALED_MAX, SCALED_MIN, SCALED_PASS } from "@/lib/domains"
import { formatAttemptDate } from "@/lib/history"
import {
  scaledBarPercent,
  tierFor,
  type Readiness,
} from "@/lib/readiness"
import {
  ArrowRight,
  Minus,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

const RAW_TARGET = 75

/** Bar fill per tier. Tier is always echoed in text too, never colour alone. */
const tierFill: Record<string, string> = {
  strong: "bg-emerald-500 dark:bg-emerald-400",
  fair: "bg-amber-500 dark:bg-amber-400",
  weak: "bg-rose-500 dark:bg-rose-400",
  none: "bg-muted-foreground/30",
}

const tierWord: Record<string, string> = {
  strong: "on target",
  fair: "below target",
  weak: "weak",
  none: "not seen",
}

function DeltaChip({ delta }: { delta: number | null }) {
  if (delta === null)
    return <span className="text-xs text-muted-foreground">first attempt</span>
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
  const tone =
    delta > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : delta < 0
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground"
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${tone}`}>
      <Icon className="size-3.5" aria-hidden />
      {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "no change"}
      {delta !== 0 && <span className="sr-only">points versus the previous attempt</span>}
      {delta !== 0 && " pts"}
    </span>
  )
}

/**
 * Trend of recent attempt percentages. The dashed rule is the ~75% raw target
 * that maps to the scaled 720 pass bar, so the line's position against it is the
 * whole message.
 */
function TrendSparkline({
  points,
}: {
  points: { id: string; percent: number; date: number }[]
}) {
  const w = 100
  const h = 34
  // Insets keep the end dots and the stroke inside the box at any point count.
  const y = (p: number) => h - 3 - (p / 100) * (h - 6)
  const x = (i: number) =>
    points.length === 1 ? w / 2 : 2.5 + (i / (points.length - 1)) * (w - 5)
  const path = points.map((p, i) => `${x(i)},${y(p.percent)}`).join(" ")
  const last = points[points.length - 1]

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-10 w-full"
      role="img"
      aria-label={`Trend of the last ${points.length} attempt${
        points.length === 1 ? "" : "s"
      }: ${points.map((p) => `${p.percent}%`).join(", ")}. Target ${RAW_TARGET}%.`}
    >
      <line
        x1="0"
        x2={w}
        y1={y(RAW_TARGET)}
        y2={y(RAW_TARGET)}
        className="stroke-muted-foreground/50"
        strokeWidth="1"
        strokeDasharray="3 3"
        vectorEffect="non-scaling-stroke"
      />
      {points.length > 1 && (
        <polyline
          points={path}
          fill="none"
          className="stroke-primary"
          strokeWidth="1.75"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {points.map((p, i) => (
        <circle
          key={p.id}
          cx={x(i)}
          cy={y(p.percent)}
          r="2"
          className={
            p.id === last.id ? "fill-primary" : "fill-primary/40"
          }
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}

/** The projected scaled score against the 720 bar, as a single labelled track. */
function ScaledBar({ scaled }: { scaled: number }) {
  const pct = scaledBarPercent(scaled, SCALED_MIN, SCALED_MAX)
  const barPct = scaledBarPercent(SCALED_PASS, SCALED_MIN, SCALED_MAX)
  const clears = scaled >= SCALED_PASS

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-3xl font-semibold tabular-nums leading-none">
          ≈ {scaled}
        </span>
        <Badge variant={clears ? "default" : "destructive"}>
          {clears ? "clears" : "below"} {SCALED_PASS}
        </Badge>
      </div>
      <div
        className="relative mt-3 h-2 w-full rounded-full bg-muted"
        role="img"
        aria-label={`Projected scaled score ${scaled} out of ${SCALED_MAX}; the passing bar is ${SCALED_PASS}.`}
      >
        <div
          className={`h-full rounded-full ${
            clears
              ? "bg-emerald-500 dark:bg-emerald-400"
              : "bg-amber-500 dark:bg-amber-400"
          }`}
          style={{ width: `${pct}%` }}
        />
        {/* Pass bar sits on top of the fill so it reads at any score. */}
        <div
          className="absolute -top-1 h-4 w-0.5 rounded bg-foreground/70"
          style={{ left: `${barPct}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        <span>{SCALED_MIN}</span>
        <span>pass {SCALED_PASS}</span>
        <span>{SCALED_MAX}</span>
      </div>
    </div>
  )
}

export default function ReadinessPanel({
  readiness,
  onDrillMistakes,
  onPracticeWeakest,
}: {
  readiness: Readiness
  onDrillMistakes: () => void
  onPracticeWeakest: (domainId: string) => void
}) {
  const { last, best, trend, coverage, mastery, weakest, projected } = readiness
  const prev = trend.length > 1 ? trend[trend.length - 2] : null
  const delta = last && prev ? last.attempt.percent - prev.percent : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="size-4 text-muted-foreground" aria-hidden />
          Where you stand
        </CardTitle>
        <CardAction>
          <Badge variant="outline">
            {readiness.attemptCount} attempt
            {readiness.attemptCount === 1 ? "" : "s"}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {projected && (
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">
              Readiness estimate · every answer you have recorded, weighted by
              domain
            </div>
            <ScaledBar scaled={projected.scaled} />
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              Orientation only — Anthropic does not publish how raw performance
              is scaled onto {SCALED_MIN}–{SCALED_MAX}.
            </p>
          </div>
        )}

        {/* ── Last / best / trend ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[auto_auto_minmax(6rem,1fr)] sm:items-end">
          <div>
            <div className="text-xs text-muted-foreground">Last attempt</div>
            <div className="text-xl font-semibold tabular-nums">
              {last ? `${last.attempt.percent}%` : "—"}
            </div>
            {last && (
              <div className="text-[11px] text-muted-foreground">
                {last.attempt.score}/{last.attempt.total} ·{" "}
                {formatAttemptDate(last.attempt.date)}
              </div>
            )}
            <div className="mt-0.5">
              <DeltaChip delta={delta} />
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Best</div>
            <div className="text-xl font-semibold tabular-nums">
              {best ? `${best.attempt.percent}%` : "—"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {best
                ? `${best.attempt.score}/${best.attempt.total} · ${best.attempt.mode}`
                : "needs a 10+ question attempt"}
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="text-xs text-muted-foreground">
              Last {trend.length} · target {RAW_TARGET}%
            </div>
            <div className="mt-0.5 rounded-md bg-muted/50 px-1 py-0.5">
              <TrendSparkline points={trend} />
            </div>
          </div>
        </div>

        {/* ── Bank coverage ── */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
            <span className="font-medium">Bank seen</span>
            <span className="text-muted-foreground tabular-nums">
              {coverage.seen} of {coverage.total} questions · {coverage.percent}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${coverage.percent}%` }}
            />
          </div>
        </div>

        {/* ── Domain mastery ── */}
        <div>
          <div className="mb-2 text-xs font-medium">
            Accuracy by domain
            <span className="ml-1 font-normal text-muted-foreground">
              · weakest is where to spend your next hour
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {mastery.map((m) => {
              const tier = tierFor(m.percent)
              const isWeakest = weakest?.domain.id === m.domain.id
              return (
                <li key={m.domain.id} className="text-xs">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium tabular-nums">
                      {m.domain.label}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {m.domain.name}
                    </span>
                    {isWeakest && (
                      <Badge variant="destructive" className="shrink-0">
                        weakest
                      </Badge>
                    )}
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {m.percent === null
                        ? tierWord.none
                        : `${m.percent}% · ${tierWord[tier]}`}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${tierFill[tier]}`}
                        style={{ width: `${m.percent ?? 0}%` }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                      {m.seen}/{m.pool} seen
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            Untagged questions are attributed to every domain their scenario
            spans, so these rows are directional — good for spotting a weak area,
            not an audit of it.
          </p>
        </div>

        {/* ── The one thing to do next ── */}
        <div className="flex flex-wrap gap-2">
          {readiness.mistakes > 0 && (
            <Button size="sm" variant="secondary" onClick={onDrillMistakes}>
              Drill {readiness.mistakes} mistake
              {readiness.mistakes === 1 ? "" : "s"}
              <ArrowRight aria-hidden />
            </Button>
          )}
          {weakest && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPracticeWeakest(weakest.domain.id)}
            >
              Practise {weakest.domain.label} · {weakest.domain.name}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
