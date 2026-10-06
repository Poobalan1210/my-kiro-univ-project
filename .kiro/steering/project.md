---
inclusion: always
---

# Kiro University entry — project rules

## What this is

A small command-line tool and MCP server that report how many distinct days a
git repository was worked on, in a chosen timezone. Built for the AWS UG Madurai
build-along.

## Conventions

- Node 20+ (developed on 24), no runtime dependencies. If a task seems to need a
  package, solve it with the standard library first. Dev-only test dependencies
  are allowed (`fast-check`), pinned to an exact version.
- Every function that parses external input returns a value or `null` — never
  throws for bad input.
- Dates are handled as UTC internally and only converted for display.
- Every new requirement gets an EARS line in `requirements.md` and either a
  property in `test/properties.test.js` or an example test.

## Spawn processes with an argument array

Run git through `runGit()` in `src/git.js`, which uses `execFileSync` with an
argument array, so that dates and paths supplied by a user or an MCP client can
never be read as shell syntax.

```js
// Good — `since` stays one argv entry, whatever it contains
execFileSync('git', ['log', `--since=${since}`], { cwd });

// Bad — `since = "x; rm -rf ~"` becomes a second command
execSync(`git log --since=${since}`, { cwd });
```

## Scored artifacts — keep these committed

- `.kiro/steering/` — this file, plus `mcp-server.md` (loaded for the server)
- `.kiro/specs/<feature>/` — requirements, design, tasks, written before code
- `.kiro/hooks/` — at least one hook that actually fires
- `.kiro/settings/mcp.json` — at least one MCP server that is actually called
- `.kiro/agents/` — the custom reviewer agent
- `power-active-days/` — the packaged power

Never add a bare `.kiro` line to `.gitignore`. That hides the artifacts the
entry is scored on.

## Numbers, not adjectives

Record real numbers when they appear — timings, counts, sizes. Do not write
"fast" or "efficient" anywhere; write the measurement or write nothing.
