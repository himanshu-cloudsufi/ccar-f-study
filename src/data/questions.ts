import importedRaw from "./imported-questions.json"

export interface Question {
  id: string
  scenario: string
  scenarioId: string
  question: string
  options: string[]
  multiSelect: boolean
  answers: number[] // indexes into options (one entry unless multiSelect)
  explanation: string
  wrongAnswerNotes?: string | null
  source?: string
  /** Domain ids from @/lib/domains, when known. Absent = fall back to the scenario map. */
  domains?: string[]
}

// Handwritten questions transcribed from the local study guides (single-answer).
interface GuideQuestion {
  id: string
  scenario: string
  scenarioId: string
  question: string
  options: string[]
  answer: number
  explanation: string
}

const guideQuestions: GuideQuestion[] = [
  // ── Scenario 1: Customer Support Resolution Agent ──────────────────────────
  {
    id: "s1q1",
    scenario: "Customer Support Agent",
    scenarioId: "s1",
    question:
      "Your agent processes a $50 refund for the wrong customer because it matched by name only. Logs show get_customer was skipped in 12% of refund flows despite the system prompt saying verification is \"mandatory.\" Best fix?",
    options: [
      "Strengthen the prompt with capitalized MANDATORY language",
      "Add a programmatic prerequisite blocking process_refund until get_customer returns a verified ID",
      "Add 8 few-shot examples of correct verification flows",
      "Lower temperature to make the model more deterministic",
    ],
    answer: 1,
    explanation:
      "Financial operations require deterministic guarantees. Prompt language and few-shot examples are probabilistic (non-zero failure rate). Lowering temperature doesn't address tool-ordering behavior at all.",
  },
  {
    id: "s1q2",
    scenario: "Customer Support Agent",
    scenarioId: "s1",
    question:
      "Your process_refund MCP tool returns \"Error: operation failed\" for every failure — network timeouts, refunds over policy limits, and invalid order IDs alike. The agent responds by retrying everything three times. What should the tool return instead?",
    options: [
      "HTTP status codes mapped into the message string",
      "Structured metadata: errorCategory, isRetryable, and a human-readable description per failure type",
      "Nothing — suppress errors and return an empty success so the agent moves on",
      "A stack trace so the agent can diagnose the failure",
    ],
    answer: 1,
    explanation:
      "Structured categories let the agent retry transients, fix validation input, and escalate business/permission errors instead of blindly retrying. Suppressing errors silently is an anti-pattern; status codes and stack traces don't give decision-relevant structure.",
  },
  {
    id: "s1q3",
    scenario: "Customer Support Agent",
    scenarioId: "s1",
    question:
      "In hour-long multi-issue sessions, your agent starts quoting wrong refund amounts and mixing up order numbers between the customer's three issues. Root-cause fix?",
    options: [
      "Increase max_tokens on every request",
      "Summarize the conversation more aggressively every 10 turns",
      "Extract structured per-issue facts (order IDs, amounts, statuses) into a persistent case-facts block included in each prompt outside the summarized history",
      "Ask the customer to restate details when confusion occurs",
    ],
    answer: 2,
    explanation:
      "Progressive summarization is what destroys precise transactional facts — summarizing more aggressively makes it worse. A persistent structured case-facts block outside the summarized history preserves amounts, dates, and order numbers.",
  },
  {
    id: "s1q4",
    scenario: "Customer Support Agent",
    scenarioId: "s1",
    question:
      "A customer writes: \"This is ridiculous, I've been overcharged AGAIN. Just fix it.\" The overcharge is a standard duplicate-billing case fully within policy. The agent should:",
    options: [
      "Escalate immediately due to negative sentiment",
      "Acknowledge the frustration and offer to resolve it now, escalating only if the customer asks for a human",
      "Ask the customer to rate their frustration 1–10 to decide routing",
      "Self-report a confidence score and escalate if below 7",
    ],
    answer: 1,
    explanation:
      "Sentiment isn't complexity; the issue is within capability. Escalate immediately only on an explicit human request or a policy gap. Frustration ratings and self-reported confidence are unreliable proxies.",
  },
  {
    id: "s1q5",
    scenario: "Customer Support Agent",
    scenarioId: "s1",
    question:
      "Your MCP tools return timestamps as Unix epochs from the billing system and ISO 8601 from the order system, and the agent occasionally mis-compares dates. Cleanest fix?",
    options: [
      "Add a prompt instruction explaining both date formats",
      "A PostToolUse hook that normalizes all timestamps to one format before the model processes results",
      "Rewrite both backend systems to use one format",
      "Have the agent call a convert_date tool whenever it sees a date",
    ],
    answer: 1,
    explanation:
      "PostToolUse hooks exist precisely to normalize heterogeneous tool results deterministically. A prompt instruction is probabilistic; rewriting backends is over-engineered; a convert_date tool adds latency and relies on the model remembering to call it.",
  },

  // ── Scenario 2: Code Generation with Claude Code ───────────────────────────
  {
    id: "s2q1",
    scenario: "Code Gen with Claude Code",
    scenarioId: "s2",
    question:
      "Your team's coding standards live in your ~/.claude/CLAUDE.md and work great for you. A new hire reports Claude ignores all the standards. Why?",
    options: [
      "The new hire's Claude Code version is outdated",
      "User-level CLAUDE.md is not distributed via version control; the standards must move to project-level CLAUDE.md",
      "The standards file exceeds the token limit",
      "New hires must run /init before standards apply",
    ],
    answer: 1,
    explanation:
      "~/.claude/CLAUDE.md applies only to that user's machine and is never shared through git. Team standards belong at project level (./CLAUDE.md or .claude/CLAUDE.md) so version control distributes them.",
  },
  {
    id: "s2q2",
    scenario: "Code Gen with Claude Code",
    scenarioId: "s2",
    question:
      "You want a codebase-analysis skill whose multi-thousand-line exploration output must not consume the main session's context. Which frontmatter option?",
    options: [
      "allowed-tools: [Read, Grep]",
      "context: fork",
      "argument-hint: \"path to analyze\"",
      "paths: [\"src/**/*\"]",
    ],
    answer: 1,
    explanation:
      "context: fork runs the skill in an isolated sub-agent context; only its result returns to the main conversation. allowed-tools restricts tools, argument-hint prompts for parameters, and paths is rules frontmatter, not skills.",
  },
  {
    id: "s2q3",
    scenario: "Code Gen with Claude Code",
    scenarioId: "s2",
    question:
      "Terraform conventions should load only when editing infrastructure files, which all live under terraform/. Test conventions should load for *.test.tsx files scattered everywhere. Best setup?",
    options: [
      "Both in root CLAUDE.md with clear headers",
      "A CLAUDE.md inside every directory that contains tests",
      "Two .claude/rules/ files with paths: [\"terraform/**/*\"] and paths: [\"**/*.test.tsx\"]",
      "Two skills that developers invoke before editing",
    ],
    answer: 2,
    explanation:
      "Glob-scoped rules load conditionally by path, handling both the single-subtree case and the scattered-file-type case. Root CLAUDE.md always loads (wasting context); per-directory CLAUDE.md can't maintainably track scattered tests; skills aren't automatic.",
  },
  {
    id: "s2q4",
    scenario: "Code Gen with Claude Code",
    scenarioId: "s2",
    question:
      "You're asked to add a null-check to one function; the failing stack trace points to the exact line. Separately, you're asked to migrate the ORM across ~50 files with two viable target libraries. Choose the modes.",
    options: [
      "Plan mode for both",
      "Direct execution for both",
      "Direct execution for the null-check; plan mode for the migration",
      "Plan mode for the null-check; direct execution for the migration",
    ],
    answer: 2,
    explanation:
      "A well-scoped single-file fix warrants direct execution. A large-scale change with multiple valid approaches and an architectural decision warrants plan mode first, then direct execution of the planned implementation.",
  },
  {
    id: "s2q5",
    scenario: "Code Gen with Claude Code",
    scenarioId: "s2",
    question:
      "After a week away, you resume a named session about the payments module, but a teammate merged a large refactor of that module in the meantime. Best approach?",
    options: [
      "--resume the session and continue where you left off",
      "--resume and ask Claude to ignore anything that looks outdated",
      "Start a fresh session, injecting a structured summary of prior conclusions, and let Claude re-explore current code",
      "fork_session to branch the old analysis",
    ],
    answer: 2,
    explanation:
      "The prior tool results are stale; resuming reasons over outdated file contents, and forking copies the same stale baseline. Fresh session + injected summary is the documented pattern. (If only 2–3 files had changed, resuming and naming those files would be acceptable.)",
  },
  {
    id: "s2q6",
    scenario: "Code Gen with Claude Code",
    scenarioId: "s2",
    question:
      "Claude keeps misinterpreting your prose description of a CSV transformation, producing inconsistent output each attempt. Most effective next step?",
    options: [
      "Rewrite the description with more precise technical language",
      "Provide 2–3 concrete input/output example pairs demonstrating the transformation",
      "Switch to a larger model",
      "Ask Claude to explain its interpretation before coding",
    ],
    answer: 1,
    explanation:
      "Concrete input/output examples are the stated most-effective technique when prose is interpreted inconsistently. The interview pattern (asking Claude to explain first) is for surfacing unknown design considerations, not pinning down a known transformation.",
  },

  // ── Scenario 3: Multi-Agent Research System ────────────────────────────────
  {
    id: "s3q1",
    scenario: "Multi-Agent Research",
    scenarioId: "s3",
    question:
      "Your coordinator's prompt instructs it to delegate research, but every Task tool call fails. The subagent definitions are correct. Most likely cause?",
    options: [
      "Subagents cannot run in parallel",
      "The coordinator's allowedTools does not include \"Task\"",
      "The subagents' system prompts are too long",
      "fork_session was not enabled",
    ],
    answer: 1,
    explanation:
      "The Task tool is the spawning mechanism for subagents; the coordinator must be permitted to call it via its allowedTools configuration.",
  },
  {
    id: "s3q2",
    scenario: "Multi-Agent Research",
    scenarioId: "s3",
    question:
      "The synthesis agent produces reports with claims but no sources, even though the web-search agent's results contained URLs. What went wrong?",
    options: [
      "The synthesis agent's model can't process URLs",
      "Findings were passed as prose summaries; claim–source mappings weren't preserved as structured data through the handoff",
      "The coordinator should have generated citations itself",
      "Web search results expire between agent invocations",
    ],
    answer: 1,
    explanation:
      "Attribution is lost during summarization unless subagents output structured claim–source mappings (URL, document name, excerpt) that downstream agents are required to preserve. Subagents share nothing by default — context must be passed explicitly.",
  },
  {
    id: "s3q3",
    scenario: "Multi-Agent Research",
    scenarioId: "s3",
    question:
      "Coordinator delegates 4 research subtasks. Currently it issues one Task call, waits, then issues the next. Total runtime is 4× a single task. Fix?",
    options: [
      "Reduce each subagent's max_tokens",
      "Emit all four Task tool calls in a single coordinator response so subagents run in parallel",
      "Merge the four subtasks into one subagent",
      "Cache subagent results between runs",
    ],
    answer: 1,
    explanation:
      "Parallel spawning = multiple Task calls in one response; separate turns = sequential. Merging subtasks creates the too-broad/attention-dilution problem; the other options don't address sequencing.",
  },
  {
    id: "s3q4",
    scenario: "Multi-Agent Research",
    scenarioId: "s3",
    question:
      "Two credible sources report the market size as $4.2B and $6.8B. The document-analysis subagent should:",
    options: [
      "Select the value from the more recent source and discard the other",
      "Average the two values",
      "Return both values, explicitly annotated with source attribution, and let the coordinator decide reconciliation before synthesis",
      "Omit the statistic entirely to avoid publishing conflicting data",
    ],
    answer: 2,
    explanation:
      "Annotate conflicts with attribution; the coordinator reconciles. Arbitrary selection, fabricated middle values, and silent omission all corrupt the research. Also check publication dates — the \"conflict\" may be temporal.",
  },
  {
    id: "s3q5",
    scenario: "Multi-Agent Research",
    scenarioId: "s3",
    question:
      "Your document-analysis subagent has 18 tools including web search, and logs show it sometimes searches the web mid-analysis and picks the wrong extraction tool. Best fix?",
    options: [
      "Add a system-prompt instruction: \"only use analysis tools\"",
      "Restrict its tool set to the 4–5 analysis tools relevant to its role",
      "Fine-tune the model on correct tool selections",
      "Lower temperature",
    ],
    answer: 1,
    explanation:
      "Scoped tool access fixes both problems: fewer tools → more reliable selection; no out-of-role tools → no cross-specialization misuse. Prompt instructions are probabilistic; fine-tuning is out of exam scope and over-engineered.",
  },
  {
    id: "s3q6",
    scenario: "Multi-Agent Research",
    scenarioId: "s3",
    question:
      "Reports consistently reflect findings from the first and last documents analyzed but omit key points from documents in the middle of the aggregated input. Mitigation?",
    options: [
      "Increase the context window",
      "Place a key-findings summary at the beginning of the aggregated input and organize details with explicit section headers",
      "Analyze fewer documents",
      "Repeat every document twice in the input",
    ],
    answer: 1,
    explanation:
      "This is the lost-in-the-middle effect — a position/attention issue that bigger windows don't fix. Restructure the input to put critical content in high-attention positions.",
  },

  // ── Scenario 4: Developer Productivity with Claude ─────────────────────────
  {
    id: "s4q1",
    scenario: "Developer Productivity",
    scenarioId: "s4",
    question:
      "You need to find every file that imports PaymentProcessor anywhere in the repo. Which tool?",
    options: [
      "Glob with pattern **/PaymentProcessor*",
      "Grep for PaymentProcessor across file contents",
      "Read on the PaymentProcessor file",
      "Bash ls -R",
    ],
    answer: 1,
    explanation:
      "Imports live in file contents → Grep. Glob matches file names/paths, which would only find files named after the class. Content vs path is the classic Grep-vs-Glob distinction.",
  },
  {
    id: "s4q2",
    scenario: "Developer Productivity",
    scenarioId: "s4",
    question:
      "Edit repeatedly fails on config.ts with \"text matches multiple locations\" — the file contains several identical settings blocks. Reliable approach?",
    options: [
      "Retry Edit with more surrounding context until unique — and if it still fails, keep retrying",
      "Use Read to load the full file, then Write the modified version",
      "Use Bash with sed",
      "Split the file first so blocks become unique",
    ],
    answer: 1,
    explanation:
      "Read + Write is the documented fallback when Edit can't find unique anchor text. Edit requires the anchor text to be unique in the file.",
  },
  {
    id: "s4q3",
    scenario: "Developer Productivity",
    scenarioId: "s4",
    question:
      "Your team's Jira MCP server config with an API token needs to be shared with all 12 developers without committing secrets. How?",
    options: [
      "Commit .mcp.json with the token inside; the repo is private",
      "Each developer adds the server to ~/.claude.json manually with their own token",
      "Commit .mcp.json using ${JIRA_TOKEN} environment-variable expansion; developers set the variable locally",
      "Store the token in project CLAUDE.md",
    ],
    answer: 2,
    explanation:
      "Project-scoped .mcp.json shares the config via git; env-var expansion keeps credentials out of the repo. Per-user config loses the shared-config benefit; the other options commit secrets.",
  },
  {
    id: "s4q4",
    scenario: "Developer Productivity",
    scenarioId: "s4",
    question:
      "Your custom MCP code_search tool is far more capable than Grep, but logs show the agent almost always uses Grep. First fix?",
    options: [
      "Remove Grep from allowedTools",
      "Enhance the MCP tool's description to explain its capabilities and outputs in detail",
      "Force the tool with tool_choice on every request",
      "Rename the tool to grep_v2",
    ],
    answer: 1,
    explanation:
      "Descriptions drive selection; thin MCP descriptions lose to familiar built-ins. Removing Grep drops a legitimately useful tool; forcing tool_choice is heavy-handed for all requests; renaming adds no selection-relevant information.",
  },
  {
    id: "s4q5",
    scenario: "Developer Productivity",
    scenarioId: "s4",
    question:
      "Three hours into exploring a 500k-line legacy system, Claude starts describing the auth flow in generic terms instead of citing the actual classes it found earlier. Which response addresses the root cause?",
    options: [
      "Ask Claude to focus harder on the specific codebase",
      "Have Claude maintain a scratchpad file of key findings and reference it, and delegate verbose sub-investigations to subagents",
      "Restart and re-explore from scratch each session",
      "Paste the entire codebase into the first message",
    ],
    answer: 1,
    explanation:
      "Classic context degradation (citing \"typical patterns\" instead of discovered specifics). Scratchpads persist findings across context boundaries; subagent delegation keeps verbose output out of the main context.",
  },
  {
    id: "s4q6",
    scenario: "Developer Productivity",
    scenarioId: "s4",
    question:
      "After a shared baseline analysis of the codebase, you want to evaluate two competing refactoring strategies independently without re-analyzing. Mechanism?",
    options: [
      "--resume the session twice in two terminals",
      "fork_session to create two independent branches from the shared analysis baseline",
      "Two fresh sessions, each redoing the analysis",
      "One session that alternates between both strategies",
    ],
    answer: 1,
    explanation:
      "fork_session exists exactly for divergent exploration from a shared baseline. Alternating in one session contaminates the comparison; fresh sessions waste the baseline work.",
  },

  // ── Scenario 5: Claude Code for CI/CD ──────────────────────────────────────
  {
    id: "s5q1",
    scenario: "Claude Code for CI/CD",
    scenarioId: "s5",
    question:
      "Your GitHub Action step claude \"Generate tests for changed files\" never completes. Fix?",
    options: [
      "claude --batch \"Generate tests for changed files\"",
      "export CLAUDE_HEADLESS=true first",
      "claude -p \"Generate tests for changed files\"",
      "Pipe yes \"\" into the command",
    ],
    answer: 2,
    explanation:
      "-p/--print is the non-interactive (headless) mode; the job hangs because Claude Code awaits interactive input. --batch and CLAUDE_HEADLESS are non-existent features used as distractors.",
  },
  {
    id: "s5q2",
    scenario: "Claude Code for CI/CD",
    scenarioId: "s5",
    question:
      "You want review findings posted automatically as inline PR comments by a script. Which flag combination?",
    options: [
      "-p --output-format json --json-schema findings.schema.json",
      "-p --verbose",
      "--output-format markdown --strict",
      "-p --comment-mode inline",
    ],
    answer: 0,
    explanation:
      "JSON output constrained by a schema is machine-parseable for automated posting. The other combinations include non-existent flags.",
  },
  {
    id: "s5q3",
    scenario: "Claude Code for CI/CD",
    scenarioId: "s5",
    question:
      "Developers dismiss ~60% of \"code smell\" findings but the security findings are excellent. Trust in the whole bot is collapsing. Best immediate + structural response?",
    options: [
      "Instruct the model to \"be more conservative overall\"",
      "Temporarily disable the code-smell category while adding explicit categorical criteria and few-shot examples distinguishing acceptable patterns from genuine issues",
      "Require two model runs to agree before posting any finding",
      "Lower the bot to comment-only, never blocking",
    ],
    answer: 1,
    explanation:
      "High-FP categories poison trust in accurate ones; disable them while fixing root cause with specific criteria + few-shot boundary examples. \"Be conservative\" is a vague instruction documented to fail; consensus voting suppresses intermittently-caught real issues.",
  },
  {
    id: "s5q4",
    scenario: "Claude Code for CI/CD",
    scenarioId: "s5",
    question:
      "Claude Code generates a feature in a CI job, then in the same session is asked to \"carefully review your changes for bugs.\" It approves its own subtle race condition. Why, and what's the fix?",
    options: [
      "The model is too small; upgrade tiers",
      "The session retains generation reasoning, biasing self-review; use an independent Claude instance without that context for the review",
      "Extended thinking should be enabled during review",
      "The review prompt needed the word \"critically\"",
    ],
    answer: 1,
    explanation:
      "Self-review limitation: retained reasoning context prevents the model from questioning its own decisions. Independent instances (session context isolation) are the fix; extended thinking and stronger wording are documented non-fixes.",
  },
  {
    id: "s5q5",
    scenario: "Claude Code for CI/CD",
    scenarioId: "s5",
    question:
      "Management wants everything on the Batch API for the 50% savings: (1) pre-merge security gate, (2) nightly test-coverage report, (3) weekly dependency audit. Correct split?",
    options: [
      "All three on batch with polling",
      "Gate stays synchronous; nightly report and weekly audit move to batch",
      "All three stay synchronous to avoid ordering issues",
      "All three on batch with a real-time fallback timeout",
    ],
    answer: 1,
    explanation:
      "Batch = latency-tolerant, non-blocking only (up to 24h, no SLA). The blocking gate must be synchronous. Ordering is a non-issue (custom_id). Fallback hybrids add needless complexity.",
  },
  {
    id: "s5q6",
    scenario: "Claude Code for CI/CD",
    scenarioId: "s5",
    question:
      "Every push to an open PR triggers a fresh review that repeats all previous comments, burying new ones. Fix?",
    options: [
      "Review only the newest commit's diff",
      "Include prior review findings in context and instruct Claude to report only new or still-unaddressed issues",
      "Deduplicate comments with string matching in the pipeline script",
      "Limit reviews to one per PR",
    ],
    answer: 1,
    explanation:
      "The documented pattern. Reviewing only the newest diff misses issues arising from interactions with earlier changes; string-match dedupe is brittle post-hoc patching; one review per PR loses coverage of later commits.",
  },

  // ── Scenario 6: Structured Data Extraction ─────────────────────────────────
  {
    id: "s6q1",
    scenario: "Structured Data Extraction",
    scenarioId: "s6",
    question:
      "Your extraction pipeline intermittently fails on malformed JSON: markdown fences, trailing commas, unescaped quotes. Most reliable fix?",
    options: [
      "Post-process the text with regex cleanup before parsing",
      "Prompt: \"Respond ONLY with valid JSON, no markdown\"",
      "Define an extraction tool with your JSON schema as input_schema and read the tool_use block, with tool_choice forcing tool use",
      "Retry parsing up to five times",
    ],
    answer: 2,
    explanation:
      "tool_use with schemas eliminates syntax errors entirely — the model fills schema-validated parameters instead of free-writing JSON. Regex cleanup, prompting, and retries reduce but don't eliminate failures.",
  },
  {
    id: "s6q2",
    scenario: "Structured Data Extraction",
    scenarioId: "s6",
    question:
      "Invoices sometimes lack a PO number, but your schema marks po_number as required. The model fills in realistic-looking fake PO numbers. Fix?",
    options: [
      "Prompt: \"never make up PO numbers\"",
      "Make po_number nullable/optional so the model can return null when absent",
      "Validate PO numbers against the ERP after extraction",
      "Lower temperature to 0",
    ],
    answer: 1,
    explanation:
      "Required fields pressure the model to fabricate values to satisfy the schema. Nullable schema design removes the pressure at the root. Prompting is probabilistic; post-validation catches but doesn't prevent; temperature doesn't change the schema constraint.",
  },
  {
    id: "s6q3",
    scenario: "Structured Data Extraction",
    scenarioId: "s6",
    question:
      "A batch of 5,000 contracts returns 200 validation failures: 150 are \"date format invalid,\" 50 are \"counterparty_address missing\" where the address exists only in a separate exhibit document not included. Handling?",
    options: [
      "Retry all 200 with error feedback",
      "Retry the 150 format failures with specific validation errors included; route the 50 missing-source cases to null/human handling — retries cannot recover absent information",
      "Retry all 200 with a stronger prompt",
      "Mark all 200 as unextractable",
    ],
    answer: 1,
    explanation:
      "Retry-with-error-feedback fixes format/structural errors; it is ineffective when the information isn't in the provided source. Segment failures by cause.",
  },
  {
    id: "s6q4",
    scenario: "Structured Data Extraction",
    scenarioId: "s6",
    question:
      "You have three extraction tools (invoice, receipt, contract) and don't know each document's type in advance. You need guaranteed structured output. tool_choice?",
    options: [
      "\"auto\"",
      "\"any\"",
      "{\"type\": \"tool\", \"name\": \"extract_invoice\"}",
      "Omit tool_choice",
    ],
    answer: 1,
    explanation:
      "\"any\" guarantees a tool call (structured output) while letting the model pick the schema matching the document type. \"auto\" (or omitting) may return prose; forcing one tool is wrong for unknown types.",
  },
  {
    id: "s6q5",
    scenario: "Structured Data Extraction",
    scenarioId: "s6",
    question:
      "Your dashboard shows 97% accuracy, so leadership wants human review dropped for all \"high-confidence\" extractions. What must you verify first, and how do you keep it safe over time?",
    options: [
      "Nothing — 97% exceeds the target",
      "Segment accuracy by document type and field to expose weak segments; then keep stratified random sampling of high-confidence extractions to measure error rates and catch novel patterns",
      "Raise the confidence threshold to 99%",
      "Ask the model whether it feels confident enough",
    ],
    answer: 1,
    explanation:
      "Aggregate metrics mask segment-level failures (99% on invoices can hide 70% on handwritten receipts); stratified sampling of the automated stream is the ongoing safety net. Raw model confidence is uncalibrated until validated against labeled data.",
  },
  {
    id: "s6q6",
    scenario: "Structured Data Extraction",
    scenarioId: "s6",
    question:
      "Extracted invoices pass schema validation, but the line items often don't sum to the stated total. What design catches this?",
    options: [
      "Stricter JSON schema types",
      "Extract calculated_total alongside stated_total and flag discrepancies (semantic validation), optionally with a conflict_detected boolean",
      "Increase max_tokens",
      "Switch to XML output",
    ],
    answer: 1,
    explanation:
      "This is a semantic error; schema strictness only governs syntax/structure. Cross-field validation with self-reported computed values flags inconsistency for review.",
  },
  {
    id: "s6q7",
    scenario: "Structured Data Extraction",
    scenarioId: "s6",
    question:
      "Extraction accuracy is fine on formal reports but the model returns null for measurements written informally (\"about two and a half meters\") even though they're present. Fix?",
    options: [
      "Mark measurement fields required to force extraction",
      "Add few-shot examples demonstrating correct extraction of informal/varied formats, plus normalization rules in the prompt",
      "Preprocess documents with regex to standardize measurements",
      "Retry nulls automatically",
    ],
    answer: 1,
    explanation:
      "Few-shot examples on varied/informal structures are the documented fix for wrongly-null fields; normalization rules pair with the strict schema. Making fields required causes fabrication elsewhere; regex is brittle; retries without new guidance rarely help.",
  },
]

const imported = importedRaw as Question[]

export const questions: Question[] = [
  ...guideQuestions.map((q) => ({
    id: q.id,
    scenario: q.scenario,
    scenarioId: q.scenarioId,
    question: q.question,
    options: q.options,
    multiSelect: false,
    answers: [q.answer],
    explanation: q.explanation,
    source: "local study guides",
  })),
  ...imported,
]
