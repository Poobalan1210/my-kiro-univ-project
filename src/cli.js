#!/usr/bin/env node
const { readCommitDates } = require('./git');
const { bucketDays, offsetFor, ZONES } = require('./days');

function parseArgs(argv) {
  const out = { tz: 'Asia/Kolkata', since: null, until: null, cwd: process.cwd() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--tz') out.tz = argv[++i];
    else if (a === '--since') out.since = argv[++i];
    else if (a === '--until') out.until = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
    else if (!a.startsWith('-')) out.cwd = a;
  }
  return out;
}

function usage() {
  return [
    'active-days — distinct days a repo was committed to',
    '',
    'Usage: active-days [path] [--tz <zone>] [--since <date>] [--until <date>]',
    '',
    `Zones: ${Object.keys(ZONES).join(', ')}`,
    '',
    'Example:',
    '  active-days . --tz Asia/Kolkata --since 2026-09-21 --until 2026-10-06',
  ].join('\n');
}

function main(argv) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log(usage());
    return 0;
  }

  const offset = offsetFor(opts.tz);
  if (offset === null) {
    console.error(`unknown timezone: ${opts.tz} (known: ${Object.keys(ZONES).join(', ')})`);
    return 1;
  }

  const dates = readCommitDates(opts.cwd, { since: opts.since, until: opts.until });
  if (dates === null) {
    console.error(`not a git repository: ${opts.cwd}`);
    return 1;
  }

  const days = bucketDays(dates, offset);
  console.log(`${days.length} active day${days.length === 1 ? '' : 's'} (${opts.tz})`);
  console.log(`${dates.length} commit${dates.length === 1 ? '' : 's'}`);
  for (const d of days) console.log(`  ${d}`);
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { main, parseArgs };
