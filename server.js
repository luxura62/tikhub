// server.js - Tikshub OAuth TikTok complet sans node-fetch

const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURATION TIKTOK ---
const TIKTOK_CLIENT_KEY = 'sbawbd1pr0vxz33uyx';
const TIKTOK_CLIENT_SECRET = 'hj2dGstMTC1ViWecJMYttbtQ1f0sedVr';
const REDIRECT_URI = 'https://tikshub.fr/auth/callback'; // ton vrai domaine

// --- SESSION ---
app.use(session({
  secret: 'tikhub_secret', // change pour un secret aléatoire
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // mettre true si HTTPS
}));

// --- ROUTE LOGIN (OAuth TikTok) ---
app.get('/auth/tiktok', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.state = state;

  const redirect_uri = encodeURIComponent(REDIRECT_URI);
  const oauthUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${TIKTOK_CLIENT_KEY}&scope=user.info.basic,video.upload,video.publish&response_type=code&redirect_uri=${redirect_uri}&state=${state}`;

  res.redirect(oauthUrl);
});

// --- ROUTE CALLBACK ---
app.get('/auth/callback', (req, res) => {
  const { code, state } = req.query;

  if (!code || !state) return res.status(400).send('Missing code or state');
  if (state !== req.session.state) return res.status(400).send('state_mismatch');

  // --- ÉCHANGE DU CODE CONTRE ACCESS_TOKEN ---
  const postData = JSON.stringify({
    client_key: sbawbd1pr0vxz33uyx,
    client_secret: hj2dGstMTC1ViWecJMYttbtQ1f0sedVr,
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI
  });

  const options = {
    hostname: 'open.tiktokapis.com',
    path: '/v2/oauth/token/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const request = https.request(options, (response) => {
    let data = '';
    response.on('data', chunk => data += chunk);
    response.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.error) {
          return res.status(400).send(`OAuth error: ${json.message}`);
        }

        // Stocke token en session pour tests
        req.session.access_token = json.data.access_token;
        res.send(`OAuth réussi ! Access token récupéré : ${json.data.access_token}`);
      } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur lors du parsing de la réponse');
      }
    });
  });

  request.on('error', err => {
    console.error(err);
    res.status(500).send('Erreur serveur lors de la requête OAuth');
  });

  request.write(postData);
  request.end();
});

// --- ROUTE TEST ---
app.get('/', (req, res) => {
  res.send('Tikshub server is running. Go to /auth/tiktok to start OAuth.');
});

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`Tikshub server running on port ${PORT}`);
});