---
inclusion: always
---

# Kiro University entry — project rules

## What this is

A small command-line tool that reports how many distinct days a git repository
was worked on, in a chosen timezone. Built for the AWS UG Madurai build-along.

## Conventions

- Node 20, no runtime dependencies. If a task seems to need a package, solve it
  with the standard library first.
- Every function that parses external input returns a value or `null` — never
  throws for bad input.
- Dates are handled as UTC internally and only converted for display.

## Scored artifacts — keep these committed

- `.kiro/steering/` — this file
- `.kiro/specs/<feature>/` — requirements, design, tasks, written before code
- `.kiro/hooks/` — at least one hook that actually fires
- `.kiro/settings/mcp.json` — at least one MCP server that is actually called

Never add a bare `.kiro` line to `.gitignore`. That hides the artifacts the
entry is scored on.

## Numbers, not adjectives

Record real numbers when they appear — timings, counts, sizes. Do not write
"fast" or "efficient" anywhere; write the measurement or write nothing.
