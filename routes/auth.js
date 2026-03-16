const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { pool } = require('../db');

const router = express.Router();

// ÉTAPE 1 : Rediriger vers TikTok
router.get('/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauth_state = state;

  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY,
    response_type: 'code',
    scope: 'user.info.basic,video.upload,video.publish,user.info.profile,user.info.stats,video.list',
    redirect_uri: process.env.URI_REDIRECT, // La virgule ici est cruciale
    state: state
  });

  const tiktokAuthURL = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  res.redirect(tiktokAuthURL);
});

// ÉTAPE 2 : Retour de TikTok
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error || state !== req.session.oauth_state) {
    return res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
  }

  try {
    // Échange du code contre un access_token (Format x-www-form-urlencoded obligatoire)
    const tokenResponse = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', 
      new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.URI_REDIRECT
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token, expires_in, open_id } = tokenResponse.data;

    // Récupération du profil
    const profileResponse = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
      params: { fields: 'open_id,display_name,avatar_url' },
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const profile = profileResponse.data.data.user;
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

    // Sauvegarde en BDD
    const result = await pool.query(`
      INSERT INTO users (tiktok_open_id, display_name, avatar_url, access_token, refresh_token, token_expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (tiktok_open_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_expires_at = EXCLUDED.token_expires_at,
        updated_at = NOW()
      RETURNING id, display_name, avatar_url
    `, [open_id, profile.display_name, profile.avatar_url, access_token, refresh_token, tokenExpiresAt]);

    req.session.user = {
      id: result.rows[0].id,
      display_name: result.rows[0].display_name,
      avatar_url: result.rows[0].avatar_url,
      open_id: open_id
    };

    delete req.session.oauth_state;
    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);

  } catch (err) {
    console.error('❌ Erreur OAuth callback:', err.response?.data || err.message);
    res.redirect(`${process.env.FRONTEND_URL}?error=token_failed`);
  }
});

router.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Non connecté' });
  res.json({ user: req.session.user });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

module.exports = { router };
