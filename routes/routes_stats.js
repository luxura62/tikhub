const express = require('express');
const axios = require('axios');
const { pool } = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();

// ─── DONNÉES SANDBOX (pour la démo TikTok et les tests) ───
const SANDBOX_STATS = {
  followers: 1420,
  following: 180,
  likes: 8300,
  videos: 24
};

// Génère un historique fictif réaliste sur 30 jours
function generateSandboxHistory() {
  const history = [];
  let followers = 1200;
  let likes = 7000;

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Croissance progressive avec légère variation
    followers += Math.floor(Math.random() * 15) + 3;
    likes += Math.floor(Math.random() * 120) + 20;

    history.push({
      date: date.toISOString().slice(0, 10),
      followers_count: followers,
      likes_count: likes
    });
  }
  return history;
}

// ─── GET /api/stats ───
router.get('/', requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    const userResult = await pool.query(
      'SELECT access_token, token_expires_at FROM users WHERE id = $1',
      [userId]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const { access_token } = userResult.rows[0];

    // Tentative d'appel TikTok réel
    try {
      const response = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
        params: {
          fields: 'open_id,display_name,avatar_url,follower_count,following_count,likes_count,video_count'
        },
        headers: { Authorization: `Bearer ${access_token}` },
        timeout: 8000
      });

      const user = response.data?.data?.user;

      if (user) {
        const stats = {
          followers: user.follower_count ?? 0,
          following: user.following_count ?? 0,
          likes: user.likes_count ?? 0,
          videos: user.video_count ?? 0,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          sandbox: false
        };

        // Sauvegarde en historique
        await saveStatsHistory(userId, stats);

        return res.json(stats);
      }
    } catch (tiktokErr) {
      // Si l'API TikTok échoue (sandbox, token expiré, etc.)
      // on retourne les données sandbox
      console.log('ℹ️ API TikTok indisponible, utilisation des données sandbox');
    }

    // Retour sandbox
    const sandboxStats = {
      ...SANDBOX_STATS,
      sandbox: true
    };

    await saveStatsHistory(userId, sandboxStats);
    return res.json(sandboxStats);

  } catch (err) {
    console.error('Erreur Stats:', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des stats' });
  }
});

// ─── GET /api/stats/history ───
router.get('/history', requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT followers_count, likes_count, recorded_at::date as date
       FROM stats_history
       WHERE user_id = $1
       ORDER BY recorded_at DESC
       LIMIT 30`,
      [userId]
    );

    // Si pas encore d'historique en BDD, on retourne les données sandbox
    if (result.rows.length < 3) {
      return res.json({
        history: generateSandboxHistory(),
        sandbox: true
      });
    }

    // Inverser pour avoir l'ordre chronologique
    const history = result.rows.reverse().map(row => ({
      date: row.date,
      followers_count: parseInt(row.followers_count),
      likes_count: parseInt(row.likes_count)
    }));

    res.json({ history, sandbox: false });

  } catch (err) {
    // Si la table n'existe pas encore
    console.log('ℹ️ Table stats_history inexistante, retour sandbox');
    res.json({
      history: generateSandboxHistory(),
      sandbox: true
    });
  }
});

// ─── GET /api/stats/posts-summary ───
// Résumé des posts pour le dashboard
router.get('/posts-summary', requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'published') as published,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) as total
       FROM scheduled_posts
       WHERE user_id = $1`,
      [userId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur posts-summary:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── HELPER : Sauvegarder l'historique ───
async function saveStatsHistory(userId, stats) {
  try {
    // Créer la table si elle n'existe pas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stats_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        followers_count INTEGER DEFAULT 0,
        likes_count INTEGER DEFAULT 0,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Eviter les doublons (1 enregistrement max par heure)
    const recent = await pool.query(
      `SELECT id FROM stats_history 
       WHERE user_id = $1 
       AND recorded_at > NOW() - INTERVAL '1 hour'`,
      [userId]
    );

    if (!recent.rows.length) {
      await pool.query(
        `INSERT INTO stats_history (user_id, followers_count, likes_count)
         VALUES ($1, $2, $3)`,
        [userId, stats.followers || 0, stats.likes || 0]
      );
    }
  } catch (err) {
    // Non bloquant
    console.log('ℹ️ Impossible de sauvegarder l\'historique:', err.message);
  }
}

module.exports = router;
