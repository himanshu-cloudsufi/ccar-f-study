# Claude Certified Architect – Foundations (CCAR-F)
## Master Overview & Study Plan

> Companion index to the six scenario study guides. Read this first.

---

## 1. Exam Logistics at a Glance

| Item | Detail |
|---|---|
| Exam code | CCAR-F |
| Items | 60 (multiple-choice + multiple-response) |
| Structure | 4 scenarios presented, drawn at random from a bank of 6 |
| Time | 120 minutes (~2 min/question) |
| Passing | Scaled score 720 (scale 100–1,000), criterion-referenced |
| Fee | $125 USD |
| Validity | 12 months; free non-proctored renewal assessment if renewed on time |
| Delivery | Pearson VUE — online proctored or test center |
| Retakes | Wait 14 / 30 / 90 days after attempts 1/2/3; max 4 attempts per rolling 12 months |

**Key implication of the structure:** you cannot predict which 4 of the 6 scenarios you'll get, so you must prepare all six. Each scenario guide in this set is self-contained.

---

## 2. Domain Weights and Where They Appear

| # | Domain | Weight | Heaviest in scenarios |
|---|---|---|---|
| 1 | Agentic Architecture & Orchestration | 27% | 1, 3, 4 |
| 2 | Tool Design & MCP Integration | 18% | 1, 3, 4 |
| 3 | Claude Code Configuration & Workflows | 20% | 2, 4, 5 |
| 4 | Prompt Engineering & Structured Output | 20% | 5, 6 |
| 5 | Context Management & Reliability | 15% | 1, 2, 3, 6 |

---

## 3. The Six Scenario Guides

1. **01 – Customer Support Resolution Agent** — Agent SDK, MCP tools, hooks, escalation, case-facts context management
2. **02 – Code Generation with Claude Code** — CLAUDE.md hierarchy, rules, commands/skills, plan mode, iterative refinement, sessions
3. **03 – Multi-Agent Research System** — coordinator/subagent orchestration, context passing, error propagation, provenance
4. **04 – Developer Productivity with Claude** — built-in tools (Read/Write/Edit/Bash/Grep/Glob), MCP server config, codebase exploration, session state
5. **05 – Claude Code for CI/CD** — headless mode, structured CI output, review prompt precision, multi-pass review, Batch API tradeoffs
6. **06 – Structured Data Extraction** — tool_use + JSON schemas, tool_choice, validation-retry, batch processing, human review calibration

---

## 4. Cross-Cutting Answer Patterns (Learn These Cold)

The official sample questions reveal a consistent grading philosophy. When two answers both "could work," the correct one almost always follows one of these principles:

1. **Deterministic > probabilistic when compliance is mandatory.** Business-critical ordering (verify identity before refund) → programmatic hooks/gates, not prompt text or few-shot examples. Prompts have a non-zero failure rate.
2. **Fix the root cause with the simplest proportionate change.** Bad tool selection → improve tool *descriptions* first, before few-shot examples, routing layers, or classifiers. "Over-engineered" is a recurring wrong-answer trap.
3. **Self-reported confidence and sentiment are unreliable proxies.** Escalation should be driven by explicit criteria + few-shot examples, not confidence thresholds or sentiment analysis.
4. **Match the API to latency tolerance.** Batch API (50% cheaper, up to 24h, no SLA) for overnight/weekly jobs; synchronous API for anything blocking.
5. **Attention dilutes; split the work.** Large multi-file reviews → per-file passes + a separate cross-file integration pass. Bigger context windows do NOT fix attention quality.
6. **Independent reviewers beat self-review.** A fresh Claude instance without the generator's reasoning context catches more issues.
7. **Never fabricate; make schemas honest.** Nullable/optional fields where data may be absent; enums with "unclear"/"other"+detail; retries can't recover information that isn't in the source.
8. **Errors must carry structure.** errorCategory, isRetryable, what was attempted, partial results. Generic failures, silent suppression, and whole-workflow termination are all anti-patterns.
9. **Subagents share nothing by default.** Context must be passed explicitly in prompts; coordinator routes all communication (hub-and-spoke).
10. **Preserve provenance.** Claim–source mappings, publication dates, conflict annotation with attribution — never silently pick one value.

---

## 5. Suggested 3-Week Study Plan

**Week 1 — Heavy domains (1 & 2):** Work through guides 01, 03, 04. Do Exercise 1 and Exercise 4 from the official guide (build an agentic loop with structured errors; build a coordinator with two subagents).

**Week 2 — Claude Code (Domain 3):** Work through guides 02 and 05. Do Exercise 2 (configure CLAUDE.md hierarchy, rules, a forked skill, an MCP server). Run Claude Code in headless mode (`claude -p ...`) at least once.

**Week 3 — Structured output & reliability (Domains 4 & 5):** Work through guide 06. Do Exercise 3 (extraction pipeline with validation-retry and a batch run). Re-take all practice questions across the six guides; review every wrong answer against the patterns in Section 4 above.

---

## 6. Official Documentation to Study

- Claude Code docs: https://code.claude.com/docs (memory/CLAUDE.md, rules, slash commands, skills, MCP, CLI reference, plan mode, sessions)
- Claude API docs: https://docs.claude.com/en/api/overview (tool use, tool_choice, Message Batches API)
- Agent SDK docs: https://docs.claude.com/en/api/agent-sdk/overview (subagents, hooks, sessions)
- MCP: https://modelcontextprotocol.io (tools, resources, error handling)

## 7. Explicitly Out of Scope (do NOT waste time here)

Fine-tuning, billing/auth, MCP server hosting/infrastructure, model internals, Constitutional AI/RLHF, embeddings/vector DBs, computer use, vision, streaming, rate limits/pricing math, OAuth/key rotation, cloud-provider specifics, benchmarking, prompt-caching internals, tokenization.
