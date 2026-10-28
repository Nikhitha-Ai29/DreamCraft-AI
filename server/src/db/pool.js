const mysql = require('mysql2/promise');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'dreamcraft',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'dreamcraft_ai',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
});

const replacePostgresPlaceholders = (sql, params) => {
  const values = [];
  const converted = sql.replace(/\$(\d+)/g, (_match, index) => {
    values.push(params[Number(index) - 1]);
    return '?';
  });
  return {
    sql: converted,
    values: values.map((value) => {
      if (value === undefined) return null;
      if (Array.isArray(value)) return JSON.stringify(value);
      return value;
    }),
  };
};

const prepareQuery = (sql, params = []) => {
  let query = sql.trim();
  let returning;
  const returningMatch = query.match(/\s+RETURNING\s+([\w*,\s]+)$/i);
  if (returningMatch) {
    returning = returningMatch[1].trim();
    query = query.slice(0, returningMatch.index).trim();
  }

  let insertedId;
  const insertMatch = query.match(/^(INSERT(?:\s+IGNORE)?\s+INTO\s+)([a-z_]\w*)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (insertMatch && !/(^|,)\s*id\s*(,|$)/i.test(insertMatch[3])) {
    insertedId = randomUUID();
    const columns = `${insertMatch[3]}, id`;
    const values = `${insertMatch[4]}, $${params.length + 1}`;
    query = query.replace(insertMatch[0], `${insertMatch[1]}${insertMatch[2]} (${columns}) VALUES (${values})`);
    params = [...params, insertedId];
  }

  query = query.replace(/\s+ON\s+CONFLICT\s+DO\s+NOTHING\s*$/i, '');
  if (/^INSERT\s+INTO\b/i.test(query) && /ON\s+CONFLICT\s+DO\s+NOTHING/i.test(sql)) {
    query = query.replace(/^INSERT\s+INTO\b/i, 'INSERT IGNORE INTO');
  }

  const binding = replacePostgresPlaceholders(query, params);
  return { ...binding, returning, insertedId, originalQuery: query };
};

const queryWith = async (connection, sql, params = []) => {
  const prepared = prepareQuery(sql, params);
  const [result] = await connection.query(prepared.sql, prepared.values);

  if (prepared.returning && prepared.insertedId) {
    const table = prepared.originalQuery.match(/^INSERT(?:\s+IGNORE)?\s+INTO\s+([a-z_]\w*)/i)?.[1];
    const [rows] = await connection.query(
      `SELECT ${prepared.returning} FROM \`${table}\` WHERE id = ?`,
      [prepared.insertedId]
    );
    return { rows, rowCount: result.affectedRows };
  }

  if (prepared.returning) {
    const updateMatch = prepared.originalQuery.match(/^UPDATE\s+([a-z_]\w*)\s+SET[\s\S]+?\s+WHERE\s+([\s\S]+)$/i);
    if (updateMatch) {
      const predicate = replacePostgresPlaceholders(updateMatch[2], params);
      const [rows] = await connection.query(
        `SELECT ${prepared.returning} FROM \`${updateMatch[1]}\` WHERE ${predicate.sql}`,
        predicate.values
      );
      return { rows, rowCount: result.affectedRows };
    }
  }

  if (Array.isArray(result)) return { rows: result, rowCount: result.length };
  return { rows: [], rowCount: result.affectedRows || 0 };
};

const queryPool = pool.query.bind(pool);
pool.query = (sql, params) => queryWith({ query: queryPool }, sql, params);
pool.connect = async () => {
  const connection = await pool.getConnection();
  return {
    query: (sql, params) => queryWith(connection, sql, params),
    release: () => connection.release(),
  };
};

pool.on('error', (err) => console.error('MySQL pool error:', err.code || 'unknown error'));

module.exports = pool;
module.exports.prepareQuery = prepareQuery;
module.exports.replacePostgresPlaceholders = replacePostgresPlaceholders;
