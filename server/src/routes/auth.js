const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');
const { normalizePhoneNumber } = require('../utils/phone');

const rollback = async (connection) => {
  try {
    await connection.query('ROLLBACK');
  } catch (error) {
    console.error('Transaction rollback failed:', error.code || error.name);
  }
};

const sign = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { name, email, password, role = 'customer' } = body;
  const phone = normalizePhoneNumber(req.body?.phone);
  if (typeof name !== 'string' || !name.trim() ||
      typeof email !== 'string' || !email.trim() ||
      typeof password !== 'string' || !password)
    return res.status(400).json({ error: 'Name, email and password are required' });
  if (!['customer', 'artisan'].includes(role))
    return res.status(400).json({ error: 'Role must be customer or artisan' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!phone) {
    return res.status(400).json({ error: 'A valid phone number with country code is required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    return res.status(400).json({ error: 'Enter a valid email address' });

  let connection;
  try {
    connection = await pool.connect();
  } catch (err) {
    console.error('Registration database connection failed:', err.code || err.name);
    return res.status(500).json({ error: 'Registration failed' });
  }
  try {
    await connection.query('BEGIN');
    const exists = await connection.query(
      'SELECT id FROM users WHERE email=$1 OR phone=$2 LIMIT 1',
      [email.trim().toLowerCase(), phone]
    );
    if (exists.rows.length) {
      await connection.query('ROLLBACK');
      return res.status(409).json({ error: 'Email or phone number is already registered' });
    }

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await connection.query(
      `INSERT INTO users (name, email, password_hash, role, phone)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, name, email, role, phone, created_at`,
      [name.trim(), email.trim().toLowerCase(), hash, role, phone]
    );
    const user = rows[0];

    if (role === 'artisan') {
      await connection.query('INSERT INTO artisan_profiles (user_id) VALUES ($1)', [user.id]);
    }

    await connection.query('COMMIT');
    res.status(201).json({ token: sign(user), user });
  } catch (err) {
    await rollback(connection);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email or phone number is already registered' });
    }
    console.error('Registration failed:', err.code || err.name);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    connection.release();
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || !email.trim() ||
      typeof password !== 'string' || !password)
    return res.status(400).json({ error: 'Email and password required' });

  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, password_hash, avatar_url, phone FROM users WHERE email=$1 AND is_active=true',
      [email.toLowerCase()]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const { password_hash, ...safe } = user;
    res.json({ token: sign(safe), user: safe });
  } catch (err) {
    console.error('Login failed:', err.code || err.name);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.phone, u.bio, u.location, u.created_at,
              ap.specializations, ap.skills, ap.experience_years, ap.price_range_min,
              ap.price_range_max, ap.is_available, ap.rating, ap.total_orders
       FROM users u
       LEFT JOIN artisan_profiles ap ON ap.user_id = u.id
       WHERE u.id=$1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/auth/profile
router.put('/profile', auth, async (req, res) => {
  const { name, phone, bio, location, avatar_url } = req.body;
  try {
    const existing = await pool.query('SELECT phone FROM users WHERE id=$1', [req.user.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'User not found' });
    const normalizedPhone = typeof phone === 'string' && phone.trim()
      ? normalizePhoneNumber(phone)
      : null;
    if (phone !== undefined && phone !== null &&
        (typeof phone !== 'string' || (phone.trim() && !normalizedPhone))) {
      return res.status(400).json({ error: 'Enter a valid phone number with country code' });
    }

    const { rows } = await pool.query(
      `UPDATE users SET name=COALESCE($1,name), phone=COALESCE($2,phone),
       bio=COALESCE($3,bio), location=COALESCE($4,location),
       avatar_url=COALESCE($5,avatar_url), updated_at=NOW()
       WHERE id=$6 RETURNING id, name, email, role, avatar_url, phone, bio, location`,
      [name, normalizedPhone, bio, location, avatar_url, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Profile update failed' });
  }
});

module.exports = router;
