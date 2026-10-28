const router = require('express').Router();
const pool = require('../db/pool');
const { auth, requireRole } = require('../middleware/auth');

// POST /api/quotations - artisan sends quotation
router.post('/', auth, requireRole('artisan'), async (req, res) => {
  const { design_request_id, amount, estimated_days, notes } = req.body;
  if (!design_request_id || !Number.isFinite(Number(amount)) || Number(amount) <= 0 ||
      !Number.isInteger(Number(estimated_days)) || Number(estimated_days) <= 0)
    return res.status(400).json({ error: 'Provide a design request, positive amount, and positive delivery days' });
  try {
    const dr = await pool.query(
      'SELECT customer_id FROM design_requests WHERE id=$1 AND status=$2',
      [design_request_id, 'open']
    );
    if (!dr.rows.length) return res.status(404).json({ error: 'Design request not found' });

    const { rows } = await pool.query(
      `INSERT INTO quotations (design_request_id, artisan_id, customer_id, amount, estimated_days, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [design_request_id, req.user.id, dr.rows[0].customer_id, amount, estimated_days, notes]
    );

    // Notify customer
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
       VALUES ($1,'quotation','New Quotation Received','An artisan has sent you a quotation',$2,'quotation')`,
      [dr.rows[0].customer_id, rows[0].id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create quotation' });
  }
});

// GET /api/quotations - customer sees their quotations
router.get('/', auth, async (req, res) => {
  try {
    const field = req.user.role === 'artisan' ? 'artisan_id' : 'customer_id';
    const { rows } = await pool.query(
      `SELECT q.*, u.name as artisan_name, u.avatar_url as artisan_avatar,
              dr.title as design_title, dr.category,
              o.id as order_id, o.status as order_status
       FROM quotations q
       JOIN users u ON u.id=q.artisan_id
       JOIN design_requests dr ON dr.id=q.design_request_id
       LEFT JOIN orders o ON o.quotation_id=q.id
       WHERE q.${field}=$1 ORDER BY q.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quotations' });
  }
});

// PUT /api/quotations/:id/accept - customer accepts quotation
router.put('/:id/accept', auth, requireRole('customer'), async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const q = await client.query(
      'SELECT * FROM quotations WHERE id=$1 AND customer_id=$2 AND status=$3 FOR UPDATE',
      [req.params.id, req.user.id, 'pending']
    );
    if (!q.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Quotation not found or already processed' });
    }
    const quot = q.rows[0];

    const design = await client.query(
      'SELECT id FROM design_requests WHERE id=$1 AND customer_id=$2 FOR UPDATE',
      [quot.design_request_id, req.user.id]
    );
    if (!design.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Design request not found' });
    }
    const existingOrder = await client.query(
      `SELECT id FROM orders WHERE design_request_id=$1 AND status <> 'cancelled' LIMIT 1`,
      [quot.design_request_id]
    );
    if (existingOrder.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'An order has already been created for this design' });
    }

    await client.query('UPDATE quotations SET status=$1, updated_at=NOW() WHERE id=$2', ['accepted', quot.id]);
    await client.query(
      `UPDATE quotations SET status='expired', updated_at=NOW()
       WHERE design_request_id=$1 AND id<>$2 AND status='pending'`,
      [quot.design_request_id, quot.id]
    );
    await client.query(
      'UPDATE design_requests SET status=$1, updated_at=NOW() WHERE id=$2',
      ['awaiting_artisan_confirmation', quot.design_request_id]
    );

    const { rows } = await client.query(
      `INSERT INTO orders (quotation_id, design_request_id, customer_id, artisan_id, total_amount, status)
       VALUES ($1,$2,$3,$4,$5,'awaiting_artisan_confirmation') RETURNING *`,
      [quot.id, quot.design_request_id, quot.customer_id, quot.artisan_id, quot.amount]
    );

    // Attach the order to an existing direct conversation when possible.
    const conversation = await client.query(
      `SELECT id FROM chat_conversations
       WHERE customer_id=$1 AND artisan_id=$2 AND order_id IS NULL
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [quot.customer_id, quot.artisan_id]
    );
    if (conversation.rows.length) {
      await client.query(
        'UPDATE chat_conversations SET order_id=$1 WHERE id=$2',
        [rows[0].id, conversation.rows[0].id]
      );
    } else {
      await client.query(
        `INSERT INTO chat_conversations (customer_id, artisan_id, order_id)
         VALUES ($1,$2,$3)`,
        [quot.customer_id, quot.artisan_id, rows[0].id]
      );
    }

    // Notify the selected artisan that the customer is waiting for order confirmation.
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
       VALUES ($1,'order','Order Confirmation Requested','The customer selected your quotation. Confirm the order to begin.',$2,'order')`,
      [quot.artisan_id, rows[0].id]
    );

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Quotation acceptance rollback failed:', rollbackError.code || rollbackError.name);
      }
    }
    console.error('Quotation acceptance failed:', err.code || err.name);
    res.status(500).json({ error: 'Failed to accept quotation' });
  } finally {
    client?.release();
  }
});

// PUT /api/quotations/:id/reject
router.put('/:id/reject', auth, requireRole('customer'), async (req, res) => {
  try {
    await pool.query(
      'UPDATE quotations SET status=$1, updated_at=NOW() WHERE id=$2 AND customer_id=$3',
      ['rejected', req.params.id, req.user.id]
    );
    res.json({ message: 'Quotation rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject quotation' });
  }
});

module.exports = router;
