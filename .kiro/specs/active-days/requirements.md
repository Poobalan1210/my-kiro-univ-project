# Requirements — active-days

## Problem

"How many days did I actually work on this?" is not answerable from a commit
count. Fifty commits in one afternoon is one day of work. Existing tools report
commits, not days.

## User stories

1. As a builder, I want the number of distinct days I committed, so I can see
   consistency rather than volume.
2. As a builder in India, I want days bucketed in my own timezone, because a
   commit at 02:00 IST belongs to that day, not the previous UTC one.
3. As a builder, I want to bound the count to a date range, so a long-lived repo
   does not inflate a short challenge.

## Acceptance criteria

- Given a repo with 50 commits across 3 calendar days, the tool reports 3.
- Given `--tz Asia/Kolkata` and a commit at `2026-09-22T20:30:00Z`, that commit
  is counted against `2026-09-23`.
- Given `--since` and `--until`, commits outside the range are excluded.
- Given a path that is not a git repository, the tool exits non-zero with a
  message and no stack trace.

## Out of scope

Remote repositories. This reads local git history only.
