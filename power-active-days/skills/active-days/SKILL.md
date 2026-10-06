---
name: active-days
description: Answer "how many days did I work on this repo", streak and consistency questions by calling the active_days MCP tool, and look up the default branch with default_branch. Use when the user asks about active days, commit days, streaks, or challenge activity in a git repository.
---

# Counting active days

A commit count measures volume. The question is usually consistency, so call
`active_days` rather than reading `git log` and counting by hand.

## Calling the tools

| Question | Call |
|---|---|
| "How many days did I work on this?" | `active_days` `{}` |
| "...during the challenge?" | `active_days` `{ "since": "2026-09-21", "until": "2026-10-06" }` |
| "...in UTC?" | `active_days` `{ "tz": "UTC" }` |
| "...in another repo?" | `active_days` `{ "path": "../other-repo" }` |
| "What's the default branch?" | `default_branch` `{}` |

`path` defaults to the directory the server runs in (the workspace). Only `UTC`
and `Asia/Kolkata` are supported. If the user is in another zone, say so rather
than picking one.

## Reading the result

`structuredContent` has `activeDays`, `commits`, `days` (ascending
`YYYY-MM-DD`), `tz` and `repo`.

- Report both numbers: "3 active days, 7 commits".
- A commit at or after 18:30 UTC is the next day in IST. When the UTC and IST
  counts differ, that boundary is the reason.
- `default_branch` with `source: "HEAD"` means `origin/HEAD` is not set, so the
  answer is the current branch, not necessarily the remote default. Say which.

## Without MCP

```bash
npx --package=github:Poobalan1210/my-kiro-univ-project active-days . --tz Asia/Kolkata
```
