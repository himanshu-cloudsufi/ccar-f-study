# Claude Certified Architect – Foundations (CCAR-F)
## Master Overview & Study Plan

> Companion index to the six scenario guides. Read this first, then the **Official Exam Guide** for the authoritative logistics, domain weights, task statements, and out-of-scope list — none of that is repeated here.

---

## 1. Cross-Cutting Answer Patterns (Learn These Cold)

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

## 2. Official Documentation to Study

- Claude Code docs: https://code.claude.com/docs (memory/CLAUDE.md, rules, slash commands, skills, MCP, CLI reference, plan mode, sessions)
- Claude API docs: https://docs.claude.com/en/api/overview (tool use, tool_choice, Message Batches API)
- Agent SDK docs: https://docs.claude.com/en/api/agent-sdk/overview (subagents, hooks, sessions)
- MCP: https://modelcontextprotocol.io (tools, resources, error handling)
