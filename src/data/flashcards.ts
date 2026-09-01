export interface Flashcard {
  id: string
  front: string
  back: string
  topic: string
}

/**
 * Drill deck for CCAR-F. Every card encodes one testable fact or decision rule
 * drawn from the six scenario guides and the official exam guide.
 */
export const flashcards: Flashcard[] = [
  // ─── Agentic loop ───────────────────────────────────────────────────────────
  {
    id: "loop-1",
    topic: "Agentic loop",
    front: "What is the only correct signal that an agentic loop should terminate?",
    back: "`stop_reason == \"end_turn\"`. On `\"tool_use\"` you execute the requested tools and continue the loop.",
  },
  {
    id: "loop-2",
    topic: "Agentic loop",
    front: "Why must tool results be appended to the conversation history each iteration?",
    back: "The model reasons about its next action from what previous tools returned. Without appended results every iteration starts blind.",
  },
  {
    id: "loop-3",
    topic: "Agentic loop",
    front: "Name three loop-termination anti-patterns the exam uses as distractors.",
    back: "Parsing natural-language signals (\"It looks like I'm done\"), arbitrary iteration caps as the primary stop, and treating the presence of assistant text content as completion.",
  },
  {
    id: "loop-4",
    topic: "Agentic loop",
    front: "Model-driven tool selection vs a hard-coded decision tree — which does the exam favor, and what's the exception?",
    back: "Model-driven: let Claude pick the next tool from context. The exception is where compliance must be guaranteed — then use a hook or programmatic gate.",
  },
  {
    id: "loop-5",
    topic: "Agentic loop",
    front: "Where does the tool_result content go in the messages array?",
    back: "Into a `user`-role message containing tool_result blocks, appended after the assistant message that requested the tool.",
  },

  // ─── Enforcement / hooks ────────────────────────────────────────────────────
  {
    id: "hook-1",
    topic: "Enforcement",
    front: "Verification is 'mandatory' in the system prompt but skipped in 12% of refund flows. Fix?",
    back: "A programmatic prerequisite gate blocking `process_refund` until `get_customer` returns a verified ID. Prompt instructions have a non-zero failure rate.",
  },
  {
    id: "hook-2",
    topic: "Enforcement",
    front: "Hooks vs prompts vs few-shot — the three-way decision rule.",
    back: "Hooks/gates for guarantees (financial, legal, ordering). Prompts for guidance, tone, and behavior shaping. Few-shot for judgment on ambiguous cases.",
  },
  {
    id: "hook-3",
    topic: "Enforcement",
    front: "What do PostToolUse hooks intercept, and what's the canonical use case?",
    back: "They intercept tool *results* before the model sees them. Canonical use: normalizing heterogeneous formats — Unix epochs vs ISO 8601 timestamps, numeric vs string status codes.",
  },
  {
    id: "hook-4",
    topic: "Enforcement",
    front: "What do tool-call interception hooks intercept, and the canonical use case?",
    back: "They intercept *outgoing* tool calls to enforce compliance — e.g. block `process_refund` over $500 and redirect to the human-escalation workflow.",
  },
  {
    id: "hook-5",
    topic: "Enforcement",
    front: "MCP tools return timestamps in two different formats and the agent mis-compares dates. Cleanest fix?",
    back: "A PostToolUse hook that normalizes all timestamps to one format before the model processes results. A prompt instruction is probabilistic; a convert_date tool adds latency and relies on the model remembering.",
  },
  {
    id: "hook-6",
    topic: "Enforcement",
    front: "A PostToolUse hook can also help with context. How?",
    back: "By trimming verbose tool output to the relevant fields (an order lookup returning 40+ fields when 5 matter) before it accumulates in context.",
  },

  // ─── Multi-concern & handoff ────────────────────────────────────────────────
  {
    id: "handoff-1",
    topic: "Task decomposition",
    front: "Customer message contains several distinct issues. Correct pattern?",
    back: "Decompose into distinct items, investigate each in parallel using shared context, then synthesize one unified resolution. Don't handle only the first or make the customer re-ask.",
  },
  {
    id: "handoff-2",
    topic: "Escalation",
    front: "What must a structured escalation handoff summary contain, and why?",
    back: "Verified customer ID, root-cause analysis, refund amount / financial exposure, and recommended action — because the human agent typically cannot see the conversation transcript.",
  },

  // ─── Tool design ────────────────────────────────────────────────────────────
  {
    id: "tool-1",
    topic: "Tool design",
    front: "What is the primary mechanism by which an LLM selects a tool?",
    back: "The tool's description. Minimal or overlapping descriptions cause misrouting between similar tools.",
  },
  {
    id: "tool-2",
    topic: "Tool design",
    front: "Tool selection is misfiring between two similar tools. What is the *first* step?",
    back: "Enrich the tool descriptions — purpose differentiated from siblings, accepted input formats, example queries, edge cases and boundaries. Not few-shot, not a routing layer, not tool consolidation.",
  },
  {
    id: "tool-3",
    topic: "Tool design",
    front: "Besides descriptions, what else can create unintended tool associations?",
    back: "Keyword-sensitive wording in the system prompt, which can override otherwise-good descriptions. Review it when selection misfires.",
  },
  {
    id: "tool-4",
    topic: "Tool design",
    front: "Give the three refactors used to remove tool overlap.",
    back: "Rename for specificity (`analyze_content` → `extract_web_results`), split generic tools (`analyze_document` → `extract_data_points`, `summarize_content`, `verify_claim_against_source`), and constrain (`fetch_url` → `load_document` with URL validation).",
  },
  {
    id: "tool-5",
    topic: "Tool design",
    front: "Your custom MCP `code_search` tool is more capable than Grep, but the agent keeps using Grep. First fix?",
    back: "Enhance the MCP tool's description to spell out its capabilities and outputs. Thin descriptions lose to familiar built-ins. Don't remove Grep and don't force tool_choice on every request.",
  },

  // ─── Error handling ─────────────────────────────────────────────────────────
  {
    id: "err-1",
    topic: "Error handling",
    front: "Name the four error categories in the MCP error taxonomy.",
    back: "Transient (timeout, service unavailable), validation (malformed input), business (policy violation), permission (no access).",
  },
  {
    id: "err-2",
    topic: "Error handling",
    front: "Which error categories are retryable as-is, and what's the correct agent move for each of the four?",
    back: "Transient: retryable, retry with backoff. Validation: not as-is, fix the input then retry. Business: not retryable, explain to the customer or escalate. Permission: not retryable, escalate.",
  },
  {
    id: "err-3",
    topic: "Error handling",
    front: "What fields make an MCP error response actionable?",
    back: "`isError`, `errorCategory`, `isRetryable`, a human-readable message, and (for business rules) a customer-facing explanation.",
  },
  {
    id: "err-4",
    topic: "Error handling",
    front: "Why is `\"Error: operation failed\"` for every failure a bug, not just untidy?",
    back: "The agent cannot choose a recovery path, so it blindly retries everything — including non-retryable business and validation failures.",
  },
  {
    id: "err-5",
    topic: "Error handling",
    front: "Access failure vs valid empty result — why does the distinction matter?",
    back: "An access failure means the query never ran, so a retry decision is needed. A valid empty result means the query succeeded with zero matches — a legitimate answer, not an error.",
  },
  {
    id: "err-6",
    topic: "Error handling",
    front: "Which error-handling behaviours are always wrong answers?",
    back: "Generic status messages after silent internal retries, returning empty results marked successful (silent suppression), and propagating a raw exception that kills the whole workflow.",
  },
  {
    id: "err-7",
    topic: "Error handling",
    front: "Layered recovery: what does a subagent handle itself, and what does it propagate?",
    back: "It handles local recovery for transient failures itself, and propagates only errors it cannot resolve — together with partial results and what was attempted.",
  },

  // ─── Context management ─────────────────────────────────────────────────────
  {
    id: "ctx-1",
    topic: "Context management",
    front: "What does progressive summarization destroy first?",
    back: "Precise transactional detail — numbers, percentages, dates, and customer-stated expectations get condensed into vague prose (\"customer wants a refund\").",
  },
  {
    id: "ctx-2",
    topic: "Context management",
    front: "The agent quotes wrong refund amounts and mixes up order numbers in a long multi-issue session. Root-cause fix?",
    back: "A persistent structured 'case facts' block (amounts, dates, order numbers, statuses, per issue) included in every prompt *outside* the summarized history. Summarizing harder makes it worse.",
  },
  {
    id: "ctx-3",
    topic: "Context management",
    front: "What is the lost-in-the-middle effect, and what does NOT fix it?",
    back: "Models attend reliably to the beginning and end of long inputs while middle content drops out. A bigger context window does not fix it — attention quality is the issue, not capacity.",
  },
  {
    id: "ctx-4",
    topic: "Context management",
    front: "Mitigation for lost-in-the-middle in aggregated multi-source input?",
    back: "Put a key-findings summary at the beginning and organize details under explicit section headers so critical content sits in high-attention positions.",
  },
  {
    id: "ctx-5",
    topic: "Context management",
    front: "Downstream agents have tight context budgets. What do you change?",
    back: "The *upstream* agents — have them return structured data (key facts, citations, relevance scores, dates) instead of verbose prose and reasoning chains.",
  },
  {
    id: "ctx-6",
    topic: "Context management",
    front: "What are the symptoms of context degradation in a long codebase session?",
    back: "Inconsistent answers, and citing generic 'typical patterns' instead of the specific classes and files it discovered earlier.",
  },
  {
    id: "ctx-7",
    topic: "Context management",
    front: "Name the four countermeasures for context degradation in large-codebase exploration.",
    back: "Subagent delegation for verbose sub-questions, scratchpad files of key findings, phase summaries injected into the next phase's subagents, and `/compact` when discovery output fills the window.",
  },
  {
    id: "ctx-8",
    topic: "Context management",
    front: "How do you design multi-agent work to survive a crash?",
    back: "Structured state persistence: each agent exports state to a known location, and on resume the coordinator loads a manifest and injects it into agent prompts — no full re-exploration.",
  },
  {
    id: "ctx-9",
    topic: "Context management",
    front: "Which Claude Code command compresses context mid-session?",
    back: "`/compact`.",
  },

  // ─── Escalation ─────────────────────────────────────────────────────────────
  {
    id: "esc-1",
    topic: "Escalation",
    front: "What are the three correct escalation triggers?",
    back: "An explicit customer request for a human, a policy gap or ambiguity, and inability to make meaningful progress.",
  },
  {
    id: "esc-2",
    topic: "Escalation",
    front: "Customer explicitly asks for a human. What does the agent do first?",
    back: "Escalate immediately, without first attempting investigation.",
  },
  {
    id: "esc-3",
    topic: "Escalation",
    front: "Is complexity an escalation trigger?",
    back: "No — policy ambiguity is. A complex request the policy clearly covers stays with the agent; a simple request the policy is silent on escalates.",
  },
  {
    id: "esc-4",
    topic: "Escalation",
    front: "Why are self-reported confidence scores a wrong escalation signal?",
    back: "LLM confidence is poorly calibrated, and the agent is most miscalibrated precisely on the hard cases where escalation matters.",
  },
  {
    id: "esc-5",
    topic: "Escalation",
    front: "Why is sentiment analysis a wrong escalation signal?",
    back: "Frustration is not complexity. Angry customers often have simple, in-policy problems.",
  },
  {
    id: "esc-6",
    topic: "Escalation",
    front: "What is the correct escalation mechanism?",
    back: "Explicit escalation criteria in the system prompt plus few-shot examples demonstrating escalate-vs-resolve decisions. Not confidence thresholds, sentiment, or a separate ML classifier.",
  },
  {
    id: "esc-7",
    topic: "Escalation",
    front: "Angry customer, but the issue is a standard in-policy duplicate charge. Correct response?",
    back: "Acknowledge the frustration and offer to resolve it now; escalate only if they reiterate or explicitly ask for a human.",
  },
  {
    id: "esc-8",
    topic: "Escalation",
    front: "`get_customer` returns several matching customers. What now?",
    back: "Ask the customer for additional identifiers. Never pick heuristically (most recent account, closest name match).",
  },

  // ─── CLAUDE.md ──────────────────────────────────────────────────────────────
  {
    id: "cmd-1",
    topic: "CLAUDE.md",
    front: "Give the three CLAUDE.md levels with their exact paths.",
    back: "User: `~/.claude/CLAUDE.md` (personal, never shared). Project: `./CLAUDE.md` or `./.claude/CLAUDE.md` (shared via git). Directory: `subdir/CLAUDE.md` (loaded on demand for that subtree).",
  },
  {
    id: "cmd-2",
    topic: "CLAUDE.md",
    front: "A new hire clones the repo and Claude ignores all the team standards. Diagnosis?",
    back: "The standards live in someone's user-level `~/.claude/CLAUDE.md`, which is never distributed through version control. Move them to project level.",
  },
  {
    id: "cmd-3",
    topic: "CLAUDE.md",
    front: "Which syntax lets a package's CLAUDE.md pull in only the standards files it needs?",
    back: "`@import` syntax, referencing external files.",
  },
  {
    id: "cmd-4",
    topic: "CLAUDE.md",
    front: "How do you break a monolithic CLAUDE.md into focused topic files?",
    back: "Move topics into the `.claude/rules/` directory — e.g. `testing.md`, `api-conventions.md`, `deployment.md`.",
  },
  {
    id: "cmd-5",
    topic: "CLAUDE.md",
    front: "First diagnostic step when Claude behaves inconsistently across sessions or machines?",
    back: "Run `/memory` to see which memory files are actually loaded.",
  },
  {
    id: "cmd-6",
    topic: "CLAUDE.md",
    front: "Skills vs CLAUDE.md — the dividing line.",
    back: "Skills are on-demand and task-specific; CLAUDE.md is always loaded and universal. If it must apply automatically by file path, it's a rule, not a skill.",
  },

  // ─── Rules / path scoping ───────────────────────────────────────────────────
  {
    id: "rule-1",
    topic: "Rules & paths",
    front: "Which frontmatter field scopes a `.claude/rules/` file, and what does it hold?",
    back: "`paths`, a YAML list of glob patterns. The rule loads only while Claude edits matching files, cutting irrelevant context and tokens.",
  },
  {
    id: "rule-2",
    topic: "Rules & paths",
    front: "Test files sit next to the code they test, all over the repo. Why can't a directory CLAUDE.md carry their conventions?",
    back: "Directory CLAUDE.md is directory-bound; the tests are spread across the whole tree. A glob rule (`**/*.test.tsx`) applies by file type regardless of location.",
  },
  {
    id: "rule-3",
    topic: "Rules & paths",
    front: "Conventions apply to (a) everything, (b) one subtree, (c) a file type spread repo-wide, (d) an on-demand task. Which mechanism each?",
    back: "(a) project CLAUDE.md, (b) directory CLAUDE.md or a rule with a directory glob, (c) `.claude/rules/` with glob frontmatter, (d) a skill or slash command.",
  },
  {
    id: "rule-4",
    topic: "Rules & paths",
    front: "Write the `paths` frontmatter for Terraform-only conventions under `terraform/`.",
    back: "`paths: [\"terraform/**/*\"]`.",
  },

  // ─── Commands & skills ─────────────────────────────────────────────────────
  {
    id: "skill-1",
    topic: "Commands & skills",
    front: "Where does a team-wide `/review` slash command belong?",
    back: "`.claude/commands/` in the repo, so every developer gets it on clone or pull. `~/.claude/commands/` is personal only.",
  },
  {
    id: "skill-2",
    topic: "Commands & skills",
    front: "Give the project and user paths for skills.",
    back: "Project: `.claude/skills/<name>/SKILL.md`. User: `~/.claude/skills/<name>/SKILL.md`.",
  },
  {
    id: "skill-3",
    topic: "Commands & skills",
    front: "What does SKILL.md `context: fork` do, and when do you use it?",
    back: "Runs the skill in an isolated sub-agent context so its output doesn't pollute the main conversation. Use for verbose output (codebase analysis) or exploratory work (brainstorming alternatives).",
  },
  {
    id: "skill-4",
    topic: "Commands & skills",
    front: "What does SKILL.md `allowed-tools` do?",
    back: "Restricts which tools the skill may use while executing — e.g. limit it to file writes to prevent destructive Bash actions.",
  },
  {
    id: "skill-5",
    topic: "Commands & skills",
    front: "What does SKILL.md `argument-hint` do?",
    back: "Prompts the developer for required parameters when they invoke the skill without arguments.",
  },
  {
    id: "skill-6",
    topic: "Commands & skills",
    front: "How do you customize a shared team skill without affecting teammates?",
    back: "Create a personal variant under `~/.claude/skills/` with a different name.",
  },
  {
    id: "skill-7",
    topic: "Commands & skills",
    front: "A codebase-analysis skill emits thousands of lines. Which frontmatter option protects the main session?",
    back: "`context: fork` — only the skill's result returns to the main conversation.",
  },

  // ─── Plan mode ──────────────────────────────────────────────────────────────
  {
    id: "plan-1",
    topic: "Plan mode",
    front: "When does plan mode win?",
    back: "Large-scale changes (a 45+ file migration), multiple valid approaches needing a decision, architectural decisions, and multi-file work where late-discovered dependencies would cause costly rework.",
  },
  {
    id: "plan-2",
    topic: "Plan mode",
    front: "When is direct execution correct?",
    back: "Simple, well-scoped changes — a single-file bug fix with a clear stack trace, adding one validation conditional.",
  },
  {
    id: "plan-3",
    topic: "Plan mode",
    front: "Correct workflow for a large migration?",
    back: "Plan mode for investigation and design, then direct execution for the planned implementation.",
  },
  {
    id: "plan-4",
    topic: "Plan mode",
    front: "Two plan-mode wrong-answer patterns to recognize.",
    back: "\"Start direct and switch to plan mode if it gets complex\" (the complexity is already stated in the requirements) and \"give exhaustive upfront instructions\" (assumes you know the answer without exploring).",
  },
  {
    id: "plan-5",
    topic: "Plan mode",
    front: "What is the Explore subagent for?",
    back: "Isolating verbose discovery output and returning only summaries, preserving the main conversation's context window during multi-phase tasks.",
  },

  // ─── Iterative refinement ──────────────────────────────────────────────────
  {
    id: "iter-1",
    topic: "Iterative refinement",
    front: "Claude keeps misinterpreting your prose description of a data transformation. Most effective next step?",
    back: "Provide 2–3 concrete input/output example pairs. Concrete examples are the documented most-effective technique when prose is interpreted inconsistently.",
  },
  {
    id: "iter-2",
    topic: "Iterative refinement",
    front: "What is the interview pattern, and when does it apply?",
    back: "Have Claude ask you questions first to surface considerations you hadn't anticipated (cache invalidation, failure modes). It's for unfamiliar domains — not for pinning down a transformation you already understand.",
  },
  {
    id: "iter-3",
    topic: "Iterative refinement",
    front: "Describe test-driven iteration with Claude.",
    back: "Write the test suite first — expected behavior, edge cases, performance — then iterate by sharing the test failures with Claude.",
  },
  {
    id: "iter-4",
    topic: "Iterative refinement",
    front: "Several review issues to fix. When one message, when sequential?",
    back: "Issues that interact go in one single detailed message covering all of them. Independent issues are fixed sequentially.",
  },

  // ─── Sessions ───────────────────────────────────────────────────────────────
  {
    id: "sess-1",
    topic: "Sessions",
    front: "Which flag continues a specific named prior session?",
    back: "`--resume <session-name>`.",
  },
  {
    id: "sess-2",
    topic: "Sessions",
    front: "What is `fork_session` for?",
    back: "Branching independent explorations from a shared analysis baseline — e.g. comparing two refactoring strategies without redoing the expensive codebase analysis.",
  },
  {
    id: "sess-3",
    topic: "Sessions",
    front: "A teammate landed a large refactor of the module your old session analyzed. Resume or fresh?",
    back: "Fresh session with a structured summary of prior conclusions injected, letting Claude re-explore current code. Prior tool results are stale, and forking copies the same stale baseline.",
  },
  {
    id: "sess-4",
    topic: "Sessions",
    front: "You resume a session and only 2–3 files changed. What do you add?",
    back: "Tell the agent exactly which files changed so it re-analyzes those instead of re-exploring everything.",
  },
  {
    id: "sess-5",
    topic: "Sessions",
    front: "Resume vs fresh — the one-line rule.",
    back: "Resume when prior context is mostly still valid; start fresh with an injected summary when prior tool results are stale.",
  },

  // ─── Multi-agent orchestration ─────────────────────────────────────────────
  {
    id: "ma-1",
    topic: "Multi-agent",
    front: "What does hub-and-spoke mean for subagent communication?",
    back: "All inter-subagent communication routes through the coordinator; subagents never talk to each other directly. Benefits: observability, consistent error handling, controlled information flow.",
  },
  {
    id: "ma-2",
    topic: "Multi-agent",
    front: "What does the coordinator own?",
    back: "Task decomposition, delegation, choosing which subagents to invoke, result aggregation, error handling, and information routing.",
  },
  {
    id: "ma-3",
    topic: "Multi-agent",
    front: "How much of the coordinator's context does a subagent inherit?",
    back: "None. Subagents run with isolated context and share no memory between invocations — everything they need must be in their prompt.",
  },
  {
    id: "ma-4",
    topic: "Multi-agent",
    front: "Which tool spawns subagents, and what must `allowedTools` contain?",
    back: "The Task tool; the coordinator's `allowedTools` must include `\"Task\"` or it cannot spawn anything.",
  },
  {
    id: "ma-5",
    topic: "Multi-agent",
    front: "How do you make subagents run in parallel?",
    back: "Emit multiple Task tool calls in a *single* coordinator response. Task calls spread across separate turns run sequentially.",
  },
  {
    id: "ma-6",
    topic: "Multi-agent",
    front: "What does `AgentDefinition` configure?",
    back: "Each subagent type: its description, system prompt, and tool restrictions.",
  },
  {
    id: "ma-7",
    topic: "Multi-agent",
    front: "Report coverage is incomplete but every subagent succeeded. Where do you look?",
    back: "At the coordinator's decomposition — it partitioned the topic too narrowly. Check what was assigned, not the downstream agents.",
  },
  {
    id: "ma-8",
    topic: "Multi-agent",
    front: "What is an iterative refinement loop in a research coordinator?",
    back: "The coordinator evaluates the synthesis output for gaps, re-delegates targeted queries to search/analysis, and re-invokes synthesis until coverage is sufficient.",
  },
  {
    id: "ma-9",
    topic: "Multi-agent",
    front: "Should a coordinator always run the full subagent pipeline?",
    back: "No — it analyzes the query and dynamically selects only the needed subagents. A simple factual query may need only search plus synthesis.",
  },
  {
    id: "ma-10",
    topic: "Multi-agent",
    front: "Coordinator prompts should specify what, and avoid what?",
    back: "Specify research goals and quality criteria; avoid rigid step-by-step procedures, which destroy subagent adaptability.",
  },
  {
    id: "ma-11",
    topic: "Multi-agent",
    front: "How should research scope be partitioned across subagents?",
    back: "Distinct subtopics or source types per agent — minimizing duplication while maximizing coverage.",
  },
  {
    id: "ma-12",
    topic: "Multi-agent",
    front: "What must a failing subagent return to the coordinator?",
    back: "Structured error context: failure type, what was attempted (the query), partial results gathered, and potential alternative approaches.",
  },
  {
    id: "ma-13",
    topic: "Multi-agent",
    front: "What are coverage annotations in a synthesis output?",
    back: "Marking which findings are well-supported and which topic areas have gaps due to unavailable sources — the report is honest about its own blind spots.",
  },

  // ─── Tool distribution ─────────────────────────────────────────────────────
  {
    id: "dist-1",
    topic: "Tool distribution",
    front: "What happens when an agent has 18 tools instead of 4–5?",
    back: "Selection reliability degrades — decision complexity scales with tool count. Restrict each agent to its role-relevant tools.",
  },
  {
    id: "dist-2",
    topic: "Tool distribution",
    front: "Why keep web search away from a synthesis agent?",
    back: "Agents misuse out-of-specialization tools — a synthesis agent holding search tools starts searching instead of synthesizing.",
  },
  {
    id: "dist-3",
    topic: "Tool distribution",
    front: "Synthesis needs fact verification constantly; routing each one through the coordinator costs +40% latency. Design?",
    back: "Give synthesis a narrowly scoped `verify_fact` tool for the 85% simple checks, keeping coordinator-routed delegation for the complex 15%. Least privilege: enough for the common case, no over-provisioning.",
  },

  // ─── tool_choice ────────────────────────────────────────────────────────────
  {
    id: "tc-1",
    topic: "Tool choice",
    front: "`tool_choice: \"auto\"` — behavior and when to use it?",
    back: "The model may reply with plain text OR call a tool. Use for conversational agents.",
  },
  {
    id: "tc-2",
    topic: "Tool choice",
    front: "`tool_choice: \"any\"` — what does it guarantee?",
    back: "The model MUST call some tool, choosing which. Use when several extraction schemas exist and the document type is unknown — it guarantees structured output.",
  },
  {
    id: "tc-3",
    topic: "Tool choice",
    front: "How do you force one specific tool, and when?",
    back: "`tool_choice: {\"type\": \"tool\", \"name\": \"extract_metadata\"}`. Use to guarantee a specific extraction runs first, then handle subsequent steps in follow-up turns.",
  },
  {
    id: "tc-4",
    topic: "Tool choice",
    front: "Three extraction tools, unknown document type, structured output required. Which tool_choice?",
    back: "`\"any\"` — it guarantees a tool call while letting the model pick the schema matching the document. `\"auto\"` may return prose; forcing one tool is wrong for unknown types.",
  },

  // ─── Built-in tools ─────────────────────────────────────────────────────────
  {
    id: "bt-1",
    topic: "Built-in tools",
    front: "Grep vs Glob — the one-line distinction.",
    back: "Grep searches file *contents*; Glob matches file *paths and names*. \"Files containing X\" → Grep; \"files named X\" → Glob.",
  },
  {
    id: "bt-2",
    topic: "Built-in tools",
    front: "Find every file that imports `PaymentProcessor`. Which tool?",
    back: "Grep — imports live in file contents. Glob would only find files *named* after the class.",
  },
  {
    id: "bt-3",
    topic: "Built-in tools",
    front: "Edit fails because the anchor text is not unique in the file. Documented fallback?",
    back: "Read the full file, then Write the modified full file.",
  },
  {
    id: "bt-4",
    topic: "Built-in tools",
    front: "What does Edit require to work at all?",
    back: "Anchor text that is unique within the file — Edit is targeted modification via unique text matching.",
  },
  {
    id: "bt-5",
    topic: "Built-in tools",
    front: "Correct strategy for exploring an unfamiliar codebase?",
    back: "Incremental: Grep for entry points, then Read to follow imports and trace flows. Never read every file upfront — it burns context and dilutes attention.",
  },
  {
    id: "bt-6",
    topic: "Built-in tools",
    front: "How do you trace usage of functions re-exported through wrapper modules?",
    back: "First identify all exported names, then Grep for each name across the codebase. Searching only the original name misses aliased re-exports.",
  },

  // ─── MCP configuration ─────────────────────────────────────────────────────
  {
    id: "mcp-1",
    topic: "MCP config",
    front: "Project vs user MCP config — exact filenames and sharing.",
    back: "Project: `.mcp.json` in the repo, shared via git. User: `~/.claude.json`, personal/experimental, not shared.",
  },
  {
    id: "mcp-2",
    topic: "MCP config",
    front: "Are project and user MCP configs mutually exclusive?",
    back: "No — both are active simultaneously. Tools from all configured servers are discovered at connection time and available together.",
  },
  {
    id: "mcp-3",
    topic: "MCP config",
    front: "Share a Jira MCP server with 12 developers without committing the API token. How?",
    back: "Commit `.mcp.json` using environment-variable expansion, e.g. `\"env\": {\"JIRA_TOKEN\": \"${JIRA_TOKEN}\"}`, and have each developer set the variable locally.",
  },
  {
    id: "mcp-4",
    topic: "MCP config",
    front: "What are MCP resources, as opposed to tools?",
    back: "Tools are actions the agent invokes; resources are content catalogs exposed to the agent — issue summaries, documentation hierarchies, database schemas.",
  },
  {
    id: "mcp-5",
    topic: "MCP config",
    front: "What problem do MCP resources solve?",
    back: "They give the agent visibility into what data exists without exploratory tool calls — no searching around to discover the landscape.",
  },
  {
    id: "mcp-6",
    topic: "MCP config",
    front: "Community MCP server or build your own?",
    back: "Prefer existing community servers for standard integrations (Jira, GitHub); build custom servers only for team-specific workflows.",
  },

  // ─── Task decomposition ────────────────────────────────────────────────────
  {
    id: "dec-1",
    topic: "Task decomposition",
    front: "Fixed sequential pipeline (prompt chaining) vs dynamic adaptive decomposition — when each?",
    back: "Chaining for predictable multi-aspect work (per-file code review then a cross-file pass). Adaptive decomposition for open-ended investigation where each step's findings shape the next.",
  },
  {
    id: "dec-2",
    topic: "Task decomposition",
    front: "\"Add comprehensive tests to this legacy codebase.\" Canonical decomposition?",
    back: "Map the structure first, identify high-impact areas, then build a prioritized plan that adapts as dependencies are discovered. Not a fixed upfront file list.",
  },
  {
    id: "dec-3",
    topic: "Task decomposition",
    front: "Why split a large review into per-file passes plus an integration pass?",
    back: "Analyzing many files at once dilutes attention: inconsistent depth, missed obvious bugs, and contradictory findings. Local passes catch local issues; one dedicated cross-file pass catches data-flow issues.",
  },

  // ─── CLI flags / CI ─────────────────────────────────────────────────────────
  {
    id: "cli-1",
    topic: "CLI flags",
    front: "Your CI step `claude \"Generate tests\"` never completes. Fix?",
    back: "Add `-p` / `--print` for non-interactive mode. Without it Claude Code waits for interactive input and the job hangs indefinitely.",
  },
  {
    id: "cli-2",
    topic: "CLI flags",
    front: "Which two flags give machine-parseable, schema-constrained CI output?",
    back: "`--output-format json` and `--json-schema <file>` — so findings can be posted automatically as inline PR comments.",
  },
  {
    id: "cli-3",
    topic: "CLI flags",
    front: "Which headless 'options' are fake distractors?",
    back: "`CLAUDE_HEADLESS=true`, a `--batch` flag, and stdin redirection from /dev/null. None are the documented mechanism.",
  },
  {
    id: "cli-4",
    topic: "CLI flags",
    front: "How does a CI-invoked Claude Code run get project context?",
    back: "CLAUDE.md — testing standards, fixture conventions, review criteria, and what makes a test valuable. It improves review relevance and cuts low-value test output.",
  },

  // ─── CI review quality ─────────────────────────────────────────────────────
  {
    id: "ci-1",
    topic: "CI review",
    front: "Every push re-reviews the PR and repeats all previous comments. Fix?",
    back: "Include the prior review findings in context and instruct Claude to report only new or still-unaddressed issues.",
  },
  {
    id: "ci-2",
    topic: "CI review",
    front: "Generated tests duplicate scenarios already covered. Fix?",
    back: "Include the existing test files in context so Claude doesn't propose covered scenarios.",
  },
  {
    id: "ci-3",
    topic: "CI review",
    front: "Which review instructions are documented NOT to improve precision?",
    back: "\"Be conservative\", \"only report high-confidence findings\", and vague criteria like \"check that comments are accurate\".",
  },
  {
    id: "ci-4",
    topic: "CI review",
    front: "Rewrite \"check that comments are accurate\" as an explicit criterion.",
    back: "\"Flag comments only when the claimed behavior contradicts the actual code behavior.\"",
  },
  {
    id: "ci-5",
    topic: "CI review",
    front: "Categorical criteria vs confidence-based filtering — which reduces false positives?",
    back: "Categorical criteria: define which categories to report (bugs, security) and which to skip (minor style, local patterns). Confidence-based filtering does not improve precision.",
  },
  {
    id: "ci-6",
    topic: "CI review",
    front: "60% of 'code smell' findings are dismissed; security findings are excellent. Why act, and how?",
    back: "High false positives in one category undermine trust in the accurate ones too. Temporarily disable the high-FP category while fixing it with explicit categorical criteria and few-shot boundary examples.",
  },
  {
    id: "ci-7",
    topic: "CI review",
    front: "What produces consistent severity classification?",
    back: "Explicit severity criteria with concrete code examples per level.",
  },
  {
    id: "ci-8",
    topic: "CI review",
    front: "Which field lets you analyze false positives systematically?",
    back: "A `detected_pattern` field on each structured finding — when developers dismiss findings you can see which code constructs trigger them and fix the prompt for those.",
  },
  {
    id: "ci-9",
    topic: "CI review",
    front: "Why can't a model reliably review code it just generated?",
    back: "It retains its generation reasoning context and is unlikely to question its own decisions. Neither \"review carefully\" instructions nor extended thinking fixes this.",
  },
  {
    id: "ci-10",
    topic: "CI review",
    front: "The documented fix for the self-review limitation?",
    back: "An independent Claude instance without the generator's reasoning context — session context isolation. The session that generated the code must not be the session that reviews it.",
  },
  {
    id: "ci-11",
    topic: "CI review",
    front: "Single-pass review of a 14-file PR gives inconsistent depth and contradictory findings. Restructure?",
    back: "Per-file passes for local issues plus a separate integration pass for cross-file data flow.",
  },
  {
    id: "ci-12",
    topic: "CI review",
    front: "Three distractor 'fixes' for attention dilution in large PR reviews.",
    back: "A larger context window (doesn't fix attention quality), forcing developers to split PRs (shifts the burden), and consensus voting across 3 runs (suppresses real bugs caught only intermittently).",
  },
  {
    id: "ci-13",
    topic: "CI review",
    front: "Self-reported per-finding confidence is legitimate for what, exactly?",
    back: "Calibrated review routing in a verification pass — not as an escalation trigger.",
  },

  // ─── Few-shot ───────────────────────────────────────────────────────────────
  {
    id: "fs-1",
    topic: "Few-shot",
    front: "How many few-shot examples, aimed where?",
    back: "2–4 targeted examples aimed at the ambiguous boundary — not dozens of easy cases.",
  },
  {
    id: "fs-2",
    topic: "Few-shot",
    front: "Name the three jobs few-shot examples do best.",
    back: "Format consistency (exact output shape), judgment on ambiguous cases (showing the reasoning for the chosen action), and false-positive reduction (acceptable patterns vs genuine issues).",
  },
  {
    id: "fs-3",
    topic: "Few-shot",
    front: "Why are few-shot FP examples better than a list of acceptable patterns?",
    back: "They enable generalization to novel patterns, rather than only matching the pre-listed cases.",
  },
  {
    id: "fs-4",
    topic: "Few-shot",
    front: "When does the exam prefer few-shot over more detailed instructions?",
    back: "When detailed instructions alone still yield inconsistent output. (For teaching a known transformation, concrete input/output examples are the tool; for enforcing a rule, use a hook.)",
  },

  // ─── Batch API ──────────────────────────────────────────────────────────────
  {
    id: "batch-1",
    topic: "Batch API",
    front: "Message Batches API: cost, window, SLA?",
    back: "50% cost savings vs synchronous, processing window up to 24 hours, and no guaranteed latency SLA.",
  },
  {
    id: "batch-2",
    topic: "Batch API",
    front: "What is `custom_id` for?",
    back: "Correlating request/response pairs. Results are not order-dependent — you retrieve and join them by ID.",
  },
  {
    id: "batch-3",
    topic: "Batch API",
    front: "Which capability is missing inside a single batch request?",
    back: "Multi-turn tool calling — you can't execute tools mid-request and feed results back.",
  },
  {
    id: "batch-4",
    topic: "Batch API",
    front: "Which of these go on batch: pre-merge security gate, nightly coverage report, weekly dependency audit?",
    back: "Nightly report and weekly audit go on batch. The pre-merge gate blocks a developer, so it stays synchronous.",
  },
  {
    id: "batch-5",
    topic: "Batch API",
    front: "\"Batches usually finish in under an hour\" — is that a valid basis for a blocking workflow?",
    back: "No. There is no latency SLA, so anything a human or pipeline blocks on must be synchronous. Hybrid timeout-fallback designs are flagged as unnecessary complexity.",
  },
  {
    id: "batch-6",
    topic: "Batch API",
    front: "SLA math: 24h max processing, T-hour guaranteed turnaround. Submission interval?",
    back: "Interval ≤ T − 24 hours. The guide's example: a 30-hour SLA → submit every 4 hours.",
  },
  {
    id: "batch-7",
    topic: "Batch API",
    front: "A batch run returns failures. What do you resubmit and how?",
    back: "Only the failed requests, identified by `custom_id`, with modifications — e.g. chunking documents that exceeded context limits.",
  },
  {
    id: "batch-8",
    topic: "Batch API",
    front: "First step before batch-running a large corpus?",
    back: "Refine the prompt on a sample set to maximize first-pass success and minimize costly resubmission cycles.",
  },

  // ─── Structured output ──────────────────────────────────────────────────────
  {
    id: "so-1",
    topic: "Structured output",
    front: "Most reliable way to get schema-compliant JSON out of Claude?",
    back: "Define an extraction tool whose `input_schema` is your target JSON schema and read the data from the `tool_use` block, with tool_choice forcing a tool call.",
  },
  {
    id: "so-2",
    topic: "Structured output",
    front: "Which class of errors does tool_use with a schema eliminate — and which does it not?",
    back: "It eliminates syntax errors (markdown fences, trailing commas, unbalanced braces, unescaped quotes). It does not eliminate semantic errors — wrong-field values, line items that don't sum, plausible-but-wrong extractions.",
  },
  {
    id: "so-3",
    topic: "Structured output",
    front: "A required field is often absent from the source document. What does the model do, and what's the fix?",
    back: "It fabricates a realistic-looking value to satisfy the schema. Make the field nullable/optional so it can return null.",
  },
  {
    id: "so-4",
    topic: "Structured output",
    front: "Two escape hatches every extraction enum should have.",
    back: "`\"unclear\"` for ambiguous cases, and `\"other\"` paired with a detail string field for extensibility.",
  },
  {
    id: "so-5",
    topic: "Structured output",
    front: "Source documents use wildly inconsistent date and currency formats. What pairs with the strict schema?",
    back: "Format normalization rules in the prompt — \"convert all dates to ISO 8601\", \"strip currency symbols\".",
  },
  {
    id: "so-6",
    topic: "Structured output",
    front: "How do you express a nullable string in a JSON Schema property?",
    back: "`{\"type\": [\"string\", \"null\"]}` — and leave the field out of `required`.",
  },

  // ─── Validation & retry ────────────────────────────────────────────────────
  {
    id: "val-1",
    topic: "Validation & retry",
    front: "What three things go into a retry after a validation failure?",
    back: "The original document, the failed extraction, and the specific validation errors. The model self-corrects against explicit feedback.",
  },
  {
    id: "val-2",
    topic: "Validation & retry",
    front: "Which failure causes does retry fix, and which does it never fix?",
    back: "Fixes format mismatches (date format, number as string) and structural errors (wrong nesting, missing wrapper). Never fixes information absent from the source — retries cannot conjure missing data.",
  },
  {
    id: "val-3",
    topic: "Validation & retry",
    front: "200 batch failures: 150 bad date formats, 50 fields that exist only in an exhibit you didn't send. Handling?",
    back: "Retry the 150 with the specific validation errors included; route the 50 to null or human review. Segment failures by cause.",
  },
  {
    id: "val-4",
    topic: "Validation & retry",
    front: "Extracted invoices pass schema validation but line items don't sum to the stated total. Design that catches it?",
    back: "Extract `calculated_total` (sum of line items) alongside `stated_total` and flag mismatches — semantic validation. Optionally add a `conflict_detected` boolean.",
  },
  {
    id: "val-5",
    topic: "Validation & retry",
    front: "What is `conflict_detected` for?",
    back: "Flagging source data that is internally inconsistent, so both values are surfaced with annotation rather than one being silently chosen.",
  },
  {
    id: "val-6",
    topic: "Validation & retry",
    front: "Fields ARE present but written informally (\"about two and a half meters\") and come back null. Fix?",
    back: "Few-shot examples demonstrating correct extraction from informal and varied formats, plus normalization rules in the prompt. Making the field required would cause fabrication elsewhere.",
  },
  {
    id: "val-7",
    topic: "Validation & retry",
    front: "Documents vary structurally — inline citations vs bibliographies, narrative vs tables. What's the fix?",
    back: "Few-shot examples demonstrating correct extraction from each structural variant.",
  },

  // ─── Human review ───────────────────────────────────────────────────────────
  {
    id: "hr-1",
    topic: "Human review",
    front: "What can a 97% aggregate accuracy figure hide?",
    back: "Terrible performance on specific document types or fields — 99% on invoices but 70% on handwritten receipts.",
  },
  {
    id: "hr-2",
    topic: "Human review",
    front: "What must you validate before reducing human review?",
    back: "Accuracy segmented by document type AND by field, to expose the weak segments the aggregate hides.",
  },
  {
    id: "hr-3",
    topic: "Human review",
    front: "How do you make field-level confidence scores usable for routing?",
    back: "Calibrate the thresholds against a labeled validation set. Raw LLM confidence is not trustworthy until mapped to ground truth.",
  },
  {
    id: "hr-4",
    topic: "Human review",
    front: "Which extractions get routed to a human?",
    back: "Low-confidence extractions and ambiguous or internally contradictory source documents — prioritizing limited reviewer capacity where it matters.",
  },
  {
    id: "hr-5",
    topic: "Human review",
    front: "What is the ongoing safety net once high-confidence extractions bypass review?",
    back: "Stratified random sampling of the high-confidence stream, forever — to measure error rates and detect novel error patterns. High confidence is not never-wrong.",
  },

  // ─── Provenance ─────────────────────────────────────────────────────────────
  {
    id: "prov-1",
    topic: "Provenance",
    front: "Synthesis produces claims with no sources, though search results had URLs. Cause?",
    back: "Findings were handed off as prose summaries; claim–source mappings weren't preserved as structured data. Attribution is lost in summarization unless mappings are explicitly carried and merged at every step.",
  },
  {
    id: "prov-2",
    topic: "Provenance",
    front: "What fields belong in a structured research finding?",
    back: "The claim, an evidence excerpt, source URL, document name, publication date, and a relevance score — content separated from metadata.",
  },
  {
    id: "prov-3",
    topic: "Provenance",
    front: "Two credible sources give market size as $4.2B and $6.8B. What does the document-analysis subagent do?",
    back: "Return both values explicitly annotated with source attribution, and let the coordinator decide reconciliation before synthesis. Never select arbitrarily, average, or omit.",
  },
  {
    id: "prov-4",
    topic: "Provenance",
    front: "Why require publication/collection dates in structured outputs?",
    back: "So a 2023 statistic beside a 2026 statistic reads as a time difference rather than a contradiction.",
  },
  {
    id: "prov-5",
    topic: "Provenance",
    front: "How should a final report treat contested findings?",
    back: "Separate well-established findings from contested ones, preserving each source's characterization and methodological context.",
  },
  {
    id: "prov-6",
    topic: "Provenance",
    front: "Rendering rule for synthesized multi-source content?",
    back: "Keep content-appropriate formats — financial data as tables, news as prose, technical findings as structured lists. Don't flatten everything to one format.",
  },

  // ─── Cross-cutting answer patterns ─────────────────────────────────────────
  {
    id: "pat-1",
    topic: "Answer patterns",
    front: "Two answers both 'could work' and compliance is mandatory. Which wins?",
    back: "The deterministic one. Programmatic hooks and gates beat prompt text or few-shot examples whenever a business-critical rule must always hold.",
  },
  {
    id: "pat-2",
    topic: "Answer patterns",
    front: "Which recurring wrong-answer trap punishes the most elaborate option?",
    back: "Over-engineering. Fix the root cause with the simplest proportionate change — improve tool descriptions before adding few-shot examples, routing layers, or classifiers.",
  },
  {
    id: "pat-3",
    topic: "Answer patterns",
    front: "Which two proxies are always the wrong basis for a decision on this exam?",
    back: "Self-reported model confidence and sentiment analysis — both unreliable. Use explicit criteria plus few-shot examples instead.",
  },
  {
    id: "pat-4",
    topic: "Answer patterns",
    front: "Which architectural choice does 'attention dilutes' imply?",
    back: "Split the work — per-file passes plus a separate cross-file integration pass. A bigger context window does not improve attention quality.",
  },
  {
    id: "pat-5",
    topic: "Answer patterns",
    front: "Honest-schema principle: what does the exam reward?",
    back: "Never fabricating. Nullable/optional fields where data may be absent, enums with \"unclear\" and \"other\"+detail, and routing absent-information cases to null or human review rather than retrying.",
  },
  {
    id: "pat-6",
    topic: "Answer patterns",
    front: "What must every error carry, and what three error behaviours are always anti-patterns?",
    back: "Carry `errorCategory`, `isRetryable`, what was attempted, and partial results. Anti-patterns: generic failures, silent suppression, and terminating the whole workflow.",
  },

  // ─── Exam logistics ─────────────────────────────────────────────────────────
  {
    id: "log-1",
    topic: "Exam logistics",
    front: "CCAR-F format: how many questions, how long, and how are scenarios drawn?",
    back: "60 questions in 120 minutes (~2 min each), with 4 scenarios drawn at random from a bank of 6.",
  },
  {
    id: "log-2",
    topic: "Exam logistics",
    front: "Passing score and scale?",
    back: "A scaled score of 720 on a 100–1,000 scale, criterion-referenced. Result is reported pass/fail only.",
  },
  {
    id: "log-3",
    topic: "Exam logistics",
    front: "Give the five domain weights.",
    back: "Agentic Architecture & Orchestration 27%, Claude Code Configuration & Workflows 20%, Prompt Engineering & Structured Output 20%, Tool Design & MCP Integration 18%, Context Management & Reliability 15%.",
  },
  {
    id: "log-4",
    topic: "Exam logistics",
    front: "Response format on the real exam?",
    back: "Multiple choice **and multiple response** — each item states how many responses to select. Distractors are designed to be plausible to a candidate with incomplete knowledge.",
  },
  {
    id: "log-5",
    topic: "Exam logistics",
    front: "Certification validity and retake rules?",
    back: "Valid 12 months, with a free non-proctored renewal if renewed on time. Retakes wait 14 / 30 / 90 days after attempts 1 / 2 / 3; max 4 attempts per rolling 12 months.",
  },
  {
    id: "log-6",
    topic: "Exam logistics",
    front: "Name four topics explicitly out of scope.",
    back: "Fine-tuning, embeddings/vector DBs, streaming, and prompt-caching internals. Also: billing/auth, MCP hosting, model internals, RLHF, computer use, vision, rate limits, tokenization.",
  },
  {
    id: "log-7",
    topic: "Exam logistics",
    front: "Why must you prepare all six scenarios?",
    back: "The four presented are drawn at random from the bank of six — you cannot predict which you'll get.",
  },
]
