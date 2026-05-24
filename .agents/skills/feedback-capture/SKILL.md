---
name: feedback-capture
description: Automatically captures user feedback, corrections, and lessons learned into docs/LEARNINGS.md. Use whenever the user corrects a mistake, expresses dissatisfaction with code quality, or establishes a new convention. This ensures learnings persist across conversations.
---

# Feedback Capture

## When to Use — AUTO-DETECT these triggers

This skill activates **automatically** when any of these occur:

1. **User corrects your code** — "don't use `any`", "rename this variable", "that's wrong"
2. **User expresses dissatisfaction** — "this is ugly", "too verbose", "not what I wanted"
3. **User establishes a convention** — "always use X pattern", "never do Y"
4. **You discover a bug pattern** — a recurring issue that should be avoided
5. **User provides style preference** — "use arrow functions", "prefer interfaces over types"

## What to Capture

For each learning, record:
- **Date** — when it was discovered
- **Category** — `code-style`, `architecture`, `naming`, `testing`, `bug-pattern`, `convention`
- **Context** — what happened (brief)
- **Learning** — the rule to follow going forward
- **Applies to** — which service(s) or "all"

## How to Capture

**Step 1:** When a trigger is detected, immediately acknowledge it:
> "Noted — I'll add this to LEARNINGS.md so it persists."

**Step 2:** Append a new entry to `docs/LEARNINGS.md`:

```markdown
### 2026-05-16 — code-style
**Context:** User corrected use of `any` type in core-service controller
**Learning:** Never use `any`. Use proper TypeScript types or `unknown` with type guards.
**Applies to:** all Node.js services
```

**Step 3:** Follow the learning immediately in current and all future work.

## How to Read Learnings

At the **start of every task**, before writing any code:

1. Read `docs/LEARNINGS.md`
2. Check if any entries are relevant to the current task
3. Follow all applicable learnings

## Categories Reference

| Category | Examples |
|----------|---------|
| `code-style` | "Use arrow functions", "No semicolons", "Prefer const over let" |
| `architecture` | "Don't put business logic in controllers", "Keep services stateless" |
| `naming` | "Use camelCase for variables", "Prefix interfaces with I" |
| `testing` | "Always mock RabbitMQ", "Test edge cases first" |
| `bug-pattern` | "Always await async calls", "Check null before accessing nested props" |
| `convention` | "Use English for all code and comments", "Sort imports alphabetically" |

## DO NOT Capture

- One-time corrections that are obvious typos
- IDE-specific preferences (formatting handled by ESLint/Ruff)
- Requirements changes (those belong in PRD.md or TASK.md)
