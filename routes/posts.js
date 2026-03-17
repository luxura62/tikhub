const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();

// ─── CONFIGURATION MULTER ───
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm', 'video/mov'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format vidéo non supporté. Utilise MP4, MOV ou WEBM.'));
    }
  }
});

// ─── CRÉER UN POST PLANIFIÉ ───
router.post('/', requireAuth, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune vidéo fournie' });
    }

    const { caption, hashtags, scheduled_at, title } = req.body;

    if (!caption || !caption.trim()) {
      return res.status(400).json({ error: 'La légende est requise' });
    }

    if (!scheduled_at) {
      return res.status(400).json({ error: 'La date de publication est requise' });
    }

    const scheduledDate = new Date(scheduled_at);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: 'La date doit être dans le futur' });
    }

    // Parser les hashtags
    const hashtagArray = hashtags
      ? hashtags.split(',').map(h => h.trim().replace(/^#/, '')).filter(Boolean)
      : [];

    console.log(`📋 Tentative d'insertion en BDD pour l'utilisateur ${req.user.id}...`);

    const result = await pool.query(
      `INSERT INTO scheduled_posts 
        (user_id, title, video_path, caption, hashtags, scheduled_at, status) 
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') 
       RETURNING id`,
      [
        req.user.id,
        title || null,
        req.file.path,
        caption.trim(),
        hashtagArray,
        scheduledDate
      ]
    );

    console.log(`✅ Post planifié avec succès : ID ${result.rows[0].id}`);

    res.status(201).json({
      success: true,
      post: { id: result.rows[0].id }
    });

  } catch (err) {
    console.error('Erreur création post:', err);
    // Supprimer le fichier uploadé en cas d'erreur
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: err.message || 'Erreur lors de la création du post' });
  }
});

// ─── LISTER LES POSTS ───
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT id, title, video_path, caption, hashtags, scheduled_at, 
             status, tiktok_post_id, error_message, created_at
      FROM scheduled_posts 
      WHERE user_id = $1
    `;
    const params = [req.user.id];

    if (status && status !== 'all') {
      query += ` AND status = $2`;
      params.push(status);
    }

    query += ` ORDER BY scheduled_at DESC`;

    const result = await pool.query(query, params);

    res.json({ posts: result.rows });

  } catch (err) {
    console.error('Erreur liste posts:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des posts' });
  }
});

// ─── RÉCUPÉRER UN POST ───
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM scheduled_posts WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Post introuvable' });
    }

    res.json({ post: result.rows[0] });

  } catch (err) {
    console.error('Erreur récupération post:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération du post' });
  }
});

// ─── SUPPRIMER UN POST ───
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM scheduled_posts WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Post introuvable' });
    }

    const post = result.rows[0];

    if (post.status !== 'pending') {
      return res.status(400).json({ error: 'Seuls les posts en attente peuvent être supprimés' });
    }

    // Supprimer le fichier vidéo
    if (post.video_path && fs.existsSync(post.video_path)) {
      fs.unlinkSync(post.video_path);
    }

    await pool.query(
      `DELETE FROM scheduled_posts WHERE id = $1`,
      [req.params.id]
    );

    res.json({ success: true });

  } catch (err) {
    console.error('Erreur suppression post:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression du post' });
  }
});

module.exports = router;
