# Tasks — active-days

- [x] 1. `src/days.js` — pure bucketing
  - `bucketDays(isoList, offsetMinutes)` returns sorted distinct `YYYY-MM-DD`
  - Ignores unparseable entries rather than throwing
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 4.2_

- [x] 2. `src/git.js` — history reader
  - `readCommitDates(cwd, {since, until})` via `git log --pretty=format:%cI`
  - Returns `null` when the path is not a repo
  - _Requirements: 3.1, 4.1_

- [x] 3. `src/cli.js` — entry point
  - Flags: `--tz`, `--since`, `--until`
  - Exit 1 with a single line when not a repo
  - _Requirements: 2.4, 2.5, 4.1_

- [x] 4. Example tests — `test/days.test.js`
  - Bucketing across the IST midnight boundary (18:29Z vs 18:30Z)
  - Fifty commits on three days report 3
  - _Requirements: 1.3, 2.2_

- [x] 5. MCP tool server — `src/mcp-server.js`
  - `active_days` and `default_branch` over stdio, standard library only
  - `readDefaultBranch(cwd)` in `git.js`: origin/HEAD, else current branch
  - Registered in the reviewer agent's `mcpServers` and in `power-active-days/mcp.json`
  - [x] 5.1 Stdio integration test against a throwaway repo — `test/mcp.test.js`
  - _Requirements: 5.1–5.5, 3.1_

- [x] 6. Property-based tests — `test/properties.test.js`
  - P1–P8 from design.md, fast-check 4.10.2 (dev only), 500 runs each
  - _Requirements: 1.1–1.3, 2.1–2.4, 4.2_

- [x] 7. Hook — run `node --test` when a `.js` file under `src/` or `test/` is saved
  - `.kiro/hooks/run-tests-on-save.json`

- [x] 8. Custom agent — `.kiro/agents/active-days-reviewer.json`
  - Read + test + MCP only; no write tool; `git push`/`git commit`/`rm` denied

- [x] 9. Power — `power-active-days/`
  - `plugin.json`, `mcp.json` (server via npx from GitHub), `skills/active-days/SKILL.md`
