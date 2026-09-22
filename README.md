# active-days

Reports how many **distinct days** a git repository was committed to, in a
chosen timezone. A commit count says fifty; this says three, which is usually
the number you actually wanted.

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

## Run the tests

```bash
node --test
```

7 tests, no dependencies. Auto-discovery is used rather than `node --test test/`
because Node 24 resolves a bare directory argument as a module and fails with
`MODULE_NOT_FOUND`.

## Why timezone handling is the interesting part

Git records UTC. Bucketing by the UTC date puts a commit made at 02:00 IST on
the *previous* day, so a builder in India loses a day from their count. The
boundary cases are covered in `test/days.test.js` — `18:29Z` and `18:30Z` on the
same date land on different IST days.

## Known limits

- Two timezones only: `UTC` and `Asia/Kolkata`. Neither observes DST, which is
  what makes the fixed-offset approach exact. A DST zone would need
  `Intl.DateTimeFormat`; see `.kiro/specs/active-days/design.md`.
- Local history only. No remote or unpushed-branch awareness.
- Task 5 in `.kiro/specs/active-days/tasks.md` (MCP-backed branch lookup) is not
  done.

## How Kiro was used

- `.kiro/steering/project.md` — conventions applied on every turn, including the
  "numbers, not adjectives" rule this README follows.
- `.kiro/specs/active-days/` — requirements and design written before any code.
  The DST trade-off was decided in design, not discovered later.
- `.kiro/settings/mcp.json` — git MCP server, for task 5.
- `.kiro/hooks/kironomics.json` — reports session activity to the user group
  leaderboard.
