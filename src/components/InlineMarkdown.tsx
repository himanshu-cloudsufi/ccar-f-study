import { useMemo } from "react"
import { parseInline } from "@/lib/inline"

/**
 * Renders a string of authored inline Markdown — code, bold, italics.
 *
 * The span styling is copied from the `Spans` renderer in GuideRenderer so a
 * code fragment looks the same whether you meet it in a guide or on a
 * flashcard; if that treatment changes, both should change together.
 */
export function InlineMarkdown({ text }: { text: string }) {
  const spans = useMemo(() => parseInline(text), [text])

  return (
    <>
      {spans.map((s, i) => {
        switch (s.t) {
          case "strong":
            return (
              <strong key={i} className="font-semibold text-foreground">
                {s.v}
              </strong>
            )
          case "em":
            return (
              <em key={i} className="italic">
                {s.v}
              </em>
            )
          case "code":
            return (
              <code
                key={i}
                className="rounded bg-muted px-[0.35em] py-[0.15em] font-mono text-[0.87em] text-foreground"
              >
                {s.v}
              </code>
            )
          default:
            return <span key={i}>{s.v}</span>
        }
      })}
    </>
  )
}
