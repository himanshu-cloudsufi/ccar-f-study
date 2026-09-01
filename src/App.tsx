import { useState } from "react";
import { guides } from "@/data/guides";
import GuideRenderer, { GuideOutline } from "@/components/GuideRenderer";
import TestView from "@/TestView";
import CardsView from "@/CardsView";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ThemeToggle from "@/components/ThemeToggle";
import {
  CommandPalette,
  SearchTriggerButton,
} from "@/components/CommandPalette";
import { useRoute, type Mode } from "@/lib/router";
import type { SearchTarget } from "@/lib/search";

// ─── Learn mode ───────────────────────────────────────────────────────────────

function LearnView({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const active = guides.find((g) => g.id === activeId) ?? guides[0];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row">
      <aside className="shrink-0 md:w-60">
        <div className="md:sticky md:top-20 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto">
          <nav className="flex flex-row gap-2 overflow-x-auto md:flex-col">
            {guides.map((g) => (
              <button
                key={g.id}
                onClick={() => onSelect(g.id)}
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

export default function App() {
  const { route, navigate } = useRoute();
  const mode = route.mode;
  const [searchOpen, setSearchOpen] = useState(false);

  // A guide hit deep-links to its section; questions and cards can only land on
  // their mode, since neither test nor cards mode addresses a single item yet.
  const goToResult = (target: SearchTarget) => {
    setSearchOpen(false);
    if (target.kind === "guide") {
      navigate({
        mode: "learn",
        guideId: target.guideId,
        section: target.slug ?? undefined,
      });
    } else {
      navigate({ mode: target.kind === "question" ? "test" : "cards" });
    }
  };

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
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <SearchTriggerButton onClick={() => setSearchOpen(true)} />
            <ThemeToggle />
            <Tabs
              value={mode}
              onValueChange={(v) => navigate({ mode: v as Mode })}
            >
              <TabsList>
                <TabsTrigger value="learn">📖 Learn</TabsTrigger>
                <TabsTrigger value="test">✍️ Test</TabsTrigger>
                <TabsTrigger value="cards">🃏 Cards</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      {mode === "learn" ? (
        <LearnView
          activeId={route.guideId}
          onSelect={(id) => navigate({ guideId: id })}
        />
      ) : mode === "test" ? (
        <TestView />
      ) : (
        <CardsView />
      )}

      <CommandPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onNavigate={goToResult}
      />
    </div>
  );
}
