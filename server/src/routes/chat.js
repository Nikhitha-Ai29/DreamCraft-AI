const router = require('express').Router();
const pool = require('../db/pool');
const { auth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { getUploadedFileUrl } = require('../utils/upload-url');

// POST /api/chat/conversations - customer starts or resumes a conversation with an artisan
router.post('/conversations', auth, requireRole('customer'), async (req, res) => {
  const { artisan_id: artisanId } = req.body;
  if (!artisanId) return res.status(400).json({ error: 'artisan_id is required' });

  try {
    const artisan = await pool.query(
      `SELECT id FROM users WHERE id=$1 AND role='artisan' AND is_active=true`,
      [artisanId]
    );
    if (!artisan.rows.length) return res.status(404).json({ error: 'Artisan not found' });

    const existing = await pool.query(
      `SELECT id FROM chat_conversations
       WHERE customer_id=$1 AND artisan_id=$2
       ORDER BY (order_id IS NULL) DESC, created_at DESC LIMIT 1`,
      [req.user.id, artisanId]
    );
    if (existing.rows.length) return res.json({ id: existing.rows[0].id });

    const { rows } = await pool.query(
      `INSERT INTO chat_conversations (customer_id, artisan_id)
       VALUES ($1,$2) RETURNING id`,
      [req.user.id, artisanId]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

// GET /api/chat/conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const field = req.user.role === 'artisan' ? 'cc.artisan_id' : 'cc.customer_id';
    const { rows } = await pool.query(
      `SELECT cc.id, cc.order_id, cc.created_at,
              c.name as customer_name, c.avatar_url as customer_avatar,
              a.name as artisan_name, a.avatar_url as artisan_avatar,
              o.status as order_status,
              (SELECT cm.content FROM chat_messages cm WHERE cm.conversation_id=cc.id ORDER BY cm.created_at DESC LIMIT 1) as last_message,
              (SELECT cm.created_at FROM chat_messages cm WHERE cm.conversation_id=cc.id ORDER BY cm.created_at DESC LIMIT 1) as last_message_at,
              (SELECT COUNT(*) FROM chat_messages cm WHERE cm.conversation_id=cc.id AND cm.is_read=false AND cm.sender_id!=$1) as unread_count,
              (SELECT o.id FROM orders o WHERE o.customer_id=cc.customer_id AND o.artisan_id=cc.artisan_id ORDER BY o.created_at DESC LIMIT 1) as latest_order_id,
              (SELECT o.status FROM orders o WHERE o.customer_id=cc.customer_id AND o.artisan_id=cc.artisan_id ORDER BY o.created_at DESC LIMIT 1) as latest_order_status,
              (SELECT dr.title FROM orders o JOIN design_requests dr ON dr.id=o.design_request_id
               WHERE o.customer_id=cc.customer_id AND o.artisan_id=cc.artisan_id ORDER BY o.created_at DESC LIMIT 1) as latest_order_title
       FROM chat_conversations cc
       JOIN users c ON c.id=cc.customer_id
       JOIN users a ON a.id=cc.artisan_id
       LEFT JOIN orders o ON o.id=cc.order_id
       WHERE ${field}=$1 ORDER BY (last_message_at IS NULL), last_message_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET /api/chat/conversations/:id/messages
router.get('/conversations/:id/messages', auth, async (req, res) => {
  try {
    const conv = await pool.query(
      'SELECT * FROM chat_conversations WHERE id=$1 AND (customer_id=$2 OR artisan_id=$2)',
      [req.params.id, req.user.id]
    );
    if (!conv.rows.length) return res.status(403).json({ error: 'Forbidden' });

    const { rows } = await pool.query(
      `SELECT cm.*, u.name as sender_name, u.avatar_url as sender_avatar
       FROM chat_messages cm
       JOIN users u ON u.id=cm.sender_id
       WHERE cm.conversation_id=$1 ORDER BY cm.created_at ASC`,
      [req.params.id]
    );

    // Mark as read
    await pool.query(
      'UPDATE chat_messages SET is_read=true WHERE conversation_id=$1 AND sender_id!=$2',
      [req.params.id, req.user.id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/chat/conversations/:id/messages
router.post('/conversations/:id/messages', auth, upload.single('media'), async (req, res) => {
  const { content } = req.body;
  if (!content && !req.file) return res.status(400).json({ error: 'Content or media required' });
  try {
    const conv = await pool.query(
      'SELECT * FROM chat_conversations WHERE id=$1 AND (customer_id=$2 OR artisan_id=$2)',
      [req.params.id, req.user.id]
    );
    if (!conv.rows.length) return res.status(403).json({ error: 'Forbidden' });

    const mediaUrl = req.file ? getUploadedFileUrl(req, req.file) : null;
    const mediaType = req.file ? (req.file.mimetype.startsWith('video') ? 'video' : req.file.mimetype.startsWith('audio') ? 'audio' : 'image') : null;

    const { rows } = await pool.query(
      `INSERT INTO chat_messages (conversation_id, sender_id, content, media_url, media_type)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, req.user.id, content || null, mediaUrl, mediaType]
    );

    // Emit via socket (handled in index.js)
    req.app.get('io')?.to(`conv_${req.params.id}`).emit('new_message', rows[0]);

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
