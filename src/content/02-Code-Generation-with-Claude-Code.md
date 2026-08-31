# Scenario 2: Code Generation with Claude Code
## CCAR-F Deep-Dive Study Guide

**Context:** Your team uses **Claude Code** for code generation, refactoring, debugging, and documentation. You must integrate it into the development workflow with custom slash commands, CLAUDE.md configurations, and know when to use plan mode vs direct execution.

**Primary domains:** Claude Code Configuration & Workflows (D3) · Context Management & Reliability (D5)

---

## Part 1: CLAUDE.md Configuration Hierarchy (Task Statement 3.1)

### The three levels (memorize the paths)

| Level | Location | Shared via git? | Use for |
|---|---|---|---|
| **User** | `~/.claude/CLAUDE.md` | ❌ No — personal only | Your own preferences across all projects |
| **Project** | `./CLAUDE.md` or `./.claude/CLAUDE.md` | ✅ Yes | Team standards: build/test commands, coding conventions, architecture decisions |
| **Directory** | `subdir/CLAUDE.md` | ✅ Yes | Conventions specific to one subtree (loaded on demand when Claude works in that directory) |

**Classic exam diagnosis:** "A new team member clones the repo but Claude doesn't follow the team's conventions." → The conventions were put in someone's **user-level** `~/.claude/CLAUDE.md`, which is never shared through version control. Move them to project level.

### Keeping CLAUDE.md modular
- **`@import` syntax** references external files, so each package's CLAUDE.md can pull in only the standards files relevant to it (chosen by that package's maintainers).
- **`.claude/rules/` directory**: split a monolithic CLAUDE.md into focused topic files — `testing.md`, `api-conventions.md`, `deployment.md`.
- **`/memory` command**: shows which memory files are actually loaded — first diagnostic step when Claude behaves inconsistently across sessions or machines.

---

## Part 2: Path-Specific Rules (Task Statement 3.3)

Rule files in `.claude/rules/` can carry **YAML frontmatter with a `paths` field of glob patterns**. The rule loads **only when Claude is editing matching files**, cutting irrelevant context and token usage.

```markdown
---
paths: ["**/*.test.tsx", "**/*.test.ts"]
---
# Testing conventions
- Use React Testing Library queries by role
- One behavior per test; no snapshot tests
```

### Rules vs directory CLAUDE.md — the key comparison
Directory-level CLAUDE.md files are **directory-bound**. Test files like `Button.test.tsx` living *next to* the code they test are spread across the whole tree — a directory CLAUDE.md can't cover them all. A glob rule (`**/*.test.tsx`) applies **by file type regardless of location**. This exact contrast is a sample-exam question.

Decision matrix:
| Conventions apply to... | Use |
|---|---|
| Everything, always | Project CLAUDE.md |
| One subtree | Directory CLAUDE.md (or a rule with a directory glob like `terraform/**/*`) |
| A file *type* spread across the repo | `.claude/rules/` with glob frontmatter |
| A task performed on demand | Skill / slash command |

---

## Part 3: Custom Slash Commands and Skills (Task Statement 3.2)

### Scoping
| Artifact | Project scope (shared via git) | User scope (personal) |
|---|---|---|
| Slash commands | `.claude/commands/` | `~/.claude/commands/` |
| Skills | `.claude/skills/<name>/SKILL.md` | `~/.claude/skills/<name>/SKILL.md` |

A team-wide `/review` command belongs in **`.claude/commands/`** in the repo — every developer gets it on clone/pull. (Sample Q4: distractors were `~/.claude/commands/` = personal only; CLAUDE.md = instructions, not command definitions; `.claude/config.json` with a commands array = doesn't exist.)

To customize a shared skill without affecting teammates, create a **personal variant under `~/.claude/skills/` with a different name**.

### SKILL.md frontmatter options (memorize all three)
- **`context: fork`** — runs the skill in an **isolated sub-agent context** so its output doesn't pollute the main conversation. Use for skills producing **verbose output** (codebase analysis) or **exploratory context** (brainstorming alternatives).
- **`allowed-tools`** — restricts which tools the skill may use while executing (e.g., limit to file writes to prevent destructive Bash actions).
- **`argument-hint`** — prompts the developer for required parameters when they invoke the skill without arguments.

### Skills vs CLAUDE.md
- **Skills** = on-demand invocation, task-specific workflows.
- **CLAUDE.md** = always-loaded, universal standards.
If it must apply automatically/deterministically based on file paths, that's a **rule**, not a skill (skills rely on invocation or Claude choosing to load them).

---

## Part 4: Plan Mode vs Direct Execution (Task Statement 3.4)

### When plan mode
- Large-scale changes (e.g., library migrations touching **45+ files**)
- **Multiple valid approaches** requiring a decision
- **Architectural decisions** (monolith → microservices, service boundaries)
- Multi-file modifications where late-discovered dependencies would cause costly rework

Plan mode enables safe exploration + design **before committing to changes**.

### When direct execution
- Simple, well-scoped changes: single-file bug fix with a clear stack trace, adding one validation conditional.

### Combining them
Correct workflow for big migrations: **plan mode for investigation → direct execution for the planned implementation**.

### The Explore subagent
For verbose discovery phases, use the **Explore subagent** to isolate exploration output and return only **summaries** — preserving the main conversation's context window during multi-phase tasks.

**Wrong-answer patterns:** "start direct and switch to plan mode if it gets complex" (complexity is already stated in the requirements); "give exhaustive upfront instructions" (assumes you already know the answer without exploring).

---

## Part 5: Iterative Refinement Techniques (Task Statement 3.5)

1. **Concrete input/output examples** — the most effective way to communicate a transformation when prose descriptions get interpreted inconsistently. Provide **2–3 examples**. (E.g., null handling in a migration script: give an input row with nulls + the exact expected output.)
2. **Test-driven iteration** — write the test suite first (expected behavior, edge cases, performance), then iterate by sharing **test failures** with Claude.
3. **The interview pattern** — have Claude **ask you questions first** to surface considerations you hadn't anticipated (cache invalidation strategy, failure modes) before implementing in an unfamiliar domain.
4. **Batching fixes** — issues that **interact** → one single detailed message covering all of them; **independent** issues → fix sequentially.

---

## Part 6: Sessions and Context (Task Statements 1.7, 5.4)

- **`--resume <session-name>`** — continue a specific named prior session across work sessions.
- **`fork_session`** — branch independent explorations from a **shared analysis baseline** (e.g., compare two refactoring approaches without redoing the codebase analysis).
- **Resume vs fresh:** resume when prior context is **mostly still valid**; start a **new session with a structured summary injected** when prior tool results are **stale** (files changed a lot). Resuming with stale tool results is unreliable.
- If resuming after limited code changes, **tell the agent exactly which files changed** so it re-analyzes those instead of re-exploring everything.
- **`/compact`** — compresses context during extended sessions when verbose discovery output fills the window.
- **Scratchpad files** — have Claude persist key findings to a file and reference it later, counteracting context degradation (symptom: Claude starts citing "typical patterns" instead of the specific classes it discovered earlier).

---

## Part 7: Practice Questions

**Q1.** Your team's coding standards live in your `~/.claude/CLAUDE.md` and work great for you. A new hire reports Claude ignores all the standards. Why?

A. The new hire's Claude Code version is outdated
B. User-level CLAUDE.md is not distributed via version control; the standards must move to project-level CLAUDE.md
C. The standards file exceeds the token limit
D. New hires must run /init before standards apply

**Answer: B.** `~/.claude/CLAUDE.md` applies only to that user's machine. Team standards belong at project level so git distributes them.

---

**Q2.** You want a codebase-analysis skill whose multi-thousand-line exploration output must not consume the main session's context. Which frontmatter option?

A. `allowed-tools: [Read, Grep]`
B. `context: fork`
C. `argument-hint: "path to analyze"`
D. `paths: ["src/**/*"]`

**Answer: B.** `context: fork` runs the skill in an isolated sub-agent context; only its result returns. A restricts tools, C prompts for args, D is rules frontmatter, not skills.

---

**Q3.** Terraform conventions should load only when editing infrastructure files, which all live under `terraform/`. Test conventions should load for `*.test.tsx` files scattered everywhere. Best setup?

A. Both in root CLAUDE.md with clear headers
B. A CLAUDE.md inside every directory that contains tests
C. Two `.claude/rules/` files with `paths: ["terraform/**/*"]` and `paths: ["**/*.test.tsx"]`
D. Two skills that developers invoke before editing

**Answer: C.** Glob-scoped rules load conditionally by path, handling both the single-subtree case and the scattered-file-type case. A always loads (wastes context, relies on inference); B can't track scattered tests maintainably; D isn't automatic.

---

**Q4.** You're asked to add a null-check to one function; the failing stack trace points to the exact line. Separately, you're asked to migrate the ORM across ~50 files with two viable target libraries. Choose the modes.

A. Plan mode for both
B. Direct execution for both
C. Direct execution for the null-check; plan mode for the migration
D. Plan mode for the null-check; direct execution for the migration

**Answer: C.** Well-scoped single-file fix → direct. Large-scale change + multiple valid approaches + architectural decision → plan mode first.

---

**Q5.** After a week away, you resume a named session about the payments module, but a teammate merged a large refactor of that module in the meantime. Best approach?

A. `--resume` the session and continue where you left off
B. `--resume` and ask Claude to ignore anything that looks outdated
C. Start a fresh session, injecting a structured summary of prior conclusions, and let Claude re-explore current code
D. `fork_session` to branch the old analysis

**Answer: C.** The prior tool results are stale; resuming (A/B) reasons over outdated file contents, and forking (D) copies the same stale baseline. Fresh session + injected summary is the documented pattern. (If only 2–3 files had changed, resuming and *naming those files* for targeted re-analysis would be acceptable.)

---

**Q6.** Claude keeps misinterpreting your prose description of a CSV transformation, producing inconsistent output each attempt. Most effective next step?

A. Rewrite the description with more precise technical language
B. Provide 2–3 concrete input/output example pairs demonstrating the transformation
C. Switch to a larger model
D. Ask Claude to explain its interpretation before coding

**Answer: B.** Concrete input/output examples are the stated most-effective technique when prose is interpreted inconsistently. (D — the interview pattern — is for surfacing unknown *design considerations*, not for pinning down a known transformation.)

---

## Key Takeaways Card
- Hierarchy: user `~/.claude/CLAUDE.md` (personal) → project `./CLAUDE.md` or `.claude/CLAUDE.md` (shared) → directory (subtree).
- Not shared with team? It's in user-level config.
- Scattered file types → glob rules beat directory CLAUDE.md.
- `context: fork` isolates verbose skills; `allowed-tools` restricts; `argument-hint` prompts.
- Plan mode: big/architectural/multiple-approaches. Direct: small, clear scope. Plan→execute combo for migrations.
- Prose fails → give 2–3 I/O examples. Unknown domain → interview pattern. Interacting bugs → one message.
- Stale context → fresh session + summary; valid context → `--resume`; comparisons → `fork_session`.
- `/memory` to debug loading; `/compact` to shrink context.

**Docs:** Memory/CLAUDE.md — https://code.claude.com/docs/en/memory · Claude Code overview — https://docs.claude.com/en/docs/claude-code/overview
