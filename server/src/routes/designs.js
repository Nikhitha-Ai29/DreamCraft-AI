const router = require('express').Router();
const pool = require('../db/pool');
const { auth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { getUploadedFileUrl } = require('../utils/upload-url');

// GET /api/designs - customer's own designs
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT dr.*, 
        (SELECT COUNT(*) FROM quotations q WHERE q.design_request_id=dr.id) as quotation_count,
        (SELECT JSON_ARRAYAGG(JSON_OBJECT(
          'id', gd.id, 'design_request_id', gd.design_request_id, 'customer_id', gd.customer_id,
          'prompt', gd.prompt, 'image_url', gd.image_url, 'provider', gd.provider,
          'is_saved', gd.is_saved, 'created_at', gd.created_at
        )) FROM generated_designs gd WHERE gd.design_request_id=dr.id) as generated_images
       FROM design_requests dr
       WHERE dr.customer_id=$1
       ORDER BY dr.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch designs' });
  }
});

// GET /api/designs/explore - artisans see open requests
router.get('/explore', auth, requireRole('artisan'), async (req, res) => {
  const { category, budget_max } = req.query;
  try {
    let q = `SELECT dr.*, u.name as customer_name, u.avatar_url as customer_avatar
             FROM design_requests dr
             JOIN users u ON u.id = dr.customer_id
             WHERE dr.status = 'open'`;
    const params = [];
    if (category) { params.push(category); q += ` AND dr.category=$${params.length}`; }
    if (budget_max) { params.push(budget_max); q += ` AND dr.budget_max<=$${params.length}`; }
    q += ' ORDER BY dr.created_at DESC LIMIT 50';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// POST /api/designs
router.post('/', auth, requireRole('customer'), async (req, res) => {
  const { title, description, category, budget_min, budget_max, colors, materials, style, pattern, reference_images } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Title and description required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO design_requests
       (customer_id, title, description, category, budget_min, budget_max, colors, materials, style, pattern, reference_images, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'draft') RETURNING *`,
      [req.user.id, title, description, category, budget_min, budget_max,
       colors || [], materials || [], style, pattern, reference_images || []]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create design request' });
  }
});

// GET /api/designs/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT dr.*, u.name as customer_name,
        (SELECT JSON_ARRAYAGG(JSON_OBJECT(
          'id', gd.id, 'design_request_id', gd.design_request_id, 'customer_id', gd.customer_id,
          'prompt', gd.prompt, 'image_url', gd.image_url, 'provider', gd.provider,
          'is_saved', gd.is_saved, 'created_at', gd.created_at
        )) FROM generated_designs gd WHERE gd.design_request_id=dr.id) as generated_images,
        (SELECT JSON_ARRAYAGG(JSON_OBJECT(
          'id', q.id, 'design_request_id', q.design_request_id, 'artisan_id', q.artisan_id,
          'customer_id', q.customer_id, 'amount', q.amount, 'estimated_days', q.estimated_days,
          'notes', q.notes, 'status', q.status, 'created_at', q.created_at, 'updated_at', q.updated_at
        )) FROM quotations q WHERE q.design_request_id=dr.id) as quotations
       FROM design_requests dr
       JOIN users u ON u.id=dr.customer_id
       WHERE dr.id=$1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Design not found' });
    const design = rows[0];
    if (design.customer_id !== req.user.id && req.user.role !== 'artisan' && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' });
    res.json(design);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch design' });
  }
});

// PUT /api/designs/:id
router.put('/:id', auth, requireRole('customer'), async (req, res) => {
  const { title, description, category, budget_min, budget_max, colors, materials, style, pattern, reference_images, status } = req.body;
  try {
    const check = await pool.query('SELECT customer_id FROM design_requests WHERE id=$1', [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ error: 'Not found' });
    if (check.rows[0].customer_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const { rows } = await pool.query(
      `UPDATE design_requests SET
       title=COALESCE($1,title), description=COALESCE($2,description),
       category=COALESCE($3,category), budget_min=COALESCE($4,budget_min),
       budget_max=COALESCE($5,budget_max), colors=COALESCE($6,colors),
       materials=COALESCE($7,materials), style=COALESCE($8,style),
       pattern=COALESCE($9,pattern), reference_images=COALESCE($10,reference_images),
       status=COALESCE($11,status), updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [title, description, category, budget_min, budget_max, colors, materials, style, pattern, reference_images, status, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// POST /api/designs/:id/images - upload reference images
router.post('/:id/images', auth, requireRole('customer'), upload.array('images', 5), async (req, res) => {
  try {
    const check = await pool.query('SELECT customer_id, reference_images FROM design_requests WHERE id=$1', [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ error: 'Not found' });
    if (check.rows[0].customer_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const newUrls = req.files.map(file => getUploadedFileUrl(req, file));
    const existing = check.rows[0].reference_images || [];
    const updated = [...existing, ...newUrls];

    const { rows } = await pool.query(
      'UPDATE design_requests SET reference_images=$1 WHERE id=$2 RETURNING *',
      [updated, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
