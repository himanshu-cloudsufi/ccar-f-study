import { useState } from "react";
import { Check, ChevronRight, Lightbulb, Quote, X } from "lucide-react";
import type { Block, GuideDoc, ListItem, Span } from "@/lib/blocks";
import { slugify, spansToText } from "@/lib/blocks";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ─── Inline spans ─────────────────────────────────────────────────────────────

function Spans({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((s, i) => {
        switch (s.t) {
          case "strong":
            return (
              <strong key={i} className="font-semibold text-foreground">
                {s.v}
              </strong>
            );
          case "em":
            return (
              <em key={i} className="italic">
                {s.v}
              </em>
            );
          case "code":
            return (
              <code
                key={i}
                className="rounded bg-muted px-[0.35em] py-[0.15em] font-mono text-[0.87em] text-foreground"
              >
                {s.v}
              </code>
            );
          case "link":
            return (
              <a
                key={i}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
              >
                {s.v}
              </a>
            );
          default:
            return <span key={i}>{s.v}</span>;
        }
      })}
    </>
  );
}

// ─── Lists ────────────────────────────────────────────────────────────────────

function Items({ items, ordered }: { items: ListItem[]; ordered: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className="flex flex-col gap-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
          <span className="mt-[0.15rem] shrink-0 select-none">
            {it.marker === "do" ? (
              <Check className="size-4 text-green-600 dark:text-green-400" />
            ) : it.marker === "dont" ? (
              <X className="size-4 text-red-600 dark:text-red-400" />
            ) : ordered ? (
              <span className="inline-flex size-4 items-center justify-center rounded-full bg-muted text-[0.65rem] font-semibold text-muted-foreground">
                {i + 1}
              </span>
            ) : (
              <span className="ml-1 inline-block size-1.5 rounded-full bg-muted-foreground/50" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <Spans spans={it.spans} />
            {it.children.length > 0 && (
              <div className="mt-1.5 border-l pl-3">
                <Items items={it.children} ordered={false} />
              </div>
            )}
          </div>
        </li>
      ))}
    </Tag>
  );
}

// ─── Clause splitting ─────────────────────────────────────────────────────────

/**
 * Splits a run of spans at top-level semicolons so a definition's clauses each
 * get their own line. Semicolons nested in parentheses/brackets, or inside a
 * code span, are left alone.
 */
function splitClauses(spans: Span[]): Span[][] {
  const out: Span[][] = [];
  let current: Span[] = [];

  const push = () => {
    // Drop the leading whitespace a split leaves behind, then the whole clause
    // if nothing but whitespace survived.
    while (current.length && current[0].t === "text") {
      const v = current[0].v.replace(/^\s+/, "");
      if (v) {
        current[0] = { t: "text", v };
        break;
      }
      current.shift();
    }
    if (current.length) out.push(current);
    current = [];
  };

  for (const span of spans) {
    if (span.t !== "text") {
      current.push(span);
      continue;
    }
    let depth = 0;
    let start = 0;
    for (let i = 0; i < span.v.length; i++) {
      const ch = span.v[i];
      if (ch === "(" || ch === "[") depth++;
      else if (ch === ")" || ch === "]") depth = Math.max(0, depth - 1);
      else if (ch === ";" && depth === 0) {
        const v = span.v.slice(start, i);
        if (v) current.push({ t: "text", v });
        push();
        start = i + 1;
      }
    }
    const rest = span.v.slice(start);
    if (rest) current.push({ t: "text", v: rest });
  }
  push();

  return out;
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

const LETTERS = "ABCDEFGH";

function Quiz({ block }: { block: Extract<Block, { type: "quiz" }> }) {
  const [picked, setPicked] = useState<number | null>(null);
  const revealed = picked !== null;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-start gap-2.5 border-b px-4 py-3">
        <Badge variant="secondary" className="shrink-0 font-mono">
          {block.qid}
        </Badge>
        <p className="text-sm leading-relaxed">
          <Spans spans={block.prompt} />
        </p>
      </div>

      <div className="flex flex-col gap-1.5 p-3">
        {block.options.map((opt, i) => {
          const isAnswer = i === block.answer;
          const isPicked = i === picked;
          return (
            <button
              key={i}
              type="button"
              onClick={() => picked === null && setPicked(i)}
              disabled={revealed}
              className={cn(
                "flex items-start gap-2.5 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                !revealed && "hover:border-primary/50 hover:bg-accent",
                revealed && isAnswer && "border-green-500/60 bg-green-500/10",
                revealed &&
                  isPicked &&
                  !isAnswer &&
                  "border-red-500/60 bg-red-500/10",
                revealed && !isAnswer && !isPicked && "opacity-55",
              )}
            >
              <span
                className={cn(
                  "mt-px inline-flex size-5 shrink-0 items-center justify-center rounded font-mono text-xs font-semibold",
                  revealed && isAnswer
                    ? "bg-green-600 text-white"
                    : revealed && isPicked
                      ? "bg-red-600 text-white"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {LETTERS[i]}
              </span>
              <span className="min-w-0 flex-1">
                <Spans spans={opt} />
              </span>
            </button>
          );
        })}
      </div>

      {revealed ? (
        <div className="border-t px-4 py-3 text-sm leading-relaxed">
          <span
            className={cn(
              "mr-1.5 font-semibold",
              picked === block.answer
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400",
            )}
          >
            {picked === block.answer ? "Correct." : "Not quite —"}
          </span>
          <span className="font-medium">Answer: {LETTERS[block.answer]}.</span>{" "}
          <Spans spans={block.explanation} />
        </div>
      ) : (
        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          Pick an option to check yourself.
        </div>
      )}
    </div>
  );
}

// ─── Blocks ───────────────────────────────────────────────────────────────────

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "heading": {
      const text = spansToText(block.spans);
      const id = slugify(text);
      if (block.level === 2) {
        return (
          <h2
            id={id}
            className="scroll-mt-24 border-b pb-2 pt-4 text-xl font-semibold tracking-tight first:pt-0"
          >
            <Spans spans={block.spans} />
          </h2>
        );
      }
      if (block.level === 3) {
        return (
          <h3 id={id} className="scroll-mt-24 pt-2 text-base font-semibold">
            <Spans spans={block.spans} />
          </h3>
        );
      }
      return (
        <h4
          id={id}
          className="scroll-mt-24 text-sm font-semibold text-muted-foreground"
        >
          <Spans spans={block.spans} />
        </h4>
      );
    }

    case "paragraph":
      return (
        <p className="text-sm leading-relaxed">
          <Spans spans={block.spans} />
        </p>
      );

    case "definition": {
      const clauses = splitClauses(block.spans);
      return (
        <div className="rounded-md border-l-2 border-primary/40 bg-muted/40 px-3 py-2">
          <span className="text-sm font-semibold text-foreground">
            <Spans spans={block.term} />
          </span>
          {clauses.length === 1 && (
            <span className="text-sm leading-relaxed">
              {" — "}
              <Spans spans={clauses[0]} />
            </span>
          )}
          {clauses.length > 1 && (
            <ul className="mt-1.5 flex flex-col gap-1">
              {clauses.map((clause, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed">
                  <span className="mt-[0.55rem] inline-block size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                  <span className="min-w-0 flex-1">
                    <Spans spans={clause} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    case "callout": {
      const principle = block.variant === "principle";
      const Icon = principle ? Lightbulb : Quote;
      return (
        <div
          className={cn(
            "flex gap-3 rounded-lg border px-4 py-3",
            principle
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-border bg-muted/50",
          )}
        >
          <Icon
            className={cn(
              "mt-0.5 size-4 shrink-0",
              principle
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground",
            )}
          />
          <p
            className={cn(
              "text-sm leading-relaxed",
              !principle && "text-muted-foreground",
            )}
          >
            <Spans spans={block.spans} />
          </p>
        </div>
      );
    }

    case "list":
      return <Items items={block.items} ordered={block.ordered} />;

    case "table":
      return (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60">
                {block.columns.map((c, i) => (
                  <th
                    key={i}
                    className="whitespace-nowrap border-b px-3 py-2 text-left font-semibold"
                  >
                    <Spans spans={c} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="even:bg-muted/25">
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className="border-b px-3 py-2 align-top leading-relaxed last:border-r-0"
                    >
                      <Spans spans={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "code":
      return (
        <figure className="overflow-hidden rounded-lg border bg-muted/40">
          {block.lang && (
            <figcaption className="border-b px-3 py-1.5 font-mono text-[0.7rem] uppercase tracking-wide text-muted-foreground">
              {block.lang}
            </figcaption>
          )}
          <pre className="overflow-x-auto px-3 py-2.5">
            <code className="font-mono text-xs leading-relaxed">
              {block.code}
            </code>
          </pre>
        </figure>
      );

    case "divider":
      return <Separator className="my-1" />;

    case "quiz":
      return <Quiz block={block} />;
  }
}

// ─── Document ─────────────────────────────────────────────────────────────────

/** In-page outline built from the document's level-2 headings. */
export function GuideOutline({ doc }: { doc: GuideDoc }) {
  const tops = doc.blocks.filter(
    (b): b is Extract<Block, { type: "heading" }> =>
      b.type === "heading" && b.level === 2,
  );
  if (tops.length < 3) return null;

  return (
    <nav className="flex flex-col gap-0.5">
      <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        On this page
      </p>
      {tops.map((h, i) => {
        const text = spansToText(h.spans);
        return (
          <a
            key={i}
            href={`#${slugify(text)}`}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ChevronRight className="size-3 shrink-0" />
            <span className="truncate">{text}</span>
          </a>
        );
      })}
    </nav>
  );
}

export default function GuideRenderer({ doc }: { doc: GuideDoc }) {
  return (
    <div className="flex flex-col gap-3.5">
      <header className="flex flex-col gap-1 pb-1">
        <h1 className="text-2xl font-bold tracking-tight">{doc.title}</h1>
        {doc.subtitle && (
          <p className="text-sm text-muted-foreground">{doc.subtitle}</p>
        )}
      </header>
      {doc.blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </div>
  );
}
