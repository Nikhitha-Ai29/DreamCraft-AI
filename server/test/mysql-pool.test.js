const test = require('node:test');
const assert = require('node:assert/strict');
const {
  prepareQuery,
  replacePostgresPlaceholders,
} = require('../src/db/pool');

test('reorders PostgreSQL-style parameters into MySQL positional bindings', () => {
  const prepared = replacePostgresPlaceholders(
    'SELECT * FROM users WHERE id=$2 OR email=$1',
    ['person@example.invalid', 'user-id']
  );
  assert.equal(prepared.sql, 'SELECT * FROM users WHERE id=? OR email=?');
  assert.deepEqual(prepared.values, ['user-id', 'person@example.invalid']);
});

test('serializes JSON array parameters and maps undefined to SQL NULL', () => {
  const prepared = replacePostgresPlaceholders(
    'UPDATE design_requests SET colors=$1, title=$2',
    [['blue', 'gold'], undefined]
  );
  assert.deepEqual(prepared.values, ['["blue","gold"]', null]);
});

test('adds an application-generated UUID to inserts with RETURNING', () => {
  const prepared = prepareQuery(
    'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email',
    ['Customer', 'customer@example.invalid']
  );
  assert.match(prepared.sql, /^INSERT INTO users \(name, email, id\) VALUES \(\?, \?, \?\)$/);
  assert.equal(prepared.returning, 'id, name, email');
  assert.match(prepared.insertedId, /^[0-9a-f-]{36}$/i);
  assert.deepEqual(prepared.values, ['Customer', 'customer@example.invalid', prepared.insertedId]);
});

test('preserves update conditions for the MySQL follow-up SELECT used by RETURNING', () => {
  const prepared = prepareQuery(
    'UPDATE users SET name=$1 WHERE id=$2 RETURNING id, name, email',
    ['Updated Name', 'user-id']
  );
  assert.equal(prepared.sql, 'UPDATE users SET name=? WHERE id=?');
  assert.equal(prepared.returning, 'id, name, email');
  assert.deepEqual(prepared.values, ['Updated Name', 'user-id']);
});

test('converts PostgreSQL ON CONFLICT DO NOTHING into MySQL INSERT IGNORE', () => {
  const prepared = prepareQuery(
    'INSERT INTO chat_conversations (customer_id, order_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    ['customer-id', 'order-id']
  );
  assert.match(prepared.sql, /^INSERT IGNORE INTO chat_conversations/);
  assert.doesNotMatch(prepared.sql, /ON CONFLICT/i);
});
