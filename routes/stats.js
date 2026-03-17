const express = require('express');
const axios = require('axios');
const { pool } = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();

// ─────────────────────────────────────────────
// GET /api/stats — Récupère les statistiques du compte
// ─────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const userId = req.user.id; // requireAuth a déjà rempli req.user

    try {
        // Récupération du token depuis la DB
            const userResult = await pool.query(
                  'SELECT access_token FROM users WHERE id = $1',
                        [userId]
                            );

                                if (!userResult.rows.length) {
                                      return res.status(404).json({ error: 'Utilisateur introuvable' });
                                          }

                                              const accessToken = userResult.rows[0].access_token;

                                                  // Appel API TikTok pour les stats
                                                      const response = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
                                                            params: {
                                                                    fields: 'open_id,display_name,avatar_url,follower_count,following_count,likes_count,video_count'
                                                                          },
                                                                                headers: { Authorization: `Bearer ${accessToken}` }
                                                                                    });

                                                                                        const stats = response.data.data.user;

                                                                                            // Mise en cache des stats en base
                                                                                                await pool.query(`
                                                                                                      INSERT INTO stats_cache (user_id, followers_count, likes_count, video_count)
                                                                                                            VALUES ($1, $2, $3, $4)
                                                                                                                `, [userId, stats.follower_count || 0, stats.likes_count || 0, stats.video_count || 0]);

                                                                                                                    res.json({
                                                                                                                          display_name: stats.display_name,
                                                                                                                                avatar_url: stats.avatar_url,
                                                                                                                                      followers: stats.follower_count || 0,
                                                                                                                                            following: stats.following_count || 0,
                                                                                                                                                  likes: stats.likes_count || 0,
                                                                                                                                                        videos: stats.video_count || 0
                                                                                                                                                            });

                                                                                                                                                              } catch (err) {
                                                                                                                                                                  console.error('❌ Erreur stats:', err.response?.data || err.message);
                                                                                                                                                                      res.status(500).json({ error: 'Impossible de récupérer les statistiques' });
                                                                                                                                                                        }
                                                                                                                                                                        });

                                                                                                                                                                        // ─────────────────────────────────────────────
                                                                                                                                                                        // GET /api/stats/history — Historique des stats (graphiques)
                                                                                                                                                                        // ─────────────────────────────────────────────
                                                                                                                                                                        router.get('/history', requireAuth, async (req, res) => {
                                                                                                                                                                          const userId = req.session.user.id;

                                                                                                                                                                            try {
                                                                                                                                                                                const result = await pool.query(`
                                                                                                                                                                                      SELECT followers_count, likes_count, video_count, fetched_at
                                                                                                                                                                                            FROM stats_cache
                                                                                                                                                                                                  WHERE user_id = $1
                                                                                                                                                                                                        ORDER BY fetched_at DESC
                                                                                                                                                                                                              LIMIT 30
                                                                                                                                                                                                                  `, [userId]);

                                                                                                                                                                                                                      res.json({ history: result.rows });
                                                                                                                                                                                                                        } catch (err) {
                                                                                                                                                                                                                            console.error('❌ Erreur historique stats:', err.message);
                                                                                                                                                                                                                                res.status(500).json({ error: 'Impossible de récupérer l\'historique' });
                                                                                                                                                                                                                                  }
                                                                                                                                                                                                                                  });

                                                                                                                                                                                                                                  module.exports = router;
                                                                                                                                                                                                                                  