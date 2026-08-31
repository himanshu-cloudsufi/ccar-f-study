import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { guides } from "@/data/guides"
import TestView from "@/TestView"
import CardsView from "@/CardsView"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ─── Learn mode ───────────────────────────────────────────────────────────────

function LearnView() {
  const [activeId, setActiveId] = useState(guides[0].id)
  const active = guides.find((g) => g.id === activeId) ?? guides[0]

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row">
      <aside className="shrink-0 md:w-64">
        <nav className="flex flex-row gap-2 overflow-x-auto md:sticky md:top-20 md:flex-col">
          {guides.map((g) => (
            <button
              key={g.id}
              onClick={() => {
                setActiveId(g.id)
                window.scrollTo({ top: 0 })
              }}
              className={`shrink-0 rounded-lg border px-3 py-2 text-left text-sm transition-colors md:w-full ${
                g.id === activeId
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent"
              }`}
            >
              <div className="font-medium">{g.shortTitle}</div>
              <div
                className={`text-xs ${
                  g.id === activeId
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                }`}
              >
                {g.tag}
              </div>
            </button>
          ))}
        </nav>
      </aside>

      <article className="min-w-0 flex-1">
        <Card>
          <CardContent className="pt-6">
            <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-table:block prose-table:overflow-x-auto prose-pre:overflow-x-auto">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {active.content}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      </article>
    </div>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

type Mode = "learn" | "test" | "cards"

export default function App() {
  const [mode, setMode] = useState<Mode>("learn")

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-xl">🎓</span>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold sm:text-base">
                CCAR-F Study Hub
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Claude Certified Architect – Foundations
              </p>
            </div>
          </div>
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as Mode)}
          >
            <TabsList>
              <TabsTrigger value="learn">📖 Learn</TabsTrigger>
              <TabsTrigger value="test">✍️ Test</TabsTrigger>
              <TabsTrigger value="cards">🃏 Cards</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {mode === "learn" ? (
        <LearnView />
      ) : mode === "test" ? (
        <TestView />
      ) : (
        <CardsView />
      )}
    </div>
  )
}
