const router = require('express').Router();
const pool = require('../db/pool');
const { auth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { getUploadedFileUrl } = require('../utils/upload-url');

const ORDER_STATUSES = [
  'design_submitted','awaiting_quotation','quotation_received','order_confirmed',
  'in_production','quality_check','ready_for_dispatch','shipped','delivered','cancelled'
];
const AWAITING_ARTISAN_CONFIRMATION = 'awaiting_artisan_confirmation';

// GET /api/orders
router.get('/', auth, async (req, res) => {
  try {
    const field = req.user.role === 'artisan' ? 'o.artisan_id' : 'o.customer_id';
    const { rows } = await pool.query(
      `SELECT o.*, 
              c.name as customer_name, c.avatar_url as customer_avatar,
              a.name as artisan_name, a.avatar_url as artisan_avatar,
              dr.title as design_title, dr.category, dr.reference_images
       FROM orders o
       JOIN users c ON c.id=o.customer_id
       JOIN users a ON a.id=o.artisan_id
       JOIN design_requests dr ON dr.id=o.design_request_id
       WHERE ${field}=$1 ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.*,
              c.name as customer_name, c.avatar_url as customer_avatar,
              a.name as artisan_name, a.avatar_url as artisan_avatar,
              dr.title as design_title, dr.description as design_description,
              dr.category, dr.reference_images, dr.colors, dr.materials,
              cc.id as conversation_id,
              (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                'id', pu.id, 'order_id', pu.order_id, 'artisan_id', pu.artisan_id,
                'stage', pu.stage, 'caption', pu.caption, 'media_urls', pu.media_urls,
                'media_type', pu.media_type, 'created_at', pu.created_at
              ))
               FROM production_updates pu WHERE pu.order_id=o.id) as production_updates
       FROM orders o
       JOIN users c ON c.id=o.customer_id
       JOIN users a ON a.id=o.artisan_id
       JOIN design_requests dr ON dr.id=o.design_request_id
       LEFT JOIN chat_conversations cc ON cc.order_id=o.id
       WHERE o.id=$1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    const order = rows[0];
    if (order.customer_id !== req.user.id && order.artisan_id !== req.user.id)
      return res.status(403).json({ error: 'Forbidden' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PUT /api/orders/:id/confirm - selected artisan confirms a customer's order request
router.put('/:id/confirm', auth, requireRole('artisan'), async (req, res) => {
  let connection;
  try {
    connection = await pool.connect();
    await connection.query('BEGIN');
    const { rows } = await connection.query(
      'SELECT id, customer_id, design_request_id, status FROM orders WHERE id=$1 AND artisan_id=$2 FOR UPDATE',
      [req.params.id, req.user.id]
    );
    if (!rows.length) {
      await connection.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }
    if (rows[0].status !== AWAITING_ARTISAN_CONFIRMATION) {
      await connection.query('ROLLBACK');
      return res.status(409).json({ error: 'This order is not awaiting your confirmation' });
    }

    const { rows: updated } = await connection.query(
      `UPDATE orders SET status='order_confirmed', updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    await connection.query(
      `UPDATE design_requests SET status='in_progress', updated_at=NOW()
       WHERE id=$1`,
      [rows[0].design_request_id]
    );
    await connection.query(
      `INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
       VALUES ($1,'order','Order Confirmed','The artisan confirmed your order.',$2,'order')`,
      [rows[0].customer_id, req.params.id]
    );
    await connection.query('COMMIT');
    res.json(updated[0]);
  } catch (err) {
    if (connection) {
      try {
        await connection.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Order confirmation rollback failed:', rollbackError.code || rollbackError.name);
      }
    }
    console.error('Order confirmation failed:', err.code || err.name);
    res.status(500).json({ error: 'Failed to confirm order' });
  } finally {
    connection?.release();
  }
});

// PUT /api/orders/:id/status - artisan updates status
router.put('/:id/status', auth, requireRole('artisan'), async (req, res) => {
  const { status, notes } = req.body;
  if (!ORDER_STATUSES.includes(status) || status === 'order_confirmed')
    return res.status(400).json({ error: 'Invalid status' });
  try {
    const check = await pool.query(
      'SELECT customer_id, status FROM orders WHERE id=$1 AND artisan_id=$2',
      [req.params.id, req.user.id]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Order not found' });
    if (check.rows[0].status === AWAITING_ARTISAN_CONFIRMATION)
      return res.status(409).json({ error: 'Confirm the order before updating its status' });

    const { rows } = await pool.query(
      'UPDATE orders SET status=$1, notes=COALESCE($2,notes), updated_at=NOW() WHERE id=$3 RETURNING *',
      [status, notes, req.params.id]
    );

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
       VALUES ($1,'order_update','Order Status Updated',$2,$3,'order')`,
      [check.rows[0].customer_id, `Your order status is now: ${status.replace(/_/g,' ')}`, req.params.id]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Status update failed' });
  }
});

// POST /api/orders/:id/production-update - artisan posts making story
router.post('/:id/production-update', auth, requireRole('artisan'), upload.array('media', 5), async (req, res) => {
  const { stage, caption } = req.body;
  if (!stage) return res.status(400).json({ error: 'Stage required' });
  try {
    const check = await pool.query('SELECT customer_id FROM orders WHERE id=$1 AND artisan_id=$2', [req.params.id, req.user.id]);
    if (!check.rows.length) return res.status(404).json({ error: 'Order not found' });

    const mediaUrls = (req.files || []).map(file => getUploadedFileUrl(req, file));
    const mediaType = req.files?.[0]?.mimetype?.startsWith('video') ? 'video' : 'image';

    const { rows } = await pool.query(
      `INSERT INTO production_updates (order_id, artisan_id, stage, caption, media_urls, media_type)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, req.user.id, stage, caption, mediaUrls, mediaType]
    );

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
       VALUES ($1,'production','New Making Story','Your artisan shared a production update',$2,'order')`,
      [check.rows[0].customer_id, req.params.id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to post update' });
  }
});

module.exports = router;
