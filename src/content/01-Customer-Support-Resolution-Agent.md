# Scenario 1: Customer Support Resolution Agent
## CCAR-F Deep-Dive Study Guide

**Context:** You are building a customer support resolution agent with the **Claude Agent SDK**. It handles high-ambiguity requests (returns, billing disputes, account issues) via custom MCP tools: `get_customer`, `lookup_order`, `process_refund`, `escalate_to_human`. Target: **80%+ first-contact resolution** while knowing when to escalate.

**Primary domains:** Agentic Architecture & Orchestration (D1) · Tool Design & MCP Integration (D2) · Context Management & Reliability (D5)

---

## The Agentic Loop (Task Statement 1.1)

### How the loop works
1. Send the request (with tools defined) to Claude via the API.
2. Inspect `stop_reason` in the response:
   - `"tool_use"` → Claude wants to call a tool. Execute the requested tool, append the **tool result** to the conversation history, and send the next request.
   - `"end_turn"` → Claude is done. Present the final response to the user.
3. Repeat until `end_turn`.

```python
messages = [{"role": "user", "content": user_request}]
while True:
    resp = client.messages.create(model=MODEL, tools=TOOLS, messages=messages, max_tokens=4096)
    messages.append({"role": "assistant", "content": resp.content})
    if resp.stop_reason == "end_turn":
        break  # final answer ready
    if resp.stop_reason == "tool_use":
        results = [execute(block) for block in resp.content if block.type == "tool_use"]
        messages.append({"role": "user", "content": results})  # tool_result blocks
```

**Why tool results go back into history:** the model reasons about its *next* action based on what previous tools returned. Without appending results, every iteration starts blind.

**Model-driven vs pre-configured decisions:** the exam favors letting Claude decide which tool to call next based on context (model-driven), rather than hard-coded decision trees or fixed tool sequences — *except* where compliance must be guaranteed (see hooks below).

### Anti-patterns (frequent wrong answers)
- ❌ Parsing natural-language signals ("It looks like I'm done") to decide loop termination
- ❌ Arbitrary iteration caps as the **primary** stopping mechanism
- ❌ Checking whether the assistant returned text content as a "completion" indicator
- ✅ The **only** correct termination signal is `stop_reason == "end_turn"`

---

## Enforcement, Hooks, and Workflow Ordering (Task Statements 1.4, 1.5)

### The core exam principle
> When deterministic compliance is required (e.g., identity verification before financial operations), prompt instructions alone have a **non-zero failure rate**. Use **programmatic enforcement**.

Two enforcement mechanisms in the Agent SDK:

**1. Programmatic prerequisites (gates)**
Block downstream tool calls until prerequisites complete. Example: block `lookup_order` and `process_refund` until `get_customer` has returned a *verified customer ID*. This is deterministic — it cannot be "forgotten" the way a prompt instruction can.

**2. Hooks**
- **PostToolUse hooks** intercept *tool results* before the model sees them. Use case: **data normalization** — your MCP tools return heterogeneous formats (Unix timestamps vs ISO 8601, numeric vs string status codes). A PostToolUse hook normalizes them so the agent reasons over consistent data.
- **Tool-call interception hooks** intercept *outgoing tool calls* to enforce compliance rules. Use case: block `process_refund` for amounts **over $500** and redirect to the human-escalation workflow.

**Decision rule for the exam:**
| Situation | Mechanism |
|---|---|
| Business rule with financial/legal consequences must ALWAYS hold | Hook / programmatic gate |
| Stylistic guidance, tone, general behavior shaping | Prompt instructions |
| Improving judgment on ambiguous cases | Few-shot examples |

### Multi-concern requests
A customer message may contain several issues ("my order arrived damaged AND I was double-charged"). Correct pattern: **decompose into distinct items → investigate each in parallel using shared context → synthesize a unified resolution**. Don't handle only the first issue or force the customer to re-ask.

### Structured handoff protocol
When escalating mid-process, the human agent typically **cannot see the conversation transcript**. Compile a structured handoff summary:
- Customer ID (verified)
- Root cause analysis
- Refund amount / financial exposure
- Recommended action

---

## Tool Design for Support Tools (Task Statements 2.1, 2.2)

### Tool descriptions are THE selection mechanism
LLMs choose tools based primarily on their **descriptions**. Minimal descriptions ("Retrieves customer information" vs "Retrieves order details") cause misrouting between similar tools. A good description includes:
- Purpose, clearly differentiated from similar tools
- Input formats it accepts (e.g., "accepts order IDs of the form ORD-XXXXX")
- Example queries it should handle
- Edge cases and boundaries ("Use lookup_order for order status/details; use get_customer for account-level information")

**Exam trap:** when tool selection fails, the *first step* is enriching descriptions — not few-shot examples (token overhead, doesn't fix root cause), not a keyword-routing layer (over-engineered, bypasses the LLM), not consolidating tools (bigger change than a first step warrants).

Also review the **system prompt** for keyword-sensitive instructions that can override good descriptions and create unintended tool associations.

### Structured error responses (MCP `isError` pattern)
Generic errors ("Operation failed") leave the agent unable to choose a recovery path. Return structured metadata:

```json
{
  "isError": true,
  "errorCategory": "business",        // transient | validation | business | permission
  "isRetryable": false,
  "message": "Refunds over $500 require supervisor approval.",
  "customerFacingExplanation": "This refund needs a quick supervisor review — I'm escalating it now."
}
```

Error taxonomy to memorize:
| Category | Example | Retryable? | Agent's correct move |
|---|---|---|---|
| Transient | timeout, service unavailable | Yes | Retry (possibly with backoff) |
| Validation | malformed order ID | No (as-is) | Fix input, then retry |
| Business | refund > policy limit | No | Explain to customer / escalate |
| Permission | agent lacks access | No | Escalate |

Also distinguish **access failures** (couldn't query — retry decision needed) from **valid empty results** (query succeeded, zero matches — a legitimate answer, not an error).

---

## Context Management for Long Support Sessions (Task Statement 5.1)

### Progressive summarization risk
As conversations grow, naive summarization condenses **numerical values, percentages, dates, and customer-stated expectations** into vague prose ("customer wants a refund" loses "$127.43 refund for order ORD-88231 promised by Friday"). 

**Fix — the "case facts" block:** extract transactional facts (amounts, dates, order numbers, statuses) into a persistent structured block included **in every prompt, outside the summarized history**. For multi-issue sessions, persist structured per-issue data (order IDs, amounts, statuses) in a separate context layer.

### Tool output bloat
An order lookup may return 40+ fields when only ~5 matter for a return. **Trim verbose tool outputs to relevant fields before they accumulate in context** (this is exactly what a PostToolUse hook can do).

### Lost-in-the-middle
Models reliably attend to the **beginning and end** of long inputs; middle content gets dropped. Place key-findings summaries at the top of aggregated inputs and use explicit section headers.

---

## Escalation & Ambiguity Resolution (Task Statement 5.2)

### Correct escalation triggers
1. **Customer explicitly requests a human** → escalate **immediately**, without first attempting investigation. (Exception nuance: if the customer is merely *frustrated* but the issue is clearly within the agent's capability, acknowledge frustration + offer to resolve, and escalate if they reiterate.)
2. **Policy gaps/exceptions** — the policy is silent or ambiguous on the request (e.g., competitor price matching when policy covers only own-site adjustments) → escalate. Complexity alone is not the trigger; *policy ambiguity* is.
3. **Inability to make meaningful progress.**

### Unreliable escalation signals (classic wrong answers)
- ❌ **Self-reported confidence scores** — LLM confidence is poorly calibrated; the agent is precisely *most* miscalibrated on the hard cases.
- ❌ **Sentiment analysis** — frustration ≠ complexity. Angry customers often have simple problems.
- ❌ **Separate ML classifiers** — over-engineered before prompt-level fixes are tried.
- ✅ **Explicit escalation criteria + few-shot examples** in the system prompt demonstrating escalate-vs-resolve decisions.

### Multiple customer matches
If `get_customer` returns several matches, **ask the customer for additional identifiers** — never pick heuristically (most recent account, closest name match, etc.).

---

## Practice Questions

**Q1.** Your agent processes a $50 refund for the wrong customer because it matched by name only. Logs show `get_customer` was skipped in 12% of refund flows despite the system prompt saying verification is "mandatory." Best fix?

A. Strengthen the prompt with capitalized MANDATORY language
B. Add a programmatic prerequisite blocking `process_refund` until `get_customer` returns a verified ID
C. Add 8 few-shot examples of correct verification flows
D. Lower temperature to make the model more deterministic

**Answer: B.** Financial operations require deterministic guarantees. A and C are probabilistic (non-zero failure rate). D doesn't address tool-ordering behavior at all.

---

**Q2.** Your `process_refund` MCP tool returns `"Error: operation failed"` for every failure — network timeouts, refunds over policy limits, and invalid order IDs alike. The agent responds by retrying everything three times. What should the tool return instead?

A. HTTP status codes mapped into the message string
B. Structured metadata: `errorCategory`, `isRetryable`, and a human-readable description per failure type
C. Nothing — suppress errors and return an empty success so the agent moves on
D. A stack trace so the agent can diagnose the failure

**Answer: B.** Structured categories let the agent retry transients, fix validation input, and escalate business/permission errors instead of blindly retrying. C silently suppresses failures (anti-pattern). A and D don't give decision-relevant structure.

---

**Q3.** In hour-long multi-issue sessions, your agent starts quoting wrong refund amounts and mixing up order numbers between the customer's three issues. Root-cause fix?

A. Increase max_tokens on every request
B. Summarize the conversation more aggressively every 10 turns
C. Extract structured per-issue facts (order IDs, amounts, statuses) into a persistent case-facts block included in each prompt outside the summarized history
D. Ask the customer to restate details when confusion occurs

**Answer: C.** Progressive summarization is what *destroys* precise transactional facts — B makes it worse. A doesn't stop fact-drift. D degrades customer experience without fixing the system.

---

**Q4.** A customer writes: "This is ridiculous, I've been overcharged AGAIN. Just fix it." The overcharge is a standard duplicate-billing case fully within policy. The agent should:

A. Escalate immediately due to negative sentiment
B. Acknowledge the frustration and offer to resolve it now, escalating only if the customer asks for a human
C. Ask the customer to rate their frustration 1–10 to decide routing
D. Self-report a confidence score and escalate if below 7

**Answer: B.** Sentiment isn't complexity; the issue is within capability. Escalate immediately only on an *explicit* human request or a policy gap. C and D use unreliable proxies.

---

**Q5.** Your MCP tools return timestamps as Unix epochs from the billing system and ISO 8601 from the order system, and the agent occasionally mis-compares dates. Cleanest fix?

A. Add a prompt instruction explaining both date formats
B. A PostToolUse hook that normalizes all timestamps to one format before the model processes results
C. Rewrite both backend systems to use one format
D. Have the agent call a `convert_date` tool whenever it sees a date

**Answer: B.** PostToolUse hooks exist precisely to normalize heterogeneous tool results deterministically. A is probabilistic; C is out of scope/over-engineered; D adds latency and relies on the model remembering to do it.

---

## Key Takeaways Card
- `stop_reason` is the only loop-termination signal: `tool_use` → execute & continue; `end_turn` → stop.
- Hooks/gates for guarantees; prompts for guidance; few-shot for judgment.
- Refund > threshold → intercept and redirect to escalation.
- Tool descriptions first when selection misfires.
- Errors: category + isRetryable + description; empty result ≠ error.
- Case-facts block beats summarization for transactional data.
- Escalate on: explicit human request (immediately), policy gaps, no progress. Never on sentiment or self-confidence.
- Multiple matches → ask for identifiers.

**Docs:** Agent SDK — https://docs.claude.com/en/api/agent-sdk/overview · Tool use — https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview · MCP — https://modelcontextprotocol.io
