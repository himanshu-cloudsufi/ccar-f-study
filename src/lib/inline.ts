// Tiny inline-Markdown parser for authored prose that is stored as a plain
// string rather than as pre-parsed blocks — the flashcard deck, mainly, whose
// `back` fields are written with backticks and asterisks.
//
// It emits the same `Span` union the guide blocks use, so a code span can be
// styled identically wherever it appears. Deliberately inline-only: no
// headings, lists or links, and no dependency. Anything it does not understand
// is emitted as literal text, so a stray marker shows up as the author typed it
// instead of swallowing the rest of the sentence.

import type { Span } from "@/lib/blocks"

const ESCAPABLE = "\\`*"

/**
 * Parses `code`, `**strong**` and `*em*` out of one line of text.
 *
 * Rules that matter for the deck:
 * - A marker with no partner is literal. `2 * 3 = 6` stays arithmetic.
 * - Backticks win over emphasis, so `**kwargs` inside code is left alone.
 * - `\*` and `` \` `` escape a marker; the backslash itself is dropped.
 * - Underscores are never emphasis — identifiers like `stop_reason` and
 *   `tool_use` appear unquoted in the deck and must survive verbatim.
 */
export function parseInline(text: string): Span[] {
  const spans: Span[] = []
  let buf = ""

  const flush = () => {
    if (buf) {
      spans.push({ t: "text", v: buf })
      buf = ""
    }
  }

  let i = 0
  while (i < text.length) {
    const ch = text[i]

    if (ch === "\\" && i + 1 < text.length && ESCAPABLE.includes(text[i + 1])) {
      buf += text[i + 1]
      i += 2
      continue
    }

    if (ch === "`") {
      const end = text.indexOf("`", i + 1)
      // An unpaired backtick is just a backtick.
      if (end < 0 || end === i + 1) {
        buf += ch
        i++
        continue
      }
      flush()
      spans.push({ t: "code", v: text.slice(i + 1, end) })
      i = end + 1
      continue
    }

    if (ch === "*") {
      const strong = text.startsWith("**", i)
      const marker = strong ? "**" : "*"
      const opens = !/\s/.test(text[i + marker.length] ?? "")
      const end = opens ? findClose(text, i + marker.length, marker) : -1
      if (end < 0) {
        // Emit the whole run literally, so the second star of an unclosed `**`
        // cannot go on to open an italic of its own.
        buf += marker
        i += marker.length
        continue
      }
      flush()
      spans.push({
        t: strong ? "strong" : "em",
        v: text.slice(i + marker.length, end),
      })
      i = end + marker.length
      continue
    }

    buf += ch
    i++
  }

  flush()
  return spans
}

/**
 * Index of the closing marker, or -1. Escaped markers and anything inside a
 * code span are skipped so `**bold with `a*b` inside**` closes in the right
 * place. Empty content (`**`, `* *`) does not count as emphasis.
 */
function findClose(text: string, from: number, marker: string): number {
  let i = from
  while (i < text.length) {
    const ch = text[i]
    if (ch === "\\") {
      i += 2
      continue
    }
    if (ch === "`") {
      const end = text.indexOf("`", i + 1)
      i = end < 0 ? i + 1 : end + 1
      continue
    }
    if (text.startsWith(marker, i)) {
      // `*` must not match the first half of a `**` run.
      if (marker === "*" && text.startsWith("**", i)) {
        i += 2
        continue
      }
      // A marker after whitespace closes nothing — that is what keeps
      // "2 * 3 * 4" arithmetic instead of italics.
      if (/\s/.test(text[i - 1] ?? "")) {
        i += marker.length
        continue
      }
      return i > from ? i : -1
    }
    i++
  }
  return -1
}
