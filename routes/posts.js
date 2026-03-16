const express = require('express');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();

// Configuration upload vidéo
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      const dir = './uploads';
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              cb(null, dir);
                },
                  filename: (req, file, cb) => {
                      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
                          cb(null, unique + path.extname(file.originalname));
                            }
                            });

                            const upload = multer({
                              storage,
                                limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
                                  fileFilter: (req, file, cb) => {
                                      const allowed = ['.mp4', '.mov', '.avi', '.webm'];
                                          const ext = path.extname(file.originalname).toLowerCase();
                                              if (allowed.includes(ext)) {
                                                    cb(null, true);
                                                        } else {
                                                              cb(new Error('Format vidéo non supporté. Utilisez MP4, MOV, AVI ou WEBM'));
                                                                  }
                                                                    }
                                                                    });

                                                                    // ─────────────────────────────────────────────
                                                                    // POST /api/posts — Planifier un nouveau post
                                                                    // ─────────────────────────────────────────────
                                                                    router.post('/', requireAuth, upload.single('video'), async (req, res) => {
                                                                      const userId = req.session.user.id;
                                                                        const { caption, hashtags, scheduled_at, title } = req.body;

                                                                          if (!req.file) {
                                                                              return res.status(400).json({ error: 'Vidéo obligatoire' });
                                                                                }

                                                                                  if (!scheduled_at) {
                                                                                      return res.status(400).json({ error: 'Date de publication obligatoire' });
                                                                                        }

                                                                                          const scheduledDate = new Date(scheduled_at);
                                                                                            if (scheduledDate <= new Date()) {
                                                                                                return res.status(400).json({ error: 'La date doit être dans le futur' });
                                                                                                  }

                                                                                                    try {
                                                                                                        const hashtagsArray = hashtags
                                                                                                              ? hashtags.split(',').map(h => h.trim().replace(/^#/, ''))
                                                                                                                    : [];

                                                                                                                        const result = await pool.query(`
                                                                                                                              INSERT INTO scheduled_posts (user_id, title, video_path, caption, hashtags, scheduled_at, status)
                                                                                                                                    VALUES ($1, $2, $3, $4, $5, $6, 'pending')
                                                                                                                                          RETURNING *
                                                                                                                                              `, [userId, title || '', req.file.path, caption || '', hashtagsArray, scheduledDate]);

                                                                                                                                                  res.status(201).json({
                                                                                                                                                        success: true,
                                                                                                                                                              post: result.rows[0]
                                                                                                                                                                  });

                                                                                                                                                                    } catch (err) {
                                                                                                                                                                        console.error('❌ Erreur création post:', err.message);
                                                                                                                                                                            res.status(500).json({ error: 'Impossible de planifier le post' });
                                                                                                                                                                              }
                                                                                                                                                                              });

                                                                                                                                                                              // ─────────────────────────────────────────────
                                                                                                                                                                              // GET /api/posts — Liste des posts planifiés
                                                                                                                                                                              // ─────────────────────────────────────────────
                                                                                                                                                                              router.get('/', requireAuth, async (req, res) => {
                                                                                                                                                                                const userId = req.session.user.id;
                                                                                                                                                                                  const { status } = req.query;

                                                                                                                                                                                    try {
                                                                                                                                                                                        let query = `
                                                                                                                                                                                              SELECT id, title, caption, hashtags, scheduled_at, status, tiktok_post_id, error_message, created_at
                                                                                                                                                                                                    FROM scheduled_posts
                                                                                                                                                                                                          WHERE user_id = $1
                                                                                                                                                                                                              `;
                                                                                                                                                                                                                  const params = [userId];

                                                                                                                                                                                                                      if (status) {
                                                                                                                                                                                                                            query += ` AND status = $2`;
                                                                                                                                                                                                                                  params.push(status);
                                                                                                                                                                                                                                      }

                                                                                                                                                                                                                                          query += ` ORDER BY scheduled_at ASC`;

                                                                                                                                                                                                                                              const result = await pool.query(query, params);
                                                                                                                                                                                                                                                  res.json({ posts: result.rows });

                                                                                                                                                                                                                                                    } catch (err) {
                                                                                                                                                                                                                                                        console.error('❌ Erreur liste posts:', err.message);
                                                                                                                                                                                                                                                            res.status(500).json({ error: 'Impossible de récupérer les posts' });
                                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                                              });

                                                                                                                                                                                                                                                              // ─────────────────────────────────────────────
                                                                                                                                                                                                                                                              // DELETE /api/posts/:id — Supprimer un post planifié
                                                                                                                                                                                                                                                              // ─────────────────────────────────────────────
                                                                                                                                                                                                                                                              router.delete('/:id', requireAuth, async (req, res) => {
                                                                                                                                                                                                                                                                const userId = req.session.user.id;
                                                                                                                                                                                                                                                                  const postId = req.params.id;

                                                                                                                                                                                                                                                                    try {
                                                                                                                                                                                                                                                                        const result = await pool.query(`
                                                                                                                                                                                                                                                                              DELETE FROM scheduled_posts
                                                                                                                                                                                                                                                                                    WHERE id = $1 AND user_id = $2 AND status = 'pending'
                                                                                                                                                                                                                                                                                          RETURNING video_path
                                                                                                                                                                                                                                                                                              `, [postId, userId]);

                                                                                                                                                                                                                                                                                                  if (!result.rows.length) {
                                                                                                                                                                                                                                                                                                        return res.status(404).json({ error: 'Post introuvable ou déjà publié' });
                                                                                                                                                                                                                                                                                                            }

                                                                                                                                                                                                                                                                                                                // Suppression du fichier vidéo
                                                                                                                                                                                                                                                                                                                    const videoPath = result.rows[0].video_path;
                                                                                                                                                                                                                                                                                                                        if (videoPath && fs.existsSync(videoPath)) {
                                                                                                                                                                                                                                                                                                                              fs.unlinkSync(videoPath);
                                                                                                                                                                                                                                                                                                                                  }

                                                                                                                                                                                                                                                                                                                                      res.json({ success: true });

                                                                                                                                                                                                                                                                                                                                        } catch (err) {
                                                                                                                                                                                                                                                                                                                                            console.error('❌ Erreur suppression post:', err.message);
                                                                                                                                                                                                                                                                                                                                                res.status(500).json({ error: 'Impossible de supprimer le post' });
                                                                                                                                                                                                                                                                                                                                                  }
                                                                                                                                                                                                                                                                                                                                                  });

                                                                                                                                                                                                                                                                                                                                                  module.exports = router;
                                                                                                                                                                                                                                                                                                                                                  