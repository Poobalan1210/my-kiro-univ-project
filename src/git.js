const { execFileSync } = require('node:child_process');

/**
 * The only place that spawns a process.
 *
 * Shells out to git rather than reading .git directly — git already handles
 * packed refs, shallow clones and worktrees, and reimplementing that is a lot
 * of work for no benefit.
 *
 * Always an argument array, never a shell string, so a date or path supplied
 * by a user or an MCP client cannot become a second command.
 *
 * @returns {string|null} trimmed stdout, or null when git exits non-zero or is
 *   not installed
 */
function runGit(cwd, args) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    // Not a repo, or git is unavailable. Callers turn this into an exit code
    // or a tool error — a stack trace here would be noise for the user.
    return null;
  }
}

/**
 * %cI is strict ISO-8601 with offset, so the caller needs no date heuristics.
 *
 * @returns {string[]|null} ISO timestamps, or null when cwd is not a repo
 */
function readCommitDates(cwd, { since, until } = {}) {
  const args = ['log', '--pretty=format:%cI'];
  if (since) args.push(`--since=${since}`);
  if (until) args.push(`--until=${until}`);

  const out = runGit(cwd, args);
  if (out === null) return null;
  return out.split('\n').map((l) => l.trim()).filter(Boolean);
}

/**
 * The branch origin/HEAD points at, else the current branch.
 *
 * origin/HEAD only exists in clones (or after `git remote set-head origin -a`),
 * so a repo created locally and pushed later has none. The current branch is
 * the useful answer then, and `source` says which one was used.
 *
 * @returns {{branch: string, source: 'origin/HEAD'|'HEAD'}|null} null when cwd
 *   is not a repo, or HEAD is detached and origin/HEAD is unset
 */
function readDefaultBranch(cwd) {
  const remote = runGit(cwd, ['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD']);
  if (remote) return { branch: remote.replace(/^origin\//, ''), source: 'origin/HEAD' };

  const local = runGit(cwd, ['symbolic-ref', '--quiet', '--short', 'HEAD']);
  if (local) return { branch: local, source: 'HEAD' };

  return null;
}

module.exports = { readCommitDates, readDefaultBranch };
