# CCAR-F Study Hub

A local web app for preparing for the **Claude Certified Architect – Foundations (CCAR-F)** exam. It bundles eight study guides (a master overview, the official exam guide, and one deep-dive per exam scenario) with a 222-question practice bank and a test engine that mirrors the real exam format. Everything runs client-side: guides are compiled in from Markdown, your attempt history lives in `localStorage`, and the only network calls are the optional team leaderboard and its sign-in.

**The exam, for reference:** 60 single-answer questions, 120 minutes, 4 scenarios drawn at random from a bank of 6, scaled score 100–1,000 with **720 to pass** (≈75% raw), $125 USD, delivered by Pearson VUE (online proctored or test centre). You cannot predict which four scenarios you get, so all six matter.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts: `npm run build` (typecheck + production build into `dist/`, deployable as plain static files on any host — GitHub Pages, S3, Netlify, `npx serve dist`), `npm run preview` (serve the built output), `npm run lint` (oxlint).

Node 20+ and npm. No env vars, no backend to run. The Supabase project URL and publishable key are committed in `src/lib/leaderboard.ts`, so the leaderboard works out of the box — reading it needs nothing, posting to it needs a work-email sign-in (see below).

## The surfaces

### Learn

Eight guides in a sidebar, rendered as Markdown. Read **Overview & Study Plan** first (logistics, domain weights, and the ten cross-cutting answer patterns), then **Official Exam Guide** (the authoritative domain/task breakdown, sample questions, and four preparation exercises), then the six scenario guides. Each scenario guide is self-contained and ends with practice questions.

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

## Team leaderboard

A shared board (Supabase) showing the **best exam-simulation attempt per person**. Only exam simulations are eligible — quick quizzes and targeted drills are not comparable. Submitting is **explicit opt-in**: after an exam sim you sign in with your work email, pick a display name, and press submit; nothing is sent otherwise. Your display name is remembered locally under `ccarf-name`.

### Identity model

Reading the board is anonymous — no sign-in, nothing to configure. **Posting a score requires signing in with a `@cloudsufi.com` address** via Supabase email magic link.

Enforcement is server-side, not in the UI. Row-level security on the `leaderboard` table allows an insert only from an authenticated session where `auth.uid() = user_id` **and** the JWT's email ends in `@cloudsufi.com`; an anonymous insert gets an HTTP 401 no matter what the client sends. Every row carries a `user_id` foreign key to `auth.users`, filled server-side by an `auth.uid()` column default rather than by the browser — so a row cannot be attributed to someone else. Scores are tied to real accounts; spoofing is not a thing.

The flow, on the exam-simulation results screen: enter your work email → Supabase sends a sign-in link → clicking it returns you to the app signed in (supabase-js persists the session in the browser, so this is once per device) → pick a display name, prefilled from your email → submit. A sign-out link sits next to it.

Study data is unaffected: attempt history, mistakes pool, and flashcard stats still live only in `localStorage` and are never sent to the server. Auth gates the leaderboard and nothing else.

**Two operational notes:**

- The magic-link email comes from Supabase's built-in sender, which is **rate-limited on the free tier** to a few emails per hour. That is fine in steady state — each person signs in roughly once per device — but on onboarding day the team should not all request links within the same hour. If that becomes a problem, configure custom SMTP in the Supabase dashboard.
- The deployed URL must be added to **Supabase → Authentication → URL Configuration** (Site URL and the redirect allowlist) or magic links will bounce back to the wrong origin. It is currently set to `http://localhost:5173`, so update it when the app moves off localhost.

**Still open, if we want it:** swapping the magic link for "Sign in with Google" restricted to the Workspace domain — with an Internal consent screen there is no Google verification review and no user cap, and it removes the email round-trip entirely. Optionally, a `user_progress` table to sync attempt history across devices. Both drop into the existing `user_id`/RLS structure with no rework.

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
  App.tsx                      shell, Learn/Test/Cards tabs, Markdown guide reader
  TestView.tsx                 test engine: draws, timer, navigator, scoring, review
  CardsView.tsx                flashcard drill: deck picker, queue, hit/miss stats
  LeaderboardPanel.tsx         board, magic-link sign-in, opt-in submit card
  content/
    00-CCAR-F-Overview-and-Study-Plan.md
    01…06-<scenario>.md          six scenario deep-dives
    07-Official-Exam-Guide.md
  data/
    guides.ts                  imports the Markdown as ?raw, sets titles/tags
    questions.ts               Question type + 36 handwritten items, merged with:
    imported-questions.json    186 community/official items — edit this to add questions
    flashcards.ts              flashcard deck
  lib/
    history.ts                 localStorage attempts + mistakes pool
    leaderboard.ts             Supabase client, auth, fetch/post
    utils.ts                   cn()
  components/ui/               shadcn primitives
  index.css                    Tailwind v4 theme
public/                        favicon, icons
```

Stack: Vite 8, React 19, TypeScript, Tailwind v4, shadcn/ui (Radix), react-markdown, supabase-js. `@/` resolves to `src/`.
