# active-days

Reports how many **distinct days** a git repository was committed to, in a
chosen timezone. A commit count says fifty; this says three, which is usually
the number you actually wanted. Runs as a CLI and as an MCP server, so Kiro can
answer "how many days did I work on this?" with a tool call.

Built with Kiro for the AWS User Group Madurai Kiro University build-along.

## Usage

```bash
node src/cli.js . --tz Asia/Kolkata --since 2026-09-21 --until 2026-10-06
```

```
3 active days (Asia/Kolkata)
7 commits
  2026-09-21
  2026-09-22
  2026-09-23
```

MCP server (stdio only, no network listener): `node src/mcp-server.js`.
Tools: `active_days {path?, tz?, since?, until?}` and `default_branch {path?}`.

## Run the tests

```bash
npm install   # dev only: fast-check 4.10.2, pinned
node --test
```

19 tests, 158 ms on Node 24.19: 7 examples, 8 fast-check properties at 500 runs
each, 4 MCP tests including a real stdio round-trip. Auto-discovery is used
rather than `node --test test/` because Node 24 resolves a bare directory
argument as a module and fails with `MODULE_NOT_FOUND`.

## Why timezone handling is the interesting part

Git records UTC. Bucketing by the UTC date puts a commit made at 02:00 IST on
the *previous* day, so a builder in India loses a day from their count. The
boundary cases are covered in `test/days.test.js` — `18:29Z` and `18:30Z` on the
same date land on different IST days — and generalised by property P6.

## Known limits

- Two timezones only: `UTC` and `Asia/Kolkata`. Neither observes DST, which is
  what makes the fixed-offset approach exact (property P4 checks it against the
  tz database for 1970–2100). A DST zone would need `Intl.DateTimeFormat`; see
  `.kiro/specs/active-days/design.md`.
- Local history only. No remote or unpushed-branch awareness.

## How Kiro was used, lesson by lesson

| Lesson | Where | What it does |
|---|---|---|
| 1. Specs | `.kiro/specs/active-days/` | 5 requirements, 16 EARS acceptance criteria; design with the DST trade-off, MCP protocol table and 8 correctness properties; 9 tasks traced to criteria. |
| 2. Steering | `.kiro/steering/project.md` (always), `.kiro/steering/mcp-server.md` (fileMatch) | Conventions with good/bad code: argument-array process spawning, null instead of throw, numbers not adjectives. |
| 3. Hooks | `.kiro/hooks/run-tests-on-save.json`, `.kiro/hooks/kironomics.json` | Saving a `.js` file in `src/` or `test/` runs `node --test`. |
| 4. Property-based tests | `test/properties.test.js` | fast-check, P1–P8 from the design, each tagged with its requirement. |
| 5. Powers | Kironomics power, `power-active-days/` | Kironomics is installed and reports through its hook; this repo also ships its own power. |
| 6. MCP | `src/mcp-server.js` | Standard-library MCP stdio server, `active_days` and `default_branch` (completes task 5). |
| 7. Custom agents | `.kiro/agents/active-days-reviewer.json` | Reviewer: read, shell and `@active-days` only, no write tool; `git push`/`commit`/`reset` and `rm` denied; spec and steering preloaded; brings its own MCP server. Run `kiro-cli chat --agent active-days-reviewer`. |
| Bonus 2. Package a power | `power-active-days/` | `plugin.json`, `skills/active-days/SKILL.md`, `mcp.json` running the server via `npx` from this repo. Import: Powers panel → Add Custom Power → Import power from a folder. |
