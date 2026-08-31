# CCAR-F: Three-Week Team Study Plan

Adapted from section 5 of the Overview guide (Learn → *Overview & Study Plan*) and rewritten around what this app actually does. Budget roughly 6–8 hours a week. The order is deliberate: the two heaviest domains first, while you still have three weeks of drilling ahead of you.

All six scenarios are fair game and you cannot predict which four you'll be served, so nothing here is optional. Per-scenario bank sizes: S1 38 · S2 38 · S3 38 · S4 34 · S5 38 · S6 36.

## Week 1 — Agentic architecture & tools (Domains 1 + 2, 45% of the exam)

**Read (Learn):** *Overview & Study Plan* first, then *Official Exam Guide* — skim the whole thing once, then read Domains 1 and 2 closely. Then guides **01 Customer Support Agent**, **03 Multi-Agent Research**, **04 Developer Productivity**.

**Drill (Test → Targeted practice):** after each guide, run that scenario alone at 10 questions, untimed. End of week: S1 + S3 + S4 together, 20 questions, **Timed at exam pace** checked. That is your first honest read on pace.

**Build (from the guide's preparation exercises):** Exercise 1 — an agentic loop with 3–4 MCP tools (make two descriptions deliberately similar and watch the model mis-select), structured errors carrying `errorCategory` and `isRetryable`, and an interception hook that hard-blocks an action until a prerequisite has run. Exercise 4 — a coordinator with two subagents, context passed explicitly in the prompts, spawned in parallel from a single response.

**Target by Friday:** 70%+ on targeted practice for S1, S3, S4. No exam simulation yet — an exam sim before you have seen the material only burns the questions.

## Week 2 — Claude Code (Domain 3, 20%)

**Read (Learn):** guides **02 Code Generation with Claude Code** and **05 Claude Code for CI/CD**, plus Domain 3 in the exam guide.

**Drill:** S2 and S5 at 10 questions each, then S2 + S5 at 20 timed. Run **Review my mistakes** at least twice this week — by now the pool has real signal in it.

**First exam simulation: Wednesday.** 60 questions, 120 minutes, one sitting, no interruptions, no tab-switching. Treat the score as a diagnostic, not a verdict; most people land in the 60s here. Read every wrong-answer note on the review screen, including for questions you got right.

**Build:** Exercise 2 — a real project with a CLAUDE.md hierarchy, `.claude/rules/` with glob frontmatter (verify it loads conditionally), a project skill with `context: fork` and `allowed-tools` (verify the isolation), and `.mcp.json` with env-var expansion alongside a personal server in `~/.claude.json`. Then run the same task through plan mode and direct execution and note where each wins. Run `claude -p "…"` headless at least once — Domain 3 asks about it.

**Target by Friday:** exam sim ≥ 68%, and 75%+ on S2/S5 targeted practice.

## Week 3 — Structured output & reliability (Domains 4 + 5, 35%) + consolidation

**Read (Learn):** guide **06 Structured Data Extraction**, Domains 4 and 5 in the exam guide, then go back and re-read **section 4 of the Overview** — the ten cross-cutting answer patterns. Those patterns decide most of the questions where two options both look workable. Learn them cold enough to name the one a question is testing.

**Drill:** S6 at 10, then S6 + your two weakest scenarios (the results screen sorts weakest-first, so you already know which) at 20 timed. Then **Full bank** — 222 questions, split over two or three sittings; the point is coverage, not the score. Finish with **Review my mistakes** until the pool is small.

**Exam simulations: Monday, Wednesday, Saturday.** Same conditions each time.

**Build:** Exercise 3 — an extraction pipeline with required/optional/nullable fields and an `"other"` + detail enum (verify it returns null instead of fabricating), a validation-retry loop that tracks which errors retries can and cannot fix, few-shot examples for informally-written values, and a ~100-document Batch API run with `custom_id` failure handling.

## Ready to book

Book the exam when **all** of these hold:

- [ ] **Two consecutive exam simulations at 75% or better.** Consecutive matters — one good run is variance in which 4 scenarios were drawn.
- [ ] **No scenario below 70%** in the per-scenario breakdown on those two runs. A weak scenario has a 4-in-6 chance of showing up.
- [ ] **Mistakes pool nearly empty** — under about 15 questions, and nothing in it you can't explain out loud. Remember an item needs two consecutive correct answers to leave the pool, so an empty-ish pool means real recall, not one lucky pass.
- [ ] **All six guides read**, and all four preparation exercises actually built rather than read about.
- [ ] **You finished a sim with time left.** 60 questions in 120 minutes is 2 minutes each; if you were still rushing at the end, pace is your problem, not knowledge.

If you're stuck at 70–74%, it is almost always the answer patterns rather than facts. Re-read Overview section 4 and, for each miss, name the pattern the question was testing before moving on.

## Day before

- One light pass over Overview section 4 and the domain outline. No new material, no cramming a guide you have never opened.
- One quick quiz (15 questions) for confidence. **Do not** run a full exam sim — a bad score the night before does nothing but rattle you.
- Confirm the logistics: Pearson VUE booking time and time zone, photo ID, and if you're taking it online-proctored, run their system check and clear your desk and walls.
- Sleep. The exam rewards careful reading, which is the first thing fatigue takes.

## Day of

- **Read every option before choosing.** The distractors are explicitly written to be plausible to someone with incomplete knowledge; the difference is usually one qualifier.
- **When two options both work, apply the patterns:** deterministic gate over prompt language when compliance is mandatory; simplest proportionate fix over a routing layer or classifier; explicit criteria over self-reported confidence or sentiment; Batch API only where latency genuinely doesn't matter; split the work rather than trusting a bigger context window; independent reviewer over self-review; nullable/honest schemas over forced fields.
- **"Over-engineered" is a recurring wrong answer.** If an option adds a component the symptom doesn't call for, it is probably the trap.
- **Flag and move on.** The platform requires an answer before advancing, so put down your best guess, flag it, and come back — never leave one blank or let it eat your clock.
- **Budget:** ~2 min/question, so aim to be at question 30 by the 55-minute mark. Reserve the last 15 minutes for flagged items.
- Only change an answer if you can articulate why the first one was wrong. Second-guessing on a feeling costs more than it recovers.

## Logistics & retakes

| Item | Detail |
|---|---|
| Fee | $125 USD per attempt |
| Format | 60 single-answer questions (one correct, three incorrect), 120 minutes |
| Structure | 4 scenarios drawn at random from the bank of 6 |
| Passing | Scaled 720 of 100–1,000, criterion-referenced (≈75% raw) |
| Result | Pass or fail only — no per-domain score, so don't count on diagnostics |
| Delivery | Pearson VUE, online proctored or test centre |
| Validity | 12 months; free non-proctored renewal assessment if you renew on time |
| Retake waits | 14 days after attempt 1, 30 after attempt 2, 90 after attempt 3 |
| Attempt cap | 4 per rolling 12 months |

The 90-day wait after a third attempt is the reason the "ready to book" bar above is deliberately strict. A failed attempt costs $125 and, later in the sequence, a quarter of a year.

## Out of scope — don't study it

Fine-tuning, billing/auth, MCP server hosting and infrastructure, model internals, Constitutional AI/RLHF, embeddings and vector DBs, computer use, vision, streaming, rate limits and pricing math, OAuth and key rotation, cloud-provider specifics, benchmarking, prompt-caching internals, tokenization.
