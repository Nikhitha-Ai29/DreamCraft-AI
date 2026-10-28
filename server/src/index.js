const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const pool = require('./db/pool');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
});
app.set('io', io);

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limits
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'Too many AI requests, please wait.' } });
app.use('/api/', apiLimiter);
app.use('/api/ai/', aiLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/designs', require('./routes/designs'));
app.use('/api/artisans', require('./routes/artisans'));
app.use('/api/quotations', require('./routes/quotations'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/uploads', require('./routes/uploads'));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', timestamp: new Date() });
  } catch (err) {
    console.error('MySQL health check failed:', err.code || 'unknown error');
    res.status(503).json({ status: 'error', database: 'unavailable', timestamp: new Date() });
  }
});

// Socket.io - real-time chat
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.user.name}`);

  socket.on('join_conversation', async (convId) => {
    try {
      const conversation = await pool.query(
        'SELECT id FROM chat_conversations WHERE id=$1 AND (customer_id=$2 OR artisan_id=$2)',
        [convId, socket.user.id]
      );
      if (conversation.rows.length) socket.join(`conv_${convId}`);
      else socket.emit('conversation_error', { error: 'Conversation access denied' });
    } catch (err) {
      console.error('Socket conversation authorization failed:', err.code || 'unknown error');
      socket.emit('conversation_error', { error: 'Unable to join conversation' });
    }
  });

  socket.on('leave_conversation', (convId) => {
    socket.leave(`conv_${convId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.user.name}`);
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.message);
  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooLarge ? 413 : 400).json({
      error: tooLarge ? 'Each uploaded file must be 50 MB or smaller' : 'Upload limit exceeded',
    });
  }
  if (err.message === 'File type not allowed')
    return res.status(400).json({ error: err.message });
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`🚀 DreamCraft AI server running on http://localhost:${PORT}`);
  try {
    await pool.query('SELECT 1');
    console.log(`📊 MySQL connected: ${process.env.MYSQL_DATABASE || 'dreamcraft_ai'}`);
  } catch (err) {
    console.error('⚠️  MySQL connection failed:', err.code || 'unknown error');
  }
  const nvidiaConfigured = Boolean(
    process.env.NVIDIA_API_KEY &&
    process.env.NVIDIA_MODEL &&
    process.env.NVIDIA_BASE_URL
  );
  console.log(`🤖 NVIDIA chatbot: ${nvidiaConfigured ? 'configured' : '⚠️  configuration required'}`);
  console.log(`🧠 NVIDIA chat model: ${process.env.NVIDIA_MODEL || 'not configured'}`);
  const imageGenerationEnabled = process.env.NVIDIA_IMAGE_GENERATION_ENABLED === 'true';
  console.log(`🎨 NVIDIA image generation: ${imageGenerationEnabled ? 'enabled' : 'disabled until access and billing are confirmed'}`);
  console.log(`🗄️ MySQL: ${process.env.MYSQL_HOST || '127.0.0.1'}:${process.env.MYSQL_PORT || 3306}/${process.env.MYSQL_DATABASE || 'dreamcraft_ai'}`);
});
