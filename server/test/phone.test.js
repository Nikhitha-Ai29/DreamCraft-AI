const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePhoneNumber } = require('../src/utils/phone');

test('normalizes and validates international phone numbers with their country code', () => {
  assert.equal(normalizePhoneNumber('+1 415 555 2671'), '+14155552671');
  assert.equal(normalizePhoneNumber('+91 98765 43210'), '+919876543210');
  assert.equal(normalizePhoneNumber('4155552671'), null);
  assert.equal(normalizePhoneNumber('+999123456789'), null);
  assert.equal(normalizePhoneNumber('+1 23'), null);
});
