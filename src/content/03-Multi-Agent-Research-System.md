# Scenario 3: Multi-Agent Research System
## CCAR-F Deep-Dive Study Guide

**Context:** A **coordinator agent** (Claude Agent SDK) delegates to specialized subagents — web search, document analysis, synthesis, and report generation — to research topics and produce comprehensive, cited reports.

**Primary domains:** Agentic Architecture & Orchestration (D1) · Tool Design & MCP Integration (D2) · Context Management & Reliability (D5)

---

## Hub-and-Spoke Orchestration (Task Statement 1.2)

### Architecture rules
- The **coordinator** owns: task decomposition, delegation, result aggregation, deciding *which* subagents to invoke, error handling, and information routing.
- **All inter-subagent communication routes through the coordinator** (hub-and-spoke). Benefits: observability, consistent error handling, controlled information flow. Subagents never talk directly to each other.
- Subagents run with **isolated context** — they do NOT inherit the coordinator's conversation history automatically.

### Dynamic invocation, not fixed pipelines
A good coordinator analyzes the query and **selects only the needed subagents** rather than always running the full pipeline. Simple factual query → maybe just web search + synthesis; deep comparison → all four.

### The narrow-decomposition failure mode (sample Q7)
If the coordinator decomposes "impact of AI on creative industries" into only "digital art / graphic design / photography," the report misses music, writing, and film — **even though every subagent works perfectly**. Root cause: coordinator decomposition too narrow. Diagnostic habit: when coverage is incomplete but each agent succeeded, **check what the coordinator assigned**, not the downstream agents.

Mitigations:
- Partition research scope to **minimize duplication** (distinct subtopics or source types per agent) *and* maximize coverage.
- **Iterative refinement loops**: coordinator evaluates synthesis output for gaps → re-delegates targeted queries to search/analysis → re-invokes synthesis until coverage is sufficient.
- Coordinator prompts should specify **research goals and quality criteria**, not rigid step-by-step procedures — this preserves subagent adaptability.

---

## Spawning Subagents and Passing Context (Task Statement 1.3)

### Mechanics to memorize
- Subagents are spawned via the **Task tool**. The coordinator's **`allowedTools` must include `"Task"`** or it cannot spawn anything.
- **`AgentDefinition`** configures each subagent type: description, system prompt, tool restrictions.
- **Parallelism:** emit **multiple Task tool calls in a single coordinator response** → subagents run in parallel. Emitting them across separate turns = sequential (slower).
- **`fork_session`**: create independent branches from a shared analysis baseline to explore divergent approaches.

### Explicit context passing (the #1 gotcha)
Subagents share **no memory** between invocations and inherit **nothing**. Everything the synthesis agent needs — web search results, document analysis outputs — must be **included directly in its prompt**.

Use **structured formats separating content from metadata**:

```json
{
  "claim": "EU AI Act enforcement began August 2026",
  "evidence_excerpt": "...",
  "source_url": "https://...",
  "document_name": "EU Commission press release",
  "publication_date": "2026-08-01",
  "relevance_score": 0.92
}
```

This preserves **attribution** through handoffs and lets downstream agents reason about recency and reliability.

---

## Tool Distribution Across Agents (Task Statement 2.3)

### Principles
- **Too many tools degrades selection.** An agent with 18 tools instead of 4–5 makes unreliable choices — decision complexity scales with tool count.
- **Agents misuse out-of-specialization tools** (a synthesis agent with web search tools starts searching instead of synthesizing).
- **Scoped access:** each agent gets only role-relevant tools, plus narrowly **scoped cross-role tools for high-frequency needs**.

### The verify_fact pattern (sample Q9)
Synthesis frequently needs to verify claims; routing every verification through coordinator → web-search agent → back adds 2–3 round trips (+40% latency). If **85% are simple fact-checks**, give the synthesis agent a **scoped `verify_fact` tool** for those, keeping coordinator-routed delegation for the complex 15%. This is **least privilege**: enough capability for the common case, without over-provisioning (giving it *all* search tools) or speculative caching.

### Constrained alternatives
Replace generic tools with constrained ones: `fetch_url` → `load_document` that validates document URLs. Split overly generic tools: `analyze_document` → `extract_data_points`, `summarize_content`, `verify_claim_against_source`. Rename to eliminate overlap: `analyze_content` → `extract_web_results` with a web-specific description.

### tool_choice options (also tested in Scenario 6)
- `"auto"` — model may answer in text OR call a tool
- `"any"` — model MUST call some tool (its choice which)
- `{"type": "tool", "name": "..."}` — model MUST call that specific tool

---

## Error Propagation (Task Statements 2.2, 5.3)

### The correct pattern (sample Q8)
When a subagent fails (e.g., web search timeout), return **structured error context** to the coordinator:
- **Failure type** (timeout, access denied, ...)
- **What was attempted** (the query)
- **Partial results** gathered before failure
- **Potential alternative approaches**

This lets the coordinator decide intelligently: retry with a modified query, try an alternative source, or proceed with partials + annotate gaps.

### Anti-patterns (all appear as distractors)
- ❌ Generic status after silent internal retries ("search unavailable") — hides context from the coordinator
- ❌ Returning empty results **marked as successful** — silently suppresses the error, corrupts the research
- ❌ Propagating the raw exception to a top-level handler that **kills the whole workflow** — one failure shouldn't end everything

### Layered recovery
Subagents handle **local recovery for transient failures** themselves; they propagate only errors they **cannot** resolve, together with partials and attempts. And always distinguish **access failure** (couldn't search) from **valid empty result** (searched fine, nothing matched).

### Coverage annotations
Synthesis output should annotate which findings are **well-supported** vs which topic areas have **gaps due to unavailable sources** — the report is honest about its own blind spots.

---

## Context, Provenance, and Conflicts (Task Statements 5.1, 5.6)

### Position effects and budgets
- **Lost-in-the-middle:** in long aggregated inputs, middle-section findings get dropped. Put a key-findings summary **at the beginning** and organize details under explicit section headers.
- When downstream agents have tight context budgets, modify **upstream** agents to return **structured data** (key facts, citations, relevance scores) instead of verbose prose and reasoning chains.
- Require subagents to include **metadata** (dates, source locations, methodological context) in structured outputs for accurate synthesis.

### Provenance
- Source attribution is **lost during summarization** unless claim–source mappings are explicitly preserved and merged at every step.
- **Conflicting statistics from credible sources:** never arbitrarily pick one. The document-analysis agent completes its work with **both values included and explicitly annotated**; the **coordinator** decides how to reconcile before synthesis. Final reports separate **well-established** findings from **contested** ones, preserving each source's characterization and methodological context.
- **Temporal data:** require publication/collection dates in structured outputs, so a 2023 statistic vs a 2026 statistic reads as a *time difference*, not a *contradiction*.
- **Rendering:** keep content-appropriate formats in synthesis — financial data as tables, news as prose, technical findings as structured lists. Don't flatten everything to one format.

---

## Practice Questions

**Q1.** Your coordinator's prompt instructs it to delegate research, but every Task tool call fails. The subagent definitions are correct. Most likely cause?

A. Subagents cannot run in parallel
B. The coordinator's `allowedTools` does not include `"Task"`
C. The subagents' system prompts are too long
D. fork_session was not enabled

**Answer: B.** The Task tool is the spawning mechanism; the coordinator must be permitted to call it.

---

**Q2.** The synthesis agent produces reports with claims but no sources, even though the web-search agent's results contained URLs. What went wrong?

A. The synthesis agent's model can't process URLs
B. Findings were passed as prose summaries; claim–source mappings weren't preserved as structured data through the handoff
C. The coordinator should have generated citations itself
D. Web search results expire between agent invocations

**Answer: B.** Attribution is lost during summarization unless subagents output structured claim–source mappings (URL, document name, excerpt) that downstream agents are required to preserve.

---

**Q3.** Coordinator delegates 4 research subtasks. Currently it issues one Task call, waits, then issues the next. Total runtime is 4× a single task. Fix?

A. Reduce each subagent's max_tokens
B. Emit all four Task tool calls in a single coordinator response so subagents run in parallel
C. Merge the four subtasks into one subagent
D. Cache subagent results between runs

**Answer: B.** Parallel spawning = multiple Task calls in one response. C creates the too-broad/attention-dilution problem; A and D don't address sequencing.

---

**Q4.** Two credible sources report the market size as $4.2B and $6.8B. The document-analysis subagent should:

A. Select the value from the more recent source and discard the other
B. Average the two values
C. Return both values, explicitly annotated with source attribution, and let the coordinator decide reconciliation before synthesis
D. Omit the statistic entirely to avoid publishing conflicting data

**Answer: C.** Annotate conflicts with attribution; the coordinator reconciles. Arbitrary selection (A), fabricated middle values (B), and silent omission (D) all corrupt the research. (Also check publication dates — the "conflict" may be temporal.)

---

**Q5.** Your document-analysis subagent has 18 tools including web search, and logs show it sometimes searches the web mid-analysis and picks the wrong extraction tool. Best fix?

A. Add a system-prompt instruction: "only use analysis tools"
B. Restrict its tool set to the 4–5 analysis tools relevant to its role
C. Fine-tune the model on correct tool selections
D. Lower temperature

**Answer: B.** Scoped tool access fixes both problems: fewer tools → more reliable selection; no out-of-role tools → no cross-specialization misuse. A is probabilistic; C is out of exam scope and over-engineered.

---

**Q6.** Reports consistently reflect findings from the first and last documents analyzed but omit key points from documents in the middle of the aggregated input. Mitigation?

A. Increase the context window
B. Place a key-findings summary at the beginning of the aggregated input and organize details with explicit section headers
C. Analyze fewer documents
D. Repeat every document twice in the input

**Answer: B.** This is the lost-in-the-middle effect — a position/attention issue that bigger windows don't fix. Restructure the input to put critical content in high-attention positions.

---

## Key Takeaways Card
- Hub-and-spoke: all communication through the coordinator; subagents have isolated context.
- `allowedTools` must include `"Task"`; parallel = multiple Task calls in ONE response.
- Pass context explicitly, structured, content separated from metadata; require dates + sources.
- Coverage gaps with successful subagents → coordinator decomposed too narrowly.
- Errors: failure type + attempted query + partials + alternatives. Never generic, never silent-success, never kill-the-workflow.
- Access failure ≠ empty result.
- Conflicts: keep both, annotate, attribute; coordinator reconciles; separate established vs contested.
- Scoped tools per role; scoped cross-role tool (verify_fact) for the high-frequency 85% case.

**Docs:** Agent SDK subagents — https://docs.claude.com/en/api/agent-sdk/overview · Multi-agent patterns — https://www.anthropic.com/engineering (multi-agent research system post)
