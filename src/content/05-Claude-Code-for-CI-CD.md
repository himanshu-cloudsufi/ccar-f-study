# Scenario 5: Claude Code for Continuous Integration
## CCAR-F Deep-Dive Study Guide

**Context:** You integrate **Claude Code** into a CI/CD pipeline: automated code reviews, test generation, PR feedback. Goals: actionable feedback, minimal false positives.

**Primary domains:** Claude Code Configuration & Workflows (D3) · Prompt Engineering & Structured Output (D4)

---

## Part 1: Running Claude Code Headless (Task Statement 3.6)

### The flags (memorize exactly — fake flags are distractors)
- **`-p` / `--print`** — non-interactive mode. Processes the prompt, prints to stdout, exits. Without it, Claude Code waits for interactive input and **the CI job hangs indefinitely** (sample Q10).
- **`--output-format json`** — machine-parseable output.
- **`--json-schema`** — enforce a specific structure on that JSON output, e.g., so findings can be posted as **inline PR comments** automatically.

```bash
claude -p "Review the diff for security issues" \
  --output-format json \
  --json-schema review-findings.schema.json
```

**Known fake options used as distractors:** `CLAUDE_HEADLESS=true`, `--batch` flag, stdin redirection from /dev/null. None are the documented mechanism.

### Giving CI-invoked Claude project context
**CLAUDE.md** is the mechanism: document testing standards, fixture conventions, review criteria, and what makes a test valuable. Effects:
- Better review relevance
- **Higher-quality test generation, less low-value test output**

### Avoiding duplicate noise across runs
- **Re-reviews after new commits:** include **prior review findings in context** and instruct Claude to report **only new or still-unaddressed issues** — prevents duplicate PR comments.
- **Test generation:** include **existing test files in context** so Claude doesn't propose scenarios already covered.

---

## Part 2: Precision Prompting to Reduce False Positives (Task Statement 4.1)

### Explicit criteria beat vague instructions
- ❌ "Check that comments are accurate" / "be conservative" / "only report high-confidence findings" — these **do not improve precision**.
- ✅ "Flag comments **only when the claimed behavior contradicts the actual code behavior**."
- ✅ Define *which categories* to report (bugs, security) vs *skip* (minor style, local patterns) — **categorical criteria, not confidence-based filtering**.

### Trust dynamics
High false-positive rates in one category **undermine developer trust in the accurate categories too**. Tactical fix while you improve prompts: **temporarily disable the high-FP categories** to restore trust.

### Severity consistency
Define **explicit severity criteria with concrete code examples per level** — that's what produces consistent severity classification.

---

## Part 3: Few-Shot Prompting (Task Statement 4.2)

When detailed instructions alone still yield inconsistent output, **few-shot examples are the most effective technique** for:
- **Format consistency** — demonstrate the exact output shape: location, issue, severity, suggested fix.
- **Ambiguous-case judgment** — 2–4 targeted examples showing the *reasoning* for why one action beat plausible alternatives (e.g., branch-level coverage-gap decisions).
- **False-positive reduction** — examples distinguishing *acceptable patterns* from *genuine issues*, enabling generalization to novel patterns (not just matching pre-listed cases).

Rule of thumb: **2–4 targeted examples aimed at the ambiguous boundary**, not dozens of easy cases.

### Feedback loops
Add a **`detected_pattern` field** to structured findings. When developers dismiss findings, you can systematically analyze *which code constructs* trigger false positives and fix the prompt for those patterns.

---

## Part 4: Multi-Instance and Multi-Pass Review (Task Statement 4.6)

### Self-review limitation
A model that just generated code **retains its reasoning context** and is unlikely to question its own decisions in the same session. Neither "review your own work carefully" instructions nor extended thinking fixes this.

✅ **Independent review instance**: a second Claude instance **without the generator's reasoning context** catches subtle issues far better. Same applies to CI: the session that generated the code should not be the session that reviews it (**session context isolation**).

### Multi-pass review (sample Q12)
Single-pass review of a 14-file PR → **attention dilution**: inconsistent depth, missed obvious bugs, contradictory findings (flagging a pattern in one file, approving identical code in another).

✅ Restructure: **per-file passes for local issues + a separate integration pass for cross-file data flow.**

Distractor knowledge:
- ❌ Larger context window — doesn't fix attention *quality*
- ❌ Forcing developers to split PRs — shifts burden, doesn't fix the system
- ❌ Consensus voting across 3 runs — suppresses real bugs that are only caught intermittently

Optional add-on: verification passes where the model **self-reports confidence per finding** — used for *calibrated review routing*, not as an escalation trigger.

---

## Part 5: Batch vs Real-Time API (Task Statement 4.5)

### Message Batches API facts (memorize)
- **50% cost savings** vs synchronous API
- Processing window **up to 24 hours**, **no guaranteed latency SLA**
- **`custom_id`** correlates request/response pairs (results are not order-dependent — retrievable by ID)
- **No multi-turn tool calling within a single batch request** (can't execute tools mid-request and return results)

### The decision rule (sample Q11)
| Workflow | API |
|---|---|
| Blocking pre-merge check (developer waits) | **Synchronous** |
| Overnight technical-debt report | **Batch** |
| Weekly audits, nightly test generation | **Batch** |
| Anything with a human or pipeline blocked on the result | **Synchronous** |

"Batches often finish faster than 24h" is **not** an acceptable basis for a blocking workflow. Hybrid timeout-fallback designs are flagged as unnecessary complexity.

### SLA math pattern
If batch processing can take up to 24h and you must guarantee results within an N-hour SLA, submit batches every **N − 24** hours. Example from the guide: **30-hour SLA → submit every 4 hours** (any document waits ≤ 4h to be submitted + ≤ 24h processing ≤ 28h... the guide's arithmetic: 4h submission window + 24h processing ≤ 30h with margin). Practice: given SLA and 24h window, submission interval ≤ SLA − 24h.

### Failure handling
Resubmit **only failed requests** (identified via `custom_id`), with modifications — e.g., **chunking documents that exceeded context limits**. And refine prompts on a **sample set first** before batch-running large volumes, to maximize first-pass success.

---

## Part 6: Practice Questions

**Q1.** Your GitHub Action step `claude "Generate tests for changed files"` never completes. Fix?

A. `claude --batch "Generate tests for changed files"`
B. `export CLAUDE_HEADLESS=true` first
C. `claude -p "Generate tests for changed files"`
D. Pipe `yes ""` into the command

**Answer: C.** `-p`/`--print` is the non-interactive mode; the job hangs because Claude Code awaits interactive input. A and B are non-existent features.

---

**Q2.** You want review findings posted automatically as inline PR comments by a script. Which flag combination?

A. `-p --output-format json --json-schema findings.schema.json`
B. `-p --verbose`
C. `--output-format markdown --strict`
D. `-p --comment-mode inline`

**Answer: A.** JSON output constrained by a schema is machine-parseable for automated posting. The others include non-existent flags.

---

**Q3.** Developers dismiss ~60% of "code smell" findings but the security findings are excellent. Trust in the whole bot is collapsing. Best immediate + structural response?

A. Instruct the model to "be more conservative overall"
B. Temporarily disable the code-smell category while adding explicit categorical criteria and few-shot examples distinguishing acceptable patterns from genuine issues
C. Require two model runs to agree before posting any finding
D. Lower the bot to comment-only, never blocking

**Answer: B.** High-FP categories poison trust in accurate ones; disable them while fixing root cause with specific criteria + few-shot boundary examples. A is a vague instruction (documented to fail); C suppresses intermittently-caught real issues.

---

**Q4.** Claude Code generates a feature in a CI job, then in the same session is asked to "carefully review your changes for bugs." It approves its own subtle race condition. Why, and what's the fix?

A. The model is too small; upgrade tiers
B. The session retains generation reasoning, biasing self-review; use an independent Claude instance without that context for the review
C. Extended thinking should be enabled during review
D. The review prompt needed the word "critically"

**Answer: B.** Self-review limitation: retained reasoning context prevents questioning its own decisions. Independent instances (session context isolation) are the fix; C and D are documented non-fixes.

---

**Q5.** Management wants everything on the Batch API for the 50% savings: (1) pre-merge security gate, (2) nightly test-coverage report, (3) weekly dependency audit. Correct split?

A. All three on batch with polling
B. Gate stays synchronous; nightly report and weekly audit move to batch
C. All three stay synchronous to avoid ordering issues
D. All three on batch with a real-time fallback timeout

**Answer: B.** Batch = latency-tolerant, non-blocking only (up to 24h, no SLA). The blocking gate must be synchronous. Ordering is a non-issue (custom_id). Fallback hybrids add needless complexity.

---

**Q6.** Every push to an open PR triggers a fresh review that repeats all previous comments, burying new ones. Fix?

A. Review only the newest commit's diff
B. Include prior review findings in context and instruct Claude to report only new or still-unaddressed issues
C. Deduplicate comments with string matching in the pipeline script
D. Limit reviews to one per PR

**Answer: B.** The documented pattern. A misses issues arising from interactions with earlier changes; C is brittle post-hoc patching; D loses coverage of later commits.

---

## Key Takeaways Card
- Headless = `-p`/`--print`; structured CI output = `--output-format json` + `--json-schema`. CLAUDE_HEADLESS and --batch don't exist.
- CLAUDE.md gives CI runs project context: testing standards, fixtures, review criteria.
- Precision comes from categorical criteria + severity examples, never "be conservative."
- High-FP categories: disable temporarily, fix with few-shot boundary examples; track `detected_pattern` for systematic FP analysis.
- Generator ≠ reviewer: independent instance. Big PRs: per-file passes + integration pass; bigger context ≠ better attention.
- Batch API: 50% off, ≤24h, no SLA, custom_id correlation, no mid-request tool loops. Blocking → sync. SLA math: interval ≤ SLA − 24h.
- Re-reviews see prior findings; test generation sees existing tests.

**Docs:** Claude Code CLI reference — https://code.claude.com/docs (CLI section) · Batches API — https://docs.claude.com/en/api (Message Batches)
