// Full-text search over every piece of study material: guide blocks, test
// questions, and flashcards. Hand-rolled on purpose — the corpus is ~6k small
// records shipped in the bundle, so a linear scan over a prebuilt string index
// is far cheaper than pulling in a fuzzy-search dependency.

import type { Block, ListItem } from "@/lib/blocks";
import { headingAnchors, spansToText } from "@/lib/blocks";
import { guides } from "@/data/guides";
import { questions } from "@/data/questions";
import { flashcards } from "@/data/flashcards";

// ─── Record model ─────────────────────────────────────────────────────────────

/** Where a result sends the app. The host decides how to actually navigate. */
export type SearchTarget =
  | { kind: "guide"; guideId: string; slug: string | null }
  | { kind: "question"; questionId: string }
  | { kind: "card"; cardId: string };

export type SearchKind = SearchTarget["kind"];

interface RecordBase {
  /** Unique within the index; used as a React key. */
  id: string;
  /** The line shown as the result's headline, and weighted higher when scoring. */
  title: string;
  /** Body text searched and snippeted. May be empty (e.g. a bare heading). */
  text: string;
}

export type SearchRecord =
  | (RecordBase & {
      kind: "guide";
      guideId: string;
      /** Guide `shortTitle`, shown as the result's context line. */
      guideTitle: string;
      /** Slug of the nearest preceding level-2 heading, for deep-linking. */
      slug: string | null;
      /** Heading blocks render differently and outrank body blocks. */
      isHeading: boolean;
    })
  | (RecordBase & { kind: "question"; scenario: string; scenarioId: string })
  | (RecordBase & { kind: "card"; topic: string });

export interface MatchRange {
  start: number;
  end: number;
}

export interface Snippet {
  /** Windowed text, already including any leading/trailing ellipsis. */
  text: string;
  /** Offsets into `text` (not the source) that the UI should <mark>. */
  ranges: MatchRange[];
}

export interface SearchResult {
  record: SearchRecord;
  score: number;
  target: SearchTarget;
}

// ─── Block → text ─────────────────────────────────────────────────────────────

/** Flattens a list tree; " · " keeps everything on one line for snippeting. */
function itemsToText(items: ListItem[]): string {
  return items
    .map((it) => {
      const own = spansToText(it.spans);
      const kids = it.children.length ? " · " + itemsToText(it.children) : "";
      return own + kids;
    })
    .join(" · ");
}

/** Plain text for one block, or null for blocks with nothing to search. */
function blockToText(block: Block): string | null {
  switch (block.type) {
    case "heading":
    case "paragraph":
      return spansToText(block.spans);
    case "callout":
      return spansToText(block.spans);
    case "definition":
      return `${spansToText(block.term)}: ${spansToText(block.spans)}`;
    case "list":
      return itemsToText(block.items);
    case "table":
      return [
        block.columns.map(spansToText).join(" · "),
        ...block.rows.map((row) => row.map(spansToText).join(" · ")),
      ].join(" · ");
    case "code":
      return block.code;
    case "quiz":
      return [
        spansToText(block.prompt),
        ...block.options.map(spansToText),
        spansToText(block.explanation),
      ].join(" · ");
    case "divider":
      return null;
  }
}

// ─── Index ────────────────────────────────────────────────────────────────────

interface IndexEntry {
  record: SearchRecord;
  /** Lowercased `title` — matches here rank above body matches. */
  title: string;
  /** Lowercased `title\ntext` — what term membership is tested against. */
  hay: string;
}

function buildIndex(): IndexEntry[] {
  const entries: IndexEntry[] = [];

  const push = (record: SearchRecord) => {
    entries.push({
      record,
      title: record.title.toLowerCase(),
      hay: `${record.title}\n${record.text}`.toLowerCase(),
    });
  };

  for (const guide of guides) {
    // Section context carried forward so a hit deep inside a section can link
    // to the level-2 heading above it. Level 3/4 headings keep the level-2 slug
    // because that is the only anchor GuideRenderer emits an outline entry for.
    let sectionTitle: string | null = null;
    let sectionSlug: string | null = null;
    // Anchors come from the same helper GuideRenderer renders its heading ids
    // with: it de-duplicates repeated headings — "Part 1: …" recurs across
    // guides — with -2/-3 suffixes, which a plain slug of the text would miss.
    const anchors = headingAnchors(guide.doc.blocks);

    guide.doc.blocks.forEach((block, i) => {
      const text = blockToText(block);
      if (text === null || text.trim() === "") return;

      const isHeading = block.type === "heading";
      if (isHeading && block.level === 2) {
        sectionTitle = text;
        sectionSlug = anchors.get(i) ?? null;
      }

      push({
        kind: "guide",
        id: `${guide.id}:${i}`,
        // A heading is its own headline; body blocks inherit their section's.
        title: isHeading ? text : (sectionTitle ?? guide.doc.title),
        text: isHeading ? "" : text,
        guideId: guide.id,
        guideTitle: guide.shortTitle,
        slug: isHeading && block.level === 2 ? (anchors.get(i) ?? null) : sectionSlug,
        isHeading,
      });
    });
  }

  for (const q of questions) {
    push({
      kind: "question",
      id: `q:${q.id}`,
      title: q.question,
      text: [...q.options, q.explanation, q.wrongAnswerNotes ?? ""].join(" · "),
      scenario: q.scenario,
      scenarioId: q.scenarioId,
    });
  }

  for (const c of flashcards) {
    push({
      kind: "card",
      id: `c:${c.id}`,
      title: c.front,
      text: c.back,
      topic: c.topic,
    });
  }

  return entries;
}

let cachedIndex: IndexEntry[] | null = null;

/** Built on first search, never at import time, so page load stays cheap. */
function getIndex(): IndexEntry[] {
  cachedIndex ??= buildIndex();
  return cachedIndex;
}

/** Corpus sizes for the palette's empty-state hint. Cheap — no index build. */
export function searchableCounts(): {
  guides: number;
  questions: number;
  cards: number;
} {
  return {
    guides: guides.length,
    questions: questions.length,
    cards: flashcards.length,
  };
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

/** Whitespace-split, lowercased, de-duplicated query terms. */
export function parseTerms(query: string): string[] {
  const seen = new Set<string>();
  for (const t of query.toLowerCase().split(/\s+/)) {
    if (t) seen.add(t);
  }
  return [...seen];
}

/** True when `i` starts a word — used to prefer prefix hits over infixes. */
function atWordStart(hay: string, i: number): boolean {
  return i === 0 || !/[\w]/.test(hay[i - 1]);
}

function scoreEntry(
  entry: IndexEntry,
  terms: string[],
  phrase: string,
): number {
  // AND semantics: every term must appear somewhere in the record.
  let firstHit = Infinity;
  for (const term of terms) {
    const at = entry.hay.indexOf(term);
    if (at < 0) return -1;
    if (at < firstHit) firstHit = at;
  }

  let score = 0;

  // Exact phrase beats scattered terms; in the title it beats phrase-in-body.
  if (terms.length > 1 || phrase.length > 2) {
    if (entry.title.includes(phrase)) score += 140;
    else if (entry.hay.includes(phrase)) score += 70;
  }

  // All terms inside the headline/heading.
  if (terms.every((t) => entry.title.includes(t))) score += 45;

  // Word-start hits are what a user typing a prefix actually means.
  for (const term of terms) {
    const at = entry.hay.indexOf(term);
    if (atWordStart(entry.hay, at)) score += 8;
  }

  // Earlier is better, but never enough to outrank a phrase or title match.
  score += Math.max(0, 25 - firstHit / 24);

  // Headings are navigational landmarks — nudge them up.
  if (entry.record.kind === "guide" && entry.record.isHeading) score += 10;

  // Ties break toward shorter, more specific records.
  score -= Math.min(15, entry.hay.length / 400);

  return score;
}

/** Ranked matches, best first. Returns [] for a blank query. */
export function search(query: string, limit = 30): SearchResult[] {
  const phrase = query.trim().toLowerCase();
  const terms = parseTerms(query);
  if (!terms.length) return [];

  const scored: SearchResult[] = [];
  for (const entry of getIndex()) {
    const score = scoreEntry(entry, terms, phrase);
    if (score < 0) continue;
    scored.push({ record: entry.record, score, target: targetFor(entry.record) });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.record.title.length - b.record.title.length ||
      a.record.id.localeCompare(b.record.id),
  );

  return scored.slice(0, limit);
}

export function targetFor(record: SearchRecord): SearchTarget {
  switch (record.kind) {
    case "guide":
      return { kind: "guide", guideId: record.guideId, slug: record.slug };
    case "question":
      return { kind: "question", questionId: record.id.slice(2) };
    case "card":
      return { kind: "card", cardId: record.id.slice(2) };
  }
}

// ─── Snippets & highlighting ──────────────────────────────────────────────────

/** Non-overlapping match ranges for every term, left to right. */
export function highlightRanges(text: string, terms: string[]): MatchRange[] {
  const lower = text.toLowerCase();
  const ranges: MatchRange[] = [];

  for (const term of terms) {
    let from = 0;
    for (;;) {
      const at = lower.indexOf(term, from);
      if (at < 0) break;
      ranges.push({ start: at, end: at + term.length });
      from = at + term.length;
    }
  }

  ranges.sort((a, b) => a.start - b.start || b.end - a.end);

  // Merge overlaps so the UI can emit a flat sequence of <mark>s.
  const merged: MatchRange[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
    else merged.push({ ...r });
  }
  return merged;
}

/**
 * A short window of `text` centred on its first match, with ellipses folded in
 * and ranges already rebased onto the returned string.
 */
export function snippet(text: string, terms: string[], width = 150): Snippet {
  const flat = text.replace(/\s+/g, " ").trim();
  if (!flat) return { text: "", ranges: [] };

  const lower = flat.toLowerCase();
  let first = Infinity;
  for (const term of terms) {
    const at = lower.indexOf(term);
    if (at >= 0 && at < first) first = at;
  }
  if (first === Infinity) first = 0;

  // Back off ~a third of the window so the match sits inside, not at the edge.
  let start = Math.max(0, first - Math.floor(width / 3));
  if (start > 0) {
    // Snap to a word boundary so the window doesn't open mid-word.
    const space = flat.indexOf(" ", start);
    if (space >= 0 && space - start < 20) start = space + 1;
  }
  let end = Math.min(flat.length, start + width);
  if (end < flat.length) {
    const space = flat.lastIndexOf(" ", end);
    if (space > start) end = space;
  }

  const head = start > 0 ? "…" : "";
  const tail = end < flat.length ? "…" : "";
  const body = flat.slice(start, end);

  return {
    text: head + body + tail,
    ranges: highlightRanges(body, terms).map((r) => ({
      start: r.start + head.length,
      end: r.end + head.length,
    })),
  };
}
