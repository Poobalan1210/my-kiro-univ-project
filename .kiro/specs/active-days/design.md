# Design — active-days

## Approach

Shell out to `git log` rather than parsing `.git` directly. Git already handles
packed refs, shallow clones and worktrees; reimplementing that is a large amount
of work for no gain.

```
git log --pretty=format:%cI [--since=…] [--until=…]
```

`%cI` gives strict ISO-8601 with offset, so no date parsing heuristics are
needed.

## Timezone bucketing

Offsets are applied as a fixed millisecond shift before taking the date part:

```js
new Date(Date.parse(iso) + offsetMs).toISOString().slice(0, 10)
```

Chosen over `Intl.DateTimeFormat` with a timeZone because the only timezone this
needs is `Asia/Kolkata`, which has no DST — a fixed shift is exact here and has
no dependency on ICU data being present in the runtime.

Trade-off recorded: this is wrong for zones that observe DST. If those are ever
needed, switch to `Intl.DateTimeFormat` and accept the ICU dependency. Property
P4 below checks the shift against the tz database for every instant 1970–2100.

## Module boundaries

| Module | Responsibility |
|---|---|
| `src/git.js` | Run git, return raw strings. The only place that spawns a process. |
| `src/days.js` | Pure: ISO strings + offset -> sorted distinct day list. |
| `src/cli.js` | Argument parsing, output, exit codes. |
| `src/mcp-server.js` | MCP stdio transport and the two tools. Calls `git.js` and `days.js`; spawns nothing itself. |

`days.js` is pure so the bucketing boundary can be tested without a repo.

## Error handling

`git.js` returns `null` when git exits non-zero. `cli.js` turns that into exit
code 1 and a one-line message. No stack traces reach the user.

## MCP tool server

Standard library only (`readline` + `JSON`), so `node src/mcp-server.js` starts
without an install step. One JSON-RPC message per line on stdin and stdout.

| Message | Response |
|---|---|
| `initialize` | The client's protocol version if supported (2024-11-05 … 2025-11-25), else the newest; `capabilities.tools` |
| `tools/list` | `active_days`, `default_branch` |
| `tools/call` | `content[0].text` = JSON, plus the same object as `structuredContent` |
| notifications | Never answered |
| anything else | `-32601` |

Invalid arguments are tool errors (`isError: true`), not protocol errors, so the
agent sees the message and can retry with a valid zone (5.4).

`default_branch` reads `git symbolic-ref refs/remotes/origin/HEAD`. That ref only
exists in clones — this repo was created locally and pushed, so it has none — so
it falls back to `symbolic-ref HEAD` and reports `source: "HEAD"`.

Registered in the reviewer agent's `mcpServers`
(`.kiro/agents/active-days-reviewer.json`) and in `power-active-days/mcp.json`,
which runs it via `npx` from GitHub for other repos.

## Correctness properties

Each is a `fast-check` property in `test/properties.test.js`, 500 runs each.

| # | Property | Validates |
|---|---|---|
| P1 | For any timestamps and zone, output is strictly ascending `YYYY-MM-DD`. | 1.2 |
| P2 | Duplicating and reversing the input does not change the output. | 1.1 |
| P3 | `1 ≤ days ≤ commits` for non-empty input; empty in, empty out. | 1.1, 1.3 |
| P4 | For every instant 1970–2100, the fixed-shift day equals the day `Intl.DateTimeFormat` gives for the IANA zone. | 2.1 |
| P5 | One instant written with any UTC offset from −12:00 to +14:00 lands on the same day. | 2.3 |
| P6 | The Asia/Kolkata day is the UTC day, or the next day exactly when UTC time of day ≥ 18:30. | 2.2 |
| P7 | Unparseable strings mixed into the input do not change the output. | 4.2 |
| P8 | Any string that is not a supported zone name, including `__proto__` and `constructor`, is rejected. | 2.4 |

P4 and P6 generators are biased towards ±60 s around 18:30Z, where an
off-by-one would otherwise hide. The MCP requirements (5.x) are covered by
example tests in `test/mcp.test.js` against a throwaway repo with commits at
10:00Z and 20:30Z.
