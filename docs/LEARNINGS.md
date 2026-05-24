# LEARNINGS — AI Coding Feedback Log

> **Purpose:** This file captures lessons learned, user feedback, and coding conventions discovered during development. AI agents MUST read this file at the start of each task and follow all entries.

---

## How to Use

- Entries are added automatically when the user corrects a mistake or provides feedback
- Each entry has: date, category, description, and the rule to follow going forward
- Categories: `code-style`, `architecture`, `naming`, `testing`, `bug-pattern`, `convention`

---

## Entries

### 2026-05-21 — bug-pattern
**Context:** After rebuild/recreate of back-end services (e.g. `core-service`) using `docker compose up --build`, the container IPs change. However, Nginx (`api-gateway`) caches the old IPs of upstreams, causing `502 Bad Gateway` (Connection refused) errors.
**Learning:** Always restart `api-gateway` (or run `docker compose restart api-gateway`) after rebuilding backend services to clear Nginx DNS cache.
**Applies to:** Docker infrastructure / Nginx gateway


<!-- 
Template for new entries:

### [DATE] — [CATEGORY]
**Context:** What happened
**Learning:** The rule to follow going forward
**Applies to:** Which service(s) or "all"
-->
