const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();

// ─── INIT TABLE ───
async function initCaptionsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS caption_templates (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name VARCHAR(100) NOT NULL,
      title TEXT,
      caption TEXT,
      hashtags TEXT[],
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
initCaptionsTable().catch(console.error);

// ─── LISTER LES TEMPLATES ───
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM caption_templates 
       WHERE user_id = $1 
       ORDER BY updated_at DESC`,
      [req.user.id]
    );
    res.json({ templates: result.rows });
  } catch (err) {
    console.error('Erreur liste templates:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── CRÉER UN TEMPLATE ───
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, title, caption, hashtags } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Le nom du template est requis' });
    }

    const hashtagArray = Array.isArray(hashtags)
      ? hashtags
      : (hashtags || '').split(',').map(h => h.trim().replace(/^#/, '')).filter(Boolean);

    const result = await pool.query(
      `INSERT INTO caption_templates (user_id, name, title, caption, hashtags)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, name.trim(), title || null, caption || null, hashtagArray]
    );

    res.status(201).json({ template: result.rows[0] });
  } catch (err) {
    console.error('Erreur création template:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── MODIFIER UN TEMPLATE ───
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, title, caption, hashtags } = req.body;

    const hashtagArray = Array.isArray(hashtags)
      ? hashtags
      : (hashtags || '').split(',').map(h => h.trim().replace(/^#/, '')).filter(Boolean);

    const result = await pool.query(
      `UPDATE caption_templates 
       SET name = $1, title = $2, caption = $3, hashtags = $4, updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [name.trim(), title || null, caption || null, hashtagArray, req.params.id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Template introuvable' });
    }

    res.json({ template: result.rows[0] });
  } catch (err) {
    console.error('Erreur modification template:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── SUPPRIMER UN TEMPLATE ───
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM caption_templates WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Template introuvable' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Erreur suppression template:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
