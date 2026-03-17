const express = require('express');
const axios = require('axios');
const { pool } = require('../db');
// On récupère requireAuth depuis ton fichier auth.js
const { requireAuth } = require('./auth'); 

const router = express.Router();

// --- GET /api/stats ---
// On ajoute requireAuth ici pour protéger la route
router.get('/', requireAuth, async (req, res) => {
  
  // CORRECTION : On utilise req.user.id (rempli par requireAuth)
  // au lieu de req.session.user.id
  const userId = req.user.id;

  try {
    // Récupération du token depuis la DB
    const userResult = await pool.query(
      'SELECT access_token FROM users WHERE id = $1',
      [userId]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    // Ici tu peux continuer avec ta logique axios...
    res.json({ message: "Stats récupérées avec succès", userId: userId });

  } catch (err) {
    console.error('Erreur Stats:', err.message);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des stats' });
  }
});

module.exports = router;
