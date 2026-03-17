const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Obligatoire pour Railway/Render en mode production
  }
});

const initDB = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS scheduled_posts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT,
      video_path TEXT NOT NULL,
      caption TEXT,
      hashtags TEXT[],
      scheduled_at TIMESTAMP NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      tiktok_post_id VARCHAR(255),
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(queryText);
    console.log("✅ Base de données initialisée");
  } catch (err) {
    console.error("❌ Erreur initDB:", err);
    throw err;
  }
};

module.exports = { pool, initDB };
