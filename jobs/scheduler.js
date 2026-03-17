const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const { pool } = require('../db');

// ─────────────────────────────────────────────
// Publie une vidéo sur TikTok via l'API Direct Post
// ─────────────────────────────────────────────
async function publishToTikTok(post, accessToken) {
    const videoPath = post.video_path;

    if (!fs.existsSync(videoPath)) {
        throw new Error(`Fichier vidéo introuvable : ${videoPath}`);
    }

    const videoSize = fs.statSync(videoPath).size;
    console.log(`📤 Préparation de l'envoi : ${videoPath} (${videoSize} octets)`);

    // Étape 1 : Initialisation de l'upload
    const initResponse = await axios.post(
        'https://open.tiktokapis.com/v2/post/publish/video/init/',
        {
            post_info: {
                title: buildCaption(post),
                privacy_level: 'SELF_ONLY',
                disable_duet: false,
                disable_comment: false,
                disable_stitch: false
            },
            source_info: {
                source: 'FILE_UPLOAD',
                video_size: videoSize,
                chunk_size: videoSize, // On garde un seul chunk pour simplifier
                total_chunk_count: 1
            }
        },
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json; charset=UTF-8'
            }
        }
    );

    const { publish_id, upload_url } = initResponse.data.data;

    // Étape 2 : Upload de la vidéo via STREAM (Évite le SIGTERM)
    // On crée un flux de lecture pour ne pas saturer la RAM
    const videoStream = fs.createReadStream(videoPath);

    await axios.put(upload_url, videoStream, {
        headers: {
            'Content-Type': 'video/mp4',
            'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`,
            'Content-Length': videoSize
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
    });

    return publish_id;
}

function buildCaption(post) {
    let caption = post.caption || '';
    if (post.hashtags && post.hashtags.length > 0) {
        caption += ' ' + post.hashtags.map(h => `#${h}`).join(' ');
    }
    return caption.trim();
}

async function getValidToken(userId) {
    const result = await pool.query(
        'SELECT access_token, refresh_token, token_expires_at FROM users WHERE id = $1',
        [userId]
    );

    if (!result.rows.length) throw new Error('Utilisateur introuvable');

    const user = result.rows[0];
    const now = new Date();
    const expiresAt = new Date(user.token_expires_at);

    // Rafraîchissement si expire dans moins d'une heure
    if (expiresAt - now < 3600 * 1000) {
        console.log(`🔄 Rafraîchissement du token pour l'utilisateur ${userId}...`);
        const refreshResponse = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', 
            new URLSearchParams({
                client_key: process.env.TIKTOK_CLIENT_KEY,
                client_secret: process.env.TIKTOK_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: user.refresh_token
            }).toString(), 
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const { access_token, refresh_token, expires_in } = refreshResponse.data;
        const newExpiry = new Date(Date.now() + expires_in * 1000);

        await pool.query(
            'UPDATE users SET access_token = $1, refresh_token = $2, token_expires_at = $3 WHERE id = $4',
            [access_token, refresh_token, newExpiry, userId]
        );

        return access_token;
    }

    return user.access_token;
}

function startScheduler() {
    cron.schedule('* * * * *', async () => {
        console.log('⏰ Vérification des posts à publier...');
        try {
            const result = await pool.query(`
                SELECT * FROM scheduled_posts 
                WHERE status = 'pending' AND scheduled_at <= NOW()
                LIMIT 5
            `);

            for (const post of result.rows) {
                try {
                    console.log(`🚀 Publication du post ${post.id}...`);
                    const token = await getValidToken(post.user_id);
                    const publishId = await publishToTikTok(post, token);

                    await pool.query(
                        "UPDATE scheduled_posts SET status = 'published', tiktok_post_id = $1 WHERE id = $2",
                        [publishId, post.id]
                    );
                    console.log(`✅ Post ${post.id} publié !`);
                } catch (err) {
                    console.error(`❌ Échec post ${post.id}:`, err.message, err.response?.data);
                    await pool.query(
                        "UPDATE scheduled_posts SET status = 'failed', error_message = $1 WHERE id = $2",
                        [err.message, post.id]
                    );
                }
            }
        } catch (err) {
            console.error('❌ Erreur Scheduler:', err.message);
        }
    });
}

module.exports = { startScheduler };
