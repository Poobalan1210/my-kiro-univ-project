# Tasks — active-days

- [x] 1. `src/days.js` — pure bucketing
  - `bucketDays(isoList, offsetMinutes)` returns sorted distinct `YYYY-MM-DD`
  - Ignores unparseable entries rather than throwing
  - _Requirements: 1, 2_

- [x] 2. `src/git.js` — history reader
  - `readCommitDates(cwd, {since, until})` via `git log --pretty=format:%cI`
  - Returns `null` when the path is not a repo
  - _Requirements: 3, 4_

- [x] 3. `src/cli.js` — entry point
  - Flags: `--tz`, `--since`, `--until`
  - Exit 1 with a single line when not a repo
  - _Requirements: 4_

- [x] 4. Tests
  - Bucketing across the IST midnight boundary (18:29Z vs 18:30Z)
  - Fifty commits on three days report 3
  - _Requirements: 1, 2_

- [ ] 5. Add an MCP-backed command that fetches the default branch name
  - _Requirements: deferred_
