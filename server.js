// server.js - Tikshub OAuth TikTok

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// --- SESSION ---
app.use(session({
  secret: process.env.SESSION_SECRET || 'tikhub_secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // mettre true si HTTPS
}));

// --- ROUTE LOGIN ---
// Génère un state aléatoire et redirige vers TikTok OAuth
app.get('/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.state = state;

  const redirect_uri = encodeURIComponent(process.env.REDIRECT_URI);
  const oauthUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${process.env.TIKTOK_CLIENT_KEY}&scope=user.info.basic,video.upload,video.publish&response_type=code&redirect_uri=${redirect_uri}&state=${state}`;

  res.redirect(oauthUrl);
});

// --- ROUTE CALLBACK ---
// Vérifie le state, récupère le code et échange contre token
app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).send('Missing code or state');
  }

  if (state !== req.session.state) {
    return res.status(400).send('state_mismatch');
  }

  // --- Échange du code contre access_token ---
  try {
    const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.REDIRECT_URI
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).send(`OAuth error: ${data.message}`);
    }

    // Stocke token en session pour tests
    req.session.access_token = data.data.access_token;

    res.send(`OAuth réussi ! Access token récupéré : ${data.data.access_token}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur lors de l\'échange du token');
  }
});

// --- ROUTE TEST ---
app.get('/', (req, res) => {
  res.send('Tikshub server is running. Go to /login to start OAuth.');
});

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`Tikshub server running on port ${PORT}`);
});