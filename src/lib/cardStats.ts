// Persistence and standings for the flashcard drill.
//
// Same discipline as lib/history.ts: every read and write is guarded, because
// localStorage can be missing (private mode), disabled, or full — a drill that
// cannot save is still a usable drill.
//
// The mastery rule is borrowed wholesale from the test mode: a card enters the
// weak pool the moment you miss it and leaves it after MASTERY_STREAK clean
// clears. Before that, "weak" was `missed > 0` forever, so one bad day marked a
// card for life and the weak deck only ever grew.

import { flashcards, type Flashcard } from "@/data/flashcards"
import { domains, type Domain } from "@/lib/domains"
import { MASTERY_STREAK } from "@/lib/history"

const KEY = "ccarf-cards"
const VERSION = 2

/** How the learner rated a card. "almost" is a partial credit — see applyRating. */
export type Rating = "got" | "almost" | "missed"

export interface CardStat {
  got: number
  missed: number
  /** Clean clears since the last miss. Resets to 0 on a miss or an "almost". */
  streak: number
  /** In the weak pool right now. */
  weak: boolean
  lastSeen: number
}

export interface CardStore {
  version: number
  cards: Record<string, CardStat>
}

export const emptyStore: CardStore = { version: VERSION, cards: {} }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null
}

function blank(): CardStat {
  return { got: 0, missed: 0, streak: 0, weak: false, lastSeen: 0 }
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0
}

/**
 * Reads the store, migrating the v1 shape in place.
 *
 * v1 was a bare `Record<cardId, { got, missed }>` with no version field. Those
 * counts are carried forward verbatim and anything with a recorded miss starts
 * in the weak pool — which is exactly what v1 meant by weak — so the first load
 * after this change loses nothing and every migrated card can now graduate.
 */
export function loadStore(): CardStore {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyStore
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return emptyStore

    const legacy = typeof parsed.version !== "number"
    const source = legacy ? parsed : isRecord(parsed.cards) ? parsed.cards : {}

    const cards: Record<string, CardStat> = {}
    for (const [id, v] of Object.entries(source)) {
      if (!isRecord(v)) continue
      const got = num(v.got)
      const missed = num(v.missed)
      cards[id] = {
        got,
        missed,
        streak: legacy ? 0 : num(v.streak),
        weak: legacy ? missed > 0 : v.weak === true,
        lastSeen: legacy ? 0 : num(v.lastSeen),
      }
    }
    return { version: VERSION, cards }
  } catch {
    return emptyStore
  }
}

export function saveStore(store: CardStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // Storage unavailable or full — the drill still works in memory.
  }
}

export function clearStore(): CardStore {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  return emptyStore
}

/**
 * Folds one rating into the store and persists it.
 *
 * - "got"    — a clean clear: extends the streak, and graduates a weak card
 *              once the streak reaches MASTERY_STREAK.
 * - "almost" — recalled it, but not cleanly. Counted as a clear so you are not
 *              punished for honesty, but the streak restarts, so an "almost"
 *              cannot graduate a card. It never *adds* a card to the weak pool:
 *              hesitating is not the same as not knowing.
 * - "missed" — into the weak pool, streak back to zero.
 */
export function applyRating(
  prev: CardStore,
  cardId: string,
  rating: Rating
): CardStore {
  const s: CardStat = prev.cards[cardId] ? { ...prev.cards[cardId] } : blank()
  s.lastSeen = Date.now()

  if (rating === "got") {
    s.got += 1
    s.streak += 1
    if (s.weak && s.streak >= MASTERY_STREAK) s.weak = false
  } else if (rating === "almost") {
    s.got += 1
    s.streak = 0
  } else {
    s.missed += 1
    s.streak = 0
    s.weak = true
  }

  const next: CardStore = {
    version: VERSION,
    cards: { ...prev.cards, [cardId]: s },
  }
  saveStore(next)
  return next
}

// ─── Standings ────────────────────────────────────────────────────────────────

/** Where one card sits on the unseen → learning → mastered ladder. */
export type CardState = "unseen" | "learning" | "weak" | "mastered"

export function cardState(store: CardStore, id: string): CardState {
  const s = store.cards[id]
  if (!s || (!s.got && !s.missed)) return "unseen"
  if (s.weak) return "weak"
  return s.streak >= MASTERY_STREAK ? "mastered" : "learning"
}

export interface Standing {
  total: number
  unseen: number
  learning: number
  weak: number
  mastered: number
  /** Cards with any record at all. */
  seen: number
}

export function standing(store: CardStore, deck: Flashcard[]): Standing {
  const s: Standing = {
    total: deck.length,
    unseen: 0,
    learning: 0,
    weak: 0,
    mastered: 0,
    seen: 0,
  }
  for (const c of deck) s[cardState(store, c.id)]++
  s.seen = s.total - s.unseen
  return s
}

/** Cards in the weak pool — a shrinking target, unlike the old `missed > 0`. */
export function weakCards(store: CardStore, deck: Flashcard[]): Flashcard[] {
  return deck.filter((c) => store.cards[c.id]?.weak)
}

/** Cards never rated, for pushing coverage rather than re-drilling favourites. */
export function unseenCards(store: CardStore, deck: Flashcard[]): Flashcard[] {
  return deck.filter((c) => cardState(store, c.id) === "unseen")
}

/** Clears still needed before a weak card graduates. 0 once it is out. */
export function clearsToGraduate(store: CardStore, id: string): number {
  const s = store.cards[id]
  if (!s?.weak) return 0
  return Math.max(0, MASTERY_STREAK - s.streak)
}

export { MASTERY_STREAK }

// ─── Topics and domains ───────────────────────────────────────────────────────

export interface TopicInfo {
  name: string
  count: number
}

export const topics: TopicInfo[] = (() => {
  const map = new Map<string, number>()
  for (const c of flashcards) map.set(c.topic, (map.get(c.topic) ?? 0) + 1)
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name))
})()

/**
 * Card topic → exam domain, so drilling can be read against what the exam
 * actually weights. This is our own reading of the deck, not published mapping:
 * the cards carry a free-text `topic`, the exam publishes five domains, and
 * several topics could defensibly sit in two of them (hooks are both
 * orchestration and Claude Code config). Directional, like the per-domain
 * breakdown on the test results screen — good for choosing what to drill next,
 * not an audit. Any topic missing here falls into the "Exam technique" group.
 */
const TOPIC_DOMAIN: Record<string, string> = {
  "Agentic loop": "d1",
  "Multi-agent": "d1",
  "Task decomposition": "d1",
  Escalation: "d1",
  "Human review": "d1",
  "Iterative refinement": "d1",
  "Tool distribution": "d1",
  Enforcement: "d1",

  "Tool design": "d2",
  "Tool choice": "d2",
  "MCP config": "d2",
  "Built-in tools": "d2",

  "CLAUDE.md": "d3",
  "Commands & skills": "d3",
  "CLI flags": "d3",
  "Plan mode": "d3",
  Sessions: "d3",
  "Rules & paths": "d3",
  "CI review": "d3",

  "Structured output": "d4",
  "Few-shot": "d4",
  "Validation & retry": "d4",

  "Context management": "d5",
  "Error handling": "d5",
  Provenance: "d5",
  "Batch API": "d5",
}

/** Bucket for topics that are exam craft rather than exam content. */
const TECHNIQUE: Domain = {
  id: "other",
  label: "—",
  name: "Exam technique",
  weight: 0,
}

export interface DomainGroup {
  domain: Domain
  topics: TopicInfo[]
  cards: Flashcard[]
  standing: Standing
}

/** The five domains plus the technique bucket, each with its cards and standing. */
export function domainGroups(store: CardStore): DomainGroup[] {
  const all = [...domains, TECHNIQUE]
  const byTopic = new Map(topics.map((t) => [t.name, t]))

  return all
    .map((domain) => {
      const names = [...byTopic.keys()].filter(
        (n) => (TOPIC_DOMAIN[n] ?? "other") === domain.id
      )
      const cards = flashcards.filter((c) => names.includes(c.topic))
      return {
        domain,
        topics: names
          .map((n) => byTopic.get(n)!)
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
        cards,
        standing: standing(store, cards),
      }
    })
    .filter((g) => g.cards.length > 0)
}
