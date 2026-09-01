# Claude Certified Architect – Foundations
## Official Exam Guide (v1.0, effective July 2026)

> Converted from the official Anthropic exam guide PDF. This is the authoritative source for what the exam tests — every task statement below is fair game.

---

## Introduction

The Claude Certified Architect – Foundations certification validates that practitioners can make informed decisions about tradeoffs when implementing real-world solutions with Claude. This exam tests foundational knowledge across **Claude Code, the Claude Agent SDK, the Claude API, and Model Context Protocol (MCP)** — the core technologies used to build production-grade applications with Claude.

Questions are grounded in realistic scenarios drawn from actual customer use cases. Candidates must demonstrate not only conceptual knowledge but **practical judgment about architecture, configuration, and tradeoffs in production deployments**.

## Exam Details at a Glance

| Item | Detail |
|---|---|
| Credential | Claude Certified Architect – Foundations |
| Number of questions | 60 |
| Time limit | 120 minutes |
| Response format | Multiple choice and multiple response; each item states how many responses to select |
| Exam structure | 4 scenarios drawn from a bank of 6 |
| Content domains | 5 (weightings below) |
| Delivery | Online proctored or at a test center |
| Exam fee | $125 USD |
| Scoring | Scaled 100–1,000; minimum passing score **720** |
| Validity | 12 months from award date; free non-proctored renewal assessment if renewed on time |
| Retakes | Wait 14 / 30 / 90 days after attempts 1 / 2 / 3; max 4 attempts per rolling 12 months |
| Result reporting | Pass/fail with a scaled score, plus percent-correct by domain on the score report |

> Incorrect options are designed to be **plausible to a candidate with incomplete knowledge**.

## Target Candidate

A solution architect who designs and implements production applications with Claude, typically with **6+ months** of practical experience, including hands-on work with:

- Building agentic applications with the Claude Agent SDK: multi-agent orchestration, subagent delegation, tool integration, lifecycle hooks
- Configuring Claude Code for team workflows: CLAUDE.md files, Agent Skills, MCP server integrations, plan mode
- Designing MCP tool and resource interfaces for backend integration
- Engineering prompts for reliable structured output: JSON schemas, few-shot examples, extraction patterns
- Managing context windows across long documents, multi-turn conversations, multi-agent handoffs
- Integrating Claude into CI/CD pipelines: automated code review, test generation, PR feedback
- Sound escalation and reliability decisions: error handling, human-in-the-loop workflows, self-evaluation patterns

## Content Outline

| Domain | Weight |
|---|---|
| 1. Agentic Architecture & Orchestration | 27% |
| 2. Tool Design & MCP Integration | 18% |
| 3. Claude Code Configuration & Workflows | 20% |
| 4. Prompt Engineering & Structured Output | 20% |
| 5. Context Management & Reliability | 15% |

## The Six Exam Scenarios

4 of these 6 are presented at random on each exam form:

1. **Customer Support Resolution Agent** — Agent SDK, MCP tools (get_customer, lookup_order, process_refund, escalate_to_human), 80%+ first-contact resolution target. *(D1, D2, D5)*
2. **Code Generation with Claude Code** — custom slash commands, CLAUDE.md configurations, plan mode vs direct execution. *(D3, D5)*
3. **Multi-Agent Research System** — coordinator delegating to web-search, document-analysis, synthesis, and report subagents; cited reports. *(D1, D2, D5)*
4. **Developer Productivity with Claude** — codebase exploration, legacy systems, boilerplate, built-in tools (Read, Write, Bash, Grep, Glob), MCP servers. *(D2, D3, D1)*
5. **Claude Code for Continuous Integration** — automated reviews, test generation, PR feedback, actionable output, minimal false positives. *(D3, D4)*
6. **Structured Data Extraction** — extraction from unstructured documents, JSON schema validation, edge cases, downstream integration. *(D4, D5)*

---

## Domain 1: Agentic Architecture & Orchestration (27%)

### 1.1 Design and implement agentic loops for autonomous task execution

**Knowledge of:** the agentic loop lifecycle — send request, inspect `stop_reason` (`"tool_use"` vs `"end_turn"`), execute requested tools, return results for the next iteration; how tool results are appended to conversation history so the model can reason about the next action; model-driven decision-making vs pre-configured decision trees or fixed tool sequences.

**Skills in:** loop control flow that continues on `"tool_use"` and terminates on `"end_turn"`; adding tool results to context between iterations; **avoiding anti-patterns** — parsing natural-language signals for termination, arbitrary iteration caps as the primary stop, or checking for assistant text content as a completion indicator.

### 1.2 Orchestrate multi-agent systems with coordinator-subagent patterns

**Knowledge of:** hub-and-spoke architecture — the coordinator manages all inter-subagent communication, error handling, and information routing; subagents operate with **isolated context** (no automatic inheritance of coordinator history); coordinator's role in decomposition, delegation, aggregation, and choosing which subagents to invoke; **risk of overly narrow decomposition** causing incomplete coverage.

**Skills in:** coordinators that dynamically select subagents rather than always running the full pipeline; partitioning research scope to minimize duplication (distinct subtopics or source types per agent); **iterative refinement loops** — evaluate synthesis output for gaps, re-delegate targeted queries, re-invoke synthesis; routing all communication through the coordinator for observability and controlled information flow.

### 1.3 Configure subagent invocation, context passing, and spawning

**Knowledge of:** the **Task tool** as the spawning mechanism; the coordinator's `allowedTools` must include `"Task"`; subagent context must be **explicitly provided in the prompt** — no automatic inheritance, no shared memory between invocations; `AgentDefinition` (descriptions, system prompts, tool restrictions); fork-based session management from a shared analysis baseline.

**Skills in:** including complete prior findings directly in the subagent's prompt; **structured formats separating content from metadata** (source URLs, document names, page numbers) to preserve attribution; **parallel spawning = multiple Task tool calls in a single coordinator response** (not across turns); coordinator prompts that specify research goals and quality criteria rather than step-by-step procedures.

### 1.4 Implement multi-step workflows with enforcement and handoff patterns

**Knowledge of:** programmatic enforcement (hooks, prerequisite gates) vs prompt-based guidance; when deterministic compliance is required (e.g., identity verification before financial operations), **prompt instructions alone have a non-zero failure rate**; structured handoff protocols for mid-process escalation.

**Skills in:** programmatic prerequisites that block downstream tool calls until prerequisites complete (e.g., block `process_refund` until `get_customer` returns a verified ID); decomposing multi-concern requests into distinct items, investigating in parallel with shared context, synthesizing a unified resolution; compiling structured handoff summaries (customer ID, root cause, refund amount, recommended action) for human agents who lack the transcript.

### 1.5 Apply Agent SDK hooks for tool call interception and data normalization

**Knowledge of:** **PostToolUse hooks** intercept tool *results* for transformation before the model processes them; tool-call interception hooks intercept *outgoing* calls to enforce compliance (e.g., block refunds above a threshold); hooks = deterministic guarantees, prompts = probabilistic compliance.

**Skills in:** PostToolUse hooks normalizing heterogeneous formats (Unix timestamps, ISO 8601, numeric status codes); interception hooks blocking policy-violating actions (refunds > $500) and redirecting to escalation; choosing hooks over prompts when business rules require guaranteed compliance.

### 1.6 Design task decomposition strategies for complex workflows

**Knowledge of:** fixed sequential pipelines (**prompt chaining**) vs **dynamic adaptive decomposition** based on intermediate findings; chaining pattern for reviews — analyze each file individually, then a cross-file integration pass; adaptive plans that generate subtasks from discoveries.

**Skills in:** chaining for predictable multi-aspect reviews; dynamic decomposition for open-ended investigation; per-file passes + separate cross-file integration pass to avoid attention dilution; decomposing open-ended tasks (e.g., "add comprehensive tests to a legacy codebase") by mapping structure → identifying high-impact areas → prioritized plan that adapts.

### 1.7 Manage session state, resumption, and forking

**Knowledge of:** `--resume <session-name>` for named session resumption; `fork_session` for independent branches from a shared baseline; informing the agent about changed files when resuming; why a **new session with a structured summary** beats resuming with stale tool results.

**Skills in:** `--resume` for continuing named investigations; `fork_session` for parallel exploration branches (comparing two strategies from one analysis); resumption when prior context is mostly valid vs fresh-with-summary when stale; naming specific changed files for targeted re-analysis.

---

## Domain 2: Tool Design & MCP Integration (18%)

### 2.1 Design effective tool interfaces with clear descriptions and boundaries

**Knowledge of:** tool descriptions as the **primary selection mechanism** — minimal descriptions cause unreliable selection among similar tools; descriptions should include input formats, example queries, edge cases, boundaries; overlapping descriptions cause misrouting; **system prompt wording** can create unintended tool associations.

**Skills in:** descriptions that differentiate purpose, inputs, outputs, and when to use vs alternatives; renaming to eliminate overlap (`analyze_content` → `extract_web_results`); splitting generic tools into purpose-specific ones (`analyze_document` → `extract_data_points`, `summarize_content`, `verify_claim_against_source`); reviewing system prompts for keyword-sensitive instructions.

### 2.2 Implement structured error responses for MCP tools

**Knowledge of:** the MCP **`isError`** flag pattern; error taxonomy — **transient** (timeouts), **validation** (bad input), **business** (policy violations), **permission**; why generic "Operation failed" responses prevent recovery decisions; retryable vs non-retryable metadata prevents wasted retries.

**Skills in:** structured metadata — `errorCategory`, `isRetryable`, human-readable descriptions; `retriable: false` + customer-friendly explanations for business violations; **local recovery in subagents for transients**, propagating only unresolvable errors with partials and attempts; distinguishing **access failures** (retry decision needed) from **valid empty results** (successful query, no matches).

### 2.3 Distribute tools appropriately across agents and configure tool choice

**Knowledge of:** too many tools (18 vs 4–5) degrades selection reliability; agents misuse out-of-specialization tools; scoped access — role-relevant tools plus limited cross-role tools for high-frequency needs; `tool_choice`: `"auto"`, `"any"`, forced `{"type": "tool", "name": "..."}`.

**Skills in:** restricting each subagent's tool set to its role; constrained alternatives (`fetch_url` → `load_document` with URL validation); scoped cross-role tools (a `verify_fact` tool for synthesis) with coordinator routing for complex cases; forced tool selection to guarantee a specific tool runs first (e.g., `extract_metadata` before enrichment); `tool_choice: "any"` to guarantee a tool call instead of conversational text.

### 2.4 Integrate MCP servers into Claude Code and agent workflows

**Knowledge of:** scoping — project `.mcp.json` (shared via git) vs user `~/.claude.json` (personal/experimental); **environment variable expansion** (`${GITHUB_TOKEN}`) for credentials without committing secrets; tools from **all configured servers discovered at connection time, available simultaneously**; **MCP resources** as content catalogs (issue summaries, documentation hierarchies, database schemas) that reduce exploratory tool calls.

**Skills in:** shared servers in `.mcp.json` with env-var expansion; personal servers in `~/.claude.json`; **enhancing MCP tool descriptions** so the agent doesn't prefer built-ins like Grep; **community servers for standard integrations** (Jira), custom servers only for team-specific workflows; exposing content catalogs as resources.

### 2.5 Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob)

**Knowledge of:** **Grep = content search** (function callers, error messages, imports); **Glob = file path/name patterns**; Read/Write for full files; **Edit = targeted modification via unique text matching**; when Edit fails on non-unique matches → **Read + Write fallback**.

**Skills in:** Grep for content, Glob for names (`**/*.test.tsx`); Read → Write when Edit can't find unique anchor text; **incremental exploration** — Grep entry points, then Read to trace imports/flows, never read-everything-upfront; tracing re-exported functions by identifying all exported names, then Grepping each name.

---

## Domain 3: Claude Code Configuration & Workflows (20%)

### 3.1 Configure CLAUDE.md hierarchy, scoping, and modular organization

**Knowledge of:** hierarchy — user `~/.claude/CLAUDE.md`, project `.claude/CLAUDE.md` or root `CLAUDE.md`, directory-level files; **user-level settings are never shared via version control**; `@import` syntax for modular external files; `.claude/rules/` for topic-specific rule files.

**Skills in:** diagnosing hierarchy issues (new teammate missing instructions that live in user-level config); `@import` for selective per-package standards; splitting monolithic CLAUDE.md into `.claude/rules/` topic files (testing.md, api-conventions.md, deployment.md); **`/memory`** to verify which memory files are loaded.

### 3.2 Create and configure custom slash commands and skills

**Knowledge of:** project commands `.claude/commands/` (shared) vs user `~/.claude/commands/` (personal); skills in `.claude/skills/` with SKILL.md frontmatter — **`context: fork`** (isolated sub-agent context), **`allowed-tools`** (restrict tools), **`argument-hint`** (prompt for parameters); personal skill variants under `~/.claude/skills/` with different names.

**Skills in:** project-scoped commands for team-wide availability; `context: fork` for verbose/exploratory skills; `allowed-tools` to prevent destructive actions; `argument-hint` for required parameters; choosing skills (on-demand, task-specific) vs CLAUDE.md (always-loaded, universal).

### 3.3 Apply path-specific rules for conditional convention loading

**Knowledge of:** `.claude/rules/` files with YAML frontmatter **`paths`** glob patterns; path-scoped rules load only when editing matching files (less irrelevant context, fewer tokens); **glob rules beat directory CLAUDE.md for file types spread across directories** (test files everywhere).

**Skills in:** `paths: ["terraform/**/*"]` for subtree conventions; `**/*.test.tsx` for scattered file types; choosing rules over subdirectory CLAUDE.md when conventions span the codebase.

### 3.4 Determine when to use plan mode vs direct execution

**Knowledge of:** plan mode for large-scale changes, multiple valid approaches, architectural decisions, multi-file modifications; direct execution for simple well-scoped changes; plan mode enables safe exploration before committing; the **Explore subagent** isolates verbose discovery output, returning summaries.

**Skills in:** plan mode for architectural work (microservice restructuring, 45+-file migrations, competing integration approaches); direct execution for clear-scope fixes (single-file bug with stack trace, one validation conditional); Explore subagent to prevent context exhaustion; **plan mode for investigation + direct execution for implementation**.

### 3.5 Apply iterative refinement techniques

**Knowledge of:** **concrete input/output examples** — the most effective way to communicate transformations when prose is interpreted inconsistently; test-driven iteration (tests first, iterate on failures); the **interview pattern** — Claude asks questions to surface unanticipated considerations; single message for interacting issues vs sequential for independent ones.

**Skills in:** 2–3 I/O example pairs for inconsistent transformations; test suites covering behavior/edge cases/performance before implementation; interview pattern for unfamiliar domains (cache invalidation, failure modes); specific test cases for edge handling (nulls in migration scripts); batching interacting fixes in one detailed message.

### 3.6 Integrate Claude Code into CI/CD pipelines

**Knowledge of:** **`-p` / `--print`** for non-interactive mode; **`--output-format json`** and **`--json-schema`** for structured CI output; CLAUDE.md provides project context (testing standards, fixtures, review criteria) to CI-invoked runs; **session context isolation** — the generating session is less effective at reviewing its own changes.

**Skills in:** `-p` to prevent interactive hangs; JSON + schema for machine-parseable findings posted as inline PR comments; including **prior review findings** in re-reviews to report only new/unaddressed issues; providing **existing test files** so generation avoids duplicates; documenting standards in CLAUDE.md to reduce low-value test output.

---

## Domain 4: Prompt Engineering & Structured Output (20%)

### 4.1 Design prompts with explicit criteria to reduce false positives

**Knowledge of:** explicit criteria beat vague instructions ("flag comments only when claimed behavior contradicts actual code behavior" vs "check comments are accurate"); "be conservative" / "only high-confidence findings" **do not improve precision**; high false-positive categories undermine trust in accurate categories.

**Skills in:** categorical criteria — which issues to report (bugs, security) vs skip (minor style) — not confidence-based filtering; **temporarily disabling high-FP categories** to restore trust while fixing prompts; explicit severity criteria with concrete code examples per level.

### 4.2 Apply few-shot prompting for consistency and quality

**Knowledge of:** few-shot examples as the most effective technique when detailed instructions alone yield inconsistent output; demonstrating ambiguous-case handling; enabling **generalization to novel patterns**, not just pre-listed cases; reducing hallucination in extraction (informal measurements, varied structures).

**Skills in:** **2–4 targeted examples** for ambiguous scenarios showing the reasoning for the chosen action; examples demonstrating exact output format (location, issue, severity, fix); examples distinguishing acceptable patterns from genuine issues; examples for varied document structures (inline citations vs bibliographies); examples fixing empty/null extraction of present-but-unusual fields.

### 4.3 Enforce structured output using tool use and JSON schemas

**Knowledge of:** `tool_use` with JSON schemas = the most reliable schema-compliant output, **eliminating syntax errors**; `tool_choice` — `"auto"` (may return text), `"any"` (must call some tool), forced (must call the named tool); strict schemas eliminate syntax errors but **not semantic errors** (line items not summing, wrong-field values); required vs optional fields; enums with "other" + detail string.

**Skills in:** extraction tools whose input schema is the target schema, reading data from the tool_use block; `"any"` when multiple schemas exist and document type is unknown; forced selection to run a specific extraction first; **nullable fields prevent fabrication** when data may be absent; "unclear" enum values and "other"+detail; format normalization rules in the prompt alongside strict schemas.

### 4.4 Implement validation, retry, and feedback loops

**Knowledge of:** retry-with-error-feedback — append the specific validation errors on retry; **retries cannot recover information absent from the source**; `detected_pattern` fields enable systematic false-positive analysis; semantic validation errors vs schema syntax errors.

**Skills in:** follow-ups containing the original document + failed extraction + specific errors; identifying retry-effective failures (format, structure) vs retry-ineffective (absent information); `detected_pattern` for dismissal analysis; self-correction flows — `calculated_total` vs `stated_total`, `conflict_detected` booleans.

### 4.5 Design efficient batch processing strategies

**Knowledge of:** Message Batches API — **50% cost savings, up to 24-hour window, no latency SLA**; appropriate for non-blocking latency-tolerant loads (overnight reports, weekly audits), inappropriate for blocking workflows (pre-merge checks); **no multi-turn tool calling within a batch request**; `custom_id` for request/response correlation.

**Skills in:** synchronous for blocking checks, batch for overnight/weekly; **submission frequency from SLA math** (4-hour windows to guarantee a 30-hour SLA with 24-hour processing); resubmitting only failures by `custom_id` with modifications (chunking oversized documents); refining prompts on a sample set before large batch runs.

### 4.6 Design multi-instance and multi-pass review architectures

**Knowledge of:** self-review limitations — retained generation reasoning makes a model unlikely to question its own decisions; **independent review instances** beat self-review instructions and extended thinking; multi-pass review — per-file local passes + cross-file integration passes avoid attention dilution and contradictory findings.

**Skills in:** a second independent instance without the generator's reasoning context; per-file passes + integration pass for large PRs; verification passes with self-reported per-finding confidence for **calibrated review routing**.

---

## Domain 5: Context Management & Reliability (15%)

### 5.1 Preserve critical information across long interactions

**Knowledge of:** progressive summarization condenses numbers, percentages, dates, and stated expectations into vague prose; the **lost-in-the-middle** effect; tool results consume tokens disproportionately (40+ fields when 5 matter); passing complete history for coherence.

**Skills in:** persistent **case-facts blocks** (amounts, dates, order numbers, statuses) outside summarized history; per-issue structured data in a separate context layer; **trimming verbose tool outputs** to relevant fields before accumulation; key-findings summaries at the beginning + explicit section headers; requiring metadata (dates, sources, methodology) in structured outputs; upstream agents returning structured data instead of verbose prose when downstream budgets are tight.

### 5.2 Design escalation and ambiguity resolution patterns

**Knowledge of:** escalation triggers — explicit human request, **policy gaps/exceptions** (not mere complexity), inability to progress; escalate immediately on explicit demand vs offer to resolve when straightforward; **sentiment and self-reported confidence are unreliable proxies**; multiple matches → ask for identifiers, never heuristic selection.

**Skills in:** explicit escalation criteria + few-shot escalate-vs-resolve examples; honoring explicit human requests immediately without investigating first; acknowledging frustration while offering resolution (escalate only if reiterated); escalating on policy silence/ambiguity (competitor price matching when policy covers only own-site); asking for additional identifiers on multiple matches.

### 5.3 Implement error propagation across multi-agent systems

**Knowledge of:** structured error context (failure type, attempted query, partial results, alternatives) enables intelligent coordinator recovery; access failures vs valid empty results; generic statuses hide context; **silent suppression and whole-workflow termination are both anti-patterns**.

**Skills in:** structured error context for coordinator recovery; distinguishing access failure from empty result; local recovery for transients, propagating only unresolvable errors with attempts and partials; **coverage annotations** in synthesis — well-supported findings vs gaps from unavailable sources.

### 5.4 Manage context in large codebase exploration

**Knowledge of:** degradation symptoms — inconsistent answers, citing "typical patterns" instead of discovered specifics; scratchpad files persist findings across context boundaries; subagent delegation isolates verbose output; structured state persistence (manifests) for crash recovery.

**Skills in:** subagents for specific verbose questions while the main agent coordinates; scratchpad files of key findings; phase summaries injected into next-phase subagent context; crash recovery via agent state exports + coordinator-loaded manifests; **`/compact`** when discovery output fills the window.

### 5.5 Design human review workflows and confidence calibration

**Knowledge of:** aggregate accuracy (97%) can mask poor performance on specific document types or fields; **stratified random sampling** of high-confidence extractions for error measurement and novel-pattern detection; field-level confidence **calibrated on labeled validation sets**; segment validation before automating.

**Skills in:** stratified sampling of the automated stream, ongoing; accuracy analysis by document type and field before reducing review; field-level confidence + calibrated thresholds; routing low-confidence and ambiguous/contradictory documents to human review.

### 5.6 Preserve provenance and handle uncertainty in multi-source synthesis

**Knowledge of:** attribution is lost in summarization unless claim–source mappings are preserved; synthesis must preserve and merge structured mappings; conflicting statistics → annotate with attribution, never arbitrarily select; publication/collection dates prevent temporal differences reading as contradictions.

**Skills in:** structured claim–source mappings (URLs, document names, excerpts) preserved through synthesis; reports separating **well-established** from **contested** findings with source characterizations; document analysis completing with both conflicting values annotated — the coordinator reconciles; dates in structured outputs; content-appropriate rendering (financial tables, news prose, technical lists).

---

## Official Sample Questions

Twelve sample questions with answers appear in the guide (customer support ×3, Claude Code ×3, multi-agent ×3, CI/CD ×3). **All twelve are included in this app's Test mode**, tagged "official exam guide" — practice them there with shuffled options.

## Preparation Exercises

**Exercise 1 — Multi-tool agent with escalation logic** *(D1, D2, D5)*: define 3–4 MCP tools with differentiating descriptions (include two deliberately similar ones); implement a stop_reason-driven loop; add structured errors (errorCategory, isRetryable) and verify per-category handling; add an interception hook enforcing a threshold rule with escalation redirect; test multi-concern messages for decomposition + unified synthesis.

**Exercise 2 — Claude Code for a team workflow** *(D3, D2)*: project CLAUDE.md with universal standards; `.claude/rules/` with glob frontmatter, verified to load conditionally; a project skill with `context: fork` + `allowed-tools`, verified isolated; `.mcp.json` with env-var expansion plus a personal server in `~/.claude.json`, both active simultaneously; compare plan mode vs direct execution across a bug fix, a migration, and a multi-approach feature.

**Exercise 3 — Structured data extraction pipeline** *(D4, D5)*: extraction tool with required/optional fields, "other"+detail enum, nullable fields — verify nulls instead of fabrication; validation-retry loop with document + failed extraction + errors, tracking retry-resolvable vs not; few-shot examples for varied formats; a 100-document batch run with custom_id failure handling and SLA math; confidence-based human review routing with segment-level accuracy analysis.

**Exercise 4 — Multi-agent research pipeline** *(D1, D2, D5)*: coordinator with `"Task"` in allowedTools delegating to two subagents with explicit context in prompts; parallel spawning via multiple Task calls in one response (measure the latency gain); structured findings (claim, excerpt, source, date) with attribution preserved through synthesis; simulated timeout → verify structured error context and coverage-gap annotation; conflicting sources → verify both values preserved with attribution, established vs contested sections.

## Appendix: Technologies and Concepts

- **Claude Agent SDK** — agent definitions, agentic loops, stop_reason handling, hooks (PostToolUse, tool-call interception), Task-tool subagent spawning, allowedTools
- **MCP** — servers, tools, resources, isError flag, tool descriptions, tool distribution, .mcp.json, env-var expansion
- **Claude Code** — CLAUDE.md hierarchy, .claude/rules/ path scoping, .claude/commands/, .claude/skills/ frontmatter (context: fork, allowed-tools, argument-hint), plan mode, /memory, /compact, --resume, fork_session, Explore subagent
- **Claude Code CLI** — -p/--print, --output-format json, --json-schema
- **Claude API** — tool_use with JSON schemas, tool_choice, stop_reason values, max_tokens, system prompts
- **Message Batches API** — 50% savings, ≤24h window, custom_id, polling, no multi-turn tool calling
- **JSON Schema / Pydantic** — required vs optional, enums, nullable fields, "other"+detail, validation-retry loops, semantic validation
- **Built-in tools** — Read, Write, Edit, Bash, Grep, Glob
- **Few-shot prompting · Prompt chaining · Context window management · Session management · Confidence scoring**

### Out-of-Scope (will NOT appear)

Fine-tuning; API auth/billing; language/framework internals; MCP server hosting/infrastructure; Claude internals/training; Constitutional AI/RLHF; embeddings/vector DBs; computer use; vision; streaming; rate limits/pricing math; OAuth/key rotation; cloud-provider specifics; benchmarking; prompt-caching internals; tokenization.

## Preparation Recommendations

1. **Build an agent with the Agent SDK** — full agentic loop, tool calling, error handling, session management, subagent spawning with context passing.
2. **Configure Claude Code on a real project** — CLAUDE.md hierarchy, path-specific rules, skills with frontmatter, at least one MCP server.
3. **Design and test MCP tools** — differentiating descriptions, structured errors with categories and retryable flags, selection testing with ambiguous requests.
4. **Build an extraction pipeline** — tool_use + schemas, validation-retry, nullable fields, Batch API practice.
5. **Practice prompt engineering** — few-shot for ambiguity, explicit review criteria, multi-pass review architectures.
6. **Study context management** — fact extraction from verbose outputs, scratchpad files, subagent delegation.
7. **Review escalation patterns** — when to escalate vs resolve, confidence-based human review routing.
