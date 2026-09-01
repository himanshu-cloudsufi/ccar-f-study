// Block-document model for the study guides. The JSON in src/content/blocks/ is
// generated from the Markdown in src/content/ and validated against it by
// scripts/validate-guide-json.py — see that script for the invariants.

export type Span =
  | { t: "text"; v: string }
  | { t: "strong"; v: string }
  | { t: "em"; v: string }
  | { t: "code"; v: string }
  | { t: "link"; v: string; href: string };

export interface ListItem {
  spans: Span[];
  /** "do" / "dont" render as ✅ / ❌ affordances instead of a plain marker. */
  marker: "none" | "do" | "dont";
  children: ListItem[];
}

export type Block =
  | { type: "heading"; level: 2 | 3 | 4; spans: Span[] }
  | { type: "paragraph"; spans: Span[] }
  | { type: "definition"; term: Span[]; spans: Span[] }
  | { type: "callout"; variant: "principle" | "note"; spans: Span[] }
  | { type: "list"; ordered: boolean; items: ListItem[] }
  | { type: "table"; columns: Span[][]; rows: Span[][][] }
  | { type: "code"; lang: string; code: string }
  | { type: "divider" }
  | {
      type: "quiz";
      qid: string;
      prompt: Span[];
      options: Span[][];
      answer: number;
      explanation: Span[];
    };

export interface GuideDoc {
  id: string;
  title: string;
  subtitle: string | null;
  blocks: Block[];
}

/** Flattens spans to plain text — for heading ids, titles, and search. */
export function spansToText(spans: Span[]): string {
  return spans.map((s) => s.v).join("");
}

/** Stable, URL-safe anchor for a heading, used by the in-page outline. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}
