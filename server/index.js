require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const { createRateLimit } = require('./middleware/rateLimit');

const grievancesRouter = require('./routes/grievances');
const sourcesRouter = require('./routes/sources');
const { startPoller } = require('./services/realTimePoller');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Socket.io configuration
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH'],
  },
});

io.on('connection', (socket) => {
  console.log(`🔌 [WebSocket] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 [WebSocket] Client disconnected: ${socket.id}`);
  });
});

app.use(cors());
app.use(express.json({ limit: '6mb' }));
app.use('/api', createRateLimit({ windowMs: 60 * 1000, max: 300 }));

// Attach io to request for route access
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'GrievancePulse AI Server (Real-Time)',
    timestamp: new Date().toISOString(),
    clients_connected: io.engine.clientsCount,
  });
});

// Main routes
app.use('/api', grievancesRouter);
app.use('/api', sourcesRouter);

// Global error handler
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large. Uploaded images must be 4 MB or smaller.' });
  }
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
  res.status(500).json({ error: 'Internal server error' });
});

// Start HTTP + WebSocket Server
server.listen(PORT, () => {
  console.log(`\n🚀 GrievancePulse AI Server running on http://localhost:${PORT}`);
  console.log(`   Groq API Key: ${process.env.GROQ_API_KEY || process.env.Groq_API_KEY ? '✅ Loaded' : '⚠️  Not set'}`);
  console.log(`   Gemini API Key: ${process.env.GEMINI_API_KEY ? '✅ Loaded' : '⚠️  Not set — image analysis unavailable'}`);
  console.log(`   Real-time WebSockets: ✅ Active`);
  console.log(`   Environment   : ${process.env.NODE_ENV || 'development'}\n`);

  // Start the background real-time poller
  startPoller(io, 45000);
});

module.exports = { app, server, io };
