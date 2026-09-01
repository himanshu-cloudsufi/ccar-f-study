# Claude Certified Architect – Foundations (CCAR-F)
## Master Overview & Study Plan

> Companion index to the six scenario guides. Read this first, then the **Official Exam Guide** — the authoritative source for logistics, sample questions, preparation exercises, and the full task statements, which are only referenced by number here. This document adds the connective tissue: how the exam is assembled from scenarios and domains, where each domain is taught, and which task statements anchor the ten answer patterns.

---

## 1. How the Exam Is Assembled

**60 questions, 120 minutes, 4 scenarios drawn at random from a bank of 6** — roughly 15 questions per drawn scenario, a mix of multiple-choice and multiple-response items that each state how many responses to select, with distractors written to be plausible to a candidate with incomplete knowledge. You cannot predict which four scenarios you get, so all six guides are mandatory: a weak scenario has a 4-in-6 chance of appearing on your form.

| # | Scenario | Guide | Domains | What it tests |
|---|---|---|---|---|
| 1 | Customer Support Resolution Agent | 01 | D1 · D2 · D5 | Agent SDK loop, MCP support tools (`get_customer`, `process_refund`, …), enforcement hooks, escalation — 80%+ first-contact resolution target |
| 2 | Code Generation with Claude Code | 02 | D3 · D5 | Custom slash commands, CLAUDE.md configurations, plan mode vs direct execution |
| 3 | Multi-Agent Research System | 03 | D1 · D2 · D5 | Coordinator delegating to web-search, document-analysis, synthesis, and report subagents; cited reports |
| 4 | Developer Productivity with Claude | 04 | D2 · D3 · D1 | Codebase exploration, legacy systems, boilerplate, built-in tools (Read, Write, Bash, Grep, Glob), MCP servers |
| 5 | Claude Code for Continuous Integration | 05 | D3 · D4 | Automated reviews, test generation, PR feedback, actionable output, minimal false positives |
| 6 | Structured Data Extraction | 06 | D4 · D5 | Extraction from unstructured documents, JSON schema validation, edge cases, downstream integration |

---

## 2. Domains → Where to Study Them

Domain weights convert directly into questions — **1% ≈ 0.6 questions of the 60** — so study time should follow the same curve. Domains 1 + 2 together are **45% of the exam**, and Domain 1 alone outweighs every other domain.

| Domain | Weight | ≈ Questions | Task statements | Taught in guides |
|---|---|---|---|---|
| **D1** Agentic Architecture & Orchestration | 27% | ~16 of 60 | 1.1–1.7 | 01 (1.1, 1.4, 1.5) · 03 (1.2, 1.3) · 04 (1.6, 1.7) · 02 (1.7) |
| **D2** Tool Design & MCP Integration | 18% | ~11 of 60 | 2.1–2.5 | 01 (2.1, 2.2) · 03 (2.2, 2.3) · 04 (2.4, 2.5) |
| **D3** Claude Code Configuration & Workflows | 20% | ~12 of 60 | 3.1–3.6 | 02 (3.1–3.5) · 05 (3.6) |
| **D4** Prompt Engineering & Structured Output | 20% | ~12 of 60 | 4.1–4.6 | 05 (4.1, 4.2, 4.5, 4.6) · 06 (4.2–4.5) |
| **D5** Context Management & Reliability | 15% | ~9 of 60 | 5.1–5.6 | 01 (5.1, 5.2) · 03 (5.1, 5.3, 5.6) · 04 (5.4) · 02 (5.4) · 06 (5.5) |

Every one of the **30 task statements** is covered by at least one scenario guide. Where a statement appears in two guides (1.7, 2.2, 4.2, 4.5, 5.1, 5.4), each guide approaches it from a different scenario — read both treatments; the exam does the same.

A reading order that follows the weights: **01 → 03 → 04** first (Domains 1 + 2, 45%), then **02 → 05** (Domain 3 plus the review half of Domain 4), then **06** (extraction and reliability).

---

## 3. Cross-Cutting Answer Patterns (Learn These Cold)

The official sample questions reveal a consistent grading philosophy. When two answers both "could work," the correct one almost always follows one of these principles — each anchored to the task statements where the exam tests it:

1. **Deterministic > probabilistic when compliance is mandatory.** Business-critical ordering (verify identity before refund) → programmatic hooks/gates, not prompt text or few-shot examples. Prompts have a non-zero failure rate. *(task statements 1.4, 1.5)*
2. **Fix the root cause with the simplest proportionate change.** Bad tool selection → improve tool *descriptions* first, before few-shot examples, routing layers, or classifiers. "Over-engineered" is a recurring wrong-answer trap. *(task statement 2.1)*
3. **Self-reported confidence and sentiment are unreliable proxies.** Escalation should be driven by explicit criteria + few-shot examples, not confidence thresholds or sentiment analysis. *(task statements 5.2, 5.5)*
4. **Match the API to latency tolerance.** Batch API (50% cheaper, up to 24h, no SLA) for overnight/weekly jobs; synchronous API for anything blocking. *(task statement 4.5)*
5. **Attention dilutes; split the work.** Large multi-file reviews → per-file passes + a separate cross-file integration pass. Bigger context windows do NOT fix attention quality. *(task statements 1.6, 4.6)*
6. **Independent reviewers beat self-review.** A fresh Claude instance without the generator's reasoning context catches more issues. *(task statements 3.6, 4.6)*
7. **Never fabricate; make schemas honest.** Nullable/optional fields where data may be absent; enums with "unclear"/"other"+detail; retries can't recover information that isn't in the source. *(task statements 4.3, 4.4)*
8. **Errors must carry structure.** errorCategory, isRetryable, what was attempted, partial results. Generic failures, silent suppression, and whole-workflow termination are all anti-patterns. *(task statements 2.2, 5.3)*
9. **Subagents share nothing by default.** Context must be passed explicitly in prompts; coordinator routes all communication (hub-and-spoke). *(task statements 1.2, 1.3)*
10. **Preserve provenance.** Claim–source mappings, publication dates, conflict annotation with attribution — never silently pick one value. *(task statements 1.3, 5.6)*

---

## 4. What the Exam Does Not Test

The Official Exam Guide's out-of-scope list is worth taking literally — every hour spent on it is an hour taken from a 27% domain. Nothing on the exam covers: **model internals** (Claude's training, Constitutional AI/RLHF, tokenization, prompt-caching internals, benchmarking); **adjacent ML infrastructure** (fine-tuning, embeddings, vector databases); **API operations** (auth/billing, rate limits and pricing math, OAuth/key rotation, streaming); **deployment plumbing** (MCP server hosting/infrastructure, cloud-provider specifics); the **multimodal surface** (vision, computer use); or language/framework internals. One nuance: the Batch API's 50% discount is still fair game — it drives an architecture decision, not pricing arithmetic. If a practice resource drills anything else on this list, it is preparing you for a different exam.

---

## 5. Official Documentation to Study

- Claude Code docs: https://code.claude.com/docs (memory/CLAUDE.md, rules, slash commands, skills, MCP, CLI reference, plan mode, sessions)
- Claude API docs: https://docs.claude.com/en/api/overview (tool use, tool_choice, Message Batches API)
- Agent SDK docs: https://docs.claude.com/en/api/agent-sdk/overview (subagents, hooks, sessions)
- MCP: https://modelcontextprotocol.io (tools, resources, error handling)
