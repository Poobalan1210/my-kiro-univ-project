const assert = require('node:assert/strict');
const { test } = require('node:test');
const { bucketDays, offsetFor } = require('../src/days');

const IST = 330;

test('fifty commits across three days report three', () => {
  const iso = [];
  for (let i = 0; i < 50; i++) {
    const day = 21 + (i % 3);
    iso.push(`2026-09-${day}T10:00:0${i % 10}Z`);
  }
  assert.equal(bucketDays(iso, IST).length, 3);
});

test('IST midnight boundary: 18:29Z is the same day, 18:30Z is the next', () => {
  assert.deepEqual(bucketDays(['2026-09-22T18:29:00Z'], IST), ['2026-09-22']);
  assert.deepEqual(bucketDays(['2026-09-22T18:30:00Z'], IST), ['2026-09-23']);
});

test('a 02:00 IST commit belongs to that day, not the previous UTC one', () => {
  // 2026-09-22T20:30:00Z is 2026-09-23 02:00 IST
  assert.deepEqual(bucketDays(['2026-09-22T20:30:00Z'], IST), ['2026-09-23']);
  assert.deepEqual(bucketDays(['2026-09-22T20:30:00Z'], 0), ['2026-09-22']);
});

test('unparseable entries are skipped, not thrown', () => {
  assert.deepEqual(bucketDays(['nonsense', '', '2026-09-21T00:00:00Z'], IST), ['2026-09-21']);
});

test('non-array input yields no days', () => {
  assert.deepEqual(bucketDays(null, IST), []);
});

test('output is sorted and distinct', () => {
  const out = bucketDays(
    ['2026-09-23T05:00:00Z', '2026-09-21T05:00:00Z', '2026-09-21T06:00:00Z'],
    IST,
  );
  assert.deepEqual(out, ['2026-09-21', '2026-09-23']);
});

test('unknown timezone is rejected rather than defaulted', () => {
  assert.equal(offsetFor('Mars/Olympus'), null);
  assert.equal(offsetFor('Asia/Kolkata'), 330);
});
