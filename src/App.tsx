import { useState } from "react";
import { guides } from "@/data/guides";
import GuideRenderer, { GuideOutline } from "@/components/GuideRenderer";
import TestView from "@/TestView";
import CardsView from "@/CardsView";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ─── Learn mode ───────────────────────────────────────────────────────────────

function LearnView() {
  const [activeId, setActiveId] = useState(guides[0].id);
  const active = guides.find((g) => g.id === activeId) ?? guides[0];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row">
      <aside className="shrink-0 md:w-60">
        <div className="md:sticky md:top-20 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto">
          <nav className="flex flex-row gap-2 overflow-x-auto md:flex-col">
            {guides.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  setActiveId(g.id);
                  window.scrollTo({ top: 0 });
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
          {/* Below xl the outline has no rail of its own, so it stays here. */}
          <div className="mt-4 hidden md:block xl:hidden">
            <GuideOutline doc={active.doc} />
          </div>
        </div>
      </aside>

      <article className="min-w-0 flex-1">
        <Card>
          <CardContent className="pt-6">
            <GuideRenderer doc={active.doc} />
          </CardContent>
        </Card>
      </article>

      <aside className="hidden shrink-0 xl:block xl:w-56">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <GuideOutline doc={active.doc} />
        </div>
      </aside>
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

type Mode = "learn" | "test" | "cards";

export default function App() {
  const [mode, setMode] = useState<Mode>("learn");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3">
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
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
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
  );
}
