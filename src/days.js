/**
 * Pure day bucketing. No git, no I/O — so the timezone boundary can be tested
 * without constructing a repository.
 */

/** Minutes offset for the timezones this tool supports. */
const ZONES = {
  UTC: 0,
  'Asia/Kolkata': 330, // +05:30, no DST
};

function offsetFor(tz) {
  return Object.prototype.hasOwnProperty.call(ZONES, tz) ? ZONES[tz] : null;
}

/**
 * Distinct calendar days covered by the given commit timestamps.
 *
 * A fixed millisecond shift is used rather than Intl.DateTimeFormat: the only
 * non-UTC zone here is Asia/Kolkata, which has no DST, so the shift is exact
 * and does not depend on ICU data being present. This would be wrong for a
 * DST-observing zone — see design.md.
 *
 * @param {string[]} isoList ISO-8601 timestamps
 * @param {number} offsetMinutes minutes east of UTC
 * @returns {string[]} sorted, distinct YYYY-MM-DD
 */
function bucketDays(isoList, offsetMinutes = 0) {
  if (!Array.isArray(isoList)) return [];
  const shift = offsetMinutes * 60 * 1000;
  const days = new Set();
  for (const iso of isoList) {
    const t = Date.parse(iso);
    // Unparseable entries are skipped rather than throwing: git output is
    // trusted but a truncated read should not take down the whole run.
    if (!Number.isFinite(t)) continue;
    days.add(new Date(t + shift).toISOString().slice(0, 10));
  }
  return [...days].sort();
}

module.exports = { bucketDays, offsetFor, ZONES };
