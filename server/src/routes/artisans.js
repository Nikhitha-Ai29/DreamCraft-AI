const router = require('express').Router();
const pool = require('../db/pool');
const { auth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { getUploadedFileUrl } = require('../utils/upload-url');

// GET /api/artisans - discover artisans
router.get('/', async (req, res) => {
  const { category, skill, min_budget, max_budget, available } = req.query;
  try {
    let q = `SELECT u.id, u.name, u.avatar_url, u.location,
              ap.specializations, ap.skills, ap.experience_years,
              ap.price_range_min, ap.price_range_max, ap.is_available,
              ap.rating, ap.total_orders, ap.portfolio_description,
              (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                'id', pi2.id, 'title', pi2.title, 'description', pi2.description,
                'media_url', pi2.media_url, 'media_type', pi2.media_type,
                'category', pi2.category, 'created_at', pi2.created_at, 'artisan_id', pi2.artisan_id
              )) FROM portfolio_items pi2 WHERE pi2.artisan_id=ap.id) as portfolio_preview
             FROM users u
             JOIN artisan_profiles ap ON ap.user_id=u.id
             WHERE u.is_active=true`;
    const params = [];
    if (available === 'true') q += ' AND ap.is_available=true';
    if (min_budget) { params.push(min_budget); q += ` AND ap.price_range_min>=$${params.length}`; }
    if (max_budget) { params.push(max_budget); q += ` AND ap.price_range_max<=$${params.length}`; }
    if (skill) { params.push(`%${skill.toLowerCase()}%`); q += ` AND LOWER(CAST(ap.skills AS CHAR)) LIKE $${params.length}`; }
    if (category) { params.push(`%${category.toLowerCase()}%`); q += ` AND LOWER(CAST(ap.specializations AS CHAR)) LIKE $${params.length}`; }
    q += ' ORDER BY ap.rating DESC, ap.total_orders DESC LIMIT 50';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch artisans' });
  }
});

// GET /api/artisans/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.avatar_url, u.location, u.bio, u.created_at,
              ap.specializations, ap.skills, ap.experience_years,
              ap.price_range_min, ap.price_range_max, ap.is_available,
              ap.rating, ap.total_orders, ap.portfolio_description,
              (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                'id', pi2.id, 'title', pi2.title, 'description', pi2.description,
                'media_url', pi2.media_url, 'media_type', pi2.media_type,
                'category', pi2.category, 'created_at', pi2.created_at, 'artisan_id', pi2.artisan_id
              ))
               FROM portfolio_items pi2 WHERE pi2.artisan_id=ap.id) as portfolio
       FROM users u
       JOIN artisan_profiles ap ON ap.user_id=u.id
       WHERE u.id=$1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Artisan not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch artisan' });
  }
});

// PUT /api/artisans/profile - update artisan profile
router.put('/profile', auth, requireRole('artisan'), async (req, res) => {
  const { specializations, skills, experience_years, price_range_min, price_range_max, is_available, portfolio_description } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE artisan_profiles SET
       specializations=COALESCE($1,specializations), skills=COALESCE($2,skills),
       experience_years=COALESCE($3,experience_years), price_range_min=COALESCE($4,price_range_min),
       price_range_max=COALESCE($5,price_range_max), is_available=COALESCE($6,is_available),
       portfolio_description=COALESCE($7,portfolio_description), updated_at=NOW()
       WHERE user_id=$8 RETURNING *`,
      [specializations, skills, experience_years, price_range_min, price_range_max, is_available, portfolio_description, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// POST /api/artisans/portfolio - add portfolio item
router.post('/portfolio', auth, requireRole('artisan'), upload.single('media'), async (req, res) => {
  const { title, description, category } = req.body;
  if (!title || !req.file) return res.status(400).json({ error: 'Title and media file required' });
  try {
    const ap = await pool.query('SELECT id FROM artisan_profiles WHERE user_id=$1', [req.user.id]);
    if (!ap.rows.length) return res.status(404).json({ error: 'Artisan profile not found' });

    const mediaUrl = getUploadedFileUrl(req, req.file);
    const mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';

    const { rows } = await pool.query(
      `INSERT INTO portfolio_items (artisan_id, title, description, media_url, media_type, category)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [ap.rows[0].id, title, description, mediaUrl, mediaType, category]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add portfolio item' });
  }
});

// DELETE /api/artisans/portfolio/:id
router.delete('/portfolio/:id', auth, requireRole('artisan'), async (req, res) => {
  try {
    const ap = await pool.query('SELECT id FROM artisan_profiles WHERE user_id=$1', [req.user.id]);
    await pool.query('DELETE FROM portfolio_items WHERE id=$1 AND artisan_id=$2', [req.params.id, ap.rows[0].id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
