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
needed, switch to `Intl.DateTimeFormat` and accept the ICU dependency.

## Module boundaries

| Module | Responsibility |
|---|---|
| `src/git.js` | Run git, return raw ISO strings. The only place that spawns a process. |
| `src/days.js` | Pure: ISO strings + offset -> sorted distinct day list. |
| `src/cli.js` | Argument parsing, output, exit codes. |

`days.js` is pure so the bucketing boundary can be tested without a repo.

## Error handling

`git.js` returns `null` when git exits non-zero. `cli.js` turns that into exit
code 1 and a one-line message. No stack traces reach the user.
