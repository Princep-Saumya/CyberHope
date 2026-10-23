require('dotenv').config();
const express = require('express');
const cors = require('cors');
const grievancesRouter = require('./routes/grievances');
const sourcesRouter = require('./routes/sources');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'GrievancePulse AI Server', timestamp: new Date().toISOString() });
});

// Main routes
app.use('/api', grievancesRouter);
app.use('/api', sourcesRouter);

// Global error handler
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 GrievancePulse AI Server running on http://localhost:${PORT}`);
  console.log(`   Gemini API Key: ${process.env.GEMINI_API_KEY ? '✅ Loaded' : '⚠️  Not set — heuristic fallback active'}`);
  console.log(`   Environment   : ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
