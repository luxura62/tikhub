require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { pool, initDB } = require('./db');
const { router: authRouter } = require('./routes/auth');
const statsRouter = require('./routes/stats');
const postsRouter = require('./routes/posts');
app.use('/api/stats', statsRouter);
const { startScheduler } = require('./jobs/scheduler');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use('/auth', authRouter);
app.use('/api/stats', statsRouter);
app.use('/api/posts', postsRouter);
app.get('/health', (req, res) => { res.json({ status: 'ok' }); });
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'frontend/build')));
  app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'frontend/build', 'index.html')); });
}
async function start() {
  try {
    await initDB();
    startScheduler();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Serveur TikHub actif sur le port ${PORT}`);
    });
  } catch (err) {
    console.error("Erreur au démarrage :", err);
  }
}

start();