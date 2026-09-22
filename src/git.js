const { execFileSync } = require('node:child_process');

/**
 * The only place that spawns a process.
 *
 * Shells out to git rather than reading .git directly — git already handles
 * packed refs, shallow clones and worktrees, and reimplementing that is a lot
 * of work for no benefit.
 *
 * %cI is strict ISO-8601 with offset, so the caller needs no date heuristics.
 *
 * @returns {string[]|null} ISO timestamps, or null when cwd is not a repo
 */
function readCommitDates(cwd, { since, until } = {}) {
  const args = ['log', '--pretty=format:%cI'];
  if (since) args.push(`--since=${since}`);
  if (until) args.push(`--until=${until}`);

  try {
    const out = execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.split('\n').map((l) => l.trim()).filter(Boolean);
  } catch {
    // Not a repo, or git is unavailable. Caller turns this into an exit code —
    // a stack trace here would be noise for the user.
    return null;
  }
}

module.exports = { readCommitDates };
