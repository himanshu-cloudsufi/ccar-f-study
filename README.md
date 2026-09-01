# CCAR-F Study Hub

A local web app for preparing for the **Claude Certified Architect – Foundations (CCAR-F)** exam. It bundles eight study guides (a master overview, the official exam guide, and one deep-dive per exam scenario) with a 222-question practice bank and a test engine that mirrors the real exam format. Everything runs client-side: guides are compiled in from Markdown, your attempt history lives in `localStorage`, and the app makes no network calls at all — no sign-in, no backend, no database.

**The exam, for reference:** 60 single-answer questions, 120 minutes, 4 scenarios drawn at random from a bank of 6, scaled score 100–1,000 with **720 to pass** (≈75% raw), $125 USD, delivered by Pearson VUE (online proctored or test centre). You cannot predict which four scenarios you get, so all six matter.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts: `npm run build` (typecheck + production build into `dist/`, deployable as plain static files on any host — GitHub Pages, S3, Netlify, `npx serve dist`), `npm run preview` (serve the built output), `npm run lint` (oxlint).

Node 20+ and npm. No env vars, no backend, no accounts — open it and start studying.

## The surfaces

### Learn

Eight guides in a sidebar, rendered from structured block documents (see [Content pipeline](#content-pipeline)) — tables, code samples, do/don't lists, exam-principle callouts, and self-checking practice questions each get their own component rather than one generic Markdown pass. Level-2 headings feed an "on this page" outline.

Read **Overview & Study Plan** first — it is a short strategy index: the ten cross-cutting answer patterns, a 3-week plan, and the docs links. Then **Official Exam Guide**, the authoritative source for logistics, domain weights, the 31 task statements, sample questions, preparation exercises, and the out-of-scope list. Then the six scenario guides, each self-contained and ending with practice questions.

### Test

Five ways in, all drawing from the same 222-question bank with questions **and** answer options reshuffled every attempt:

| Mode | Draw | Timer |
|---|---|---|
| 🎯 Exam simulation | 4 random scenarios × 15 questions = 60, single-answer only | 120 min |
| ⚡ Quick quiz | 15 random | 30 min |
| 🏋️ Full bank | all 222 | 2 min/question |
| 🔁 Review my mistakes | your current mistakes pool | untimed |
| 🎯 Targeted practice | pick any scenarios, then 10 / 20 / all | optional, at exam pace |

While in a test you get a **navigator grid** showing answered, unanswered, and flagged questions, so you can flag-for-review and jump around the way the real platform lets you. The exam simulation deliberately excludes the handful of multi-select items in the bank — the real exam is single-answer only (one correct option, three distractors) and requires an answer before you can advance.

### Cards

Flashcard drilling for fast recall on the same material. Pick one or more scenarios to narrow the deck (nothing selected means everything), then work the shuffled queue: reveal each card and mark whether you got it. Anything you stumble on can be re-drilled immediately, and per-card hit/miss counts persist under `ccarf-cards` — again, local only.

## Scoring and the mistakes drill

Submitting a test scores it immediately: an overall percentage against the **75% target** that maps to the 720 scaled passing score, a per-scenario breakdown sorted weakest-first, and a full answer review with the explanation and (on most questions) notes on why each wrong option is wrong. Read the wrong-answer notes even when you scored the question correctly — the distractors are written to be plausible to someone with incomplete knowledge, which is exactly what the real exam does.

Every attempt folds into `localStorage` (last 30 attempts, key `ccarf-history`):

- A question **enters** the mistakes pool when you answer it wrong or skip it.
- It **leaves** after you answer it correctly **twice** in a row (`MASTERY_STREAK` in `src/lib/history.ts`). One lucky guess is not mastery.
- "Review my mistakes" drills exactly that pool, untimed, and the results screen offers a one-click drill of what you just missed.

Attempt history is per-browser and never leaves your machine. Clearing it is a two-click confirm on the Test intro screen. If `localStorage` is unavailable (private windows, storage disabled), the app still works — history just doesn't persist.

## Contributing questions

Add items to `src/data/imported-questions.json` — a flat JSON array. `src/data/questions.ts` concatenates the 36 handwritten guide questions with that file, so a new entry appears everywhere in the app on save. One item:

```json
{
  "id": "me1",
  "scenario": "Customer Support Agent",
  "scenarioId": "s1",
  "question": "Telemetry shows process_refund firing without a verified customer ID in 12% of calls. Which change guarantees identity verification first?",
  "options": ["…", "…", "…", "…"],
  "multiSelect": false,
  "answers": [0],
  "explanation": "Why the keyed answer is right.",
  "wrongAnswerNotes": "Why each distractor fails.",
  "source": "nanp/claude-certification-mock-exams (CCAR-F)"
}
```

| Field | Notes |
|---|---|
| `id` | Unique across the whole bank. Handwritten items use `s1q1…`; imported sets use their own prefixes. Duplicate ids corrupt history and mistake tracking. |
| `scenario` | Display label, e.g. `Customer Support Agent`. Match the spelling already used for that scenario or it splits into two groups in the UI. |
| `scenarioId` | `s1`–`s6`, mapping to the six scenario guides in that order. |
| `question` | Prefer concrete numbers and symptoms over abstractions — that is how the real items read. |
| `options` | 4 strings, ideally. Order doesn't matter; the app shuffles and remaps `answers`. |
| `multiSelect` | `false` for single-answer. `true` items are excluded from exam simulations. |
| `answers` | Array of **indexes into `options`**, not letters. One entry unless `multiSelect`. |
| `explanation` | Required. Say why the answer is right on principle, not just "it's best practice". |
| `wrongAnswerNotes` | Optional but strongly encouraged — this is where most of the learning is. |
| `source` | Provenance string, shown in review. Reuse an existing value when adding to a set. |

**The one hard rule: principle-based questions only.** Write items that test a documented pattern — deterministic gates over prompt language, structured tool errors, explicit context passing to subagents, Batch API vs synchronous, and so on. **Never transcribe questions from an actual exam attempt.** Verbatim recall violates the certification NDA, gets the credential revoked, and teaches memorisation instead of the reasoning the exam grades. If you sat the exam, write from the concepts you found underweighted, not the wording you remember.

## Project structure

```
src/
  App.tsx                      shell, Learn/Test/Cards tabs, guide reader
  TestView.tsx                 test engine: draws, timer, navigator, scoring, review
  CardsView.tsx                flashcard drill: deck picker, queue, hit/miss stats
  content/                     authoring source (Markdown)
    00-CCAR-F-Overview-and-Study-Plan.md
    01…06-<scenario>.md          six scenario deep-dives
    07-Official-Exam-Guide.md
    blocks/*.json              generated block documents — what the app imports
  components/
    GuideRenderer.tsx          block/span renderer + on-this-page outline
  data/
    guides.ts                  imports the block JSON, sets titles/tags
    questions.ts               Question type + 36 handwritten items, merged with:
    imported-questions.json    186 community/official items — edit this to add questions
    flashcards.ts              flashcard deck
  lib/
    blocks.ts                  Block/Span/GuideDoc types
    history.ts                 localStorage attempts + mistakes pool
    utils.ts                   cn()
  components/ui/               shadcn primitives
  index.css                    Tailwind v4 theme
public/                        favicon, icons
scripts/
  validate-guide-json.py       checks the block JSON against its Markdown source
```

Stack: Vite 8, React 19, TypeScript, Tailwind v4, shadcn/ui (Radix). No Markdown runtime — guides ship as JSON. `@/` resolves to `src/`.

## Content pipeline

`src/content/*.md` is the authoring source. The app does **not** render it. Each guide is converted once into a block document under `src/content/blocks/*.json` and rendered by `src/components/GuideRenderer.tsx`, which maps each block type to a real component.

Block types: `heading`, `paragraph`, `definition` (a `**Label:** body` pair), `callout` (`principle` / `note`), `list` (nestable, with `do` / `dont` markers replacing ❌ / ✅ bullets), `table`, `code`, `divider`, and `quiz` — the `**Qn.**` practice questions, which render as click-to-check questions with per-option feedback instead of an answer key sitting in plain sight. Inline text is a flat span array (`text` / `strong` / `em` / `code` / `link`), so there is no Markdown parsing at runtime. See `src/lib/blocks.ts` for the types.

**After editing a guide's Markdown, regenerate its JSON and verify it:**

```bash
python3 scripts/validate-guide-json.py                  # all guides
python3 scripts/validate-guide-json.py 05-Claude-Code-for-CI-CD   # just one
```

The validator is the guard against the two failure modes of a conversion like this. It checks the schema (block and span shapes, table arity, quiz answer range, no leftover `**` or backticks in span text) and then diffs every word of prose in the Markdown against every word in the JSON — reporting `LOST from markdown` for dropped runs and `INVENTED in json` for added ones. It also requires code blocks to match byte-for-byte and the table and question counts to agree. A guide that passes is a faithful conversion, not a paraphrase.
