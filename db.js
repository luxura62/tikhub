const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDB() {
  let retries = 5;
  
  while (retries > 0) {
    try {
      const client = await pool.connect();
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          tiktok_open_id VARCHAR(255) UNIQUE NOT NULL,
          display_name VARCHAR(255),
          avatar_url TEXT,
          access_token TEXT NOT NULL,
          refresh_token TEXT,
          token_expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS scheduled_posts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(500),
          video_url TEXT,
          video_path TEXT,
          caption TEXT,
          hashtags TEXT[],
          scheduled_at TIMESTAMP NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          tiktok_post_id VARCHAR(255),
          error_message TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS stats_cache (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          followers_count INTEGER DEFAULT 0,
          likes_count INTEGER DEFAULT 0,
          video_count INTEGER DEFAULT 0,
          fetched_at TIMESTAMP DEFAULT NOW()
        );
      `);

      client.release();
      console.log('✅ Base de données initialisée');
      return;

    } catch (err) {
      retries--;
      console.log(`⏳ PostgreSQL pas prêt, nouvelle tentative dans 5s... (${retries} restantes)`);
      await new Promise(res => setTimeout(res, 5000));
    }
  }

  throw new Error('❌ Impossible de se connecter à PostgreSQL après 5 tentatives');
}

module.exports = { pool, initDB };