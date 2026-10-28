const router = require('express').Router();
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');
const { getNvidiaConfig, getNvidiaErrorResponse, generateChatResponse } = require('../services/nvidia');
const {
  generateComfyUiImage,
  getComfyUiConfig,
  getComfyUiErrorResponse,
} = require('../services/comfyui');

const { createNvidiaClient } = require('../services/nvidia');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const SYSTEM_PROMPT = `You are DreamCraft AI assistant, helping customers design custom handmade products.
You help users:
- Describe and refine their dream product ideas
- Choose materials, colors, patterns, and styles
- Understand different product categories (sarees, jewellery, pottery, clothing, handicrafts)
- Prepare detailed descriptions for artisan quotations
- Understand pricing and timelines
- Navigate the platform

Be warm, creative, and encouraging. Ask clarifying questions to understand their vision better.
Keep responses concise and actionable.`;

// GET /api/ai/conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, created_at, updated_at FROM ai_conversations
       WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// POST /api/ai/conversations
router.post('/conversations', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `INSERT INTO ai_conversations (user_id, title) VALUES ($1, $2) RETURNING *`,
      [req.user.id, req.body.title || 'New Conversation']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// GET /api/ai/conversations/:id/messages
router.get('/conversations/:id/messages', auth, async (req, res) => {
  try {
    const conv = await pool.query(
      'SELECT id FROM ai_conversations WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (!conv.rows.length) return res.status(404).json({ error: 'Conversation not found' });

    const { rows } = await pool.query(
      `SELECT id, role, content, created_at FROM ai_messages
       WHERE conversation_id=$1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/ai/conversations/:id/messages
router.post('/conversations/:id/messages', auth, async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Message content required' });

  const nvidiaConfig = getNvidiaConfig();
  if (!nvidiaConfig.ok) {
    return res.status(503).json({
      error: 'NVIDIA AI is not configured',
      hint: `Set ${nvidiaConfig.missing.join(', ')} in server/.env. Keep the API key out of the frontend and chat.`,
    });
  }
  const ai = createNvidiaClient(nvidiaConfig);

  try {
    const conv = await pool.query(
      'SELECT id FROM ai_conversations WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (!conv.rows.length) return res.status(404).json({ error: 'Conversation not found' });

    const history = await pool.query(
      `SELECT role, content FROM ai_messages WHERE conversation_id=$1
       ORDER BY created_at DESC LIMIT 10`,
      [req.params.id]
    );
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.rows.reverse(),
      { role: 'user', content },
    ];

    let reply;
    try {
      reply = await generateChatResponse({ client: ai, model: nvidiaConfig.model, messages });
    } catch (err) {
      console.error('NVIDIA chat request failed', { status: err.status, code: err.code });
      const providerError = getNvidiaErrorResponse(err);
      return res.status(providerError.status).json(providerError.body);
    }

    if (!reply) return res.status(502).json({ error: 'NVIDIA returned an empty response. Please try again.' });

    await pool.query(
      'INSERT INTO ai_messages (conversation_id, role, content) VALUES ($1,$2,$3)',
      [req.params.id, 'user', content]
    );
    const { rows } = await pool.query(
      'INSERT INTO ai_messages (conversation_id, role, content) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, 'assistant', reply]
    );

    await pool.query(
      'UPDATE ai_conversations SET updated_at=NOW() WHERE id=$1',
      [req.params.id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(500).json({ error: 'AI response failed' });
  }
});

// POST /api/ai/generate-image
router.post('/generate-image', auth, async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });
  if (prompt.length > 5000) {
    return res.status(400).json({ error: 'Design description is too long to generate an image' });
  }
  const comfyUiConfig = getComfyUiConfig();
  if (!comfyUiConfig.ok) {
    return res.status(503).json({
      error: 'Local image generation is not configured',
      hint: comfyUiConfig.error,
    });
  }

  if (req.body.design_request_id) {
    try {
      const design = await pool.query(
        'SELECT id FROM design_requests WHERE id=$1 AND customer_id=$2',
        [req.body.design_request_id, req.user.id]
      );
      if (!design.rows.length) {
        return res.status(404).json({ error: 'Design request not found' });
      }
    } catch (error) {
      console.error('Design ownership check failed:', error.code || error.name);
      return res.status(500).json({ error: 'Could not verify design request' });
    }
  }

  let generated;
  try {
    generated = await generateComfyUiImage({
      config: comfyUiConfig,
      prompt,
    });
  } catch (error) {
    console.error('Local ComfyUI image generation failed:', error.code || error.name);
    const providerError = getComfyUiErrorResponse(error);
    return res.status(providerError.status).json(providerError.body);
  }

  const filename = `generated-${randomUUID()}.${generated.extension}`;
  const imageDirectory = path.join(__dirname, '../uploads/generated');
  const imagePath = path.join(imageDirectory, filename);
  try {
    await fs.mkdir(imageDirectory, { recursive: true });
    await fs.writeFile(imagePath, generated.buffer, { flag: 'wx' });
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/generated/${filename}`;
    const { rows } = await pool.query(
      `INSERT INTO generated_designs (design_request_id, customer_id, prompt, image_url, provider)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [
        req.body.design_request_id || null,
        req.user.id,
        prompt,
        imageUrl,
        'comfyui',
      ]
    );
    res.json(rows[0]);
  } catch (error) {
    await fs.unlink(imagePath).catch((unlinkError) => {
      console.error('Generated image cleanup failed:', unlinkError.code || unlinkError.name);
    });
    console.error('Generated image persistence failed:', error.code || error.name);
    return res.status(500).json({ error: 'The image was generated but could not be saved' });
  }
});

module.exports = router;
