/**
 * Property-based tests for the correctness properties in
 * .kiro/specs/active-days/design.md ("Correctness properties", P1-P8).
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fc = require('fast-check');
const { bucketDays, offsetFor, ZONES } = require('../src/days');

const RUNS = { numRuns: 500 };
const DAY = 86_400_000;
const MIN = Date.UTC(1970, 0, 1);
const MAX = Date.UTC(2100, 0, 1);
const IST_MIDNIGHT_UTC = (18 * 60 + 30) * 60_000; // 18:30Z is 00:00 IST

// --- generators -----------------------------------------------------------

const instant = fc.integer({ min: MIN, max: MAX });
const zoneName = fc.constantFrom(...Object.keys(ZONES));
const zoneOffset = fc.constantFrom(...Object.values(ZONES));
// Real-world UTC offsets, -12:00 to +14:00 in 15-minute steps.
const utcOffset = fc.integer({ min: -48, max: 56 }).map((q) => q * 15);
// Bias towards the IST midnight boundary, where an off-by-one would hide.
const nearIstMidnight = fc
  .tuple(fc.integer({ min: 0, max: 47_000 }), fc.integer({ min: -60_000, max: 60_000 }))
  .map(([day, delta]) => day * DAY + IST_MIDNIGHT_UTC + delta);

const pad = (n) => String(n).padStart(2, '0');

/** The same instant written the way `git log --pretty=%cI` writes it. */
function withOffset(ms, offsetMinutes) {
  const wall = new Date(ms + offsetMinutes * 60_000).toISOString().slice(0, 19);
  const abs = Math.abs(offsetMinutes);
  return `${wall}${offsetMinutes < 0 ? '-' : '+'}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

const utcIso = instant.map((ms) => new Date(ms).toISOString());
const gitIso = fc.tuple(instant, utcOffset).map(([ms, off]) => withOffset(ms, off));
const anyIso = fc.oneof(utcIso, gitIso);
const junk = fc.string().filter((s) => Number.isNaN(Date.parse(s)));

// Oracle for P4: the IANA tz database, independent of the fixed-shift code.
const FORMATTERS = Object.fromEntries(
  Object.keys(ZONES).map((tz) => [
    tz,
    new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }),
  ]),
);
function intlDay(ms, tz) {
  const p = Object.fromEntries(FORMATTERS[tz].formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

const nextDay = (ymd) => new Date(Date.parse(`${ymd}T00:00:00Z`) + DAY).toISOString().slice(0, 10);

// --- properties -----------------------------------------------------------

test('P1 (1.2): output is strictly ascending YYYY-MM-DD', () => {
  fc.assert(
    fc.property(fc.array(anyIso), zoneOffset, (xs, off) => {
      const out = bucketDays(xs, off);
      for (const d of out) assert.match(d, /^\d{4}-\d{2}-\d{2}$/);
      for (let i = 1; i < out.length; i++) assert.ok(out[i - 1] < out[i], `${out[i - 1]} !< ${out[i]}`);
    }),
    RUNS,
  );
});

test('P2 (1.1): duplicating and reordering commits does not change the days', () => {
  fc.assert(
    fc.property(fc.array(anyIso), zoneOffset, (xs, off) => {
      assert.deepEqual(bucketDays([...xs, ...xs].reverse(), off), bucketDays(xs, off));
    }),
    RUNS,
  );
});

test('P3 (1.1, 1.3): 1 <= days <= commits for any non-empty history', () => {
  fc.assert(
    fc.property(fc.array(anyIso), zoneOffset, (xs, off) => {
      const n = bucketDays(xs, off).length;
      if (xs.length === 0) assert.equal(n, 0);
      else assert.ok(n >= 1 && n <= xs.length, `${n} days from ${xs.length} commits`);
    }),
    RUNS,
  );
});

test('P4 (2.1): the fixed offset agrees with the tz database for 1970-2100', () => {
  fc.assert(
    fc.property(fc.oneof(instant, nearIstMidnight), zoneName, (ms, tz) => {
      assert.deepEqual(bucketDays([new Date(ms).toISOString()], ZONES[tz]), [intlDay(ms, tz)]);
    }),
    RUNS,
  );
});

test('P5 (2.3): the same instant written with any UTC offset lands on the same day', () => {
  fc.assert(
    fc.property(instant, utcOffset, zoneOffset, (ms, written, off) => {
      assert.deepEqual(bucketDays([withOffset(ms, written)], off), bucketDays([new Date(ms).toISOString()], off));
    }),
    RUNS,
  );
});

test('P6 (2.2): the IST day is the UTC day, or the next one from 18:30Z', () => {
  fc.assert(
    fc.property(fc.oneof(instant, nearIstMidnight), (ms) => {
      const iso = new Date(ms).toISOString();
      const [utc] = bucketDays([iso], ZONES.UTC);
      const [ist] = bucketDays([iso], ZONES['Asia/Kolkata']);
      assert.equal(ist, ms % DAY >= IST_MIDNIGHT_UTC ? nextDay(utc) : utc);
    }),
    RUNS,
  );
});

test('P7 (4.2): unparseable entries never change the result', () => {
  fc.assert(
    fc.property(fc.array(anyIso), fc.array(junk), zoneOffset, (good, bad, off) => {
      assert.deepEqual(bucketDays([...bad, ...good, ...bad], off), bucketDays(good, off));
    }),
    RUNS,
  );
});

test('P8 (2.4): anything that is not a supported zone name is rejected', () => {
  const inherited = fc.constantFrom('__proto__', 'constructor', 'toString', 'hasOwnProperty', 'utc', 'IST');
  fc.assert(
    fc.property(
      fc.oneof(fc.string(), inherited).filter((s) => !Object.hasOwn(ZONES, s)),
      (s) => assert.equal(offsetFor(s), null),
    ),
    RUNS,
  );
});
