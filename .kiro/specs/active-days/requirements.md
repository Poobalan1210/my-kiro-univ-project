# Requirements — active-days

## Introduction

"How many days did I actually work on this?" is not answerable from a commit
count. Fifty commits in one afternoon is one day of work. active-days reports
distinct days, in the builder's timezone, from the command line and over MCP.

## Glossary

- **Active day** — a calendar date, in the selected timezone, with at least one commit.
- **Supported zone** — `UTC` or `Asia/Kolkata`. Neither observes DST.
- **Tool server** — `src/mcp-server.js`, the MCP stdio server.

## Requirement 1 — Count days, not commits

**User story:** As a builder, I want the number of distinct days I committed,
so I can see consistency rather than volume.

1. WHEN the history has several commits on the same local date THE SYSTEM SHALL count that date once.
2. WHEN days are reported THE SYSTEM SHALL list them as `YYYY-MM-DD`, ascending, without duplicates.
3. WHEN a repository has 50 commits across 3 calendar days THE SYSTEM SHALL report 3 active days and 50 commits.

## Requirement 2 — Bucket in the builder's timezone

**User story:** As a builder in India, I want days bucketed in my own timezone,
because a commit at 02:00 IST belongs to that day, not the previous UTC one.

1. WHEN `--tz Asia/Kolkata` is given THE SYSTEM SHALL assign each commit to its date at UTC+05:30.
2. WHEN a commit is at or after 18:30 UTC THE SYSTEM SHALL assign it to the next calendar day in Asia/Kolkata (`2026-09-22T20:30:00Z` → `2026-09-23`).
3. WHEN two timestamps denote the same instant with different UTC offsets THE SYSTEM SHALL assign them to the same day.
4. IF the timezone is not a supported zone THEN THE SYSTEM SHALL reject it with a message listing the supported zones, rather than defaulting.
5. WHEN no timezone is given THE SYSTEM SHALL use Asia/Kolkata.

## Requirement 3 — Bound to a date range

**User story:** As a builder, I want to bound the count to a date range, so a
long-lived repo does not inflate a short challenge.

1. WHEN `--since` and/or `--until` are given THE SYSTEM SHALL exclude commits outside the range.

## Requirement 4 — Fail cleanly

**User story:** As a builder, I want clear failures, so a typo in a path does
not produce a stack trace.

1. IF the path is not a git repository THEN THE SYSTEM SHALL exit with code 1 and a one-line message, with no stack trace.
2. IF a timestamp cannot be parsed THEN THE SYSTEM SHALL skip it and count the rest.

## Requirement 5 — Answer from inside Kiro (MCP)

**User story:** As a builder chatting with Kiro, I want to ask "how many days
did I work on this?" and have Kiro call a tool for the answer, instead of
reading `git log` and guessing.

1. THE tool server SHALL speak MCP over stdio (newline-delimited JSON-RPC 2.0) and write nothing but protocol messages to stdout.
2. WHEN `tools/call` invokes `active_days` THE tool server SHALL return the days and counts the CLI reports for the same arguments, as JSON text and as `structuredContent`.
3. WHEN `tools/call` invokes `default_branch` THE tool server SHALL return the branch `origin/HEAD` points to, or the current branch when `origin/HEAD` is not set, together with which source was used.
4. IF tool arguments are invalid (unknown zone, non-string value, not a repository) THEN THE tool server SHALL return a result with `isError: true` and a one-line message, and keep running.
5. IF the tool name or method is unknown THEN THE tool server SHALL return a JSON-RPC error (`-32602` / `-32601`).

## Out of scope

Remote repositories. DST-observing zones.
