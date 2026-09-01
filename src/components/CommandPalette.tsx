// Global ⌘K search palette. Built from scratch rather than shadcn's dialog /
// command primitives because neither is installed in this repo — so the overlay,
// focus handling, and roving keyboard selection are all hand-wired here.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { BookOpen, CircleHelp, Layers, Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  MatchRange,
  SearchKind,
  SearchRecord,
  SearchResult,
  SearchTarget,
} from "@/lib/search";
import { parseTerms, search, searchableCounts, snippet } from "@/lib/search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (target: SearchTarget) => void;
}

const RESULT_LIMIT = 30;

const KIND_META: Record<SearchKind, { label: string; icon: LucideIcon }> = {
  guide: { label: "Guides", icon: BookOpen },
  question: { label: "Questions", icon: CircleHelp },
  card: { label: "Flashcards", icon: Layers },
};

/** Groups render in this order regardless of where each kind's best hit fell. */
const KIND_ORDER: SearchKind[] = ["guide", "question", "card"];

// ─── Highlighting ─────────────────────────────────────────────────────────────

/** Splits `text` on `ranges` and wraps the matches in <mark>. */
function Highlight({ text, ranges }: { text: string; ranges: MatchRange[] }) {
  if (!ranges.length) return <>{text}</>;

  const parts: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((r, i) => {
    if (r.start > cursor) parts.push(text.slice(cursor, r.start));
    parts.push(
      <mark
        key={i}
        className="rounded-[3px] bg-yellow-200/80 px-[0.1em] text-foreground dark:bg-yellow-400/25 dark:text-foreground"
      >
        {text.slice(r.start, r.end)}
      </mark>,
    );
    cursor = r.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <>{parts}</>;
}

// ─── Result row ───────────────────────────────────────────────────────────────

/** Context line under a hit — which guide / scenario / topic it came from. */
function contextLabel(record: SearchRecord): string {
  switch (record.kind) {
    case "guide":
      return record.guideTitle;
    case "question":
      return record.scenario;
    case "card":
      return record.topic;
  }
}

function ResultRow({
  result,
  terms,
  selected,
  onActivate,
  onHover,
  rowRef,
  id,
}: {
  result: SearchResult;
  terms: string[];
  selected: boolean;
  onActivate: () => void;
  onHover: () => void;
  rowRef: (el: HTMLButtonElement | null) => void;
  id: string;
}) {
  const { record } = result;
  const title = useMemo(
    () => snippet(record.title, terms, 110),
    [record.title, terms],
  );
  const body = useMemo(
    () => (record.text ? snippet(record.text, terms, 150) : null),
    [record.text, terms],
  );

  return (
    <button
      ref={rowRef}
      id={id}
      type="button"
      role="option"
      aria-selected={selected}
      // Mouse-down rather than click: the input keeps focus, so activating with
      // the pointer can't race the blur-driven focus restore on close.
      onMouseDown={(e) => {
        e.preventDefault();
        onActivate();
      }}
      onMouseMove={onHover}
      className={cn(
        "flex w-full flex-col gap-1 rounded-md px-3 py-2 text-left transition-colors",
        selected ? "bg-accent text-accent-foreground" : "hover:bg-muted/60",
      )}
    >
      <span className="text-sm font-medium leading-snug text-foreground">
        <Highlight text={title.text} ranges={title.ranges} />
      </span>
      {body && body.text ? (
        <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          <Highlight text={body.text} ranges={body.ranges} />
        </span>
      ) : null}
      <span className="text-[0.7rem] font-medium tracking-wide text-muted-foreground/80 uppercase">
        {contextLabel(record)}
      </span>
    </button>
  );
}

// ─── Palette ──────────────────────────────────────────────────────────────────

export function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Element to hand focus back to when the palette closes.
  const restoreRef = useRef<HTMLElement | null>(null);

  const terms = useMemo(() => parseTerms(query), [query]);
  const results = useMemo(
    () => (query.trim() ? search(query, RESULT_LIMIT) : []),
    [query],
  );

  // Flat order = keyboard order. Groups are slices of this same array so the
  // selection index never has to be translated between the two views.
  const groups = useMemo(() => {
    const flat: SearchResult[] = [];
    const out: { kind: SearchKind; items: SearchResult[]; offset: number }[] = [];
    for (const kind of KIND_ORDER) {
      const items = results.filter((r) => r.record.kind === kind);
      if (!items.length) continue;
      out.push({ kind, items, offset: flat.length });
      flat.push(...items);
    }
    return { list: out, flat };
  }, [results]);

  const flat = groups.flat;

  // Each open starts from a clean slate. Adjusted during render off the previous
  // `open` value rather than in an effect, so the stale query's results never
  // get a chance to paint.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setSelected(0);
    }
  }

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const activate = useCallback(
    (result: SearchResult | undefined) => {
      if (!result) return;
      onNavigate(result.target);
      onOpenChange(false);
    },
    [onNavigate, onOpenChange],
  );

  // ── Global shortcut ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        // Leave ⌘K alone while the user is typing somewhere else — it is a
        // common in-editor binding and stealing it would be hostile.
        const el = e.target as HTMLElement | null;
        const typing =
          el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el?.isContentEditable === true;
        if (typing && el !== inputRef.current) return;

        e.preventDefault();
        onOpenChange(!open);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        close();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange, close]);

  // ── Focus: capture on open, restore on close ────────────────────────────────
  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;
    // The panel mounts in this same commit, so the ref is already live.
    inputRef.current?.focus();
    inputRef.current?.select();

    return () => {
      restoreRef.current?.focus?.();
      restoreRef.current = null;
    };
  }, [open]);

  // Keep the active row visible during keyboard traversal.
  useEffect(() => {
    if (!open) return;
    rowRefs.current[selected]?.scrollIntoView({ block: "nearest" });
  }, [selected, open, flat.length]);

  if (!open) return null;

  const move = (delta: number) => {
    if (!flat.length) return;
    setSelected((i) => (i + delta + flat.length) % flat.length);
  };

  // Tab is trapped inside the panel so the overlay behaves like a real modal.
  const onPanelKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Home" && flat.length) {
      e.preventDefault();
      setSelected(0);
    } else if (e.key === "End" && flat.length) {
      e.preventDefault();
      setSelected(flat.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      activate(flat[selected]);
    } else if (e.key === "Tab") {
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'input, button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const counts = searchableCounts();

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={close}
        className="absolute inset-0 h-full w-full cursor-default bg-background/70 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search study material"
        onKeyDown={onPanelKeyDown}
        className={cn(
          // Full-width sheet on phones, centred panel from sm up.
          "absolute inset-x-0 top-0 flex max-h-[100dvh] flex-col overflow-hidden border-b bg-popover text-popover-foreground shadow-2xl",
          "sm:inset-x-auto sm:top-[10vh] sm:left-1/2 sm:max-h-[70vh] sm:w-[min(40rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:rounded-xl sm:border",
        )}
      >
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              // The result set is about to change under the cursor.
              setSelected(0);
            }}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-results"
            aria-autocomplete="list"
            aria-activedescendant={
              flat.length ? `command-palette-row-${selected}` : undefined
            }
            placeholder="Search guides, questions and flashcards…"
            className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query ? (
            <Badge variant="outline" className="shrink-0 tabular-nums">
              {results.length}
              {results.length === RESULT_LIMIT ? "+" : ""}
            </Badge>
          ) : null}
          <button
            type="button"
            onClick={close}
            aria-label="Close search"
            className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <Separator />

        {!query.trim() ? (
          <div className="px-4 py-6 text-xs leading-relaxed text-muted-foreground">
            <p className="text-sm font-medium text-foreground">
              Search everything
            </p>
            <p className="mt-1">
              {counts.guides} study guides · {counts.questions} exam questions ·{" "}
              {counts.cards} flashcards.
            </p>
            <p className="mt-2">
              <Kbd>⌘K</Kbd> opens this anywhere, <Kbd>↑</Kbd> <Kbd>↓</Kbd> moves,{" "}
              <Kbd>↵</Kbd> jumps to the hit, <Kbd>esc</Kbd> closes. All terms you
              type must match.
            </p>
          </div>
        ) : !flat.length ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No matches for “{query.trim()}”. Try fewer or broader words.
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div
              id="command-palette-results"
              role="listbox"
              aria-label="Search results"
              className="flex flex-col gap-1 p-2"
            >
              {groups.list.map((group) => {
                const meta = KIND_META[group.kind];
                const Icon = meta.icon;
                return (
                  <div key={group.kind} className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      <Icon className="size-3.5" />
                      {meta.label}
                      <span className="font-normal tabular-nums opacity-70">
                        {group.items.length}
                      </span>
                    </div>
                    {group.items.map((result, i) => {
                      const index = group.offset + i;
                      return (
                        <ResultRow
                          key={result.record.id}
                          id={`command-palette-row-${index}`}
                          result={result}
                          terms={terms}
                          selected={index === selected}
                          onActivate={() => activate(result)}
                          onHover={() => setSelected(index)}
                          rowRef={(el) => {
                            rowRefs.current[index] = el;
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

// ─── Trigger & bits ───────────────────────────────────────────────────────────

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border bg-muted px-1 py-0.5 font-sans text-[0.7rem] text-foreground">
      {children}
    </kbd>
  );
}

/** Header affordance — the shortcut alone is not discoverable enough. */
export function SearchTriggerButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      aria-label="Search study material"
      className="gap-2 text-muted-foreground"
    >
      <Search className="size-4" />
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden rounded border bg-muted px-1 py-0.5 font-sans text-[0.7rem] sm:inline">
        ⌘K
      </kbd>
    </Button>
  );
}
