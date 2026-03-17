const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();

// Configuration upload vidéo avec vérification de dossier
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    // Utilisation de existsSync/mkdirSync au démarrage uniquement pour éviter les erreurs d'écriture
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Limité à 50MB pour stabiliser le serveur
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp4', '.mov', '.avi', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Format vidéo non supporté (MP4, MOV, AVI, WEBM uniquement)'));
    }
  }
});

// POST /api/posts — Planifier un nouveau post
router.post('/', requireAuth, upload.single('video'), async (req, res) => {
  const userId = req.user.id; 
  const { caption, hashtags, scheduled_at, title } = req.body;

  if (!req.file) return res.status(400).json({ error: 'Vidéo obligatoire' });
  if (!scheduled_at) return res.status(400).json({ error: 'Date de planification obligatoire' });

  const scheduledDate = new Date(scheduled_at);
  if (scheduledDate <= new Date()) {
    // Si la date est passée, on supprime le fichier qui vient d'être uploadé pour rien
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'La date doit être dans le futur' });
  }

  try {
    const hashtagsArray = hashtags
      ? hashtags.split(',').map(h => h.trim().replace(/^#/, ''))
      : [];

    console.log(`💾 Tentative d'insertion en BDD pour l'utilisateur ${userId}...`);

    const result = await pool.query(`
      INSERT INTO scheduled_posts (user_id, title, video_path, caption, hashtags, scheduled_at, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *`, 
      [userId, title || '', req.file.path, caption || '', hashtagsArray, scheduledDate]
    );

    console.log(`✅ Post planifié avec succès : ID ${result.rows[0].id}`);
    res.status(201).json({ success: true, post: result.rows[0] });

  } catch (err) {
    console.error('❌ Erreur SQL ou Système:', err.message);
    // Nettoyage du fichier en cas d'échec de la base de données
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Erreur interne lors de la planification' });
  }
});

// GET /api/posts — Liste des posts
router.get('/', requireAuth, async (req, res) => {
  const userId = req.user.id; 
  const { status } = req.query;

  try {
    let query = `SELECT id, title, caption, hashtags, scheduled_at, status, created_at FROM scheduled_posts WHERE user_id = $1`;
    const params = [userId];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }
    query += ` ORDER BY scheduled_at ASC`;

    const result = await pool.query(query, params);
    res.json({ posts: result.rows });
  } catch (err) {
    console.error('❌ Erreur récupération liste:', err.message);
    res.status(500).json({ error: 'Impossible de récupérer les posts' });
  }
});

// DELETE /api/posts/:id — Supprimer un post
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = req.user.id; 
  const postId = req.params.id;

  try {
    const result = await pool.query(`
      DELETE FROM scheduled_posts
      WHERE id = $1 AND user_id = $2 AND status = 'pending'
      RETURNING video_path`, 
      [postId, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Post introuvable ou déjà publié' });
    }

    const videoPath = result.rows[0].video_path;
    // Suppression asynchrone du fichier
    if (videoPath) {
      fs.access(videoPath, fs.constants.F_OK, (err) => {
        if (!err) {
          fs.unlink(videoPath, (err) => {
            if (err) console.error("Erreur suppression fichier:", err);
          });
        }
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Erreur suppression:', err.message);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

module.exports = router;
