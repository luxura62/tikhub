const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { pool } = require('/db');

const router = express.Router();
const JWT_SECRET = process.env.SESSION_SECRET || 'dev-secret';

router.get('/login', (req, res) => {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY,
    response_type: 'code',
    scope: 'user.info.basic,user.info.profile,user.info.stats,video.publish,video.upload,video.list',
    redirect_uri: process.env.URI_REDIRECT,
    state: 'tikhub'
  });
  res.redirect('https://www.tiktok.com/v2/auth/authorize/?' + params.toString());
});

router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    return res.redirect(process.env.FRONTEND_URL + '?error=auth_failed');
  }
  try {
    const tokenResponse = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
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
    const profileResponse = await axios.get(
      'https://open.tiktokapis.com/v2/user/info/',
      {
        params: { fields: 'open_id,display_name,avatar_url' },
        headers: { Authorization: 'Bearer ' + access_token }
      }
    );
    const profile = profileResponse.data.data.user;
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);
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
    const user = {
      id: result.rows[0].id,
      display_name: result.rows[0].display_name,
      avatar_url: result.rows[0].avatar_url,
      open_id: open_id
    };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.redirect(process.env.FRONTEND_URL + '/dashboard');
  } catch (err) {
    console.error('Erreur OAuth:', err.response?.data || err.message);
    res.redirect(process.env.FRONTEND_URL + '?error=token_failed');
  }
});

router.get('/me', (req, res) => {
  const token = req.cookies?.auth_token;
  if (!token) return res.status(401).json({ error: 'Non connecte' });
  try {
    const user = jwt.verify(token, JWT_SECRET);
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

function requireAuth(req, res, next) {
  const token = req.cookies?.auth_token;
  if (!token) return res.status(401).json({ error: 'Connexion requise' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
}

module.exports = { router, requireAuth };