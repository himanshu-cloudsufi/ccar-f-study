# Scenario 4: Developer Productivity with Claude
## CCAR-F Deep-Dive Study Guide

**Context:** You build developer-productivity tools with the **Claude Agent SDK**: exploring unfamiliar codebases, understanding legacy systems, generating boilerplate, automating repetitive tasks. Uses **built-in tools** (Read, Write, Edit, Bash, Grep, Glob) and integrates **MCP servers**.

**Primary domains:** Tool Design & MCP Integration (D2) · Claude Code Configuration & Workflows (D3) · Agentic Architecture & Orchestration (D1)

---

## Part 1: Built-in Tools — Purposes and Selection (Task Statement 2.5)

| Tool | Purpose | Example |
|---|---|---|
| **Grep** | Search file **contents** for patterns | Find all callers of `processPayment`, locate an error message, find import statements |
| **Glob** | Match file **paths/names** by pattern | Find all `**/*.test.tsx`, all `*.config.js` |
| **Read** | Load full file contents | Read a module before modifying it |
| **Write** | Write a whole file | Create a new file; rewrite after Read |
| **Edit** | Targeted modification via **unique text matching** | Replace one function body |
| **Bash** | Run shell commands | Run tests, git operations |

### The two classic confusions
1. **Grep vs Glob:** "find files *named* X" → Glob; "find files *containing* X" → Grep. Content vs path.
2. **Edit failure fallback:** Edit requires the anchor text to be **unique** in the file. When it isn't (repeated boilerplate, duplicated blocks), Edit fails → fall back to **Read (full file) + Write (modified full file)**.

### Exploration strategy for unfamiliar codebases
Build understanding **incrementally**: Grep for entry points → Read to follow imports and trace flows. **Do not read every file upfront** (burns context, dilutes attention).

**Wrapper-module tracing pattern:** to trace usage of functions re-exported through wrapper modules — first identify **all exported names**, then Grep for **each name** across the codebase (searching only the original name misses aliased re-exports).

---

## Part 2: MCP Server Integration (Task Statement 2.4)

### Configuration scoping
| Scope | File | Shared? | Use for |
|---|---|---|---|
| **Project** | `.mcp.json` (in repo) | ✅ via git | Team-shared tooling (Jira, GitHub, internal APIs) |
| **User** | `~/.claude.json` | ❌ | Personal/experimental servers |

Both are active **simultaneously** — tools from **all configured servers are discovered at connection time** and available together.

### Credentials without committing secrets
`.mcp.json` supports **environment variable expansion**:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
    }
  }
}
```

Each developer sets `GITHUB_TOKEN` locally; the config is safe to commit.

### MCP resources vs tools
- **Tools** = actions the agent invokes.
- **Resources** = **content catalogs** exposed to the agent — issue summaries, documentation hierarchies, database schemas. Purpose: give agents **visibility into available data without exploratory tool calls** (the agent doesn't have to "search around" to learn what exists).

### Adoption problems and fixes
- **Agent prefers built-in Grep over your capable MCP tool** → your MCP tool's **description is too thin**. Enhance it to explain capabilities and outputs in detail. (Descriptions drive selection — same principle as Scenario 1.)
- **Community vs custom servers:** prefer **existing community MCP servers for standard integrations** (e.g., Jira); build **custom** servers only for team-specific workflows.

---

## Part 3: Task Decomposition for Dev Workflows (Task Statement 1.6)

Two patterns — know when each applies:

| Pattern | When | Example |
|---|---|---|
| **Fixed sequential pipeline (prompt chaining)** | Predictable, multi-aspect work | Code review: analyze each file individually → separate cross-file integration pass |
| **Dynamic adaptive decomposition** | Open-ended investigation where each step's findings shape the next | "Add comprehensive tests to this legacy codebase" |

**Legacy-testing decomposition (canonical example):** map the structure first → identify high-impact areas → create a **prioritized plan that adapts** as dependencies are discovered. Not a fixed upfront file list.

**Per-file + integration split rationale:** analyzing many files at once dilutes attention (inconsistent depth, missed bugs, contradictory findings). Local pass per file + one dedicated cross-file data-flow pass.

---

## Part 4: Session State, Resumption, Forking (Task Statement 1.7)

- **`--resume <session-name>`** — continue a named investigation across work sessions.
- **`fork_session`** — parallel exploration branches from a **shared analysis baseline**: e.g., compare two testing strategies or two refactoring approaches without repeating the expensive codebase analysis.
- **Resume vs fresh:**
  - Prior context mostly valid → resume; if specific files changed, **inform the agent which files** for targeted re-analysis.
  - Prior tool results stale (big refactor landed) → **new session + structured summary injected**. Resuming over stale file contents produces unreliable reasoning.

---

## Part 5: Context Management in Large Codebases (Task Statement 5.4)

### Symptoms of context degradation
In extended sessions the model starts giving **inconsistent answers** and referencing **"typical patterns"** instead of the specific classes it discovered earlier. That's your cue to intervene.

### The four countermeasures
1. **Subagent delegation** — spawn subagents for specific verbose questions ("find all test files", "trace refund-flow dependencies") while the main agent keeps high-level coordination. Verbose exploration output stays in the subagent's context.
2. **Scratchpad files** — agents record key findings to files and reference them for later questions, surviving context boundaries.
3. **Phase summarization** — summarize key findings from one exploration phase, then inject the summary into the initial context of the next phase's subagents.
4. **`/compact`** — reduce context usage when discovery output fills the window mid-session.

### Crash recovery
Design **structured state persistence**: each agent **exports state to a known location**; on resume the coordinator **loads a manifest** and injects it into agent prompts. Work survives crashes without full re-exploration.

---

## Part 6: Practice Questions

**Q1.** You need to find every file that *imports* `PaymentProcessor` anywhere in the repo. Which tool?

A. Glob with pattern `**/PaymentProcessor*`
B. Grep for `PaymentProcessor` across file contents
C. Read on the PaymentProcessor file
D. Bash `ls -R`

**Answer: B.** Imports live in file *contents* → Grep. Glob (A) matches file *names*, which would only find files named after the class.

---

**Q2.** Edit repeatedly fails on `config.ts` with "text matches multiple locations" — the file contains several identical settings blocks. Reliable approach?

A. Retry Edit with more surrounding context until unique — and if it still fails, keep retrying
B. Use Read to load the full file, then Write the modified version
C. Use Bash with sed
D. Split the file first so blocks become unique

**Answer: B.** Read + Write is the documented fallback when Edit can't find unique anchor text. (Adding context can work, but the tested fallback pattern is Read+Write.)

---

**Q3.** Your team's Jira MCP server config with an API token needs to be shared with all 12 developers without committing secrets. How?

A. Commit `.mcp.json` with the token inside; the repo is private
B. Each developer adds the server to `~/.claude.json` manually with their own token
C. Commit `.mcp.json` using `${JIRA_TOKEN}` environment-variable expansion; developers set the variable locally
D. Store the token in project CLAUDE.md

**Answer: C.** Project-scoped `.mcp.json` shares the config via git; env-var expansion keeps credentials out of the repo. B loses the shared-config benefit; A and D commit secrets.

---

**Q4.** Your custom MCP `code_search` tool is far more capable than Grep, but logs show the agent almost always uses Grep. First fix?

A. Remove Grep from allowedTools
B. Enhance the MCP tool's description to explain its capabilities and outputs in detail
C. Force the tool with tool_choice on every request
D. Rename the tool to `grep_v2`

**Answer: B.** Descriptions drive selection; thin MCP descriptions lose to familiar built-ins. A removes a legitimately useful tool; C is heavy-handed for all requests; D doesn't add selection-relevant information.

---

**Q5.** Three hours into exploring a 500k-line legacy system, Claude starts describing the auth flow in generic terms instead of citing the actual classes it found earlier. Which response addresses the root cause?

A. Ask Claude to focus harder on the specific codebase
B. Have Claude maintain a scratchpad file of key findings and reference it, and delegate verbose sub-investigations to subagents
C. Restart and re-explore from scratch each session
D. Paste the entire codebase into the first message

**Answer: B.** Classic context degradation. Scratchpads persist findings across context boundaries; subagent delegation keeps verbose output out of the main context. C loses all work; D is impossible/counterproductive.

---

**Q6.** After a shared baseline analysis of the codebase, you want to evaluate two competing refactoring strategies independently without re-analyzing. Mechanism?

A. `--resume` the session twice in two terminals
B. `fork_session` to create two independent branches from the shared analysis baseline
C. Two fresh sessions, each redoing the analysis
D. One session that alternates between both strategies

**Answer: B.** fork_session exists exactly for divergent exploration from a shared baseline. D contaminates the comparisons; C wastes the baseline work.

---

## Key Takeaways Card
- Grep = contents; Glob = paths; Edit needs unique anchors, else Read+Write.
- Explore incrementally (Grep entry points → Read/trace), never read-everything-upfront.
- `.mcp.json` = project/shared (+ `${ENV_VAR}` expansion); `~/.claude.json` = personal. All servers' tools available simultaneously.
- MCP resources = content catalogs → fewer exploratory calls. Thin descriptions → agent prefers built-ins.
- Community servers for standard integrations; custom only for team-specific needs.
- Prompt chaining for predictable reviews; adaptive decomposition for open-ended work.
- Degradation symptoms ("typical patterns") → scratchpads, subagents, phase summaries, /compact.
- Crash recovery = state manifests exported per agent, loaded by coordinator on resume.

**Docs:** Claude Code MCP — https://code.claude.com/docs (MCP section) · Agent SDK — https://docs.claude.com/en/api/agent-sdk/overview
